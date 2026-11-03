import {createRequire, syncBuiltinESMExports} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';

const fs = createRequire(import.meta.url)('node:fs/promises') as typeof import('node:fs/promises');
const [data, task, output, probe] = process.argv.slice(2) as [string, string, string, string?];
const writeFile = fs.writeFile;
const control = new AbortController();
process.on('message', message => {
  if (message === 'abort') control.abort();
});
fs.writeFile = async (...args: Parameters<typeof writeFile>) => {
  await writeFile(...args);
  if ((!probe || probe === 'receipt-crash') && String(args[0]).includes('.asset-staging-')) {
    process.send?.('staged');
    // The parent kills this dedicated process with a real unpublished staged file on disk.
    await delay(60_000, undefined, {signal: control.signal});
  }
};
const rename = fs.rename;
fs.rename = async (...args: Parameters<typeof rename>) => {
  if (probe === 'publish' && String(args[0]).includes('.asset-staging-')) {
    process.send?.('publishing');
    await new Promise<void>(resolve => {
      process.once('message', message => { if (message === 'continue') resolve(); });
    });
  }
  return rename(...args);
};
const link=fs.link;
fs.link=async (...args:Parameters<typeof link>)=>{
 if(probe==='receipt-linked' && String(args[1]).includes('.asset-published-')){
  await link(...args);
  process.send?.({stage:'linked',receipt:String(args[1])});
  await delay(60_000,undefined,{signal:control.signal});
  return;
 }
 if((probe==='receipt'||probe==='receipt-forged') && String(args[1]).includes('.asset-published-')){
  process.send?.({stage:'publishing',receipt:String(args[1])});
  await new Promise<void>(resolve=>process.once('message',message=>{if(message==='continue')resolve();}));
 }
 return link(...args);
};
syncBuiltinESMExports();
const {exportStoryPreview} = await import('../src/story-planner/preview.js');
try { await exportStoryPreview(data, task, output, control.signal, probe?.startsWith('receipt') ? undefined : 'legacy-v2'); }
finally { process.disconnect?.(); }
