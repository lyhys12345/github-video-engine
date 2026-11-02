import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {sha256,canonical} from '../core/util.js';
export type SegmentFingerprint={source:string;plan:string;voice:string;transcript:string;style:string;font:string;implementation:string};
export async function segmentRevision(previousOutputPath:string|undefined,current:SegmentFingerprint){
 if(!previousOutputPath)return {kind:'initial-render' as const,current,invalidated:[],approvalStatus:'new-independent-review-required'};
 const bytes=await readFile(join(previousOutputPath,'evaluation.json')),prior=JSON.parse(bytes.toString('utf8'));
 if(!prior.fingerprint||!prior.technicalPassed)throw Error('Revision requires a completed fingerprinted prior render');
 const mp4=await readFile(join(previousOutputPath,'segment.mp4'));
 if(sha256(mp4)!==prior.output.sha256)throw Error('Previous revision output integrity mismatch');
 const changed=(Object.keys(current) as (keyof SegmentFingerprint)[]).filter(k=>current[k]!==prior.fingerprint[k]);
 const invalidated=new Set<string>();
 for(const field of changed){
  if(['voice','transcript'].includes(field))for(const item of ['narration','timeline','captions','frames','mp4','review-approval'])invalidated.add(item);
  else if(field==='plan')for(const item of ['timeline','captions','frames','mp4','review-approval'])invalidated.add(item);
  else for(const item of ['frames','mp4','review-approval'])invalidated.add(item);
 }
 return {kind:'local-revision' as const,previousOutputPath,previousEvaluationSha256:sha256(bytes),previousMp4Sha256:prior.output.sha256,previousFingerprint:prior.fingerprint,current,changed,invalidated:[...invalidated],approvalStatus:changed.length?'previous-review-stale-new-review-required':'same-content-review-still-pending',cachePolicy:'full-local-rerender-no-stale-output-reuse',binding:sha256(canonical(current))};
}
