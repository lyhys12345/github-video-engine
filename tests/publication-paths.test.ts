import {it,expect} from 'vitest';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publishAssetFiles,RECEIPT_PUBLICATION} from '../src/story-planner/asset-pack.js';
import {sha256} from '../src/core/util.js';

it.runIf(process.platform==='win32')('deep Windows receipt export publishes and resumes without manual workspace relocation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-path-'));
 try{
  const parent=join(root,'w'.repeat(Math.max(1,195-root.length-1)));await mkdir(parent);
  const out=join(parent,'export'),data=join(root,'data'),files=new Map([['nested/source.txt',Buffer.from('fixed source')],['index.html',Buffer.from('experimental pending')]]);
  const id=sha256('deep-export'),signal=new AbortController().signal;
  const first=await publishAssetFiles(data,id,out,files,signal,RECEIPT_PUBLICATION);
  expect(first.bundle.length).toBeLessThan(260);
  expect(await readFile(join(first.bundle,'nested/source.txt'),'utf8')).toBe('fixed source');
  const marker=JSON.parse(await readFile(join(out,'.asset-pack-owner.json'),'utf8'));
  expect(marker.pathLayout).toBe('compact-v1');expect(marker.token).toMatch(/^[a-f0-9-]{36}$/);
  const second=await publishAssetFiles(data,id,out,files,signal,RECEIPT_PUBLICATION);
  expect(second).toMatchObject({bundle:first.bundle,reused:true});
  await expect(publishAssetFiles(data,sha256('unrelated'),out,files,signal,RECEIPT_PUBLICATION)).rejects.toMatchObject({code:'ASSET_EXPORT_EXISTS'});
  await writeFile(join(first.bundle,'nested/source.txt'),'changed');
  const repaired=await publishAssetFiles(data,id,out,files,signal,RECEIPT_PUBLICATION);
  expect(repaired).toMatchObject({reused:false});expect(repaired.bundle).not.toBe(first.bundle);
  expect(await readFile(join(repaired.bundle,'nested/source.txt'),'utf8')).toBe('fixed source');
  expect(await readFile(join(first.bundle,'nested/source.txt'),'utf8')).toBe('changed');
 }finally{await rm(root,{recursive:true,force:true,maxRetries:3});}
});

it('ordinary receipt exports retain historical names and exact-byte reuse',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gve-path-old-'));
 try{
  const files=new Map([['index.html',Buffer.from('pending')]]),out=join(root,'out'),data=join(root,'data'),id=sha256('ordinary');
  const first=await publishAssetFiles(data,id,out,files,new AbortController().signal,RECEIPT_PUBLICATION);
  expect(first.bundle).toContain('.asset-staging-');
  const second=await publishAssetFiles(data,id,out,files,new AbortController().signal,RECEIPT_PUBLICATION);
  expect(second).toMatchObject({bundle:first.bundle,reused:true});
 }finally{await rm(root,{recursive:true,force:true,maxRetries:3});}
});
