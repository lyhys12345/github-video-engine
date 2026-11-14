import {it,expect} from 'vitest';
import {resolve} from 'node:path';
import {command} from '../src/core/process.js';
it('keeps the URL showcase alias bound to a workspace and refuses extra command words before IO',async()=>{
 const cli=resolve('src/cli.ts');
 await expect(command(process.execPath,['--import','tsx',cli,'explanation','showcase','--data','missing','--spec','missing'])).rejects.toThrow('requires --workspace');
 await expect(command(process.execPath,['--import','tsx',cli,'explanation','showcase','extra','--workspace','missing','--spec','missing'])).rejects.toThrow('exactly two');
});

it('routes the public audience audit and checks its exact flags', async () => {
 const cli = resolve('src/cli.ts');
 const invoke = (...args: string[]) => command(process.execPath, ['--import', 'tsx', cli, 'showcase', 'audience-audit', ...args]);
 await expect(invoke('--request', 'missing')).rejects.toThrow(/--out <new-dir>/);
 await expect(invoke('--request', 'missing', '--out', 'missing', '--task', 'irrelevant')).rejects.toThrow(/--out <new-dir>/);
 await expect(invoke('--request', 'audience-request-missing.json', '--out', 'unused')).rejects.toThrow(/audience-request-missing\.json/);
});
