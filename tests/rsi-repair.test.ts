import {it,expect} from 'vitest';import {mkdtemp,writeFile,mkdir,readFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {execFileSync} from 'node:child_process';
import {freezeExperiment} from '../src/workflow/rsi-experiment.js';import {startRepair,applyRepair,repairStatus,recordRepairReview} from '../src/workflow/rsi-repair.js';import {canonical,sha256} from '../src/core/util.js';
it('persists repairs, rejects stale/fake reviews, resumes, reuses exact retries and bounds attempts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'rsi-repair-'));for(const [n,t]of Object.entries({base:'baseline',candidate:'first',requirements:'audience',rubric:'clarity'}))await writeFile(join(root,n),t);
 await freezeExperiment({id:'test',baseline:join(root,'base'),candidate:join(root,'candidate'),requirements:join(root,'requirements'),rubric:join(root,'rubric'),out:join(root,'freeze'),requiredModalities:['script']});const chain=join(root,'chain'),op=join(root,'freeze','operator-manifest.json');let state=await startRepair(chain,op);expect((await startRepair(chain,op)).attempts).toHaveLength(1);
 const cli=JSON.parse(execFileSync(process.execPath,['--import','tsx','scripts/rsi-repair.ts','status',chain],{encoding:'utf8'}));expect(cli.current.recordSha256).toBe(state.current!.recordSha256);
 await mkdir(join(chain,'.pending-crashed'));await writeFile(join(chain,'.pending-crashed','partial'),'incomplete');expect((await repairStatus(chain)).attempts).toHaveLength(1);
 const report=join(root,'report'),candidate=join(root,'next');await writeFile(candidate,'second');const first=state.current!,review={experimentSha256:sha256(canonical(first.experiment)),reviewer:'independent',verdict:'REVISE',coverage:['script'],findings:['Clarify input'],preferred:'neither'};await writeFile(report,JSON.stringify({...review,experimentSha256:'a'.repeat(64)}));await expect(applyRepair(chain,first.recordSha256,report,candidate)).rejects.toThrow('Record exact review');await writeFile(report,JSON.stringify(review));await recordRepairReview(chain,first.recordSha256,report);await expect(applyRepair(chain,'b'.repeat(64),report,candidate)).rejects.toThrow('predecessor');
 await applyRepair(chain,first.recordSha256,report,candidate);expect(await applyRepair(chain,first.recordSha256,report,candidate)).toMatchObject({status:'reused',attempt:2});state=await repairStatus(chain);expect(state.attempts).toHaveLength(2);expect(await readFile(join(state.attempts[0]!.directory,'candidate.txt'),'utf8')).toBe('first');
 await writeFile(candidate,'third');await writeFile(report,JSON.stringify({...review,experimentSha256:sha256(canonical(state.current!.experiment))}));await recordRepairReview(chain,state.current!.recordSha256,report);await applyRepair(chain,state.current!.recordSha256,report,candidate);state=await repairStatus(chain);expect(state.remaining).toBe(0);await writeFile(report,JSON.stringify({...review,experimentSha256:sha256(canonical(state.current!.experiment))}));await recordRepairReview(chain,state.current!.recordSha256,report);await writeFile(candidate,'fourth');await expect(applyRepair(chain,state.current!.recordSha256,report,candidate)).rejects.toThrow('within budget');
 const terminal=join(root,'terminal'),initial=await startRepair(terminal,op);await writeFile(report,JSON.stringify({...review,verdict:'PASS',findings:[],experimentSha256:sha256(canonical(initial.current!.experiment))}));await recordRepairReview(terminal,initial.current!.recordSha256,report);expect((await repairStatus(terminal)).currentReview?.decision.status).toBe('PASS');await expect(applyRepair(terminal,initial.current!.recordSha256,report,candidate)).rejects.toThrow('within budget');await writeFile(report,JSON.stringify(review));await expect(recordRepairReview(terminal,initial.current!.recordSha256,report)).rejects.toThrow('Conflicting');
 const recordPath=join(state.current!.directory,'record.json'),record=JSON.parse(await readFile(recordPath,'utf8'));await writeFile(recordPath,JSON.stringify({...record,previousRecordSha256:'c'.repeat(64)}));await expect(repairStatus(chain)).rejects.toThrow('predecessor');
});




it('keeps the finding reviewer for terminal PASS and revalidates saved reviewer identity', async () => {
 const root = await mkdtemp(join(tmpdir(), 'rsi-reviewer-'));
 for (const [name, text] of Object.entries({base:'baseline', candidate:'first', requirements:'audience', rubric:'clarity', next:'second'})) {
  await writeFile(join(root,name),text);
 }
 await freezeExperiment({id:'fixed-reviewer',baseline:join(root,'base'),candidate:join(root,'candidate'),requirements:join(root,'requirements'),rubric:join(root,'rubric'),out:join(root,'freeze'),requiredModalities:['script']});
 const chain=join(root,'chain'),reportPath=join(root,'review.json');
 let state=await startRepair(chain,join(root,'freeze','operator-manifest.json'));
 const first={experimentSha256:sha256(canonical(state.current!.experiment)),reviewer:'finding-judge',verdict:'REVISE',coverage:['script'],findings:['Clarify the input'],preferred:'neither'};
 await writeFile(reportPath,canonical(first));
 await recordRepairReview(chain,state.current!.recordSha256,reportPath);
 await applyRepair(chain,state.current!.recordSha256,reportPath,join(root,'next'));
 state=await repairStatus(chain);
 const terminal={...first,experimentSha256:sha256(canonical(state.current!.experiment)),verdict:'PASS',findings:[],preferred:'A'};
 await writeFile(reportPath,canonical({...terminal,reviewer:'replacement-judge'}));
 await expect(recordRepairReview(chain,state.current!.recordSha256,reportPath)).rejects.toThrow('Reviewer changed');
 expect((await repairStatus(chain)).currentReview).toBeUndefined();
 // A rejected replacement must not poison the chain or prevent the original reviewer from finishing.
 await writeFile(reportPath,canonical(terminal));
 await recordRepairReview(chain,state.current!.recordSha256,reportPath);
 state=await repairStatus(chain);
 expect(state.currentReview?.decision.status).toBe('PASS');
 expect(state.currentReview?.report.reviewer).toBe('finding-judge');
 // Even a recomputed report hash cannot disguise a different terminal reviewer.
 const savedPath=join(state.current!.directory,'review.json');
 const saved=JSON.parse(await readFile(savedPath,'utf8'));
 saved.report.reviewer='replacement-judge';
 saved.reviewSha256=sha256(canonical(saved.report));
 await writeFile(savedPath,canonical(saved));
 await expect(repairStatus(chain)).rejects.toThrow('Reviewer changed');
 await expect(applyRepair(chain,state.current!.recordSha256,reportPath,join(root,'next'))).rejects.toThrow('Reviewer changed');
});
