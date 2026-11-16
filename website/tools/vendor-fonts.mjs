import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='dist/assets/fonts';
await mkdir(root,{recursive:true});
const userAgent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const request='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400..700&family=Manrope:wght@400..800&display=swap';
const response=await fetch(request,{headers:{'User-Agent':userAgent}});if(!response.ok)throw new Error(`Font CSS ${response.status}`);
const css=await response.text();
const blocks=[...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g)].map(m=>m[1]);
if(blocks.length!==2)throw new Error(`Expected 2 Latin font faces; received ${blocks.length}`);
let localCss='/* Self-hosted OFL font subsets. See the accompanying licenses and provenance. */\n';
const manifest=[];
for(const block of blocks){
 const family=block.match(/font-family:\s*'([^']+)'/)[1];
 const source=block.match(/url\((https:\/\/fonts.gstatic.com\/[^)]+)\)/)[1];
 const slug=family==='DM Sans'?'dm-sans':'manrope';
 const font=await fetch(source);if(!font.ok)throw new Error(`Font download ${font.status}`);
 const bytes=Buffer.from(await font.arrayBuffer());if(bytes.subarray(0,4).toString()!=='wOF2')throw new Error('Expected WOFF2 font');
 await writeFile(`${root}/${slug}-latin.woff2`,bytes);
 const licenseUrl=`https://raw.githubusercontent.com/google/fonts/main/ofl/${slug==='dm-sans'?'dmsans':'manrope'}/OFL.txt`;
 const licenseResponse=await fetch(licenseUrl);if(!licenseResponse.ok)throw new Error('License download failed');
 const license=await licenseResponse.text();if(!license.includes('SIL OPEN FONT LICENSE'))throw new Error('Missing OFL');
 await writeFile(`${root}/${slug}-OFL.txt`,license);
 localCss+=block.replace(source,`/assets/fonts/${slug}-latin.woff2`).replace('font-display: swap','font-display: swap')+'\n';
 manifest.push({family,file:`${slug}-latin.woff2`,source,license:licenseUrl,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
}
await writeFile(`${root}/fonts.css`,localCss);
await writeFile(`${root}/provenance.json`,JSON.stringify({request,retrievedAt:new Date().toISOString(),fonts:manifest},null,2)+'\n');
console.log(JSON.stringify(manifest.map(({family,bytes})=>({family,bytes}))));
