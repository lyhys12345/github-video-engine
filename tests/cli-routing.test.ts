import {it,expect} from 'vitest';
import {resolve} from 'node:path';
import {command} from '../src/core/process.js';
it('keeps the URL showcase alias bound to a workspace and refuses extra command words before IO',async()=>{
 const cli=resolve('src/cli.ts');
 await expect(command(process.execPath,['--import','tsx',cli,'explanation','showcase','--data','missing','--spec','missing'])).rejects.toThrow('requires --workspace');
 await expect(command(process.execPath,['--import','tsx',cli,'explanation','showcase','extra','--workspace','missing','--spec','missing'])).rejects.toThrow('exactly two');
});
