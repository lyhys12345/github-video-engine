import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {bundle} from '@remotion/bundler';
import {makeCancelSignal, openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {killTree} from '../core/process.js';
import {projectRoot} from '../providers/local.js';
import {SHOWCASE_AUDIT_ARTIFACT} from '../renderer/showcase-audit-contract.js';
import type {ShowcaseProps} from '../renderer/showcase-reel.js';

export type WorkerRequest = {id: string; props: ShowcaseProps; from: number; to: number; kind: 'shot' | 'still' | 'audit'};
export type WorkerResponse = {id: string; error?: string};
const requestPath = process.argv[2]!;
const directory = dirname(resolve(requestPath));
const executable = (JSON.parse(await readFile(requestPath, 'utf8')) as {browser: string}).browser;
const {cancelSignal, cancel} = makeCancelSignal();
let browser: Awaited<ReturnType<typeof openBrowser>> | undefined;
let serveUrl: string | undefined;
let active = Promise.resolve();
let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;
  cancel();
  // This also runs when the owning process dies without executing finally.
  const force = setTimeout(() => {void killTree(process.pid);}, 8000);
  void active.finally(async () => {
    try { await browser?.close({silent: true}); }
    finally {
      clearTimeout(force);
      if (process.connected) process.disconnect();
    }
  });
}
process.once('disconnect', stop);
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
process.on('message', (request: WorkerRequest | {kind: 'stop'}) => {
  if (request.kind === 'stop') { stop(); return; }
  if (stopping) return;
  const {id, kind, from, to} = request;
  const props = kind === 'audit' ? {...request.props, auditDom: true} : request.props;
  if (!/^[0-9a-f]{64}$/.test(id)) { stop(); return; }
  active = active.then(async () => {
    try {
      if (!serveUrl) {
        serveUrl = await bundle({entryPoint: join(projectRoot, 'src/renderer/showcase-reel.tsx'),
          outDir: join(directory, 'bundle'), publicDir: join(directory, 'public'), enableCaching: false});
      }
      if (stopping) return;
      browser ??= await openBrowser('chrome', {browserExecutable: executable, logLevel: 'error'});
      if (stopping) return;
      const composition = await selectComposition({serveUrl, id: 'ShowcaseReel', inputProps: props, puppeteerInstance: browser});
      if (composition.durationInFrames !== props.frames || composition.fps !== 30 ||
          composition.width !== 1080 || composition.height !== 1920) throw new Error('Unexpected showcase composition geometry.');
      const options = {serveUrl, composition, inputProps: props, puppeteerInstance: browser, cancelSignal, overwrite: false};
      if (kind === 'audit') {
        let measurement: string | undefined;
        await renderStill({...options, frame: from, output: join(directory, id + '.png'), imageFormat: 'png',
          timeoutInMilliseconds: 45_000, logLevel: 'error', onArtifact: artifact => {
            if (artifact.filename === SHOWCASE_AUDIT_ARTIFACT && artifact.frame === from && typeof artifact.content === 'string') {
              measurement = artifact.content;
            }
          }});
        if (!measurement) throw new Error('Showcase DOM measurement was not emitted for the rendered frame.');
        await writeFile(join(directory, id + '.json'), measurement, {flag: 'wx'});
      } else if (kind === 'still') {
        await renderStill({...options, frame: from, output: join(directory, id + '.png'), imageFormat: 'png'});
      } else {
        await renderMedia({...options, frameRange: [from, to - 1], outputLocation: join(directory, id + '.mp4'),
          codec: 'h264', pixelFormat: 'yuv420p', muted: true, concurrency: 2, logLevel: 'error'});
      }
      if (process.connected) process.send!({id} satisfies WorkerResponse);
    } catch (error) {
      if (process.connected) process.send!({id, error: error instanceof Error ? error.stack ?? error.message : String(error)} satisfies WorkerResponse);
    }
  });
});
