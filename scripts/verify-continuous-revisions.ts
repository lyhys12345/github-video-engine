import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {sha256,canonical} from '../src/core/util.js';
import {segmentRevision} from '../src/short-segment/revision.js';
import {ffmpegPath} from '../src/providers/local.js';
import {command} from '../src/core/process.js';
const [base='examples/continuous-explainer-v1/rembg-v3',narrationOut='examples/continuous-explainer-v1/rembg-narration-v1',assetOut='examples/continuous-explainer-v1/rembg-asset-v1',rea='examples/continuous-explainer-v1/rea-v3',ruleFolder='rule-proof',reportName='actual-revision-verification.json',rejectionsName='actual-rejections.json']=process.argv.slice(2);
const root='work/continuous-explainer-v1/revisions',read=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
const result=[];
for(const [name,out] of [['narration',narrationOut],['asset',assetOut]] as const){
 const originalBytes=await readFile(join(base,'evaluation.json')),original=JSON.parse(originalBytes.toString('utf8')),evaluation=await read(join(out,'evaluation.json')),revision=await read(join(out,'revision.json'));
 if(!evaluation.technicalPassed||revision.previousEvaluationSha256!==sha256(originalBytes)||revision.previousMp4Sha256!==sha256(await readFile(join(base,'segment.mp4')))||evaluation.output.sha256!==sha256(await readFile(join(out,'segment.mp4'))))throw Error('Actual revision source/output binding failed');
 if(revision.approvalStatus!=='previous-review-stale-new-review-required'||!revision.invalidated.includes('mp4')||evaluation.output.sha256===original.output.sha256)throw Error('Revision incorrectly reused current output/review');
 const same=async(file:string)=>sha256(await readFile(join(base,file)))===sha256(await readFile(join(out,file)));
 if(name==='asset'){
  for(const file of ['source-audio.bin','narration.wav','timeline.json','captions.srt','visual-plan.json','source-pack/story.json','source-pack/compiled.json'])if(!await same(file))throw Error('Asset-only revision changed '+file);
  if(canonical(revision.changed)!==canonical(['source','style']))throw Error('Asset revision is not isolated to source style');
 }else{
  if(await same('source-audio.bin')||await same('timeline.json')||await same('captions.srt'))throw Error('Narration revision failed to update audio/timing/captions');
  if(!await same('source-pack/assets/visual-style.json'))throw Error('Narration revision changed source visual asset');
  const oldText=original.timeline.cues.map((c:any)=>c.text).join(''),newText=evaluation.timeline.cues.map((c:any)=>c.text).join('');
  if(newText!==oldText.replace('一张图，怎样只留下主体？','一张图，怎样把背景去掉？'))throw Error('Unexpected narration revision scope');
 }
 result.push({name,base,out,baseEvaluationSha256:sha256(originalBytes),baseMp4Sha256:original.output.sha256,newMp4Sha256:evaluation.output.sha256,changed:revision.changed,invalidated:revision.invalidated,reviewStatus:revision.approvalStatus,actualFrames:evaluation.timeline.totalFrames,actualSeconds:evaluation.output.seconds,sourceAudioUnchanged:await same('source-audio.bin'),passed:true});
}
const prior=await read(join(rea,'evaluation.json')),afterPlanBytes=await readFile(join(root,ruleFolder,'after-plan.json')),ruleDecision=await segmentRevision(rea,{...prior.fingerprint,plan:sha256(afterPlanBytes)});
if(ruleDecision.kind!=='local-revision'||canonical(ruleDecision.changed)!==canonical(['plan'])||!ruleDecision.invalidated.includes('mp4'))throw Error('Rule edit did not invalidate output/review');
await writeFile(join(root,ruleFolder,'revision.json'),JSON.stringify(ruleDecision,null,2),{flag:'wx'});
const rule=await read(join(root,ruleFolder,'proof.json'));if(!rule.passed||!rule.originalPlanUnchanged||rule.results.some((r:any)=>r.frames!==90||!r.decoded))throw Error('Rule media proof failed');
const pixelCommands=[],pixels=[];
for(const [name,path] of [['base',base],['asset',assetOut]]){
 const dest=join(root,reportName.replace('.json',`-${name}-pixel.rgb`)),args=['-v','error','-nostdin','-n','-i',join(path!,'segment.mp4'),'-vf','select=eq(n\\,661),format=rgb24,crop=1:1:531:1035','-vsync','0','-frames:v','1','-f','rawvideo',dest];
 pixelCommands.push({exe:ffmpegPath(),args});await command(ffmpegPath(),args,{timeout:30000});const rgb=await readFile(dest);if(rgb.length!==3)throw Error('Expected one actual decoded RGB pixel');pixels.push({name,frame:661,x:531,y:1035,rgb:[...rgb]});
}
const pixelDistance=Math.sqrt(pixels[0]!.rgb.reduce((s,c,i)=>s+(c-pixels[1]!.rgb[i]!)**2,0));if(pixelDistance<50)throw Error('Consumed asset change not visible in actual decoded subject pixel');
await writeFile(join(root,reportName.replace('.json','-pixel-commands.json')),JSON.stringify(pixelCommands,null,2),{flag:'wx'});
const report={schemaVersion:'1.0',executedAt:new Date().toISOString(),scope:'three separate actual local revision axes, with original outputs preserved',narratedRevisions:result,ruleRevision:{...rule,decision:ruleDecision},assetActualDecodedPixel:{pixels,pixelDistance,passed:true},rejections:await read(join(root,rejectionsName)),listening:'pending-owner-review',paidCalls:0,targetExecution:false,passed:true};
await writeFile(join(root,reportName),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,narratedRevisions:result,ruleChanged:ruleDecision.changed}));
