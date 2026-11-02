import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderMedia,renderStill} from '@remotion/renderer';
import {browserPath,ffmpegPath,ffprobePath,projectRoot} from '../src/providers/local.js';
import {command,killTree} from '../src/core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../src/core/owned-runtime.js';
import {VisualPlanSchema,VisualStyleSchema,buildSegmentTimeline} from '../src/short-segment/plan.js';
import {sha256,canonical} from '../src/core/util.js';
const out=resolve(process.argv[2]??'work/continuous-explainer-v1/revisions/rule-proof');await mkdir(out,{recursive:false});await mkdir(join(out,'public'));
const plan=VisualPlanSchema.parse(JSON.parse(await readFile('reviews/continuous-explainer-v1/rea-visual-plan.json','utf8'))),style=VisualStyleSchema.parse(JSON.parse(await readFile('work/continuous-explainer-v1/inputs/rea/bundle/assets/visual-style.json','utf8'))),receipt=JSON.parse(await readFile('work/chen-continuous-voice/generation-receipt.json','utf8')),timeline=buildSegmentTimeline(plan,receipt.recordings[0].measuredSeconds),revised=structuredClone(plan);revised.rule!.to=9;
const start=timeline.cues[4]!.startFrame+10,end=start+89,provenanceHash=sha256(await readFile('work/continuous-explainer-v1/inputs/rea/bundle/provenance.json'));
await copyFile('assets/fonts/noto-sans-sc/NotoSansSC-Variable.ttf',join(out,'public/font.ttf'));
await writeFile(join(out,'before-plan.json'),JSON.stringify(plan,null,2));await writeFile(join(out,'after-plan.json'),JSON.stringify(revised,null,2));await writeFile(join(out,'timeline.json'),JSON.stringify(timeline,null,2));
const tmp=await createOwnedRuntimeTmp(out),signal=new AbortController().signal,commands:{exe:string;args:string[]}[]=[],results=[];
const run=async(exe:string,args:string[],timeout=120000)=>{commands.push({exe,args});await writeFile(join(out,'commands.json'),JSON.stringify(commands,null,2));return command(exe,args,{signal,timeout});};
let browser:Awaited<ReturnType<typeof openBrowser>>|undefined;
const deadline=setTimeout(()=>{void killTree(process.pid);},240000);
try{
 const serveUrl=await bundle({entryPoint:join(projectRoot,'src/short-segment/composition.tsx'),outDir:join(out,'bundle'),publicDir:join(out,'public'),webpackOverride:c=>({...c,resolve:{...c.resolve,extensionAlias:{'.js':['.ts','.tsx','.js']}}})});
 browser=await openBrowser('chrome',{browserExecutable:await browserPath(),logLevel:'error'});
 for(const [name,currentPlan] of [['before',plan],['after',revised]] as const){
  const inputProps={plan:currentPlan,timeline,provenanceHash,visualStyle:style},composition=await selectComposition({serveUrl,id:'BoundedStorySegment',inputProps,puppeteerInstance:browser});
  await renderStill({serveUrl,composition,inputProps,puppeteerInstance:browser,frame:start+45,output:join(out,name+'.png'),imageFormat:'png',overwrite:false});
  await renderMedia({serveUrl,composition,inputProps,puppeteerInstance:browser,frameRange:[start,end],outputLocation:join(out,name+'-raw.mp4'),codec:'h264',pixelFormat:'yuv420p',muted:true,concurrency:2,logLevel:'error',overwrite:false});
  await run(ffmpegPath(),['-v','error','-nostdin','-n','-i',join(out,name+'-raw.mp4'),'-vf','scale=in_range=pc:out_range=tv,format=yuv420p','-c:v','libx264','-crf','18','-preset','veryfast','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709',join(out,name+'.mp4')]);
  const raw=await run(ffprobePath(),['-v','error','-count_frames','-show_streams','-show_format','-of','json',join(out,name+'.mp4')]),probe=JSON.parse(raw);await writeFile(join(out,name+'.ffprobe.json'),raw);
  if(probe.streams.length!==1||probe.streams[0].codec_name!=='h264'||Number(probe.streams[0].nb_read_frames)!==90||Math.abs(Number(probe.format.duration)-3)>.04)throw Error('Rule proof clip did not preserve requested 90 frames');
  await run(ffmpegPath(),['-v','error','-xerror','-i',join(out,name+'.mp4'),'-f','null','-']);
  results.push({name,mp4Sha256:sha256(await readFile(join(out,name+'.mp4'))),pngSha256:sha256(await readFile(join(out,name+'.png'))),planSha256:sha256(canonical(currentPlan)),frames:90,seconds:3,decoded:true});
 }
 if(results[0]!.mp4Sha256===results[1]!.mp4Sha256||results[0]!.pngSha256===results[1]!.pngSha256)throw Error('Rule revision did not affect actual media');
 await writeFile(join(out,'proof.json'),JSON.stringify({schemaVersion:'1.0',scope:'silent 3-second actual local revision excerpts; not formal narration deliverables',fieldChanged:'rule.to',before:12,after:9,sourceConditionUnchanged:13,sourceAccelerationUnchanged:.001,narrationChanged:false,voiceGeneration:false,sourceTimelineFrames:{start,end},originalPlanUnchanged:sha256(canonical(plan))===sha256(canonical(VisualPlanSchema.parse(JSON.parse(await readFile('reviews/continuous-explainer-v1/rea-visual-plan.json','utf8'))))),results,passed:true},null,2),{flag:'wx'});
}finally{clearTimeout(deadline);await browser?.close({silent:true});await cleanupOwnedRuntimeTmp(out);}
