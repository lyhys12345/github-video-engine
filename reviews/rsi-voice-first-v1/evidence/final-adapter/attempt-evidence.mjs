import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const hash = value => createHash('sha256').update(value).digest('hex');
const result = [];
for (const [name, directory] of [['public', 'p'], ['anna', 'a']]) {
  const db = new DatabaseSync(join(directory, 'tasks.sqlite'), {readOnly: true});
  try {
    const tasks = db.prepare("SELECT id, json_extract(data,'$.state') AS state, json_extract(data,'$.attempt') AS attempt, json_extract(data,'$.error.code') AS errorCode, json_array_length(data,'$.outputs') AS outputCount, json_extract(data,'$.result.sha256') AS resultSha256 FROM tasks ORDER BY rowid").all();
    const events = db.prepare('SELECT type, data, at FROM task_events WHERE task_id=? ORDER BY seq');
    const receipts = db.prepare('SELECT phase, attempt, data FROM usage_events WHERE task_id=? ORDER BY seq');
    for (const task of tasks) {
      result.push({name, ...task, events: events.all(task.id).map(row => {
        const parsed = JSON.parse(row.data);
        return {type: row.type, at: row.at, code: parsed.code, classification: parsed.classification, attempt: parsed.attempt, sha256: hash(row.data)};
      }), receipts: receipts.all(task.id).map(row => {
        const parsed = JSON.parse(row.data);
        return {phase: row.phase, attempt: row.attempt, outcome: parsed.outcome, wallDurationMs: parsed.wallDurationMs,
          providerChargeMicros: parsed.providerChargeMicros, sha256: hash(row.data)};
      })});
    }
  } finally { db.close(); }
}
const mode = process.argv[2];
if (mode === 'during') {
  // Public already re-entered attempt 2. Its durable failure event is still present.
  const a = result.find(row => row.name === 'anna');
  const p = result.find(row => row.name === 'public');
  if (!(a.state === 'failed' && a.outputCount === 0 && a.resultSha256 === null &&
      p.events.some(event => event.code === 'ATOMIC_STORAGE_UNAVAILABLE'))) throw Error('Unexpected pre-retry evidence');
}
const snapshot = {capturedAt: new Date().toISOString(), tests: result};
await writeFile('task-attempts-' + mode + '.json', JSON.stringify(snapshot, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(result.map(({name, attempt, state, outputCount, events}) => ({
  name,attempt,state,outputCount,eventKinds: events.map(event => event.code ?? event.type)}))));
