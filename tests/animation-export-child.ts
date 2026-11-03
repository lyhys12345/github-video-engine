import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
// Deterministic test barrier at the real atomic publication boundary.
const original=fs.link;
fs.link=async function(from,to){
 if(String(from).includes('.animation-export-')){
  process.send?.({staged:String(from),destination:String(to)});
  await delay(60_000);
  throw new Error('Test parent did not terminate the export child.');
 }
 return original(from,to);
};
syncBuiltinESMExports();
const {exportAnimationTask}=await import('../src/story-planner/animation-task.js');
await exportAnimationTask(process.argv[2]!,process.argv[3]!,process.argv[4]!);
