import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {canonical,sha256} from '../src/core/util.js';
import {parseByoConfig,callByoAuthor,resolveByoEndpoint} from '../src/providers/byo-llm.js';
import {authorNarrativeViaApi,narrativeApiAuthorCommand} from '../src/workflow/narrative-api-author.js';
import {runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {sourceFixture,workflowRoot} from './workflow-support.js';
const signal=new AbortController().signal;
const testKey='TEST_ONLY_MOCK_NOT_A_REAL_KEY_12345';
const env={GVE_LLM_API_KEY:testKey};
const base={schemaVersion:'byo-llm-config/1.0',enabled:true,model:'mock-test-only',allowLocalHttp:true,maxOutputTokens:8000,timeoutMs:1000,inputMicrosPerMillionTokens:0,outputMicrosPerMillionTokens:0,maxEstimatedCostMicros:0};
async function mock(handler:(req:IncomingMessage,res:ServerResponse,body:any)=>unknown){
 let count=0;const requests:any[]=[];const server=createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;count++;const body=JSON.parse(raw);requests.push({body,authorization:req.headers.authorization});await handler(req,res,body);});
 await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const port=(server.address() as {port:number}).port;
 return{config:{...base,endpoint:`http://127.0.0.1:${port}/v1/chat/completions`},requests,get count(){return count;},close:async()=>{server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}};
}
const completion=(value:unknown,extra:unknown={})=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}],usage:{prompt_tokens:123,completion_tokens:456,total_tokens:579},...extra as object});
async function started(){
 const root=await workflowRoot('byo'),source=sourceFixture();
 const first=await runNarrativeWorkspace(source.repository,root,undefined,'planning',signal,async url=>url.includes('/commits/')?{sha:source.commit}:url.includes('/readme?')?{type:'file',path:'README.md',encoding:'base64',size:Buffer.byteLength(source.documents[0]!.content),content:Buffer.from(source.documents[0]!.content).toString('base64')}:{full_name:'example/demo',name:'demo',default_branch:'main',license:null});
 if(first.status!=='awaiting-session-agent'||!('authoringPacket'in first))throw Error('Missing packet');
 const guide=JSON.parse(await readFile(join(first.authoringPacket.bundle,'authoring-guide.json'),'utf8'));
 const handoff=JSON.parse(await readFile(first.agentHandoff.packet,'utf8'));
 return{root,first,guide,handoff};
}
async function fixture(f:Awaited<ReturnType<typeof started>>){
 const story=JSON.parse(await readFile('examples/http-story-v1/express-story.json','utf8')),animation=JSON.parse(await readFile('examples/http-story-v1/express-animation.json','utf8'));
 story.evidence.sources=f.guide.sources.map((s:any)=>s.descriptor??s); // Exact captured descriptors, never fabricated provider metadata.
 // Guide sources are actual source descriptors in the packet; each assertion is TEST ONLY, not a semantic claim.
 const descriptor=story.evidence.sources[0];
 story.evidence.claims.forEach((c:any)=>{c.citations=[{document:descriptor.id,startLine:2,endLine:2,quote:'Removes image backgrounds.'}];});
 story.shots.forEach((s:any)=>{s.narration='测试旁白。';s.visual='TEST ONLY mock author data, no semantic acceptance';s.visualSeconds=4;s.holdSeconds=0;s.transitionSeconds=0;});
 const claims=story.evidence.claims.map((c:any)=>({id:c.id,statement:c.statement,basis:c.kind==='inference'?{kind:c.kind,reasoning:c.rationale}:{kind:c.kind},citations:c.citations.map((q:any)=>({sourceId:q.document,sourceSha256:descriptor.sha256,startLine:q.startLine,endLine:q.endLine,quote:q.quote}))}));
 const plan:any={schemaVersion:'repository-narrative-plan/1.1',binding:f.first.binding,authoringRequestId:f.guide.authoringRequestId,authorship:{kind:'api-model'},interpretation:'api-model-authored-not-semantic-approval',brief:{title:'TEST ONLY API mock',audience:'structural fixture',question:'TEST ONLY question',thesis:'TEST ONLY thesis',scope:'No semantic acceptance',exclusions:[],claimIds:claims.map((c:any)=>c.id)},claims,scenes:[...story.shots.map((s:any,i:number)=>({id:s.id,role:['hook','mechanism','example'][i],title:'TEST ONLY',narration:s.narration,visual:s.visual,onScreenText:[],claimIds:s.claimIds,estimatedSeconds:4,transitionToNext:'TEST ONLY',execution:{kind:'supported-story',adapter:'http',storyTaskId:'$SCENE_STORY_TASK_ID',expectedGraphHash:'$SCENE_STORY_GRAPH_HASH',shotIds:[s.id]}})),{id:'gap',role:'limitation',title:'Unverified',narration:'TEST ONLY unproduced',visual:'TEST ONLY',onScreenText:[],claimIds:[],estimatedSeconds:2,transitionToNext:'TEST ONLY',execution:{kind:'needs-evidence',reason:'No runtime observation',missingEvidence:'Measured output'}},{id:'closing',role:'closing',title:'Pending',narration:'TEST ONLY unproduced',visual:'TEST ONLY',onScreenText:[],claimIds:[],estimatedSeconds:2,transitionToNext:'',execution:{kind:'needs-adapter',reason:'Not implemented',requiredCapability:'New capability'}}],openQuestions:['Semantic review pending']};
 const run={schemaVersion:'repository-narrative-run-author/2.0',profile:'complete-technical-preview/1.0',captureTaskId:f.first.source.taskId,bindingSha256:f.first.source.bindingSha256,presentation:'generic',selection:plan.scenes.map((s:any)=>s.execution.kind==='supported-story'?{kind:'story-slice',sceneId:s.id,slices:[{shotId:s.id,startFrame:0,endFrame:120}]}:{kind:'placeholder',sceneId:s.id,frames:60}),speech:story.shots.map((s:any)=>({sceneId:s.id,captions:[{startChar:0,endChar:[...s.narration].length,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}))};
 return{storyJson:JSON.stringify(story),narrativeJson:JSON.stringify(plan),animationJson:JSON.stringify(animation),runJson:JSON.stringify(run)};
}
async function fileBytes(root:string):Promise<string>{let out='';for(const n of await readdir(root)){const p=join(root,n);if((await lstat(p)).isDirectory())out+=await fileBytes(p);else out+=(await readFile(p)).toString('utf8');}return out;}


export {signal,testKey,env,base,mock,completion,started,fixture,fileBytes};
