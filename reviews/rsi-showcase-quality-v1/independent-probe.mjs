import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, readdir, stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
// Run from the candidate repository: node --import tsx reviews/rsi-showcase-quality-v1/independent-probe.mjs
// Optional GVE_REVIEW_REPO and GVE_REVIEW_SCRATCH select repository and scratch parent.
const repository = resolve(process.env.GVE_REVIEW_REPO ?? process.cwd());
const source = path => pathToFileURL(join(repository, path)).href;
const {showcaseCropComposition} = await import(source('src/showcase/crop-quality.ts'));
const {showcaseTimeline} = await import(source('src/showcase/timeline.ts'));
const {TaskRunner} = await import(source('src/orchestrator/tasks.ts'));
const {sha256} = await import(source('src/core/util.ts'));
const signal = new AbortController().signal;
let seed=48173; const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const ease=x=>x*x*(3-2*x), mix=(a,b,t)=>a+(b-a)*t;
const region=()=>{let width=.01+rand()*.99,height=.01+rand()*.99;return {x:rand()*(1-width),y:rand()*(1-height),width,height}};
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${msg}: ${a} != ${b}`);
let panelsChecked=0,framesChecked=0;
for(let example=0;example<240;example++){
 const frames=1+Math.floor(rand()*100), layout=['standard','immersive','cinematic'][example%3], inset=48+Math.floor(rand()*93);
 const viewport=layout==='cinematic'?{x:inset,y:236,w:1080-2*inset,h:1240}:layout==='immersive'?{x:0,y:125,w:1080,h:1460}:{x:0,y:135,w:1080,h:1450};
 const media=[{id:'a',path:'a.png',sha256:'a'.repeat(64),type:'image',width:1+Math.floor(rand()*2000),height:1+Math.floor(rand()*2000)},{id:'b',path:'b.mp4',sha256:'b'.repeat(64),type:'video',width:1+Math.floor(rand()*2000),height:1+Math.floor(rand()*2000),frames:200,fps:30}];
 const panels=[0,1,2].map((p)=>({...region(),crop:region(),cropEnd:region(),fit:p%2?'contain':'cover',...(p===1?{mediaId:'b'}:{}),reveal:example%7===0?1:rand(),motion:{from:region(),start:.1,end:.1+rand()*.9}}));
 const manifest={layout,cinematic:{safeInset:inset},theme:'paper',projectLabel:'Oracle',media,narration:[{id:'line',sha256:'c'.repeat(64)}],beats:[{id:'line',shots:[{mediaId:'a',weight:1,crop:{x:0,y:0,width:1,height:1},panels}]}]};
 const actual=showcaseCropComposition(manifest,showcaseTimeline(manifest,[['line','Oracle']], [{frames,samples:frames*800}]),signal).shots[0].panels;
 for(let p=0;p<panels.length;p++){
  const panel=panels[p],src=media[p===1?1:0],expected=[];
  for(let f=0;f<frames;f++){
   const progress=f/frames;if(progress<panel.reveal)continue;
   const mt=ease(Math.max(0,Math.min(1,(progress-panel.motion.start)/(panel.motion.end-panel.motion.start)))), ct=ease(progress);
   const box=Object.fromEntries(['x','y','width','height'].map(k=>[k,mix(panel.motion.from[k],panel[k],mt)]));
   const crop=Object.fromEntries(['x','y','width','height'].map(k=>[k,mix(panel.crop[k],panel.cropEnd[k],ct)]));
   const dw=viewport.w*box.width,dh=viewport.h*box.height,cw=src.width*crop.width,ch=src.height*crop.height;
   const scale=panel.fit==='contain'?Math.min(dw/cw,dh/ch):Math.max(dw/cw,dh/ch);
   const vw=Math.min(cw,dw/scale),vh=Math.min(ch,dh/scale),vx=src.width*crop.x+(cw-vw)/2,vy=src.height*crop.y+(ch-vh)/2;
   expected.push({f,scale,clip:panel.fit==='cover'?1-vw*vh/(cw*ch):0,fill:panel.fit==='contain'?cw*ch*scale*scale/(dw*dh):1,vx,vy,vw,vh,left:viewport.x+viewport.w*box.x,top:viewport.y+viewport.h*box.y,dw,dh});framesChecked++;
  }
  assert.equal(actual[p].visibleFrameCount,expected.length);assert.equal(actual[p].firstVisibleFrame,expected[0]?.f??null);
  if(!expected.length){assert.equal(actual[p].worstEnlargement,null);assert.deepEqual(actual[p].warnings,['never-visible']);continue;}
  const best=expected.reduce((a,b)=>b.scale>a.scale?b:a), a=actual[p].worstEnlargement;
  assert.equal(a.frame,best.f);close(a.outputScale,best.scale,'scale');close(a.assumedPhoneScale,best.scale/3,'phone scale');
  for(const [key,expectKey] of [['x','vx'],['y','vy'],['width','vw'],['height','vh']])close(a.visibleSourcePixels[key],best[expectKey],'visible '+key);
  for(const [key,expectKey] of [['left','left'],['top','top'],['width','dw'],['height','dh']])close(a.destinationOutputPixels[key],best[expectKey],'destination '+key);
  if(panel.fit==='cover'){const worst=expected.reduce((a,b)=>b.clip>a.clip?b:a);close(actual[p].worstCoverClipping.additionalCoverClippedFraction,worst.clip,'clipping');}
  else{const least=expected.reduce((a,b)=>b.fill<a.fill?b:a);close(actual[p].leastContainFill.containFillFraction,least.fill,'fill');}
  panelsChecked++;
 }
}
const scratch=await mkdtemp(join(process.env.GVE_REVIEW_SCRATCH ?? tmpdir(),'gve-quality-independent-'));
const root=join(scratch,'state'), missing=join(scratch,'must-not-exist');
assert.throws(()=>new TaskRunner(missing,{readOnly:true}));await assert.rejects(stat(missing));
const writer=new TaskRunner(root);
const schema=()=>writer.db.prepare("SELECT type,name,sql FROM sqlite_master ORDER BY type,name").all();
const beforeSchema=JSON.stringify(schema()), beforeVersion=writer.db.prepare('PRAGMA user_version').get().user_version;
writer.db.prepare('INSERT INTO tasks(id,data) VALUES(?,?)').run('live-wal','{"sentinel":true}');
const reader=new TaskRunner(root,{readOnly:true});assert.deepEqual(reader.get('live-wal'),{sentinel:true});assert.throws(()=>reader.event('live-wal','unauthorized',{}));reader.close();
assert.equal(JSON.stringify(schema()),beforeSchema);assert.equal(writer.db.prepare('PRAGMA user_version').get().user_version,beforeVersion);assert.equal(writer.db.prepare('SELECT count(*) AS n FROM task_events').get().n,0);writer.close();
const legacyRoot=join(scratch,'legacy');await mkdir(legacyRoot);const old=new DatabaseSync(join(legacyRoot,'tasks.sqlite'));old.close();
const beforeLegacy=sha256(await readFile(join(legacyRoot,'tasks.sqlite')));assert.throws(()=>new TaskRunner(legacyRoot,{readOnly:true}),/unsupported tasks database version 0/);assert.equal(sha256(await readFile(join(legacyRoot,'tasks.sqlite'))),beforeLegacy);
const migrated=new TaskRunner(legacyRoot);assert.equal(migrated.db.prepare('PRAGMA user_version').get().user_version,1);migrated.close();
console.log(JSON.stringify({status:'PASS',oracleCases:240,visiblePanelsChecked:panelsChecked,visibleFramesChecked:framesChecked,readOnlyChecks:['missing path not created','live WAL row visible','write rejected','schema and version unchanged','event count unchanged','legacy read-only rejected unchanged','default legacy migration succeeds'],scratch},null,2));

