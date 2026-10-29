import {expect,it} from 'vitest';
import {mkdtemp,mkdir,writeFile,lstat,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {command} from '../src/core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../src/core/owned-runtime.js';
import * as compatibility from '../src/final-renderer/owned-runtime.js';

it('core ownership helper and M3 compatibility entry expose the same functions',()=>{expect(compatibility.createOwnedRuntimeTmp).toBe(createOwnedRuntimeTmp);expect(compatibility.cleanupOwnedRuntimeTmp).toBe(cleanupOwnedRuntimeTmp);});
it('trusted command env changes only the actual child and retains normal inherited runtime environment',async()=>{
 const owner=await mkdtemp(join(tmpdir(),'gve-env-')),runtime=await createOwnedRuntimeTmp(owner),before={TEMP:process.env.TEMP,TMP:process.env.TMP,TMPDIR:process.env.TMPDIR,custom:process.env.GVE_RUNTIME_TEST};
 try{const value=JSON.parse(await command(process.execPath,['-e',"const fs=require('fs'),os=require('os'),p=require('path');const own=fs.mkdtempSync(p.join(os.tmpdir(),'test-'));fs.writeFileSync(p.join(own,'payload'),'own');console.log(JSON.stringify({tmp:os.tmpdir(),custom:process.env.GVE_RUNTIME_TEST,hasPath:!!process.env.PATH}));"],{env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory,GVE_RUNTIME_TEST:'child-only'}}));expect(value).toMatchObject({tmp:runtime.directory,custom:'child-only',hasPath:true});expect({TEMP:process.env.TEMP,TMP:process.env.TMP,TMPDIR:process.env.TMPDIR,custom:process.env.GVE_RUNTIME_TEST}).toEqual(before);await cleanupOwnedRuntimeTmp(owner);expect(await lstat(runtime.directory).then(()=>true,()=>false)).toBe(false);expect(await lstat(runtime.directory+'.owner').then(()=>true,()=>false)).toBe(false);expect(JSON.parse(await readFile(join(owner,'runtime-owner.json'),'utf8')).directory).toBe(runtime.directory);}finally{await cleanupOwnedRuntimeTmp(owner);await rm(owner,{recursive:true,force:true});}
});
