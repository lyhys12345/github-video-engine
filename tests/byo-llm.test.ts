import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {it,expect} from 'vitest';
import {canonical,sha256} from '../src/core/util.js';
import {parseByoConfig,callByoAuthor,resolveByoEndpoint} from '../src/providers/byo-llm.js';
import {authorNarrativeViaApi,narrativeApiAuthorCommand,continueApiNarrative} from '../src/workflow/narrative-api-author.js';
import {runNarrativeWorkspace} from '../src/workflow/narrative-run.js';
import {sourceFixture,workflowRoot} from './workflow-support.js';
import {signal,testKey,env,base,mock,completion,started,fixture,fileBytes} from './byo-api-support.js';

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
it('local continuation rejects changed author bytes, wrong stages and API flags without another provider request',async()=>{
 const f=await started(),answer=await fixture(f),s=await mock((_q,res)=>res.end(JSON.stringify(completion(answer))));
 try{const out=join(f.root,'api-author-guard');await authorNarrativeViaApi(f.root,s.config,out,true,signal,env);await expect(continueApiNarrative(f.root,out,'planning' as any,signal)).rejects.toThrow('explicit local');await expect(narrativeApiAuthorCommand(['explanation','api-continue'],{workspace:f.root,out,through:'speech','enable-api':true},signal)).rejects.toThrow('api-continue');const p=join(out,'author/narrative.json'),bytes=await readFile(p);await writeFile(p,Buffer.concat([bytes,Buffer.from('\n')]));await expect(continueApiNarrative(f.root,out,'speech',signal)).rejects.toThrow('bytes changed');expect(s.count).toBe(1);await writeFile(p,bytes);const report=join(out,'api-report.json'),old=await readFile(report),changed=JSON.parse(old.toString());changed.source.bindingSha256='f'.repeat(64);await writeFile(report,canonical(changed));await expect(continueApiNarrative(f.root,out,'speech',signal)).rejects.toThrow('author/source differs');expect(s.count).toBe(1);await writeFile(report,old);
 }finally{await s.close();}
});
