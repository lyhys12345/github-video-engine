import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill,makeCancelSignal} from '@remotion/renderer';
import {ExplanationSchema} from '../contracts/explanation.js';
const input=JSON.parse(await readFile(process.argv[2]!,'utf8')),dir=dirname(process.argv[2]!),plan=ExplanationSchema.parse(input.plan);
const {cancelSignal,cancel}=makeCancelSignal();let browser:Awaited<ReturnType<typeof openBrowser>>|undefined;
const stop=()=>{cancel();void browser?.close({silent:true}).catch(()=>{});};process.once('SIGINT',stop);process.once('SIGTERM',stop);
try{
 const serveUrl=await bundle({entryPoint:join(import.meta.dirname,'composition.tsx'),outDir:join(dir,'bundle'),publicDir:join(dir,'public'),webpackOverride:config=>({...config,resolve:{...config.resolve,extensionAlias:{'.js':['.ts','.tsx','.js']}}})});
 browser=await openBrowser('chrome',{browserExecutable:input.browser,logLevel:'error'});
 const props={plan},composition=await selectComposition({serveUrl,id:'Explanation',inputProps:props,puppeteerInstance:browser});
 await mkdir(join(dir,'frames'));
 for(const second of [1,4.5,6.5,8,10,12,15,17])await renderStill({serveUrl,composition,inputProps:props,puppeteerInstance:browser,frame:Math.floor(second*30),output:join(dir,'frames',`${second}.png`),imageFormat:'png',cancelSignal});
 await renderMedia({serveUrl,composition,inputProps:props,puppeteerInstance:browser,outputLocation:join(dir,'raw.mp4'),codec:'h264',pixelFormat:'yuv420p',muted:true,concurrency:2,logLevel:'error',cancelSignal});
 await writeFile(join(dir,'worker-result.json'),JSON.stringify({frames:composition.durationInFrames,width:composition.width,height:composition.height,fps:composition.fps}));
}finally{await browser?.close({silent:true});}
