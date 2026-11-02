import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {sha256,canonical} from '../src/core/util.js';
import {StorySchema} from '../src/contracts/story.js';
import {compileAnimation} from '../src/story-planner/animation.js';

// Authored, evidence-grounded excerpt adaptations. No model or target repository runs.
const definitions={
 rea:{title:'REA：从画面找到规则',kind:'rule-build',min:45,max:60,claims:['handoff','rule','rebuild'],phases:[
  ['hook','为什么越跑越快？','这个小恐龙，为什么越跑越快？光看画面，很难知道。',['rule']],
  ['inspect','跟着线索找代码','REA 的官方案例，拿到了网页加载的 index.js。',['handoff']],
  ['connect','找到更新条件','沿着代码看，规则就出现了：没撞上、速度还没到上限，',['rule']],
  ['execute','一次更新，加一点','每更新一次，就加一点。起步是六，每次加零点零零一，不到十三，就继续加速。',['rule']],
  ['execute','规则驱动游戏','把这条规则放进教学游戏，障碍物就越跑越快。',['rule','rebuild']],
  ['test','切换成手动控制','再切成手动调速，拖动滑杆，快慢就由你控制。',['rebuild']],
  ['resolve','线索交给助手','这里，REA 提供程序线索，助手根据线索重建演示。',['handoff','rebuild']],
  ['resolve','找到规则之后','找到一条规则，不等于复制整个游戏；绘制、跳跃和碰撞，还需要重新实现。',['rebuild']],
 ]},
 rembg:{title:'rembg：留下同一个主体',kind:'mask-apply',min:25,max:40,claims:['predict','apply','background','quality-inference'],phases:[
  ['hook','怎样只留下主体？','一张图，怎样只留下主体？',['predict']],
  ['inspect','模型先预测蒙版','rembg 先让模型预测前景蒙版。',['predict']],
  ['inspect','白色保留，黑色透明','白色区域保留，黑色区域变透明。',['apply']],
  ['connect','同一蒙版对准原图','把这张蒙版盖回原图，',['apply']],
  ['execute','背景透明，主体留下','背景消失，主体留下。注意，同一个主体，没有重新画一遍。',['apply']],
  ['test','换个背景，检查边缘','它现在可以放到新的背景里。放大边缘，再检查有没有多留或漏掉的细节。',['background','quality-inference']],
  ['resolve','处理原理示意','这里用合成插画演示处理原理，并没有实际运行模型。',['apply']],
 ]},
} as const;
const outputRoot=process.argv[2]??'work/continuous-explainer-v1/inputs';
await mkdir(outputRoot,{recursive:true});
await mkdir('examples/continuous-explainer-v1',{recursive:true});
await mkdir('reviews/continuous-explainer-v1',{recursive:true});
for(const name of ['rea','rembg'] as const){
 const d=definitions[name],base=`work/asset-closure-v1/actual/${name}/bundle`,original=await readFile(join(base,'story.json')),old=JSON.parse(original.toString('utf8')),oldManifest=await readFile(join(base,'manifest.json'));
 const story=StorySchema.parse({...old,id:`${name}-continuous-v1`,name:d.title,shots:d.phases.map(([scene,label,narration,claimIds],i)=>({id:`beat-${i+1}`,beat:i===0?'hook':scene==='resolve'?'closing':scene==='test'?'example':'mechanism',narration,visual:`持续的同一场景与主体；${label}。${old.evidence.disclosure}`,claimIds:[...claimIds],visualSeconds:0,holdSeconds:.2,transitionSeconds:0}))});
 const animation={schemaVersion:'1.0',storyId:story.id,shots:story.shots.map(s=>({shotId:s.id,objects:[{id:'subject',label:'连续主体',visual:name==='rea'?'runner':'cutout',kind:'state'}],actions:[{kind:'emphasize',target:'subject',start:.1,end:.9,claimIds:s.claimIds}]}))};
 const plan={schemaVersion:'1.0',id:`${name}-continuous-v1`,title:d.title,kind:d.kind,presentation:'continuous-explainer',styleAssetPath:'assets/visual-style.json',durationBounds:{minSeconds:d.min,maxSeconds:d.max},sourceShotIds:story.shots.map(s=>s.id),claimIds:d.claims,phases:d.phases.map(([scene,label,captionText])=>({scene,label,captionText})),labels:{source:name==='rea'?'官方案例中的 index.js':'合成原图与蒙版',result:name==='rea'?'可调速教学重建':'透明主体与新背景',disclosure:name==='rea'?'官方案例原理示意 · 助手演绎 · 教学重建 · 时间压缩':'合成插画与蒙版示意 · 未运行 rembg 模型'},...(name==='rea'?{rule:{from:6,to:12,conditionMax:13,acceleration:.001,basis:'原代码 SPEED 6 / ACCELERATION .001 / speed < 13；演示终点12、更新节奏及手动速度轨迹均为作者选择，不是实测或硬钳位。'}}:{})};
 const out=join(outputRoot,name,'bundle');
 try{await stat(out);throw Error('Versioned bundle exists: '+out);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 await mkdir(out,{recursive:true});
 const files:{path:string;sha256:string;bytes:number}[]=[];
 const put=async(path:string,bytes:Buffer)=>{await mkdir(join(out,path,'..'),{recursive:true});await writeFile(join(out,path),bytes,{flag:'wx'});files.push({path,sha256:sha256(bytes),bytes:bytes.length});};
 const json=async(path:string,value:unknown)=>put(path,Buffer.from(JSON.stringify(value,null,2)));
 const sourceProvenance=JSON.parse(await readFile(join(base,'provenance.json'),'utf8'));
 for(const source of sourceProvenance.sources){const bytes=await readFile(join(base,source.path));if(sha256(bytes)!==source.sha256)throw Error('Source snapshot changed');await put(source.path,bytes);}
 await json('story.json',story);await json('animation.json',animation);await json('compiled.json',compileAnimation(story,animation));
 await json('assets/visual-style.json',{schemaVersion:'1.0',subjectColor:'#ef9a70',backdropColor:'#527eae'});
 await json('adaptation.json',{schemaVersion:'1.0',sourceStorySha256:sha256(original),sourceManifestSha256:sha256(oldManifest),scriptStatus:'authored-adaptation-of-current-grounded-story',sourceStoryPath:`${base}/story.json`,claims:story.shots.map(s=>({shotId:s.id,claimIds:s.claimIds})),notes:name==='rea'?['Official example grounds loaded index.js and rule; assistant workflow is instructional inference.','Auto condition tests speed < 13 before adding; never claim exact clamp.','Rendering/jump/collision are rewritten teaching implementation.']:['Same original pixels masked; no model execution.','New background use and edge checks are disclosed instructional inference.']});
 await json('provenance.json',{...sourceProvenance,storyId:story.id,scope:'continuous-authored-teaching-illustration-not-observed-execution',adaptation:'adaptation.json',voice:'external-current-generation-binding-required'});
 await json('manifest.json',{schemaVersion:'1.0',kind:'experimental-story-asset-pack-v1',taskId:sha256(canonical({story,animation,files})),review:'pending',scope:'bounded continuous explainer source closure; not full film',files:[...files]});
 await writeFile(`examples/continuous-explainer-v1/${name}-story.json`,JSON.stringify(story,null,2));
 await writeFile(`reviews/continuous-explainer-v1/${name}-visual-plan.json`,JSON.stringify(plan,null,2));
 await writeFile(join(outputRoot,`${name}-narration.txt`),story.shots.map(s=>s.narration).join(''));
 console.log(JSON.stringify({name,out,narration:story.shots.map(s=>s.narration).join(''),phases:plan.phases.length}));
}
