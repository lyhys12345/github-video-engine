import {z} from 'zod';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomInt} from 'node:crypto';
import {canonical,sha256} from '../core/util.js';

const Hash=z.string().regex(/^[a-f0-9]{64}$/);
const Modality=z.enum(['script','frames','audio','continuous-av']);
export const Experiment=z.strictObject({schemaVersion:z.literal('rsi-experiment/1.0'),id:z.string().min(1),
 requirements:z.string().min(1),rubric:z.string().min(1),requiredModalities:z.array(Modality).min(1),
 baselineSha256:Hash,candidateSha256:Hash,requirementsSha256:Hash,rubricSha256:Hash,
 attempt:z.number().int().min(1).max(3),previousExperimentSha256:Hash.optional()});
export type ExperimentValue=z.infer<typeof Experiment>;
export function verifyExperiment(raw:unknown){const e=Experiment.parse(raw);if(sha256(e.requirements)!==e.requirementsSha256||sha256(e.rubric)!==e.rubricSha256)throw Error('Changed requirements or rubric');return e;}
export function nextExperiment(previous:ExperimentValue,candidate:Buffer){const p=verifyExperiment(previous);return Experiment.parse({...p,candidateSha256:sha256(candidate),attempt:p.attempt+1,previousExperimentSha256:sha256(canonical(p))});}
export function reviewDecision(raw:unknown,eRaw:unknown){
 const e=verifyExperiment(eRaw),r=z.strictObject({experimentSha256:Hash,reviewer:z.string().min(1),verdict:z.enum(['PASS','REVISE','UNVERIFIED']),coverage:z.array(Modality),findings:z.array(z.string().min(1)),preferred:z.enum(['A','B','tie','neither'])}).parse(raw);
 if(r.experimentSha256!==sha256(canonical(e)))throw Error('Review belongs to another experiment');
 if(e.requiredModalities.some(m=>!r.coverage.includes(m)))return {status:'UNVERIFIED',reason:'Required modality was not reviewed'};
 if(r.verdict==='REVISE'&&!r.findings.length)throw Error('Revision needs actionable findings');
 if(r.verdict==='PASS'&&r.findings.length)throw Error('Resolve findings before PASS');
 return {status:r.verdict==='REVISE'&&e.attempt===3?'STOP':r.verdict,preferred:r.preferred};
}
export async function verifyFrozenPacket(operatorPath:string){
 const {dirname}=await import('node:path');const operator=JSON.parse(await readFile(operatorPath,'utf8'));const e=verifyExperiment(operator.experiment);
 if(operator.experimentSha256!==sha256(canonical(e))||!['A','B'].includes(operator.baselineLabel)||operator.candidateLabel!==(operator.baselineLabel==='A'?'B':'A'))throw Error('Invalid operator mapping');
 const packet=join(dirname(operatorPath),'reviewer');const assignment=JSON.parse(await readFile(join(packet,'assignment.json'),'utf8'));
 if(assignment.experimentSha256!==operator.experimentSha256||assignment.requirements!==e.requirements||assignment.rubric!==e.rubric||canonical(assignment.requiredModalities)!==canonical(e.requiredModalities))throw Error('Changed assignment');
 for(const [label,hash]of [[operator.baselineLabel,e.baselineSha256],[operator.candidateLabel,e.candidateSha256]])if(sha256(await readFile(join(packet,label+'.txt')))!==hash)throw Error('Changed reviewer artifact');
 return e;
}
/** Reviewer gets identical filenames and no baseline/candidate mapping. The private manifest stays with the operator. */
export async function freezeExperiment(input:{id:string;baseline:string;candidate:string;requirements:string;rubric:string;out:string;requiredModalities:z.infer<typeof Modality>[]}){
 const [baseline,candidate,requirements,rubric]=await Promise.all([readFile(input.baseline),readFile(input.candidate),readFile(input.requirements,'utf8'),readFile(input.rubric,'utf8')]);
 const e=verifyExperiment({schemaVersion:'rsi-experiment/1.0',id:input.id,requirements,rubric,requiredModalities:input.requiredModalities,baselineSha256:sha256(baseline),candidateSha256:sha256(candidate),requirementsSha256:sha256(requirements),rubricSha256:sha256(rubric),attempt:1});
 const out=resolve(input.out);await mkdir(out);const packet=join(out,'reviewer');await mkdir(packet);
 const swap=!!randomInt(2);await writeFile(join(packet,'A.txt'),swap?candidate:baseline,{flag:'wx'});await writeFile(join(packet,'B.txt'),swap?baseline:candidate,{flag:'wx'});
 const digest=sha256(canonical(e));await writeFile(join(packet,'assignment.json'),canonical({experimentSha256:digest,requirements,rubric,requiredModalities:e.requiredModalities,instruction:'Review A and B independently. Return preferred A/B/tie/neither, verdict, actual coverage and actionable findings. Do not infer unavailable modalities.'}),{flag:'wx'});
 await writeFile(join(out,'operator-manifest.json'),canonical({experiment:e,experimentSha256:digest,baselineLabel:swap?'B':'A',candidateLabel:swap?'A':'B'}),{flag:'wx'});
 return {packet,experimentSha256:digest};
}
