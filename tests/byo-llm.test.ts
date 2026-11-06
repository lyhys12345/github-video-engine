import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {it,expect} from 'vitest';
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

it('defaults off, rejects key-in-config, missing env and CLI missing explicit gate without calls',async()=>{
 expect(()=>parseByoConfig({...base,endpoint:'http://127.0.0.1/v1/chat/completions'},false)).toThrow('explicit --enable-api');
 expect(()=>parseByoConfig({...base,enabled:false,endpoint:'http://127.0.0.1/v1/chat/completions'},true)).toThrow('enabled');
 expect(()=>parseByoConfig({...base,endpoint:'http://127.0.0.1/v1/chat/completions',apiKey:testKey},true)).toThrow('non-secret');
 await expect(narrativeApiAuthorCommand(['explanation','api-author'],{workspace:'missing',spec:'missing',out:'missing'},signal)).rejects.toThrow('enable-api');
 const s=await mock((_q,res)=>res.end('{}'));try{await expect(callByoAuthor(parseByoConfig(s.config,true),{},signal,{})).rejects.toThrow('environment variable');expect(s.count).toBe(0);}finally{await s.close();}
});
it('real local HTTP author response reaches source-bound planning with explicit API provenance and no stored key',async()=>{
 const f=await started(),answer=await fixture(f);const s=await mock((_q,res)=>res.end(JSON.stringify(completion(answer))));
 try{const sourceBefore=await readFile(join(f.root,'source.json')),out=join(f.root,'api-author-mock');const r=await authorNarrativeViaApi(f.root,s.config,out,true,signal,env);
 expect(r.status).toBe('api-authored-planning-complete');expect(r.providerRequests).toBe(1);expect(s.count).toBe(1);expect(s.requests[0].authorization).toBe('Bearer '+testKey);expect(JSON.stringify(s.requests[0].body)).not.toContain(testKey);expect(s.requests[0].body.response_format.json_schema.strict).toBe(true);expect(s.requests[0].body.tools).toBeUndefined();expect(s.requests[0].body.messages[1].content).toContain('untrusted');expect(JSON.stringify(r)).not.toContain(testKey);expect(await fileBytes(out)).not.toContain(testKey);expect(await readFile(join(f.root,'source.json'))).toEqual(sourceBefore);
 const narrative=JSON.parse(await readFile(join(out,'author/narrative.json'),'utf8'));expect(narrative.authorship.kind).toBe('api-model');const pointer=JSON.parse(await readFile(join(f.root,'current-run.json'),'utf8'));expect(JSON.parse(await readFile(join(f.root,pointer.result),'utf8')).status).toBe('checkpoint-complete');
 await expect(authorNarrativeViaApi(f.root,s.config,out,true,signal,env)).rejects.toThrow('never overwritten');expect(s.count).toBe(1);
 }finally{await s.close();}
});
it('denies private endpoints, URL credentials/query, non-loopback HTTP and budget overflow before requests',async()=>{
 const s=await mock((_q,res)=>res.end('{}'));try{for(const endpoint of ['http://localhost/v1/chat/completions','http://169.254.169.254/v1/chat/completions','https://127.0.0.1/v1/chat/completions','https://169.254.169.254/v1/chat/completions','https://user:password@example.com/v1/chat/completions','https://example.com/v1/chat/completions?key=hidden'])await expect(resolveByoEndpoint(parseByoConfig({...s.config,endpoint},true))).rejects.toThrow();
 await expect(callByoAuthor(parseByoConfig({...s.config,inputMicrosPerMillionTokens:1_000_000,maxEstimatedCostMicros:0},true),{},signal,env)).rejects.toThrow('budget');expect(s.count).toBe(0);
 }finally{await s.close();}
});
it('actual CLI parses explicit activation and emits a source-bound planning result against localhost only',async()=>{
 const f=await started(),answer=await fixture(f),s=await mock((_q,res)=>res.end(JSON.stringify(completion(answer))));
 try{const config=join(f.root,'mock-api-config.json');await writeFile(config,JSON.stringify(s.config));const output=await new Promise<string>((resolve,reject)=>{const child=spawn(process.execPath,['--import','tsx','src/cli.ts','explanation','api-author','--workspace',f.root,'--spec',config,'--out',join(f.root,'api-author-cli'),'--enable-api'],{cwd:process.cwd(),env:{...process.env,GVE_LLM_API_KEY:testKey},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(Error('Mock CLI failed: '+stderr+stdout)));});expect(output).not.toContain(testKey);expect(JSON.parse(output).status).toBe('api-authored-planning-complete');expect(s.count).toBe(1);
 }finally{await s.close();}
},20000);
it('never follows redirects or leaks credential-bearing provider errors; never retries',async()=>{
 let stolen=0;const target=await mock((_q,res)=>{stolen++;res.end('{}');});const s=await mock((_q,res)=>{res.writeHead(302,{location:target.config.endpoint});res.end(testKey);});
 try{await expect(callByoAuthor(parseByoConfig(s.config,true),{},signal,env)).rejects.toThrow('body omitted');expect(s.count).toBe(1);expect(stolen).toBe(0);}finally{await s.close();await target.close();}
});
it('rejects credential echoes, truncation, tool calls, extra files, invalid JSON and timed-out responses',async()=>{
 for(const response of [completion({storyJson:testKey,narrativeJson:'{}',animationJson:'{}',runJson:'{}'}),{choices:[{finish_reason:'length',message:{content:'{}'}}]},{choices:[{finish_reason:'stop',message:{content:'{}',tool_calls:[{name:'execute'}]}}]},completion({storyJson:'{}',narrativeJson:'{}',animationJson:'{}',runJson:'{}','../execute.js':'do not run'}),'NOT JSON']){
  const s=await mock((_q,res)=>res.end(typeof response==='string'?response:JSON.stringify(response)));try{let caught='';try{await callByoAuthor(parseByoConfig(s.config,true),{},signal,env);}catch(e){caught=String(e);}expect(caught).not.toContain(testKey);expect(caught).toMatch(/discarded|unsupported|validation|not JSON/);expect(s.count).toBe(1);}finally{await s.close();}
 }
 const hanging=await mock(()=>{});try{await expect(callByoAuthor(parseByoConfig({...hanging.config,timeoutMs:100},true),{},signal,env)).rejects.toThrow('timed out');expect(hanging.count).toBe(1);}finally{await hanging.close();}
});
it('bounds response bytes and refuses credential-containing prompts before any HTTP request',async()=>{
 const s=await mock((_q,res)=>res.end('x'.repeat(4_000_001)));try{await expect(callByoAuthor(parseByoConfig(s.config,true),{},signal,env)).rejects.toThrow('byte limit');expect(s.count).toBe(1);await expect(callByoAuthor(parseByoConfig(s.config,true),{secret:testKey},signal,env)).rejects.toThrow('must not appear');expect(s.count).toBe(1);}finally{await s.close();}
});
it('refuses stale source binding and mismatched API authors before any unapproved author execution',async()=>{
 const f=await started(),answer=await fixture(f),sourcePath=join(f.root,'source.json'),original=await readFile(sourcePath);const changed=JSON.parse(original.toString());changed.bindingSha256='f'.repeat(64);await writeFile(sourcePath,canonical(changed));const s=await mock((_q,res)=>res.end(JSON.stringify(completion(answer))));
 try{await expect(authorNarrativeViaApi(f.root,s.config,join(f.root,'api-author-stale'),true,signal,env)).rejects.toThrow('binding');expect(s.count).toBe(0);await writeFile(sourcePath,original);const plan=JSON.parse(answer.narrativeJson);plan.authorship={kind:'session-agent'};answer.narrativeJson=JSON.stringify(plan);const out=join(f.root,'api-author-invalid');await expect(authorNarrativeViaApi(f.root,s.config,out,true,signal,env)).rejects.toThrow('No automatic retry');expect(s.count).toBe(1);expect(JSON.parse(await readFile(join(out,'api-report.json'),'utf8')).errorCode).toBe('API_AUTHOR_VALIDATION');expect(await fileBytes(out)).not.toContain(testKey);expect(await readdir(out)).toEqual(['api-report.json']);
 }finally{await s.close();}
});
