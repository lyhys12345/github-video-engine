import{it,expect}from'vitest';import{validateShowcase,distributeShots}from'../src/renderer/showcase-reel-contract.js';import{sha256}from'../src/core/util.js';
const text='这是批准的旁白。',bytes=Buffer.from(JSON.stringify({lines:[['line1',text]],shots:['官方演示']})),asset={path:'x',sha256:'a'.repeat(64)},approval={schemaVersion:'script-owner-authorization/1.0',scriptSha256:sha256(bytes),authority:'unit-test only'},crop={x:0,y:0,width:1,height:1},m={schemaVersion:'showcase-reel/1.0',theme:'paper',projectLabel:'Example',script:{...asset,sha256:sha256(bytes)},approval:asset,font:asset,narration:[{...asset,id:'line1',transcriptSha256:sha256(text),receipt:asset,captionChunks:[text]}],media:[{...asset,id:'demo',type:'video',width:800,height:674,frames:260,fps:30}],beats:[{id:'line1',shots:[{mediaId:'demo',weight:1,crop,startFrame:40,endFrame:100}]}]};
it('binds exact approved narration and validates real-source frame bounds',()=>{expect(validateShowcase(bytes,approval,m).script.lines[0]![1]).toBe(text);expect(()=>validateShowcase(bytes,{...approval,scriptSha256:'b'.repeat(64)},m)).toThrow('approval');expect(()=>validateShowcase(bytes,approval,{...m,narration:[{...m.narration[0],captionChunks:['替换台词']}]})).toThrow('differs');expect(()=>validateShowcase(bytes,approval,{...m,beats:[{id:'line1',shots:[{...m.beats[0]!.shots[0],endFrame:300}]}]})).toThrow('frame range');});
it('rejects fabricated media identities, crop overflow and duplicate narration',()=>{expect(()=>validateShowcase(bytes,approval,{...m,media:[...m.media,...m.media]})).toThrow('Duplicate');expect(()=>validateShowcase(bytes,approval,{...m,beats:[{id:'line1',shots:[{...m.beats[0]!.shots[0],crop:{...crop,x:.2}}]}]})).toThrow('Crop exceeds');expect(()=>validateShowcase(bytes,approval,{...m,narration:[...m.narration,...m.narration]})).toThrow('once in order');});
it('allocates all original speech frames exactly with no hidden inter-shot gap',()=>{const s=distributeShots([{weight:3},{weight:1},{weight:3}],17,301);expect(s[0]!.start).toBe(17);expect(s.at(-1)!.end).toBe(318);expect(s.reduce((n,s)=>n+s.end-s.start,0)).toBe(301);expect(s[0]!.end).toBe(s[1]!.start);expect(()=>distributeShots([{weight:1},{weight:1}],0,1)).toThrow('under one frame');});
import{sourceCropLayout}from'../src/renderer/showcase-geometry';
it('contain clips the requested source region before centering, never revealing adjacent page sections',()=>{const g=sourceCropLayout(1440,5713,{x:.49,y:.028,width:.51,height:.142},1080,1450,'contain');expect(g.crop.width).toBeLessThanOrEqual(1080);expect(g.crop.height).toBeLessThanOrEqual(1450);expect(g.source.left).toBeLessThan(0);expect(-g.source.left/g.source.width).toBeCloseTo(.49);expect(g.crop.height/g.source.height).toBeCloseTo(.142);expect(g.crop.top).toBeCloseTo((1450-g.crop.height)/2);});
import {panelPosition,unitProgress} from '../src/renderer/showcase-geometry';
it('binds independent panel assets and validates their own source ranges',()=>{
 const p={crop,x:0,y:0,width:.5,height:1,mediaId:'second',startFrame:10,endFrame:20};
 const candidate={...m,media:[...m.media,{...asset,id:'second',type:'video',width:800,height:674,frames:30,fps:30}],beats:[{id:'line1',shots:[{...m.beats[0]!.shots[0],panels:[p]}]}]};
 expect(validateShowcase(bytes,approval,candidate).manifest.beats[0]!.shots[0]!.panels![0]!.mediaId).toBe('second');
 expect(()=>validateShowcase(bytes,approval,{...candidate,media:m.media})).toThrow('Unknown visual asset');
 expect(()=>validateShowcase(bytes,approval,{...candidate,beats:[{id:'line1',shots:[{...candidate.beats[0]!.shots[0],panels:[{...p,endFrame:31}]}]}]})).toThrow('frame range');
});
it('validates authored semantic animation bounds and preserves legacy defaults',()=>{
 const shot=m.beats[0]!.shots[0]!,p={crop,x:.5,y:0,width:.5,height:1,motion:{from:{x:0,y:0,width:1,height:1},start:0,end:.5}},overlay={kind:'label',text:'流程示意',x:0,y:0,width:.5,height:.1,start:0,end:.2};
 const candidate={...m,layout:'immersive',beats:[{id:'line1',shots:[{...shot,panels:[p],overlays:[overlay]}]}]};
 expect(validateShowcase(bytes,approval,candidate).manifest.layout).toBe('immersive');
 expect(validateShowcase(bytes,approval,m).manifest.layout).toBeUndefined();
 expect(()=>validateShowcase(bytes,approval,{...candidate,beats:[{id:'line1',shots:[{...shot,panels:[{...p,x:.8}]}]}]})).toThrow('Panel exceeds');
 expect(()=>validateShowcase(bytes,approval,{...candidate,beats:[{id:'line1',shots:[{...shot,panels:[{...p,motion:{...p.motion,end:0}}]}]}]})).toThrow('Motion interval');
 expect(()=>validateShowcase(bytes,approval,{...candidate,beats:[{id:'line1',shots:[{...shot,overlays:[{...overlay,text:undefined}]}]}]})).toThrow('Label text');
 expect(panelPosition(p,0)).toEqual(p.motion.from);expect(panelPosition(p,1)).toEqual({x:.5,y:0,width:.5,height:1});expect(panelPosition({...p,motion:undefined},.2)).toEqual({x:.5,y:0,width:.5,height:1});expect(unitProgress(.2,.3,.8)).toBe(0);
});
import {showcaseCaptions} from '../src/renderer/showcase-reel-contract';
it('keeps authored display estimates bound to exact text and measured original audio duration',()=>{
 const candidate={...m,narration:[{...m.narration[0],captionChunks:undefined,captionCues:[{text,startFrame:0,endFrame:93}]}]};
 expect(validateShowcase(bytes,approval,candidate).manifest.narration[0]!.captionCues).toHaveLength(1);
 expect(showcaseCaptions(text,20,93,candidate.narration[0]!)).toEqual([{text,start:20,end:113}]);
 expect(()=>showcaseCaptions(text,20,94,candidate.narration[0]!)).toThrow('measured');
 expect(()=>validateShowcase(bytes,approval,{...candidate,narration:[{...candidate.narration[0],captionCues:[{text:'篡改',startFrame:0,endFrame:93}]}]})).toThrow('partition');
});
