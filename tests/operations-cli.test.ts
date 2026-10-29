import {test,expect,afterEach} from 'vitest';
import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {JobDatabase} from '../src/orchestrator/database.js';
import {parseSpec} from '../src/contracts/video.js';
import {canonical,sha256} from '../src/core/util.js';
const dirs:string[]=[];
const root=resolve('.'),entry=join(root,'src/cli.ts'),loader=join(root,'node_modules/tsx/dist/loader.mjs');
afterEach(async()=>{for(const dir of dirs.splice(0))await rm(dir,{recursive:true,force:true,maxRetries:3});});
async function scratch(){const dir=await mkdtemp(join(tmpdir(),'gve-audit-cli-'));dirs.push(dir);return dir;}
function cli(cwd:string,args:string[]){return spawnSync(process.execPath,['--import',pathToFileURL(loader).href,entry,...args],{cwd,encoding:'utf8',windowsHide:true,timeout:15000,env:{...process.env,GVE_BROWSER:join(cwd,'missing-browser'),GVE_FFMPEG:join(cwd,'missing-ffmpeg'),GVE_FFPROBE:join(cwd,'missing-ffprobe')}});}
async function populated(){const dir=await scratch(),spec=parseSpec(JSON.parse(await readFile(join(root,'examples/demo.v1.json'),'utf8')));const db=new JobDatabase(dir);try{const environment={fixture:'CLI audit test: queued real SQLite job, no rendering'};db.create({spec,specDirectory:dir,environment,inputFingerprint:sha256(canonical({spec,environment}))});}finally{db.close();}return dir;}
test('real audit CLI reads queued SQLite state without requiring browser/media tools and exports a new report',async()=>{
 const dir=await populated(),out=join(await scratch(),'report.json'),dbBefore=sha256(await readFile(join(dir,'jobs.sqlite')));
 const result=cli(dir,['audit','--data',dir,'--out',out]);expect(result.status,result.stderr).toBe(0);const report=JSON.parse(result.stdout);expect(report.schemaVersion).toBe('operations-audit/1.3');expect(report.ok).toBe(true);expect(JSON.parse(await readFile(out,'utf8'))).toEqual(report);expect(sha256(await readFile(join(dir,'jobs.sqlite')))).toBe(dbBefore);expect((await readdir(dir)).some(n=>['workflow','tasks.sqlite','production.sqlite'].includes(n))).toBe(false);
});
test('audit refuses missing data, irrelevant flags and extra positionals without creating default stores',async()=>{
 const dir=await scratch();for(const args of [['audit'],['audit','extra','--data',dir],['audit','--data',dir,'--repo','https://github.com/example/unused']]){const result=cli(dir,args);expect(result.status,result.stderr).not.toBe(0);expect(JSON.parse(result.stderr.slice(result.stderr.indexOf('{'))).error.code).toBe('USAGE');}expect(await readdir(dir)).toEqual([]);
});
test('audit report export never overwrites an existing file',async()=>{
 const dir=await populated(),out=join(await scratch(),'existing.json');await writeFile(out,'keep this user report');const result=cli(dir,['audit','--data',dir,'--out',out]);expect(result.status).toBe(1);expect(result.stderr).toContain('AUDIT_EXPORT_EXISTS');expect(await readFile(out,'utf8')).toBe('keep this user report');
});
