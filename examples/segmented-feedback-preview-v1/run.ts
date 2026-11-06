/** Execute the already-authored, hash-guarded feedback plan; never infers prose or cue timings. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {applyNarrativeFeedbackPlan} from '../../src/workflow/narrative-feedback.js';
const [workspace,spec,candidate,output]=process.argv.slice(2);if(!workspace||!spec||!candidate||!output)throw Error('usage: run.ts WORKSPACE EXPLICIT_PLAN NEW_OR_SAME_CANDIDATE EVIDENCE_DIRECTORY');
const root=resolve(output);await mkdir(root,{recursive:true});const result=await applyNarrativeFeedbackPlan(workspace,spec,candidate,'preview',new AbortController().signal);await writeFile(join(root,'feedback-result.json'),JSON.stringify(result,null,2));const run='run' in result?result.run:JSON.parse(await readFile(result.current.currentResult,'utf8'));await writeFile(join(root,'edited.json'),JSON.stringify(run,null,2));await writeFile(join(root,'integration.json'),JSON.stringify({workspace:resolve(workspace),spec:resolve(spec),candidate:resolve(candidate),review:'pending; explicit caller-authored timings, not speech alignment or approval'},null,2));
