import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {compileStory} from '../src/story-planner/compile.ts';
const root='work/mri',mode='initial';
if(!['initial','measured','edit'].includes(mode))throw Error('Use initial, measured or edit. This is an explicitly authored experiment, not an automatic repository interpreter.');
const packetRoot=join(root,'authoring',(await readdir(join(root,'authoring')))[0]);
const p=join(packetRoot,(await readdir(packetRoot)).find(x=>x.startsWith('.asset-staging')||x.startsWith('.s-')));
const hand=JSON.parse(await readFile(join(p,'agent-handoff.json'),'utf8'));
if(hand.binding.repository!=='https://github.com/lukeed/mri'||hand.binding.commit!=='62b9ce4f25e1f7b476c99858c20882d86c010085'||hand.read.sources.length!==2)throw Error('Wrong captured source');
const story=JSON.parse(await readFile(join(p,'drafts/story.json'),'utf8'));
const plan=JSON.parse(await readFile(join(p,'drafts/narrative.json'),'utf8'));
const lines=Object.fromEntries(await Promise.all(hand.read.sources.map(async s=>[s.id,(await readFile(join(p,s.path),'utf8')).split('\n')])));
const claim=(id,statement,source,start,end)=>({id,statement,kind:'documented',citations:[{document:source,startLine:start,endLine:end,quote:lines[source].slice(start-1,end).join('\n')}],rationale:'固定提交的文档或源码直接支持；语义解释仍待独立审阅。'});
const claims=[claim('purpose','mri扫描命令行标志和参数。','source-1',1,7),claim('mechanism','mri接受参数数组并返回对象，源码维护普通参数列表并依次读取参数。','source-1',45,52),claim('example','文档给出参数--foo和bar产生foo值为bar的对象示例。','source-1',72,79),claim('boundary','文档强调unknown与alias同时配置，而源码strict开关按unknown是否定义设置；差异未实测。','source-1',90,98)];
claims[1].citations.push({document:'source-2',startLine:64,endLine:78,quote:lines['source-2'].slice(63,78).join('\n')});
claims[3].kind='inference';claims[3].rationale='静态对照文档条件和源码strict设置；未运行目标，未裁定所有配置的行为。';claims[3].citations.push({document:'source-2',startLine:22,endLine:26,quote:lines['source-2'].slice(21,26).join('\n')},{document:'source-2',startLine:62,endLine:62,quote:lines['source-2'][61]});
const data=[
['hook','参数怎样变成对象','命令行给出一串参数。这个库把标志和参数整理成对象。','purpose','命令行参数','解析结果对象',9],
['mechanism','数组与结果','接口接受参数数组，源码依次扫描，并保留普通参数列表。动画不是执行。','mechanism','参数数组','解析结果对象',10],
['example','文档例子','文档例子把标志和值整理成对象。这里只引用文档，没有运行例子。','example','参数数组','解析对象',10],
['limitation','需要保留的疑点','未知参数的文档条件与源码开关有差异。本片保留这个疑点，未运行验证。','boundary','文档中的条件','源码中的开关',10],
['closing','来源与验证的边界','看懂输入和对象，也要留意文档与源码的边界。事实和听感仍待最终审阅。','mechanism','输入与输出关系','证据与待验证项',10]
];
// Explicit editorial revisions made after the actual first measurements.
if(mode!=='initial')data.forEach((scene,i)=>scene[6]=[8,9,10,9,10][i]);
if(mode==='edit')data[3][2]='仅首字符参与判断；非字符串会报错。这不是全局字符清理器。';
story.id='mri-story';story.name='mri参数解析固定来源预览';
story.evidence={...story.evidence,schemaVersion:'1.1',id:'mri-evidence',name:story.name,audience:'了解基础JavaScript字符串操作的开发者',claims,objects:[{id:'input',label:'参数数组',kind:'code'},{id:'output',label:'解析结果对象',kind:'code'}],actors:[{id:'tool',label:'命令行解析函数',role:'tool'}],operations:[{id:'parse',kind:'document-transform',input:'input',output:'output',dependsOn:[],claimIds:['mechanism'],actorIds:['tool'],parameters:{}}],disclosure:'会话Agent依据固定README与源码创作；示意动画而非目标执行；事实、听感、连续视听与最终验收待审。'};
story.timing={fps:30,chineseCharsPerSecond:8,wordsPerSecond:5};
story.shots=data.map(([role,title,narration,c,left,right,seconds])=>({id:'scene-'+role,beat:role,narration,visual:`${title}：${left}与${right}的来源示意，未执行目标。`,claimIds:[c],visualSeconds:seconds,holdSeconds:0,transitionSeconds:0}));
plan.brief={title:story.name,audience:story.evidence.audience,question:'参数数组怎样进入对象，又有什么证据边界？',thesis:'固定文档和源码解释参数到对象的关系；未知参数的条件差异保留待验证。',scope:'固定提交readme与src/index.js，5章完整技术预览；不模拟全部分支。',exclusions:['不运行目标代码或示例','不测性能','不对文档与源码条件差异作运行结论'],claimIds:claims.map(c=>c.id)};
plan.claims=claims.map(c=>({id:c.id,statement:c.statement,basis:c.kind==='inference'?{kind:'inference',reasoning:c.rationale}:{kind:'documented'},citations:c.citations.map(q=>({sourceId:q.document,sourceSha256:story.evidence.sources.find(s=>s.id===q.document).sha256,startLine:q.startLine,endLine:q.endLine,quote:q.quote}))}));
plan.scenes=data.map(([role,title,narration,c,left,right,seconds],i)=>({id:'scene-'+role,role,title,narration,visual:story.shots[i].visual,onScreenText:[title,'来源示意，未执行，待审'],claimIds:[c],estimatedSeconds:seconds,transitionToNext:i===data.length-1?'':'继续下一章来源解释。',execution:{kind:'supported-story',adapter:'document-flow/1.0',storyTaskId:'$SCENE_STORY_TASK_ID',expectedGraphHash:'$SCENE_STORY_GRAPH_HASH',shotIds:['scene-'+role]},...(role==='mechanism'?{}:{visualContext:{schemaVersion:'narrative-scene-context/1.0',title,question:'这一章解释什么',explanation:left+'到'+right,boundary:'来源示意，未执行，待审',claimIds:[c]}})}));
plan.openQuestions=['unknown与alias条件的文档/源码差异未实测；语义、听感与词级对齐待审。'];
const animation={schemaVersion:'narrative-scene-animations/1.0',storyId:story.id,scenes:data.map(([role,title,narration,c,left,right])=>({sceneId:'scene-'+role,profile:role==='mechanism'?'causal-operation/1.0':'legacy-animation/1.0',animation:role==='mechanism'?{schemaVersion:'1.2',storyId:story.id,shots:[{shotId:'scene-'+role,operationId:'parse',start:.08,arrive:.3,processed:.65,end:.9}]}:{schemaVersion:'1.0',storyId:story.id,shots:[{shotId:'scene-'+role,objects:[{id:'left',label:left,kind:'document',visual:'code'},{id:'right',label:right,kind:'document',visual:'code'}],actions:[{kind:'reveal',target:'left',start:0,end:.2,claimIds:[c]},{kind:'compare',source:'left',target:'right',start:.25,end:.65,claimIds:[c]},{kind:'emphasize',target:'right',start:.7,end:.9,claimIds:[c]}]}]}}))};
const compiled=compileStory(story);
const run={schemaVersion:'repository-narrative-run-author/2.0',profile:'complete-technical-preview/1.0',captureTaskId:hand.startTaskId,bindingSha256:hand.bindingSha256,presentation:'generic',selection:compiled.shots.map(s=>({kind:'story-slice',sceneId:s.id,slices:[{shotId:s.id,startFrame:0,endFrame:s.endFrame-s.startFrame}]})),speech:story.shots.map(s=>({sceneId:s.id,captions:[{startChar:0,endChar:[...s.narration].length,startSample:0,endSample:'$FULL_RECORDING_SAMPLES'}]}))};
const author=join(root,mode==='edit'?'author-edited':'author');
await mkdir(author,{recursive:true});for(const[name,value]of Object.entries({story,narrative:plan,animation,run}))await writeFile(join(author,name+'.json'),JSON.stringify(value,null,2));
console.log(JSON.stringify({author:'actual session Agent',commit:hand.binding.commit,sources:hand.read.sources,seconds:compiled.totalFrames/30+2}));
