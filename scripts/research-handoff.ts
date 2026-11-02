import {writeFile} from 'node:fs/promises';
import {buildResearchHandoff} from '../src/story-planner/research-handoff.js';
const [spec,root,out,...extra]=process.argv.slice(2);
if(!spec||!root||!out||extra.length)throw new Error('Usage: pnpm exec tsx scripts/research-handoff.ts <story.json> <source-root> <new-output.json>');
const result=await buildResearchHandoff(spec,root);
await writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({fingerprint:result.fingerprint,review:result.review,shots:result.story.shots.length})+'\n');
