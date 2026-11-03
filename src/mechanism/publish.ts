import {spawn} from 'node:child_process';
import {join, resolve} from 'node:path';

export const publisherScript = 'scripts/mechanism-publish-windows.ps1';

export function requireMechanismPublisher() {
  if (process.platform !== 'win32' || !process.env.SystemRoot) {
    throw new Error('MECHANISM: safe publication requires Windows');
  }
  return join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
}

/** The same process that holds the native handles writes all files, with the manifest last. */
export async function publishMechanism(
  output: string, files: ReadonlyMap<string, string | Buffer>, directory = true,
) {
  return publishNative(output, files, directory, false);
}

export async function publishExactReview(output: string, files: ReadonlyMap<string, Buffer>) {
  return publishNative(output, files, true, true);
}

async function publishNative(output: string, files: ReadonlyMap<string, string | Buffer>, directory: boolean, exactReview: boolean) {
  const host = requireMechanismPublisher();
  if (!directory && files.size !== 1) throw new Error('MECHANISM: file publication requires one payload');
  const script = resolve(import.meta.dirname, '../..', publisherScript);
  const request = JSON.stringify({
    output: resolve(output), directory, exactReview, names: [...files.keys()],
    payloads: [...files.values()].map(value => Buffer.from(value).toString('base64')),
  });
  await new Promise<void>((done, fail) => {
    const worker = spawn(host, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script],
      {stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true});
    let error = '';
    worker.stderr.on('data', data => { error = (error + data.toString()).slice(-8192); });
    worker.once('error', fail);
    worker.stdin.on('error', cause => {
      if (!['EPIPE', 'EOF'].includes((cause as NodeJS.ErrnoException).code ?? '')) fail(cause);
    });
    worker.once('close', code => {
      if (code === 0) done();
      else fail(new Error('MECHANISM: safe publication failed: ' + error.trim()));
    });
    worker.stdin.end(request, 'utf8');
  });
}
