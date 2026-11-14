import {it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {command} from '../src/core/process.js';

it('rejects an unclassified new test and duplicate/stale catalog entries through the real CLI',async()=>{
 const root=await mkdtemp(join(tmpdir(),'test-catalog-'));await mkdir(join(root,'tests'));
 await writeFile(join(root,'tests','one.test.ts'),'// fixture entry, never executed');
 const path=join(root,'tests','catalog.json'),script=resolve('scripts/test-suite.mjs');
 const catalog={schemaVersion:'test-catalog/1.0',suites:{unit:{runner:'vitest',files:['tests/one.test.ts']}}};
 const run=()=>command(process.execPath,[script,'check'],{env:{GVE_TEST_CATALOG_ROOT:root}});
 await writeFile(path,JSON.stringify(catalog));expect(JSON.parse(await run()).classified).toBe(1);
 await mkdir(join(root,'tests','nested'));
 await writeFile(join(root,'tests','nested','new.test.ts'),'// deliberately unclassified nested test');
 await expect(run()).rejects.toThrow('tests/nested/new.test.ts');
 catalog.suites.unit.files.push('tests/nested/new.test.ts');await writeFile(path,JSON.stringify(catalog));expect(JSON.parse(await run()).status).toBe('pass');
 catalog.suites.unit.files.push('tests/nested/new.test.ts','tests/nonexistent.test.ts');await writeFile(path,JSON.stringify(catalog));
 await expect(run()).rejects.toThrow('TEST_CATALOG');
});
