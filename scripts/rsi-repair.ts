import {startRepair,applyRepair,repairStatus,recordRepairReview} from '../src/workflow/rsi-repair.js';
const [command,root,first,second,third]=process.argv.slice(2);if(!root)throw Error('Usage: rsi-repair.ts start ROOT OPERATOR | status ROOT | apply ROOT PREVIOUS_RECORD_SHA REVIEW CANDIDATE');
console.log(JSON.stringify(command==='start'?await startRepair(root,first!):command==='status'?await repairStatus(root):command==='record-review'?await recordRepairReview(root,first!,second!):command==='apply'?await applyRepair(root,first!,second!,third!):(()=>{throw Error('Unknown command');})(),null,2));

