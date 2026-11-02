import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sha256} from '../src/core/util.js';
import {StorySchema} from '../src/contracts/story.js';
import {VisualPlanSchema,validateSegmentNarration} from '../src/short-segment/plan.js';
const receiptPath=resolve('work/chen-continuous-voice/generation-receipt.json'),receipt=JSON.parse(await readFile(receiptPath,'utf8'));
for(const name of ['rea','rembg']){
 const bundlePath=resolve(`work/continuous-explainer-v1/inputs/${name}/bundle`),visualPlanPath=resolve(`reviews/continuous-explainer-v1/${name}-visual-plan.json`),story=StorySchema.parse(JSON.parse(await readFile(`${bundlePath}/story.json`,'utf8'))),plan=VisualPlanSchema.parse(JSON.parse(await readFile(visualPlanPath,'utf8'))),transcript=String(receipt[`${name}Text`]);
 validateSegmentNarration(story,plan,transcript);
 const path=resolve(`work/chen-continuous-voice/${name}.mp3`),input={schemaVersion:'1.0',bundlePath,visualPlanPath,generationReceiptPath:receiptPath,voice:{path,sha256:sha256(await readFile(path)),transcript,provider:receipt.provider,voiceLabel:receipt.voiceLabel,approvalBasis:'Owner-approved Chen free UI generation, exact newly adapted narration; original speed; perceptual acceptance pending'}};
 await writeFile(`work/continuous-explainer-v1/inputs/${name}-segment-input.json`,JSON.stringify(input,null,2),{flag:'wx'});
 console.log(JSON.stringify({name,sha256:input.voice.sha256,exactText:true}));
}
