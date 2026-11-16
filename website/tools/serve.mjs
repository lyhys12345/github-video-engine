import http from 'node:http';
import {stat, readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const noEnhancement=process.argv.includes('--without-js');
const qaEnabled=process.argv.includes('--qa');
const qaRoot=path.resolve('qa');
const portIndex=process.argv.indexOf('--port');
const port=portIndex<0?4173:Number(process.argv[portIndex+1]);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use a valid preview port between 1024 and 65535.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8','.woff2':'font/woff2','.json':'application/json'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(qaEnabled&&((process.argv.includes('--fail-caption')&&pathname.endsWith('.vtt'))||(process.argv.includes('--fail-media')&&pathname.endsWith('.mp4')))){
   res.writeHead(404,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('Injected local QA failure');return;
  }
  const isQa=qaEnabled&&pathname.startsWith('/__qa/');
  const base=isQa?qaRoot:root;
  let file=path.resolve(base,`.${isQa?pathname.slice('/__qa'.length):pathname}`);
  if(file!==base&&!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
  let s=await stat(file);if(s.isDirectory()){file=path.join(file,'index.html');s=await stat(file);}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
  if(noEnhancement&&path.extname(file)==='.html'){
   const html=(await readFile(file,'utf8')).replace(/<script type="module" src="\/assets\/site\.js"><\/script>/,'');
   res.writeHead(200,{'Content-Type':headers['Content-Type'],'Content-Length':Buffer.byteLength(html)}).end(req.method==='HEAD'?undefined:html);return;
  }
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),s.size-1):s.size-1;if(start>end||start>=s.size){res.writeHead(416,{'Content-Range':`bytes */${s.size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${s.size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);return;}
  res.writeHead(200,{...headers,'Content-Length':s.size});if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}/ (${noEnhancement?'static HTML only':'enhanced'})`));
