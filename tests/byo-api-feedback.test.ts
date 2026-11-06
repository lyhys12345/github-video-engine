import {it,expect} from 'vitest';
import {join} from 'node:path';
import {readFile,readdir} from 'node:fs/promises';
import {authorNarrativeViaApi} from '../src/workflow/narrative-api-author.js';
import {generateApiFeedback,continueApiFeedback,narrativeApiFeedbackCommand} from '../src/workflow/narrative-api-feedback.js';
import {signal,env,testKey,mock,completion,started,fixture,fileBytes} from './byo-api-support.js';
import {feedbackFixture} from './byo-feedback-support.js';
const feedback='开场说得更直接，并让传递动画更快。';
async function baseline(){const f=await started(),a=await fixture(f),s=await mock((_q,r)=>r.end(JSON.stringify(completion(a))));try{await authorNarrativeViaApi(f.root,s.config,join(f.root,'api-author-base'),true,signal,env);}finally{await s.close();}return f;}
it('API feedback requires both explicit gates before reading config/workspace or sending a request',async()=>{
 await expect(narrativeApiFeedbackCommand(['explanation','api-feedback'],{workspace:'missing',out:'missing',spec:'missing',feedback},signal)).rejects.toThrow('enable-api');
 const s=await mock((_q,r)=>r.end('{}'));try{await expect(generateApiFeedback('missing',s.config,feedback,'missing',false,'speech',signal,env)).rejects.toThrow('enable-api');await expect(generateApiFeedback('missing',{...s.config,enabled:false},feedback,'missing',true,'speech',signal,env)).rejects.toThrow('enabled');expect(s.count).toBe(0);}finally{await s.close();}
});
it('rejects untrusted stale source/hash, changed feedback, invented claims and false session provenance without executing edits',async()=>{
 const f=await baseline();for(const kind of ['hash','source','feedback','claim','provenance','command']){const s=await mock((_q,r,b)=>{const p:any=feedbackFixture(b);if(kind==='hash')p.expectedAuthorSha256='f'.repeat(64);if(kind==='source')p.source.captureTaskId='f'.repeat(64);if(kind==='feedback')p.feedback.text='different user request';if(kind==='claim')p.changes[0].visual.sceneAnimation.animation.shots[0].actions[0].claimIds=['invented'];if(kind==='provenance'){p.schemaVersion='narrative-feedback-plan/1.0';p.feedback.interpretedBy='current-session-agent';}if(kind==='command')p.execute='DO NOT EXECUTE';r.end(JSON.stringify(completion({planJson:JSON.stringify(p)})));});
 try{const out=join(f.root,'api-feedback-'+kind);await expect(generateApiFeedback(f.root,s.config,feedback,out,true,'speech',signal,env)).rejects.toThrow('No automatic retry');expect(s.count).toBe(1);const report=JSON.parse(await readFile(join(out,'api-feedback-report.json'),'utf8'));expect(report.status).toBe('failed');expect(report.errorCode).toBe('API_FEEDBACK_PLAN');expect(await readdir(out)).not.toContain('applied');expect(await fileBytes(out)).not.toContain(testKey);await expect(generateApiFeedback(f.root,s.config,feedback,out,true,'speech',signal,env)).rejects.toThrow('no automatic repeat');expect(s.count).toBe(1);await expect(continueApiFeedback(f.root,out,'speech',signal)).rejects.toThrow();expect(s.count).toBe(1);}finally{await s.close();}
 }
});
it('credential-bearing feedback is rejected before HTTP and is not persisted as user text',async()=>{
 const f=await baseline(),s=await mock((_q,r)=>r.end('{}'));try{const out=join(f.root,'api-feedback-secret');await expect(generateApiFeedback(f.root,s.config,'accidental '+testKey,out,true,'speech',signal,env)).rejects.toThrow('No automatic retry');expect(s.count).toBe(0);expect(await fileBytes(out)).not.toContain(testKey);}finally{await s.close();}
});
it('keyless feedback continuation refuses API flags and invalid stages without a model call',async()=>{
 await expect(narrativeApiFeedbackCommand(['explanation','api-feedback-continue'],{workspace:'missing',out:'missing',through:'preview','enable-api':true},signal)).rejects.toThrow('api-feedback-continue');await expect(continueApiFeedback('missing','missing','planning' as any,signal)).rejects.toThrow('explicitly');
});
