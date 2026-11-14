#!/usr/bin/env node
import {readFile,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(process.env.GVE_TEST_CATALOG_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'..'));
process.chdir(root);
const catalog=JSON.parse(await readFile('tests/catalog.json','utf8'));
async function inventory(dir){
 const files=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const name=dir+'/'+entry.name;
  if(entry.isSymbolicLink())throw Error('Linked test inventory entry is unsupported: '+name);
  if(entry.isDirectory())files.push(...await inventory(name));
  else if(/\.test\.ts$|\.node\.ts$|_test\.py$/.test(entry.name))files.push(name);
 }
 return files;
}
const files=(await inventory('tests')).sort();
const entries=Object.values(catalog.suites).flatMap(s=>s.files),duplicates=entries.filter((n,i)=>entries.indexOf(n)!==i);
const missing=files.filter(n=>!entries.includes(n)),stale=entries.filter(n=>!files.includes(n));
if(catalog.schemaVersion!=='test-catalog/1.0'||duplicates.length||missing.length||stale.length){
 console.error(JSON.stringify({error:'TEST_CATALOG',missing,duplicates,stale},null,2));process.exit(1);
}
const group=process.argv[2]??'check';
if(group==='check'){console.log(JSON.stringify({status:'pass',classified:files.length,groups:Object.fromEntries(Object.entries(catalog.suites).map(([k,s])=>[k,s.files.length]))},null,2));process.exit(0);}
const selected=group==='local'?['unit','integration','node']:[group];
async function run(exe,args){
 const code=await new Promise((done,reject)=>{const child=spawn(exe,args,{stdio:'inherit',shell:false,windowsHide:true});child.once('error',reject);child.once('close',done);});
 if(code!==0)process.exit(typeof code==='number'?code:1);
}
for(const name of selected){
 const suite=catalog.suites[name];if(!suite)throw Error('Unknown test suite: '+name);
 if(suite.runner==='vitest')await run(process.execPath,['node_modules/vitest/vitest.mjs','run',...suite.files]);
 else if(suite.runner==='node')await run(process.execPath,['--import','tsx','--test',...suite.files]);
 else if(suite.runner==='python'){for(const file of suite.files)await run(process.env.GVE_TEST_PYTHON??'python',[file]);}
 else throw Error('Unknown runner');
}
