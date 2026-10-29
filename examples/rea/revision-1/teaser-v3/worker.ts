import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill,makeCancelSignal} from '@remotion/renderer';
const input=JSON.parse(await readFile(process.argv[2]!,'utf8')),dir=dirname(process.argv[2]!);
const {cancelSignal,cancel}=makeCancelSignal();let browser:Awaited<ReturnType<typeof openBrowser>>|undefined;
const stop=()=>{cancel();void browser?.close({silent:true}).catch(()=>{});};
process.once('disconnect',stop);process.once('SIGINT',stop);process.once('SIGTERM',stop);process.on('message',m=>{if((m as any)?.type==='cancel')stop();});
const deadline=setTimeout(stop,600000);
try{
 const serveUrl=await bundle({entryPoint:input.entry,outDir:join(dir,'bundle'),publicDir:join(dir,'public')});
 browser=await openBrowser('chrome',{browserExecutable:input.browser,logLevel:'error'});
 const composition=await selectComposition({serveUrl,id:'DinoTeaser',puppeteerInstance:browser});
 if(composition.durationInFrames!==720||composition.width!==1080||composition.height!==1920||composition.fps!==30)throw Error('Preview scope mismatch');
 await mkdir(join(dir,'samples'));
 for(const frame of [45,100,220,360,480,650])await renderStill({serveUrl,composition,puppeteerInstance:browser,frame,output:join(dir,'samples',`${frame}.png`),imageFormat:'png',cancelSignal,overwrite:false});
 await renderMedia({serveUrl,composition,puppeteerInstance:browser,outputLocation:join(dir,'silent-raw.mp4'),codec:'h264',pixelFormat:'yuv420p',muted:true,concurrency:2,logLevel:'error',cancelSignal,overwrite:false,onProgress:p=>{if(p.renderedFrames%100===0)console.log(JSON.stringify({renderedFrames:p.renderedFrames,encodedFrames:p.encodedFrames}));}});
 await writeFile(join(dir,'worker-result.json'),JSON.stringify({success:true,frames:720,fps:30,width:1080,height:1920,workerPid:process.pid}));
}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(deadline);await browser?.close({silent:true});process.removeListener('disconnect',stop);if(process.connected)process.disconnect();}
