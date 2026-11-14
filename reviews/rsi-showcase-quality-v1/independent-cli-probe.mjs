import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
const fixture=resolve(process.argv[2]);
const reference=JSON.parse(await readFile(join(fixture,'crop-quality.json'),'utf8'));
const workspace=join(fixture,'workspace'),data=join(workspace,'state');
const scratch=await mkdtemp(join(process.env.GVE_REVIEW_SCRATCH??tmpdir(),'gve-quality-cli-independent-'));
function snapshot(){const db=new DatabaseSync(join(data,'tasks.sqlite'),{readOnly:true});try{return JSON.stringify({schema:db.prepare("SELECT type,name,sql FROM sqlite_master ORDER BY type,name").all(),version:db.prepare('PRAGMA user_version').get(),tasks:db.prepare('SELECT * FROM tasks ORDER BY id').all(),events:db.prepare('SELECT * FROM task_events ORDER BY seq').all(),usage:db.prepare('SELECT * FROM usage_events ORDER BY rowid').all()})}finally{db.close()}}
function run(args,expectedError){const child=spawnSync(process.execPath,['--import','tsx','src/cli.ts','showcase','quality',...args],{cwd:process.env.GVE_REVIEW_REPO??process.cwd(),encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:10000000,env:{...process.env,GVE_FFMPEG:'missing-quality-probe-ffmpeg',GVE_FFPROBE:'missing-quality-probe-ffprobe',GVE_BROWSER:'missing-quality-probe-browser',GVE_NARRATION_VOICE:'missing-quality-probe-voice'}});if(expectedError){assert.notEqual(child.status,0);assert.match(child.stdout+child.stderr,expectedError);return;}assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout)}
const baselineArgs=['--workspace',workspace,'--task',reference.baseline.renderTaskId],before=snapshot(),pointer=await readFile(join(workspace,'current-showcase.json'));
const first=run(baselineArgs),again=run(baselineArgs),standalone=run(['--data',data,'--task',reference.baseline.renderTaskId]);
assert.deepEqual(first,again);assert.deepEqual(first,standalone);assert.deepEqual(first.baselineComposition,reference.baselineComposition);
const plan=JSON.parse(await readFile(join(fixture,'plan.json'),'utf8')),path=join(scratch,'stale-plan.json');
await writeFile(path,JSON.stringify({...plan,baseline:{...plan.baseline,candidateSha256:'0'.repeat(64)}}));run([...baselineArgs,'--spec',path],/Stale or different/);
await writeFile(path,JSON.stringify({...plan,feedback:{...plan.feedback,videoReviewSha256:'0'.repeat(64)}}));run([...baselineArgs,'--spec',path],/digest does not belong/);
await writeFile(path,JSON.stringify({...plan,shots:[{...plan.shots[0],expectedShotSha256:'0'.repeat(64)}]}));run([...baselineArgs,'--spec',path],/Unknown or stale/);
run([...baselineArgs,'--out',join(scratch,'forbidden-output')],/USAGE/);
const proposed=run([...baselineArgs,'--spec',join(fixture,'plan.json')]);assert.deepEqual(proposed.baselineComposition,first.baselineComposition);assert.ok(proposed.proposedComposition);assert.equal(proposed.revisionPlanSha256,createHash('sha256').update(await readFile(join(fixture,'plan.json'))).digest('hex'));
assert.equal(snapshot(),before);assert.deepEqual(await readFile(join(workspace,'current-showcase.json')),pointer);
console.log(JSON.stringify({status:'PASS',fixture,candidateSha256:reference.baseline.candidateSha256,checks:['deterministic repeat','workspace equals standalone branch','saved final media composition agrees','exact plan digest','valid proposed composition','stale baseline rejected','unbound review rejected','stale shot rejected','forbidden output option rejected','media and voice tools unavailable','task events usage schema version and pointer unchanged'],scratch},null,2));
