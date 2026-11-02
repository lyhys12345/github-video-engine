import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sha256} from '../src/core/util.js';
import {StorySchema} from '../src/contracts/story.js';
import {VisualPlanSchema,validateSegmentNarration} from '../src/short-segment/plan.js';
const receipt=JSON.parse(await readFile('work/chen-current-voice/generation-receipt.json','utf8'));
for(const name of ['rea','rembg']){
 const plan=VisualPlanSchema.parse(JSON.parse(await readFile(`reviews/chen-segments-v1/${name}-visual-plan.json`,'utf8'))),bundlePath=resolve(`work/asset-closure-v1/actual/${name}/bundle`),story=StorySchema.parse(JSON.parse(await readFile(`${bundlePath}/story.json`,'utf8'))),transcript=String(receipt[`${name}Text`]);
 validateSegmentNarration(story,plan,transcript);
 const path=resolve(`work/chen-current-voice/${name}.mp3`),hash=sha256(await readFile(path)),input={schemaVersion:'1.0',bundlePath,visualPlanPath:resolve(`reviews/chen-segments-v1/${name}-visual-plan.json`),generationReceiptPath:resolve('work/chen-current-voice/generation-receipt.json'),voice:{path,sha256:hash,transcript,provider:receipt.provider,voiceLabel:receipt.voiceLabel,approvalBasis:'Owner-selected Chen; fresh exact current narration generated in free account UI; original speed; listening pending'}};
 await writeFile(`work/chen-current-voice/${name}-segment-input.json`,JSON.stringify(input,null,2));console.log(JSON.stringify({name,sha256:hash,scriptMatches:true}));
}
