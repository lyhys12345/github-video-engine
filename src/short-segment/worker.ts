import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill,makeCancelSignal} from '@remotion/renderer';
import {killTree} from '../core/process.js';
import {checkExtendedScratch, EXTENDED_RENDER_PROFILE, EXTENDED_WORKER_DEADLINE, extendedRanges, MAX_PART_BYTES, MAX_SAMPLES} from '../presentation/duration.js';
const input=JSON.parse(await readFile(process.argv[2]!,'utf8')),dir=dirname(process.argv[2]!);
const extended = input.renderProfile === EXTENDED_RENDER_PROFILE;
if (input.renderProfile !== undefined && !extended) throw Error('Unknown segment render profile');
const {cancelSignal,cancel}=makeCancelSignal();let browser:Awaited<ReturnType<typeof openBrowser>>|undefined;
const stop=()=>{cancel();void browser?.close({silent:true}).catch(()=>{});};
process.once('disconnect',stop);process.once('SIGINT',stop);process.once('SIGTERM',stop);
const deadline=setTimeout(stop,extended ? EXTENDED_WORKER_DEADLINE : 600000);
let scratchFailure: unknown, scratchCheck: Promise<void> | undefined, peakScratchBytes = 0;
const checkScratch = () => {
  if (!extended || scratchFailure) return;
  return scratchCheck ??= checkExtendedScratch(dir).then(measured => {
    peakScratchBytes = Math.max(peakScratchBytes, measured.bytes);
  }).catch(error => {
    scratchFailure = error;
    stop();
  }).finally(() => {scratchCheck = undefined;});
};
const scratchTimer = extended ? setInterval(() => {void checkScratch();}, 2_000) : undefined;
try{
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'bundling',workerPid:process.pid}));
 const serveUrl=await bundle({entryPoint:input.entry,outDir:join(dir,'bundle'),publicDir:join(dir,'public'),webpackOverride:c=>({...c,resolve:{...c.resolve,extensionAlias:{'.js':['.ts','.tsx','.js']}}})});
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'browser-starting',workerPid:process.pid}));
 const startupTimeout=setTimeout(()=>{void writeFile(join(dir,'progress.json'),JSON.stringify({stage:'browser-start-timeout',workerPid:process.pid,timeoutMs:45000})).finally(()=>killTree(process.pid));},45000);
 try{browser=await openBrowser('chrome',{browserExecutable:input.browser,logLevel:'error'});}finally{clearTimeout(startupTimeout);}
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'sampling',workerPid:process.pid}));
 const composition=await selectComposition({serveUrl,id:'BoundedStorySegment',inputProps:input.props,puppeteerInstance:browser});
 const {fps,width,height}=input.geometry??{fps:30,width:1080,height:1920};
 if(composition.durationInFrames!==input.props.timeline.totalFrames||composition.fps!==fps||composition.width!==width||composition.height!==height||
   (extended ? fps!==24||width!==720||height!==1280 : composition.durationInFrames>3600||composition.durationInFrames>fps*60))throw Error('Bounded segment scope mismatch');
 const ranges = extended ? extendedRanges(composition.durationInFrames) : [];
 if (extended && (!Array.isArray(input.sampleFrames) || input.sampleFrames.length > MAX_SAMPLES ||
   new Set(input.sampleFrames).size !== input.sampleFrames.length ||
   input.sampleFrames.some((frame: number) => !Number.isInteger(frame) || frame < 0 || frame >= composition.durationInFrames))) throw Error('Extended sample scope mismatch');
 await mkdir(join(dir,'samples'));
 for(const frame of input.sampleFrames)await renderStill({serveUrl,composition,inputProps:input.props,puppeteerInstance:browser,frame,output:join(dir,'samples',`${frame}.png`),imageFormat:'png',cancelSignal,overwrite:false});
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'rendering',workerPid:process.pid}));
 const media = {serveUrl,composition,inputProps:input.props,puppeteerInstance:browser,codec:'h264',pixelFormat:'yuv420p',muted:true,
   concurrency:2,logLevel:'error',cancelSignal,overwrite:false} as const;
 if (extended) {
   for (const [index, frameRange] of ranges.entries()) {
     const outputLocation = join(dir, 'part-' + index + '.mp4');
     await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'rendering-part',workerPid:process.pid,index,frameRange}));
     await renderMedia({...media, outputLocation, frameRange, imageFormat:'jpeg', jpegQuality:88,
       videoBitrate:'3M', encodingMaxRate:'4M', encodingBufferSize:'4M'});
     const bytes = (await stat(outputLocation)).size;
     if (bytes <= 0 || bytes > MAX_PART_BYTES) throw Error('Extended render part exceeds encoded byte budget');
     await checkScratch();
     if (scratchFailure) throw scratchFailure;
   }
 } else {
   await renderMedia({...media,outputLocation:join(dir,'silent.mp4'),
     onProgress:p=>{if(p.renderedFrames%100===0)console.log(JSON.stringify({renderedFrames:p.renderedFrames,encodedFrames:p.encodedFrames}));}});
 }
 if (scratchFailure) throw scratchFailure;
 await writeFile(join(dir,'worker-result.json'),JSON.stringify({success:true,frames:composition.durationInFrames,fps,width,height,workerPid:process.pid,
   ...(extended ? {peakScratchBytes} : {})},null,2));
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'completed',workerPid:process.pid}));
}catch(e){console.error(scratchFailure ?? e);process.exitCode=1;}finally{clearInterval(scratchTimer);clearTimeout(deadline);await browser?.close({silent:true});process.removeListener('disconnect',stop);if(process.connected)process.disconnect();}
