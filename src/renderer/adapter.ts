import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {VideoSpec} from '../contracts/video.js';
import {command} from '../core/process.js';
import {createOwnedRuntimeTmp,cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {checkAbort} from '../core/errors.js';
import {projectRoot, browserPath, ffmpegPath} from '../providers/local.js';
export interface RenderRequest {spec: VideoSpec; assets: Record<string, string>; directory: string; signal: AbortSignal}
export interface VideoRenderer {render(request: RenderRequest): Promise<string>}
export class RemotionRenderer implements VideoRenderer {
  async render(request: RenderRequest): Promise<string> {
    const input = join(request.directory, 'input.json');
    const raw = join(request.directory, 'remotion.mp4');
    const output = join(request.directory, 'render.mp4');
    checkAbort(request.signal);const runtime=await createOwnedRuntimeTmp(request.directory);
    try {
    await writeFile(input, JSON.stringify({spec: request.spec, assets: request.assets, browser: await browserPath(), parentPid: process.pid}));
    // The worker owns Chrome/FFmpeg and bundling; timeout/cancel kills this process tree.
    await command(process.execPath, ['--import', 'tsx', join(projectRoot, 'src/renderer/worker.ts'), input, raw], {signal: request.signal, timeout: 180_000, cwd: projectRoot, env:{TEMP:runtime.directory,TMP:runtime.directory,TMPDIR:runtime.directory}});
    await command(ffmpegPath(), ['-v', 'error', '-nostdin', '-n', '-i', raw, '-map', '0:v:0', '-an', '-vf', 'scale=in_range=auto:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', output], {signal: request.signal, timeout: 60_000});
    await cleanupOwnedRuntimeTmp(request.directory,runtime.root);return output;
    } catch(error) {await cleanupOwnedRuntimeTmp(request.directory,runtime.root);throw error;}
  }
}
