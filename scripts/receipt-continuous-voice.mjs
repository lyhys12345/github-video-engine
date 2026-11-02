import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='work/chen-continuous-voice',hash=b=>createHash('sha256').update(b).digest('hex');
const reaText=await readFile('work/continuous-explainer-v1/inputs/rea-narration.txt','utf8'),rembgText=await readFile('work/continuous-explainer-v1/inputs/rembg-narration.txt','utf8'),rembgRevisionText=rembgText.replace('一张图，怎样只留下主体？','一张图，怎样把背景去掉？');
const recordings=[];
for(const [name,text,before,after] of [['rea',reaText,9341,9127],['rembg',rembgText,9127,8989],['rembg-revision',rembgRevisionText,8989,8851]]){
 const path=`${root}/${name}.mp3`,bytes=await readFile(path),probe=execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],{encoding:'utf8'}),parsed=JSON.parse(probe);
 await writeFile(`${root}/${name}.ffprobe.json`,probe);
 recordings.push({name,path:`${name}.mp3`,sha256:hash(bytes),bytes:bytes.length,text,measuredSeconds:Number(parsed.format.duration),creditsBefore:before,creditsAfter:after,creditsUsed:before-after,probe:`${name}.ffprobe.json`,probeSha256:hash(Buffer.from(probe)),transcriptVerification:'coordinator exact submitted-text declaration; not independently transcribed or heard'});
}
const receipt={schemaVersion:'1.0',scope:'two bounded continuous explainers plus one actual narration-edit proof',provider:'ElevenLabs account UI',voiceLabel:'Chen Mandarin Chinese',model:'Eleven v4',stability:.5,similarity:.75,cloneStrength:0,rate:'original',reaText,rembgText,rembgRevisionText,creditsBefore:9341,creditsAfterRea:9127,creditsAfterRembg:8989,creditsAfterRembgRevision:8851,creditsUsed:490,paidAction:false,identityBasis:'coordinator reports same approved selected voice and settings; screenshot independently inspected shows Chen Mandarin Chinese, Eleven v4 and matching slider positions',observationBasis:{coordinator:'root generated and saved all three MP3s and reported balance sequence in this chat',screenshot:{path:'generation-ui.png',sha256:hash(await readFile(`${root}/generation-ui.png`)),shows:'revision exact text, Chen Mandarin Chinese, Eleven v4, sliders at .5/.75/0 positions, MP3 44.1kHz/128kbps and final balance 8851; does not itself prove earlier balance steps or transcribe earlier clips'}},recordings,speechContentReview:'pending; no listening or independent speech transcription',voiceId:'not recorded; not inferred'};
await writeFile(`${root}/generation-receipt.json`,JSON.stringify(receipt,null,2));
console.log(JSON.stringify(recordings.map(({name,measuredSeconds,sha256})=>({name,measuredSeconds,sha256})),null,2));
