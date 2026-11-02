import {readFile,writeFile,mkdir,cp,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {sha256,canonical} from '../src/core/util.js';
import {compileAnimation} from '../src/story-planner/animation.js';
import {StorySchema} from '../src/contracts/story.js';
import {VisualPlanSchema,validateSegmentNarration} from '../src/short-segment/plan.js';
const root=resolve('work/continuous-explainer-v1/revisions'),base=resolve('work/continuous-explainer-v1/inputs/rembg/bundle');
const input=JSON.parse(await readFile('work/continuous-explainer-v1/inputs/rembg-segment-input.json','utf8')),receipt=JSON.parse(await readFile(input.generationReceiptPath,'utf8'));
const previousOutputPath=resolve(process.argv[2]??'examples/continuous-explainer-v1/rembg-v3');
await mkdir(root,{recursive:true});
const original=JSON.parse(await readFile(join(base,'manifest.json'),'utf8')),originalFiles=[{path:'manifest.json',sha256:sha256(await readFile(join(base,'manifest.json')))},...original.files];
for(const f of originalFiles)if(sha256(await readFile(join(base,f.path)))!==f.sha256)throw Error('Original source closure corrupt');
const json=async(p:string,v:unknown)=>writeFile(p,JSON.stringify(v,null,2));
async function copy(name:string){const dest=join(root,name,'bundle');try{await stat(dest);throw Error('Revision destination exists');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}await mkdir(join(root,name),{recursive:true});await cp(base,dest,{recursive:true,errorOnExist:true,force:false});return dest;}
async function close(bundle:string){const manifest=JSON.parse(await readFile(join(bundle,'manifest.json'),'utf8'));for(const f of manifest.files){const bytes=await readFile(join(bundle,f.path));f.sha256=sha256(bytes);f.bytes=bytes.length;}const story=JSON.parse(await readFile(join(bundle,'story.json'),'utf8')),animation=JSON.parse(await readFile(join(bundle,'animation.json'),'utf8'));manifest.taskId=sha256(canonical({story,animation,files:manifest.files}));manifest.review='new-independent-review-required';await json(join(bundle,'manifest.json'),manifest);}
const narrationBundle=await copy('narration'),story=StorySchema.parse(JSON.parse(await readFile(join(narrationBundle,'story.json'),'utf8'))),animation=JSON.parse(await readFile(join(narrationBundle,'animation.json'),'utf8')),plan=VisualPlanSchema.parse(JSON.parse(await readFile(input.visualPlanPath,'utf8')));
story.shots[0]!.narration='一张图，怎样把背景去掉？';plan.phases[0]!.captionText=story.shots[0]!.narration;
if(story.shots.map(s=>s.narration).join('')!==receipt.rembgRevisionText)throw Error('Revision generation and exact edited story mismatch');
validateSegmentNarration(story,plan,receipt.rembgRevisionText);
await json(join(narrationBundle,'story.json'),story);await json(join(narrationBundle,'compiled.json'),compileAnimation(story,animation));
const adaptation=JSON.parse(await readFile(join(narrationBundle,'adaptation.json'),'utf8'));adaptation.revision={kind:'narration-opening-edit',previousBundleManifestSha256:originalFiles[0]!.sha256,oldOpening:'一张图，怎样只留下主体？',newOpening:story.shots[0]!.narration};await json(join(narrationBundle,'adaptation.json'),adaptation);await close(narrationBundle);
const narrationPlanPath=join(root,'narration','visual-plan.json');await json(narrationPlanPath,plan);
const path=resolve('work/chen-continuous-voice/rembg-revision.mp3'),narrationInput={...input,bundlePath:narrationBundle,visualPlanPath:narrationPlanPath,previousOutputPath,voice:{...input.voice,path,sha256:sha256(await readFile(path)),transcript:receipt.rembgRevisionText}};
await json(join(root,'narration','input.json'),narrationInput);
// Forged caller text cannot make the previous audio valid for the new words.
await json(join(root,'narration','stale-voice-input.json'),{...narrationInput,voice:{...input.voice,transcript:receipt.rembgRevisionText}});
const assetBundle=await copy('asset'),style=JSON.parse(await readFile(join(assetBundle,'assets/visual-style.json'),'utf8'));style.subjectColor='#70d2c0';await json(join(assetBundle,'assets/visual-style.json'),style);await close(assetBundle);
await json(join(root,'asset','input.json'),{...input,bundlePath:assetBundle,previousOutputPath});
const tamperBundle=await copy('tamper');await json(join(tamperBundle,'assets/visual-style.json'),style);
await json(join(root,'tamper','input.json'),{...input,bundlePath:tamperBundle,previousOutputPath});
for(const f of originalFiles)if(sha256(await readFile(join(base,f.path)))!==f.sha256)throw Error('Original source closure changed by fixture preparation');
await json(join(root,'fixture-receipt.json'),{schemaVersion:'1.0',base,previousOutputPath,originalFiles,originalSourceBytesPreserved:true,fixtures:{narration:'narration/input.json',staleVoice:'narration/stale-voice-input.json',asset:'asset/input.json',tamper:'tamper/input.json'},expectations:{narration:'new current audio, exact changed narration and actual rerender required',staleVoice:'must reject receipt mismatch despite caller text matching new narration',asset:'actual subjectColor change consumed by frame and MP4',tamper:'must reject source closure hash mismatch'},execution:'fixtures only; actual rejection and media renders must be recorded separately'});
console.log(JSON.stringify({root,previousOutputPath,narrationText:receipt.rembgRevisionText,originalSourceBytesPreserved:true}));
