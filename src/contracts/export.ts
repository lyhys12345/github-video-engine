import {mkdir, writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {VideoSpecSchema, SceneSpecSchema, ProjectSchema} from './video.js';
import {ArtifactSchema, JobSchema, JobStepSchema, EvaluationResultSchema} from './runtime.js';
import {RepositorySnapshotSchema,PlanningPackageSchema,DelegationSchema} from './planning.js';
import {ProductionPackageSchema,ReadthroughSchema} from './production.js';
await mkdir('schemas', {recursive: true});
for (const [name, schema] of Object.entries({VideoSpec: VideoSpecSchema, SceneSpec: SceneSpecSchema, Project: ProjectSchema, Artifact: ArtifactSchema, Job: JobSchema, JobStep: JobStepSchema, EvaluationResult: EvaluationResultSchema,RepositorySnapshot:RepositorySnapshotSchema,PlanningPackage:PlanningPackageSchema,DelegationAttestation:DelegationSchema,ProductionPackage:ProductionPackageSchema,Readthrough:ReadthroughSchema})) {
  await writeFile(`schemas/${name}.v1.schema.json`, JSON.stringify({...z.toJSONSchema(schema, {target: 'draft-2020-12'}), $id: `urn:github-video-engine:${name}:1.0`, $comment: 'Zod also enforces cross-field invariants; see docs/contracts.md.'}, null, 2) + '\n');
}
