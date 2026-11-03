import {readFile, mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderMedia, renderStill} from '@remotion/renderer';
import {compositionId, geometry, type MechanismMediaProps} from './media-spec.js';

const path = process.argv[2]!;
const dir = dirname(path);
const input = JSON.parse(await readFile(path, 'utf8')) as {
  entry: string; browser: string; props: MechanismMediaProps; samples: number[];
};
await mkdir(join(dir, 'public'));
const serveUrl = await bundle({entryPoint: input.entry, outDir: join(dir, 'bundle'),
  publicDir: join(dir, 'public'), webpackOverride: config => ({...config, cache: false})});
const browser = await openBrowser('chrome', {browserExecutable: input.browser, logLevel: 'error'});
try {
  const composition = await selectComposition({serveUrl, id: compositionId, inputProps: input.props, puppeteerInstance: browser});
  if (Object.entries(geometry).some(([key, value]) => composition[key as keyof typeof geometry] !== value)) {
    throw new Error('MECHANISM: composition geometry mismatch');
  }
  await renderMedia({serveUrl, composition, inputProps: input.props, puppeteerInstance: browser,
    outputLocation: join(dir, 'raw.mp4'), codec: 'h264', pixelFormat: 'yuv420p', muted: true,
    overwrite: false, concurrency: 2, logLevel: 'error'});
  for (const frame of input.samples) {
    await renderStill({serveUrl, composition, inputProps: input.props, puppeteerInstance: browser, frame,
      output: join(dir, 'sample-' + frame + '.png'), imageFormat: 'png', overwrite: false});
  }
} finally {
  await browser.close({silent: true});
}
