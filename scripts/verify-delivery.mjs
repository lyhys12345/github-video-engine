// Read-only verification against an independently retained manifest hash; grants no approval.
import {lstat,readFile} from 'node:fs/promises';
import {resolve,join,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const hash=b=>createHash('sha256').update(b).digest('hex');
try{
 const {values,positionals}=parseArgs({allowPositionals:true,options:{'manifest-sha':{type:'string'}}});
 if(positionals.length!==1||!/^[a-f0-9]{64}$/.test(values['manifest-sha']??''))throw Error('Usage: node scripts/verify-delivery.mjs <directory> --manifest-sha <trusted SHA256>');
 const root=resolve(positionals[0]),top=await lstat(root);if(!top.isDirectory()||top.isSymbolicLink())throw Error('Delivery root must be a regular directory');
 async function regular(file,max){
  if(typeof file!=='string'||!file||file.includes('\\')||isAbsolute(file)||/[\u0000-\u001f\u007f:]/.test(file)||file.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe manifest file path');
  let p=root;for(const part of file.split('/')){p=join(p,part);if((await lstat(p)).isSymbolicLink())throw Error('Linked delivery path refused: '+file);}
  const s=await lstat(p);if(!s.isFile()||s.size>max)throw Error('Not a bounded regular file: '+file);const b=await readFile(p);if(b.length!==s.size)throw Error('File changed during verification: '+file);return b;
 }
 const raw=await regular('delivery-manifest.json',4_000_000),manifestSha256=hash(raw);if(manifestSha256!==values['manifest-sha'])throw Error('Delivery manifest differs from the supplied trusted hash');
 const manifest=JSON.parse(raw);if(manifest.schemaVersion!=='final-delivery/1.0'||!Array.isArray(manifest.files)||manifest.files.length<1||manifest.files.length>256)throw Error('Unsupported delivery manifest');
 const seen=new Set();let totalBytes=0;
 for(const f of manifest.files){if(seen.has(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<0||f.bytes>250_000_000||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('Invalid/duplicate manifest entry');seen.add(f.path);totalBytes+=f.bytes;if(totalBytes>1_000_000_000)throw Error('Delivery exceeds verification byte limit');const b=await regular(f.path,250_000_000);if(b.length!==f.bytes||hash(b)!==f.sha256)throw Error('Delivery file integrity mismatch: '+f.path);}
 console.log(JSON.stringify({ok:true,readOnly:true,directory:root,manifestSha256,verifiedFiles:seen.size,totalBytes,extraFilesInspected:false,approvalGranted:false,finalHumanAcceptance:manifest.finalHumanAcceptance??'unknown'},null,2));
}catch(error){console.error(JSON.stringify({ok:false,error:String(error),approvalGranted:false}));process.exitCode=1;}
