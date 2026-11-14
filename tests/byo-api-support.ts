import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {canonical,sha256} from '../src/core/util.js';
import {parseByoConfig,callByoAuthor,resolveByoEndpoint} from '../src/providers/byo-llm.js';
import {authorNarrativeViaApi,narrativeApiAuthorCommand} from '../src/workflow/narrative-api-author.js';
import {runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {sourceFixture,workflowRoot} from './workflow-support.js';
import {narrativeAuthorFixture as fixture} from './narrative-author-fixture.js';
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
async function fileBytes(root:string):Promise<string>{let out='';for(const n of await readdir(root)){const p=join(root,n);if((await lstat(p)).isDirectory())out+=await fileBytes(p);else out+=(await readFile(p)).toString('utf8');}return out;}


export {signal,testKey,env,base,mock,completion,started,fixture,fileBytes};
