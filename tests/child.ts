import {writeFile,rename} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {Engine} from '../src/orchestrator/engine.js';
import {fixture, fixtureDirectory, mockOptions} from './support.js';
const [mode, root, idOrMarker] = process.argv.slice(2);
const publishMarker=async(path:string,value:string)=>{const temporary=`${path}.${process.pid}.partial`;await writeFile(temporary,value);await rename(temporary,path);};
if (mode === 'sleep-tree') {
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {windowsHide: true, stdio: 'ignore'});
  await publishMarker(root!, JSON.stringify({parent: process.pid, child: child.pid}));
  setInterval(() => {}, 1000);
} else {
  let activeJobId = '';
  const engine = new Engine(root!, {...mockOptions, leaseMs: 500, afterStage: mode === 'crash' ? async (stage, job) => {
    if (stage === 'VALIDATE') { await publishMarker(idOrMarker!, job.id); await new Promise(() => {}); }
  } : undefined, renderer: mode === 'crash-render' ? {async render({directory}) {
    await writeFile(`${directory}/partial.mp4`, 'UNCOMMITTED'); await publishMarker(idOrMarker!, activeJobId); await new Promise(() => {}); return '';
  }} : mockOptions.renderer});
  try {
    const id = mode?.startsWith('crash') ? (await engine.submit(await fixture(), fixtureDirectory)).id : idOrMarker!;
    activeJobId = id;
    await engine.run(id); console.log(JSON.stringify(await engine.status(id)));
  } finally { engine.close(); }
}
