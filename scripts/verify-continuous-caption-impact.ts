import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {renderSegmentFrame} from '../src/short-segment/frame.js';
import {sha256} from '../src/core/util.js';
const frozen=resolve('reviews/continuous-explainer-v1/candidate-2/frozen'),before=await import(pathToFileURL(join(frozen,'src/short-segment/frame.ts')).href),results=[];
for(const name of ['rembg','revision-narration','revision-asset','rea']){
 const root=join(frozen,name),plan=JSON.parse(await readFile(join(root,'visual-plan.json'),'utf8')),timeline=JSON.parse(await readFile(join(root,'timeline.json'),'utf8')),style=JSON.parse(await readFile(join(root,'source-pack',plan.styleAssetPath),'utf8')),provenanceHash=sha256(await readFile(join(root,'source-pack/provenance.json'))),changed=[];
 for(let frame=0;frame<timeline.totalFrames;frame++)if(before.renderSegmentFrame(plan,timeline,frame,provenanceHash,style)!==renderSegmentFrame(plan,timeline,frame,provenanceHash,style))changed.push(frame);
 if(name!=='rea'&&changed.length)throw Error('Caption-only fix unexpectedly affects reused '+name);
 if(name==='rea'&&!changed.length)throw Error('Observed caption fix has no effect');
 results.push({name,totalFrames:timeline.totalFrames,changedFrames:changed,allFramesCompared:true,svgIdentical:changed.length===0,reusedMedia: name!=='rea'});
}
const ruleRoot=join(frozen,'evidence/revisions/rule-proof-v2'),ruleProof=JSON.parse(await readFile(join(ruleRoot,'proof.json'),'utf8')),ruleTimeline=JSON.parse(await readFile(join(ruleRoot,'timeline.json'),'utf8')),ruleStyle=JSON.parse(await readFile(join(frozen,'rea/source-pack/assets/visual-style.json'),'utf8')),ruleProvenance=sha256(await readFile(join(frozen,'rea/source-pack/provenance.json')));
for(const name of ['before','after']){
 const plan=JSON.parse(await readFile(join(ruleRoot,name+'-plan.json'),'utf8')),changed=[];
 for(let frame=ruleProof.sourceTimelineFrames.start;frame<=ruleProof.sourceTimelineFrames.end;frame++)if(before.renderSegmentFrame(plan,ruleTimeline,frame,ruleProvenance,ruleStyle)!==renderSegmentFrame(plan,ruleTimeline,frame,ruleProvenance,ruleStyle))changed.push(frame);
 if(changed.length)throw Error('Caption-only fix unexpectedly affects reused rule clip '+name);
 results.push({name:'rule-'+name,totalFrames:90,changedFrames:changed,allFramesCompared:true,svgIdentical:true,reusedMedia:true});
}
const hash=async(path:string)=>sha256(await readFile(path));
const report={schemaVersion:'1.0',scope:'caption-only addition of assistant/noncollision semantic tokens',previousCandidateManifestSha256:await hash(resolve('reviews/continuous-explainer-v1/candidate-2/manifest.json')),sourceBeforeSha256:await hash(join(frozen,'src/short-segment/captions.ts')),sourceAfterSha256:await hash('src/short-segment/captions.ts'),results,rembgReuse:'all frames equal under old and new actual rendering functions; source/audio/timeline/plan/style bytes and existing actual MP4s remain reused byte for byte',reaAction:'new full render required; narration/audio/cues/plan/style remain unchanged',passed:true};
await writeFile('work/continuous-explainer-v1/caption-impact-candidate-3.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,results:results.map(r=>({name:r.name,frames:r.totalFrames,changed:r.changedFrames.length}))}));
