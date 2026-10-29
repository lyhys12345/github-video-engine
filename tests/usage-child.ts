// Real crash fixture: callback is simulated local work, no media/provider is invoked.
import {TaskRunner} from '../src/orchestrator/tasks.js';
const runner=new TaskRunner(process.argv[2]!);
await runner.run('crash-fixture',{projectId:'crash'},async()=>{
  process.stdout.write('READY\n');
  await new Promise(()=>{});
  return{value:true,outputs:[]};
},new AbortController().signal,{leaseMs:250,accounting:{provider:'windows-sapi-offline',ratePolicy:'local-zero-v1'}});
