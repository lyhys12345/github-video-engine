import {readFile} from 'node:fs/promises';
import {renameSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
import {parseSpec} from '../contracts/video.js';
import {killTree} from '../core/process.js';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Worker requires input and output paths');
const input = JSON.parse(await readFile(inputPath, 'utf8'));
const watchdog = setInterval(() => { try { process.kill(input.parentPid, 0); } catch { void killTree(process.pid); } }, 1000);
watchdog.unref();
const deadline = setTimeout(() => { void killTree(process.pid); }, 175_000); deadline.unref();
const inputProps = {spec: parseSpec(input.spec), assets: input.assets as Record<string, string>};
const serveUrl = await bundle({entryPoint: join(dirname(fileURLToPath(import.meta.url)), 'composition.tsx'), outDir: join(dirname(outputPath), 'bundle'), publicDir: null,
  webpackOverride: (config) => ({...config, resolve: {...config.resolve, extensionAlias: {'.js': ['.ts', '.tsx', '.js']}}})});
const browser = await openBrowser('chrome', {browserExecutable: input.browser, logLevel: 'error'});
try {
  const composition = await selectComposition({serveUrl, id: 'Demo', inputProps, puppeteerInstance: browser});
  const progressPath = join(dirname(outputPath), 'render-progress.json');
  let lastProgressAt = 0;
  await renderMedia({composition, serveUrl, inputProps, codec: 'h264', pixelFormat: 'yuv420p', outputLocation: outputPath,
    puppeteerInstance: browser, concurrency: 2, crf: 20, logLevel: 'error', timeoutInMilliseconds: 30_000,
    onProgress: ({renderedFrames, encodedFrames}) => {
      if (Date.now() - lastProgressAt < 200 && renderedFrames !== composition.durationInFrames) return;
      lastProgressAt = Date.now();
      writeFileSync(`${progressPath}.partial`, JSON.stringify({schemaVersion: '1.0', phase: 'rendering', workerPid: process.pid,
        parentPid: input.parentPid, renderedFrames, encodedFrames, totalFrames: composition.durationInFrames, updatedAt: new Date().toISOString()}));
      renameSync(`${progressPath}.partial`, progressPath);
    }});
} finally { clearInterval(watchdog); clearTimeout(deadline); await browser.close({silent: true}); }
