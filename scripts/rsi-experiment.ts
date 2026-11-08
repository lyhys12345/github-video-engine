import {readFile} from 'node:fs/promises';
import {freezeExperiment,reviewDecision,verifyFrozenPacket} from '../src/workflow/rsi-experiment.js';
const [command,spec,report]=process.argv.slice(2);
if(!spec||!['freeze','review'].includes(command??''))throw Error('Usage: node --import tsx scripts/rsi-experiment.ts freeze INPUT.json | review OPERATOR.json REPORT.json');
const input=JSON.parse(await readFile(spec,'utf8'));
console.log(JSON.stringify(command==='freeze'?await freezeExperiment(input):reviewDecision(JSON.parse(await readFile(report!,'utf8')),await verifyFrozenPacket(spec)),null,2));
