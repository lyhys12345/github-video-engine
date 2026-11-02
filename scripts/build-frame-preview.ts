import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {captureEvidence} from '../src/story-planner/runtime.js';
import {compileAnimation} from '../src/story-planner/animation.js';
import {renderFramePreview} from '../src/story-planner/frame-preview.js';
import {sha256} from '../src/core/util.js';
const out=resolve(process.argv[2]??'work/causal-preview-v3');
for(const name of ['rea','rembg']){
 const snapshot=await captureEvidence(`examples/story-planner-v1/${name}.json`,'.');
 const animation=JSON.parse(await readFile(`examples/story-planner-v1/${name}-animation.json`,'utf8'));
 const plan=compileAnimation(snapshot.graph,animation),dir=join(out,name);await mkdir(join(dir,'sources'),{recursive:true});
 const sources=[];for(const source of snapshot.sources){const location=`sources/${source.id}.txt`;await writeFile(join(dir,location),source.bytes,{flag:'wx'});const declared=snapshot.graph.evidence.sources.find(s=>s.id===source.id)!;sources.push({...declared,path:location,sha256:sha256(source.bytes),bytes:source.bytes.length});}
 const provenance={schemaVersion:'1.0',scope:'experimental-authored-illustration-not-observed-execution',sources,claims:snapshot.graph.evidence.claims};
 const provenanceBytes=JSON.stringify(provenance,null,2)+'\n';await writeFile(join(dir,'provenance.json'),provenanceBytes,{flag:'wx'});
 const frames=[];for(const shot of plan.shots)for(const fraction of [.1,.5,.9]){const frame=shot.startFrame+Math.floor((shot.endFrame-shot.startFrame-1)*fraction),file=`${shot.shotId}-${fraction}.svg`;const svg=renderFramePreview(plan,frame).replace('<metadata>','<metadata>provenance.json SHA-256 '+sha256(provenanceBytes)+'; ');await writeFile(join(dir,file),svg,{flag:'wx'});frames.push({file,frame,sha256:sha256(svg)});}
 await writeFile(join(dir,'manifest.json'),JSON.stringify({schemaVersion:'1.0',provenance:{path:'provenance.json',sha256:sha256(provenanceBytes)},frames},null,2)+'\n',{flag:'wx'});
 await writeFile(join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><title>Experimental causal frame sequence</title><body style="background:#101827;color:white"><h1>实验示意，非执行结果</h1><a href="provenance.json">来源、分类与哈希</a>'+frames.map(f=>`<figure style="display:inline-block"><img width="240" src="${f.file.replace('.svg','.png')}" alt="frame ${f.frame}"><figcaption>${f.file} frame ${f.frame}</figcaption></figure>`).join('')+'</body>',{flag:'wx'});
}
