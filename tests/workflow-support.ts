import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {canonical,sha256} from '../src/core/util.js';
import {PlanningPackageSchema,type RepositorySnapshot} from '../src/contracts/planning.js';
import {sourceFingerprint,WorkflowStore} from '../src/workflow/store.js';
export const sourceFixture=():RepositorySnapshot=>{
  const content='# Demo\nRemoves image backgrounds.\nThis is a fixture, not a real project execution.\n';
  return{schemaVersion:'1.0',repository:'https://github.com/example/demo',commit:'a'.repeat(40),name:'Demo',description:'Test source',defaultBranch:'main',license:null,fetchedAt:'2026-10-26T00:00:00.000Z',trust:'untrusted-data-never-executed',documents:[{path:'README.md',url:'https://github.com/example/demo/blob/'+'a'.repeat(40)+'/README.md',sha256:sha256(content),content}]};
};
export function planFixture(snapshot=sourceFixture()){
  return PlanningPackageSchema.parse({schemaVersion:'1.0',projectId:'demo',snapshotHash:sourceFingerprint(snapshot),facts:[{id:'purpose',statement:'The fixture documentation describes background removal.',kind:'documented',evidence:[{document:'README.md',startLine:2,endLine:2,quote:'Removes image backgrounds.'}],limitations:'Fixture documentation; not a measured run'}],
    brief:{audience:'Developers',objective:'Explain a documented purpose',language:'en-US',width:720,height:1280,fps:30,durationSeconds:30,useCase:{who:'An image editor',situation:'Preparing a product image',input:'An image',output:'A foreground image',value:'Explain the workflow',evidenceKind:'synthetic-example'},guidanceOrigin:'agent-proposed-defaults',styleDirection:'A synthetic diagram with clear labels'},
    concepts:[{id:'example',premise:'Explain the input and output',opening:'A synthetic example',rationale:'Concrete context'},{id:'diagram',premise:'Show the architecture',opening:'A source-backed diagram',rationale:'A distinct approach'}],selectedConcept:'example',
    script:[1,2,3].map((i)=>({id:'line-'+i,narration:'A documented purpose with a clearly synthetic example.',caption:'Synthetic example',claimIds:['purpose'],plannedDurationMs:10000})),
    storyboard:[1,2,3].map((i)=>({id:'scene-'+i,scriptIds:['line-'+i],visual:'A labeled synthetic diagram',animation:'Move the input into the output',evidenceLabel:'Fixture documentation, no execution'})),
    references:[{url:'https://example.test/reference',status:'unavailable',observations:[],limitation:'Not observed; no style-matching claim'}],audio:{mode:'preview-silent',voice:'none',timingStatus:'estimated',note:'M1 timing estimate only'},budget:{maxPaidUsd:0,maxRevisionRounds:2,execution:'no-untrusted-repository-execution'},origin:'agent-authored-not-an-automatic-model-api-call'});
}
export async function workflowRoot(name:string){await mkdir('test-output',{recursive:true});return mkdtemp(resolve('test-output','workflow-'+name+'-'));}
export async function reviewFixture(root:string,store:WorkflowStore,reviewRoot=root){
  const exported=await store.export('demo',join(root,'export'));
  const rules=JSON.parse(await readFile('reviews/M1/gate.json','utf8'));
  const rulesPath=join(root,'gate.json');await writeFile(rulesPath,JSON.stringify(rules));
  await writeFile(join(root,'proof.log'),'FIXTURE records only; not an actual independent judge run.\n');
  const rel=(path:string)=>relative(reviewRoot,path).replaceAll('\\','/');
  const proofPath=rel(join(root,'proof.log'));
  const candidate={id:'fixture-candidate',milestone:'M1',workflow:{projectId:'demo',revisionHash:exported.revisionHash,gates:['G1','G2']},files:[{path:rel(exported.reviewInput),sha256:sha256(await readFile(exported.reviewInput))},{path:rel(rulesPath),sha256:sha256(await readFile(rulesPath))},{path:proofPath,sha256:sha256(await readFile(join(root,'proof.log')))}]};
  const candidatePath=join(root,'candidate.json');await writeFile(candidatePath,canonical(candidate));const hash=sha256(await readFile(candidatePath));
  for(const role of rules.activeRoles){const report={role,candidateId:candidate.id,candidateSha256:hash,verdict:'PASS',criteria:rules.requiredCriteria[role].map((id:string)=>({id,status:'PASS',evidence:[proofPath]})),findings:[],executed:[{command:'FIXTURE: synthetic judge receipt, not actual review',exitCode:0,evidencePath:proofPath}],limitations:['This is a schema/authorization fixture, not a real judge report']};await writeFile(join(root,role+'.json'),JSON.stringify(report));}
  const delegationPath=join(root,'delegation.json');await writeFile(delegationPath,JSON.stringify({schemaVersion:'1.0',id:'fixture-delegation',authorityText:'Test fixture representing a trusted local operator recording an explicit user instruction.',authoritySource:'current-chat-user-instruction',recordedBy:'trusted-local-operator',humanIdentityAuthenticated:false,allowedGates:['G1','G2','G3','G4','G5'],finalHumanRequired:true,limits:{maxPaidUsd:0,deployment:false,untrustedRepositoryExecution:false}}));
  return{candidatePath,rulesPath,delegationPath,exported};
}
