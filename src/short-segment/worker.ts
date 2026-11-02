import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill,makeCancelSignal} from '@remotion/renderer';
import {killTree} from '../core/process.js';
const input=JSON.parse(await readFile(process.argv[2]!,'utf8')),dir=dirname(process.argv[2]!);
const {cancelSignal,cancel}=makeCancelSignal();let browser:Awaited<ReturnType<typeof openBrowser>>|undefined;
const stop=()=>{cancel();void browser?.close({silent:true}).catch(()=>{});};
process.once('disconnect',stop);process.once('SIGINT',stop);process.once('SIGTERM',stop);
const deadline=setTimeout(stop,600000);
try{
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'bundling',workerPid:process.pid}));
 const serveUrl=await bundle({entryPoint:input.entry,outDir:join(dir,'bundle'),publicDir:join(dir,'public'),webpackOverride:c=>({...c,resolve:{...c.resolve,extensionAlias:{'.js':['.ts','.tsx','.js']}}})});
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'browser-starting',workerPid:process.pid}));
 const startupTimeout=setTimeout(()=>{void writeFile(join(dir,'progress.json'),JSON.stringify({stage:'browser-start-timeout',workerPid:process.pid,timeoutMs:45000})).finally(()=>killTree(process.pid));},45000);
 try{browser=await openBrowser('chrome',{browserExecutable:input.browser,logLevel:'error'});}finally{clearTimeout(startupTimeout);}
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'sampling',workerPid:process.pid}));
 const composition=await selectComposition({serveUrl,id:'BoundedStorySegment',inputProps:input.props,puppeteerInstance:browser});
 if(composition.durationInFrames!==input.props.timeline.totalFrames||composition.durationInFrames>1800||composition.fps!==30||composition.width!==1080||composition.height!==1920)throw Error('Bounded segment scope mismatch');
 await mkdir(join(dir,'samples'));
 for(const frame of input.sampleFrames)await renderStill({serveUrl,composition,inputProps:input.props,puppeteerInstance:browser,frame,output:join(dir,'samples',`${frame}.png`),imageFormat:'png',cancelSignal,overwrite:false});
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'rendering',workerPid:process.pid}));
 await renderMedia({serveUrl,composition,inputProps:input.props,puppeteerInstance:browser,outputLocation:join(dir,'silent.mp4'),codec:'h264',pixelFormat:'yuv420p',muted:true,concurrency:2,logLevel:'error',cancelSignal,overwrite:false,onProgress:p=>{if(p.renderedFrames%100===0)console.log(JSON.stringify({renderedFrames:p.renderedFrames,encodedFrames:p.encodedFrames}));}});
 await writeFile(join(dir,'worker-result.json'),JSON.stringify({success:true,frames:composition.durationInFrames,fps:30,width:1080,height:1920,workerPid:process.pid},null,2));
 await writeFile(join(dir,'progress.json'),JSON.stringify({stage:'completed',workerPid:process.pid}));
}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(deadline);await browser?.close({silent:true});process.removeListener('disconnect',stop);if(process.connected)process.disconnect();}
