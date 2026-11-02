import {ArtifactStore} from '../src/assets/store.js';
import {EngineError} from '../src/core/errors.js';
import {planAssetPack} from '../src/story-planner/asset-pack.js';
const controller=new AbortController(),original=ArtifactStore.prototype.commit;let first=true;
ArtifactStore.prototype.commit=async function(...args){const artifact=await original.apply(this,args);if(first){first=false;process.send?.({taskId:args[3],committed:artifact.sha256});await new Promise<void>(done=>process.once('message',()=>{controller.abort(new EngineError('CANCELLED','Actual asset-pack process cancellation after first CAS commit','cancelled'));done();}));}return artifact;};
try{await planAssetPack(process.argv[2]!,process.argv[3]!,process.argv[4]!,process.argv[5]!,process.argv[6]!,controller.signal);}catch(e){process.send?.({cancelled:true,message:String(e)});}
