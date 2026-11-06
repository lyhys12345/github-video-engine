import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {EngineError} from '../core/errors.js';
import {canonical,sha256} from '../core/util.js';
import {ancestors,boundedFile} from '../story-planner/runtime.js';
import {parseByoConfig,callByoStructured} from '../providers/byo-llm.js';
import {ApiNarrativeFeedbackPlan,narrativeFeedbackContext,applyNarrativeFeedback,applyNarrativeFeedbackPlan} from './narrative-feedback.js';
import {statusNarrativeWorkspace} from './narrative-workspace.js';
import {readNarrativeAuthorData} from './narrative-run.js';
const fail=(code:string,message:string):never=>{throw new EngineError(code,message);};
const read=async(p:string)=>JSON.parse((await boundedFile(p,1_000_000)).toString('utf8'));
const Envelope=z.strictObject({planJson:z.string().min(1).max(1_000_000)});
function candidate(workspace:string,out:string){workspace=resolve(workspace);out=resolve(out);if(dirname(out)!==workspace||!/^api-feedback-[a-z0-9-]{1,60}$/.test(basename(out)))fail('API_FEEDBACK_OUTPUT','Use a fresh api-feedback-NAME child of the owned workspace.');return{workspace,out};}
export async function continueApiFeedback(workspace:string,out:string,through:'speech'|'preview',signal:AbortSignal){
 if(!['speech','preview'].includes(through))fail('API_FEEDBACK','Select speech or preview explicitly.');
 ({workspace,out}=candidate(workspace,out));await ancestors(out);
 const report=await read(join(out,'api-feedback-report.json')),planBytes=await boundedFile(join(out,'plan.json'),1_000_000);
 if(report.schemaVersion!=='byo-api-feedback/1.0'||report.status!=='plan-ready'||report.workspace!==workspace||report.providerRequests!==1||report.planSha256!==sha256(planBytes))fail('API_FEEDBACK','A completed exact API feedback plan is required.');
 const plan=ApiNarrativeFeedbackPlan.parse(JSON.parse(planBytes.toString('utf8')));
 if(canonical(report.source)!==canonical(plan.source))fail('API_FEEDBACK','Feedback receipt/source differs.');
 const file=join(out,'continuation-'+randomUUID()+'.json'),base={schemaVersion:'byo-api-feedback-continuation/1.0',workspace,out,through,planSha256:report.planSha256,providerRequests:0,modelCalls:0,configRead:false,keyRead:false,approval:'none'};
 try{const applied=await applyNarrativeFeedbackPlan(workspace,join(out,'plan.json'),join(out,'applied'),through,signal),value={...base,status:applied.status,applied};await writeFile(file,canonical(value),{flag:'wx'});return{...value,report:file};}catch(error){await writeFile(file,canonical({...base,status:'failed',errorCode:error instanceof EngineError?error.code:'LOCAL_FEEDBACK_FAILED'}),{flag:'wx'});throw error;}
}
export async function generateApiFeedback(workspace:string,configValue:unknown,feedback:string,out:string,explicitEnable:boolean,through:'speech'|'preview',signal:AbortSignal,env:NodeJS.ProcessEnv=process.env){
 const config=parseByoConfig(configValue,explicitEnable);
 if(typeof feedback!=='string'||!feedback.trim()||feedback.length>4000)fail('API_FEEDBACK_INPUT','Supply one nonempty feedback message, at most4000 characters.');
 if(!['speech','preview'].includes(through))fail('API_FEEDBACK_INPUT','Select speech or preview.');
 ({workspace,out}=candidate(workspace,out));await ancestors(workspace);
 const current=await statusNarrativeWorkspace(workspace,signal);if(current.authorState!=='unchanged')fail('API_FEEDBACK_INPUT','Resolve changed/unavailable current authors before API feedback.');
 const author=await readNarrativeAuthorData(current.authorDirectory);if(author.missing)fail('API_FEEDBACK_INPUT','Complete author data required.');
 try{await mkdir(out);}catch{return fail('API_FEEDBACK_OUTPUT','Output exists or cannot be reserved; no automatic repeat API request.');}
 const file=join(out,'api-feedback-report.json'),base={schemaVersion:'byo-api-feedback/1.0',workspace,source:{captureTaskId:current.source.taskId,bindingSha256:current.source.bindingSha256},feedbackSha256:sha256(feedback),endpointSha256:sha256(config.endpoint),facts:'pending',listening:'pending',ownerAcceptance:'pending',realProviderVerification:'unverified'};
 await writeFile(file,canonical({...base,status:'authorized-call-pending'}),{flag:'wx'});let receipt:unknown=null;
 try{
  const context=await narrativeFeedbackContext(workspace,join(out,'input-context.json'),signal),docs=Object.fromEntries([...author.files].filter(([n])=>['story.json','narrative.json','animation.json','run.json'].includes(n)).map(([n,b])=>[n,JSON.parse(b.toString('utf8'))]));
  if(context.expectedCurrentResultSha256!==current.currentResultSha256||context.expectedAuthorSha256!==author.hash)fail('API_FEEDBACK_STALE','Workspace advanced before the model request; no API request made.');
  const prompt={schemaVersion:'byo-feedback-prompt/1.0',feedback,context,author:docs,planSchema:z.toJSONSchema(ApiNarrativeFeedbackPlan),rules:['Interpret this feedback into an explicit narrative-feedback-plan/1.1 with interpretedBy api-model and the EXACT original feedback text.','All hashes/source bindings must match supplied context. Select only supported produced single-shot scenes.','Preserve sources/claims and unchanged scenes; use only existing validated animation operations. No new factual evidence, commands or approval.','For segmented narration supply explicit complete captions with full character coverage; sample partitions are authored, not measured word alignment.','Choose authored timing conservatively or shorten text; executor never auto-extends, clips or stretches recordings.']};
  const call=await callByoStructured(config,prompt,signal,{schema:Envelope,name:'github_video_feedback'},env);receipt=call.receipt;
  let plan:z.infer<typeof ApiNarrativeFeedbackPlan>;try{plan=ApiNarrativeFeedbackPlan.parse(JSON.parse(call.envelope.planJson));call.assertSafe(plan);if(plan.feedback.text!==feedback||plan.expectedCurrentResultSha256!==context.expectedCurrentResultSha256||plan.expectedAuthorSha256!==context.expectedAuthorSha256||canonical(plan.source)!==canonical(context.source))throw Error('Feedback/source/hash mismatch');applyNarrativeFeedback(docs['story.json'],docs['narrative.json'],docs['run.json'],docs['animation.json'],plan);}catch{return fail('API_FEEDBACK_PLAN','Untrusted provider plan failed source/hash/feedback/schema/local edit checks; raw response omitted.');}
  const bytes=canonical(plan);await writeFile(join(out,'plan.json'),bytes,{flag:'wx'});await writeFile(file,canonical({...base,status:'plan-ready',providerRequests:1,call:receipt,planSha256:sha256(bytes),interpretedBy:'api-model'}));
 }catch(error){const code=error instanceof EngineError&&/^(API_[A-Z_]+)$/.test(error.code)?error.code:'API_FEEDBACK_FAILED';await writeFile(file,canonical({...base,status:'failed',errorCode:code,call:receipt,rawResponseStored:false,requestUsage:'May be billed on failure; no automatic retry.'}));throw new EngineError(code,'API feedback preparation failed; inspect the sanitized report. No automatic retry.');}
 const local=await continueApiFeedback(workspace,out,through,signal);return{schemaVersion:'byo-api-feedback-result/1.0',providerRequests:1,apiReport:file,local};
}
export async function narrativeApiFeedbackCommand(pos:string[],values:Record<string,unknown>,signal:AbortSignal){
 const continuing=pos[1]==='api-feedback-continue',allowed=continuing?['workspace','out','through']:['workspace','out','through','spec','feedback','enable-api'];
 if(pos.length!==2||!['api-feedback','api-feedback-continue'].includes(pos[1]??'')||['workspace','out',...(continuing?['through']:['spec','feedback'])].some(k=>typeof values[k]!=='string')||values.through!==undefined&&!['speech','preview'].includes(String(values.through))||Object.entries(values).some(([k,v])=>v!==undefined&&!allowed.includes(k)))fail('USAGE','explanation api-feedback --workspace W --spec CONFIG --feedback TEXT --out W/api-feedback-NAME --enable-api [--through speech|preview] | api-feedback-continue --workspace W --out CANDIDATE --through speech|preview');
 if(continuing)return continueApiFeedback(String(values.workspace),String(values.out),values.through as 'speech'|'preview',signal);
 if(values['enable-api']!==true)fail('API_DISABLED','Explicit --enable-api is required.');
 let config:unknown;try{config=await read(String(values.spec));}catch{return fail('API_CONFIG','Unable to read non-secret config.');}
 return generateApiFeedback(String(values.workspace),config,String(values.feedback),String(values.out),true,(values.through??'speech') as 'speech'|'preview',signal);
}
