import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {compileStory} from '../src/story-planner/compile.ts';
const root=process.argv[2]??'work/bom-source',mode=process.argv[3]??'initial';
if(!['initial','measured','edit'].includes(mode))throw Error('Use initial, measured or edit. This is an explicitly authored experiment, not an automatic repository interpreter.');
const packetRoot=join(root,'authoring',(await readdir(join(root,'authoring')))[0]);
const p=join(packetRoot,(await readdir(packetRoot)).find(x=>x.startsWith('.asset-staging')||x.startsWith('.s-')));
const hand=JSON.parse(await readFile(join(p,'agent-handoff.json'),'utf8'));
if(hand.binding.repository!=='https://github.com/sindresorhus/strip-bom'||hand.binding.commit!=='c691ec5724be8bb61e9df269a2577fcba41353f7'||hand.read.sources.length!==2||hand.read.sources[0].sha256!=='e0df571ee107f319e0abf7f2ec911cd7ebedc1b46e007a44b91b9bd7a8fda8c2'||hand.read.sources[1].sha256!=='a664d1b90954d79ecf4845a5572ccd5a80118df1752ae826c52818d041226d9f')throw Error('This authored experiment requires the exact documented strip-bom capture; it is not a generic source interpreter.');
const story=JSON.parse(await readFile(join(p,'drafts/story.json'),'utf8'));
const plan=JSON.parse(await readFile(join(p,'drafts/narrative.json'),'utf8'));
const lines=Object.fromEntries(await Promise.all(hand.read.sources.map(async s=>[s.id,(await readFile(join(p,s.path),'utf8')).split('\n')])));
const claim=(id,statement,source,start,end)=>({id,statement,kind:'documented',citations:[{document:source,startLine:start,endLine:end,quote:lines[source].slice(start-1,end).join('\n')}],rationale:'固定提交的文档或源码直接支持；语义解释仍待独立审阅。'});
const claims=[claim('purpose','项目从字符串中去掉 UTF-8 字节顺序标记。','source-1',1,3),claim('mechanism','首字符代码为 FEFF 时返回去掉首字符的字符串，否则返回原字符串。','source-2',6,12),claim('example','README 展示带 FEFF 前缀的 unicorn 得到 unicorn。','source-1',18,21),claim('boundary','函数只接受字符串，且仅检查首字符。','source-2',1,12)];
const data=[
['hook','开头的隐藏标记','这个小库处理字符串开头的字节顺序标记。它的作用范围很小。','purpose','带前缀字符串','移除开头标记',6],
['mechanism','检查首字符','源码检查首字符的代码值。遇到指定标记，就从第二个字符开始返回。','mechanism','带开头标记','去掉首字符',8],
['example','文档中的例子','文档例子给单词加上标记前缀，去掉后留下原单词。本实验未运行例子。','example','文档中的前缀','原单词',8],
['limitation','范围与边界','它拒绝非字符串，只检查开头。不要把它理解为清理所有位置的标记。','boundary','仅接受字符串','仅检查开头',8],
['closing','回到使用判断','关键是先看开头，再决定切掉一位。这里是来源示意，事实与听感待审。','mechanism','首字符检查','条件切片',8]
];
// Explicit editorial revisions made after the actual first measurements.
if(mode!=='initial')data.forEach((scene,i)=>scene[6]=[8,9,10,9,10][i]);
if(mode==='edit')data[3][2]='仅首字符参与判断；非字符串会报错。这不是全局字符清理器。';
story.id='strip-bom-story';story.name='strip-bom 固定来源技术预览';
story.evidence={...story.evidence,schemaVersion:'1.1',id:'strip-bom-evidence',name:story.name,audience:'了解基础JavaScript字符串操作的开发者',claims,objects:[{id:'input',label:'带开头标记的字符串',kind:'code'},{id:'output',label:'移除首字符的字符串',kind:'code'}],actors:[{id:'tool',label:'首字符检查与切片',role:'tool'}],operations:[{id:'strip',kind:'document-transform',input:'input',output:'output',dependsOn:[],claimIds:['mechanism'],actorIds:['tool'],parameters:{}}],disclosure:'会话Agent依据固定README与源码创作；示意动画而非目标执行；事实、听感、连续视听与最终验收待审。'};
story.timing={fps:30,chineseCharsPerSecond:8,wordsPerSecond:5};
story.shots=data.map(([role,title,narration,c,left,right,seconds])=>({id:'scene-'+role,beat:role,narration,visual:`${title}：${left}与${right}的来源示意，未执行目标。`,claimIds:[c],visualSeconds:seconds,holdSeconds:0,transitionSeconds:0}));
plan.brief={title:story.name,audience:story.evidence.audience,question:'这个小函数究竟删什么，又不删什么？',thesis:'它有条件地移除字符串开头的一位，不是任意位置的通用清理器。',scope:'仅固定提交README与index.js，5章完整技术预览。',exclusions:['不运行目标代码或示例','不测性能','不声称清理任意位置标记'],claimIds:claims.map(c=>c.id)};
plan.claims=claims.map(c=>({id:c.id,statement:c.statement,basis:{kind:'documented'},citations:c.citations.map(q=>({sourceId:q.document,sourceSha256:story.evidence.sources.find(s=>s.id===q.document).sha256,startLine:q.startLine,endLine:q.endLine,quote:q.quote}))}));
plan.scenes=data.map(([role,title,narration,c,left,right,seconds],i)=>({id:'scene-'+role,role,title,narration,visual:story.shots[i].visual,onScreenText:[title,'来源示意，未执行，待审'],claimIds:[c],estimatedSeconds:seconds,transitionToNext:i===data.length-1?'':'继续下一章来源解释。',execution:{kind:'supported-story',adapter:'document-flow/1.0',storyTaskId:'$SCENE_STORY_TASK_ID',expectedGraphHash:'$SCENE_STORY_GRAPH_HASH',shotIds:['scene-'+role]},...(role==='mechanism'?{}:{visualContext:{schemaVersion:'narrative-scene-context/1.0',title,question:'这一章解释什么',explanation:left+'到'+right,boundary:'来源示意，未执行，待审',claimIds:[c]}})}));
plan.openQuestions=['未执行目标仓库，无运行测量；语义、听感与词级对齐待审。'];
const animation={schemaVersion:'narrative-scene-animations/1.0',storyId:story.id,scenes:data.map(([role,title,narration,c,left,right])=>({sceneId:'scene-'+role,profile:role==='mechanism'?'causal-operation/1.0':'legacy-animation/1.0',animation:role==='mechanism'?{schemaVersion:'1.2',storyId:story.id,shots:[{shotId:'scene-'+role,operationId:'strip',start:.08,arrive:.3,processed:.65,end:.9}]}:{schemaVersion:'1.0',storyId:story.id,shots:[{shotId:'scene-'+role,objects:[{id:'left',label:left,kind:'document',visual:'code'},{id:'right',label:right,kind:'document',visual:'code'}],actions:[{kind:'reveal',target:'left',start:0,end:.2,claimIds:[c]},{kind:'compare',source:'left',target:'right',start:.25,end:.65,claimIds:[c]},{kind:'emphasize',target:'right',start:.7,end:.9,claimIds:[c]}]}]}}))};
const compiled=compileStory(story);
const run={schemaVersion:'repository-narrative-run-author/2.0',profile:'complete-technical-preview/1.0',captureTaskId:hand.startTaskId,bindingSha256:hand.bindingSha256,presentation:'generic',selection:compiled.shots.map(s=>({kind:'story-slice',sceneId:s.id,slices:[{shotId:s.id,startFrame:0,endFrame:s.endFrame-s.startFrame}]})),speech:story.shots.map(s=>({sceneId:s.id,captions:[{startChar:0,endChar:[...s.narration].length,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}))};
const author=join(root,mode==='edit'?'author-edited':'author');
await mkdir(author,{recursive:true});for(const[name,value]of Object.entries({story,narrative:plan,animation,run}))await writeFile(join(author,name+'.json'),JSON.stringify(value,null,2));
console.log(JSON.stringify({author:'actual session Agent',commit:hand.binding.commit,sources:hand.read.sources,seconds:compiled.totalFrames/30+2}));
