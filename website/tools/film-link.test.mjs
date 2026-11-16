import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFilmLink,isShowcasePath,parseFilmHash} from '../dist/assets/film-link.js';

const allowed=['artcraft-demo','engine-flagship','voicestudio-demo','openmaic-b-demo','worldknow-demo'];

test('all curated films round-trip through English and Chinese canonical routes',()=>{
 for(const route of ['/showcase/','/zh/showcase/'])for(const id of allowed){
  const result=new URL(buildFilmLink('https://example.com',route,id,allowed));
  assert.equal(result.origin,'https://example.com');
  assert.equal(result.pathname,route);
  assert.equal(result.search,'');
  assert.equal(parseFilmHash(result.hash,allowed),id);
 }
});

test('copied links contain no original query, draft state, fragment or current page path',()=>{
 assert.equal(buildFilmLink('https://example.com/guide/?token=private&draft=hello#secret','/zh/showcase/','artcraft-demo',allowed),'https://example.com/zh/showcase/#film=artcraft-demo');
 assert.equal(buildFilmLink('http://localhost:8787/guide/?repository=private','/showcase/','engine-flagship',allowed),'http://localhost:8787/showcase/#film=engine-flagship');
});

test('unknown, malformed and malicious hashes are ignored without decoding paths or HTML',()=>{
 for(const hash of ['',null,undefined,'#other=artcraft-demo','#film=unknown','#film=ArtCraft-demo','#film=artcraft-demo&secret=x','#film=artcraft-demo?x=y','#film=artcraft-demo#next','#film=%61rtcraft-demo','#film=../artcraft-demo','#film=https://evil.example','#film=<img src=x onerror=alert(1)>','#film=artcraft-demo%0A','#film=artcraft-demo\n'])assert.equal(parseFilmHash(hash,allowed),null,String(hash));
});

test('share URL creation rejects unapproved IDs and routes',()=>{
 for(const route of ['/','/showcase','/zh/showcase','/showcase/?secret=x','//evil.example/showcase/','/zh/../showcase/','/fr/showcase/']){
  assert.equal(isShowcasePath(route),false);
  assert.throws(()=>buildFilmLink('https://example.com',route,'artcraft-demo',allowed),TypeError);
 }
 assert.throws(()=>buildFilmLink('https://example.com','/showcase/','unknown',allowed),TypeError);
});

test('share origins cannot carry executable schemes, local file paths or credentials',()=>{
 for(const origin of ['javascript:alert(1)','file:///C:/private','data:text/html,unsafe','https://name:secret@example.com','not a URL'])assert.throws(()=>buildFilmLink(origin,'/showcase/','artcraft-demo',allowed),TypeError);
});
