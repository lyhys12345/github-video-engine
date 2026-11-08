import {it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {freezeExperiment,verifyExperiment,nextExperiment,reviewDecision,verifyFrozenPacket} from '../src/workflow/rsi-experiment.js';
import {canonical,sha256} from '../src/core/util.js';
it('freezes exact bytes, anonymizes labels and prevents overwriting a previous experiment',async()=>{
 const root=await mkdtemp(join(tmpdir(),'rsi-'));for(const [name,text]of Object.entries({base:'old',candidate:'new',requirements:'audience',rubric:'clarity'}))await writeFile(join(root,name),text);
 const input={id:'test',baseline:join(root,'base'),candidate:join(root,'candidate'),requirements:join(root,'requirements'),rubric:join(root,'rubric'),out:join(root,'frozen'),requiredModalities:['script'] as const};
 const result=await freezeExperiment({...input,requiredModalities:[...input.requiredModalities]});const manifest=JSON.parse(await readFile(join(input.out,'operator-manifest.json'),'utf8'));
 expect(sha256(await readFile(join(result.packet,manifest.baselineLabel+'.txt')))).toBe(manifest.experiment.baselineSha256);expect(await readFile(join(result.packet,'assignment.json'),'utf8')).not.toContain('baselineLabel');await expect(freezeExperiment({...input,requiredModalities:['script']})).rejects.toThrow();
 const e=manifest.experiment;expect(()=>verifyExperiment({...e,rubric:'easier'})).toThrow();
 const receipt={experimentSha256:sha256(canonical(e)),reviewer:'judge',verdict:'PASS',coverage:[],findings:[],preferred:'B'};expect(reviewDecision(receipt,e).status).toBe('UNVERIFIED');expect(reviewDecision({...receipt,coverage:['script']},e).status).toBe('PASS');
 const two=nextExperiment(e,Buffer.from('revision')),three=nextExperiment(two,Buffer.from('revision2'));expect(()=>nextExperiment(three,Buffer.from('four'))).toThrow();expect(()=>reviewDecision(receipt,two)).toThrow('another experiment');
 await verifyFrozenPacket(join(input.out,'operator-manifest.json'));await writeFile(join(result.packet,'A.txt'),'tampered');await expect(verifyFrozenPacket(join(input.out,'operator-manifest.json'))).rejects.toThrow('Changed reviewer artifact');
});
