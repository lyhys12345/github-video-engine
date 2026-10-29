import {readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {ProductionPackageSchema,ReadthroughSchema} from '../contracts/production.js';
import {killTree} from '../core/process.js';
const[inputPath,output]=process.argv.slice(2);if(!inputPath||!output)throw new Error('Missing production worker inputs');
const input=JSON.parse(await readFile(inputPath,'utf8'));
const props={design:ProductionPackageSchema.parse(input.design),readthrough:ReadthroughSchema.parse(input.readthrough),captions:input.captions,mode:input.mode};
const watchdog=setInterval(()=>{try{process.kill(input.parentPid,0);}catch{void killTree(process.pid);}},1000);watchdog.unref();
const deadline=setTimeout(()=>{void killTree(process.pid);},230000);deadline.unref();
let browser:Awaited<ReturnType<typeof openBrowser>>|undefined;
try{
  const serveUrl=await bundle({entryPoint:join(import.meta.dirname,'production-composition.tsx'),outDir:join(dirname(output),'bundle'),publicDir:null,webpackOverride:c=>({...c,resolve:{...c.resolve,extensionAlias:{'.js':['.ts','.tsx','.js']}}})});
  browser=await openBrowser('chrome',{browserExecutable:input.browser,logLevel:'error'});
  const composition=await selectComposition({serveUrl,id:'Explainer',inputProps:props,puppeteerInstance:browser});
  if(input.mode==='style'){
    let from=0;for(let index=0;index<props.design.scenes.length;index++){await renderStill({serveUrl,composition,inputProps:props,puppeteerInstance:browser,frame:from+Math.min(75,props.readthrough.lines[index]!.allocatedFrames-1),output:join(dirname(output),`scene-${index+1}.png`),imageFormat:'png',logLevel:'error'});from+=props.readthrough.lines[index]!.allocatedFrames;}
  }else{
    const motionIndex=props.design.scenes.findIndex(s=>s.id===props.design.authorization.motionScene);
    const start=props.readthrough.lines.slice(0,motionIndex).reduce((n,l)=>n+l.allocatedFrames,0);
    const frames=Math.round(props.design.authorization.motionSeconds*props.readthrough.fps);
    await renderMedia({serveUrl,composition,inputProps:props,puppeteerInstance:browser,outputLocation:output,codec:'h264',pixelFormat:'yuv420p',concurrency:2,scale:input.mode==='animatic'?.5:1,frameRange:input.mode==='motion'?[start,start+frames-1]:null,logLevel:'error',timeoutInMilliseconds:30000,
      onProgress:({renderedFrames,encodedFrames})=>{void writeFile(join(dirname(output),'progress.json'),JSON.stringify({renderedFrames,encodedFrames,workerPid:process.pid,parentPid:input.parentPid})).catch(()=>{});}});
  }
}finally{clearTimeout(deadline);clearInterval(watchdog);await browser?.close({silent:true});}
