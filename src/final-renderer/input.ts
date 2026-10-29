import {z} from 'zod';
import {ProductionPackageSchema,ReadthroughSchema,type ProductionPackage,type Readthrough} from '../../src/contracts/production.js';

export const FinalInputSchema=z.object({
 project:z.object({id:z.string().regex(/^[a-z][a-z0-9-]{0,63}$/),name:z.string().trim().min(1).max(40),repository:z.string().regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),commit:z.string().regex(/^[a-f0-9]{40}$/)}).strict(),
 design:ProductionPackageSchema,readthrough:ReadthroughSchema,captions:z.record(z.string(),z.string().trim().min(1).max(200)),
 font:z.object({path:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),browser:z.string().min(1),
}).strict().superRefine((v,ctx)=>{
 const bad=(message:string)=>ctx.addIssue({code:'custom',message});
 if(v.project.id!==v.design.projectId||v.project.id!==v.readthrough.projectId||v.design.planRevision!==v.readthrough.planRevision)bad('Project/plan/readthrough binding mismatch');
 if(v.design.scenes.length!==v.readthrough.lines.length||v.design.scenes.some((s,i)=>s.scriptId!==v.readthrough.lines[i]?.id))bad('Scene order must exactly match measured voice line order');
 if(v.design.scenes.some((s,i)=>s.layout==='path'&&v.readthrough.lines[i]!.allocatedFrames/v.readthrough.fps<5))bad('The four-node portrait path needs at least five measured seconds');
 const keys=Object.keys(v.captions).sort(),ids=v.readthrough.lines.map(l=>l.id).sort();if(JSON.stringify(keys)!==JSON.stringify(ids))bad('Caption keys must exactly cover measured scene lines');
});
export type FinalRenderInput=z.infer<typeof FinalInputSchema>;
export type FrameProps={project:FinalRenderInput['project'];design:ProductionPackage;readthrough:Readthrough;captions:Record<string,string>;variant:'clean'|'captioned';font:{family:'GVE Noto Sans SC';file:'gve-noto.ttf';sha256:string}};
export type FinalSample={sceneId:string;frame:number;localFrame:number;phase:'start'|'reveal'|'hold'|'transition';path:string};
export type FinalRenderResult={clean:string;captioned:string;cover:string;samples:FinalSample[];frames:number;fps:number;width:1080;height:1920;progress:string;metadata:string;workerPid:number;font:{sha256:string;family:string;legacyRequestedFamily:string;loaded:boolean};source:{recipe:'portrait-cascade-derived-v2';upstreamCommit:'43bd349a136651865ecfa6ea1cf012f6e957d304'};silent:true};
