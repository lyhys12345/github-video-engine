import {mkdir,writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {EvidenceGraphSchema,CompiledPlanSchema} from '../contracts/evidence-plan.js';
await mkdir('schemas/evidence-planner-v1',{recursive:true});
for(const [name,schema]of [['evidence-graph',EvidenceGraphSchema],['compiled-plan',CompiledPlanSchema]]as const)await writeFile(`schemas/evidence-planner-v1/${name}.schema.json`,JSON.stringify(z.toJSONSchema(schema),null,2));
