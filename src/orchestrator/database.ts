import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {JobSchema, JobStepSchema, type Job, type JobStep, type Stage, type Artifact} from '../contracts/runtime.js';
import {EngineError, errorInfo} from '../core/errors.js';

export class JobDatabase {
  readonly db: DatabaseSync;
  constructor(readonly root: string) {
    mkdirSync(root, {recursive: true});
    this.db = new DatabaseSync(resolve(root, 'jobs.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
    const version = this.db.prepare('PRAGMA user_version').get() as {user_version: number};
    if (version.user_version > 1) { this.db.close(); throw new EngineError('DB_VERSION', 'Database is newer than this engine'); }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS steps(job_id TEXT NOT NULL REFERENCES jobs(id), stage TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(job_id, stage));
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL REFERENCES jobs(id), at TEXT NOT NULL, type TEXT NOT NULL, detail TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS cache(fingerprint TEXT PRIMARY KEY, outputs TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS immutable_steps BEFORE UPDATE ON steps WHEN json_extract(OLD.data,'$.status')='succeeded' BEGIN SELECT RAISE(ABORT,'Committed steps are immutable'); END;
      CREATE TRIGGER IF NOT EXISTS preserve_steps BEFORE DELETE ON steps BEGIN SELECT RAISE(ABORT,'Steps cannot be deleted'); END;
      PRAGMA user_version=1;
    `);
  }
  close() { this.db.close(); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  event(id: string, type: string, detail: unknown = {}) {
    this.db.prepare('INSERT INTO events(job_id,at,type,detail) VALUES(?,?,?,?)').run(id, new Date().toISOString(), type, JSON.stringify(detail));
  }
  events(id: string) { return this.db.prepare('SELECT * FROM events WHERE job_id=? ORDER BY seq').all(id); }
  cached(fingerprint: string): Artifact[] | undefined {
    const row = this.db.prepare('SELECT outputs FROM cache WHERE fingerprint=?').get(fingerprint);
    return row ? JSON.parse(row.outputs as string) as Artifact[] : undefined;
  }
  get(id: string): Job {
    const row = this.db.prepare('SELECT data FROM jobs WHERE id=?').get(id) as {data: string} | undefined;
    if (!row) throw new EngineError('JOB_NOT_FOUND', `No job ${id}; use jobs status to list jobs`);
    return JobSchema.parse(JSON.parse(row.data));
  }
  list(): Job[] { return this.db.prepare('SELECT data FROM jobs ORDER BY rowid DESC').all().map((r) => JobSchema.parse(JSON.parse(r.data as string))); }
  private save(job: Job) { job.updatedAt = new Date().toISOString(); this.db.prepare('UPDATE jobs SET data=? WHERE id=?').run(JSON.stringify(JobSchema.parse(job)), job.id); }
  create(input: Pick<Job, 'spec' | 'specDirectory' | 'inputFingerprint' | 'environment'>): Job {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT id FROM jobs WHERE fingerprint=?').get(input.inputFingerprint);
      if (row) return this.get(row.id as string);
      const now = new Date().toISOString();
      const job: Job = {schemaVersion: '1.0', id: randomUUID(), ...input, status: 'queued', stage: null, createdAt: now, updatedAt: now, error: null, owner: null, leaseUntil: 0, cancelRequested: false};
      this.db.prepare('INSERT INTO jobs(id,fingerprint,data) VALUES(?,?,?)').run(job.id, job.inputFingerprint, JSON.stringify(JobSchema.parse(job)));
      this.event(job.id, 'created'); return job;
    });
  }
  claim(id: string, ttl: number): string {
    return this.transaction(() => {
      const job = this.get(id);
      if (job.status === 'running' && job.leaseUntil > Date.now()) throw new EngineError('JOB_BUSY', `Job ${id} is owned by an active worker; retry after its lease expires`);
      if (job.status === 'succeeded') throw new EngineError('JOB_COMPLETE', 'Job already succeeded');
      if (job.status === 'failed' && job.error?.classification === 'permanent') throw new EngineError('PERMANENT_FAILURE', `Job cannot resume: ${job.error.message}. Correct the input or restore the artifact.`);
      const previous = job.status;
      job.status = 'running'; job.owner = randomUUID(); job.leaseUntil = Date.now() + ttl; job.cancelRequested = false; job.error = null;
      this.save(job); this.event(id, 'claimed', {previous, owner: job.owner}); return job.owner;
    });
  }
  assertOwner(id: string, owner: string): Job {
    const job = this.get(id);
    if (job.status !== 'running' || job.owner !== owner || job.leaseUntil <= Date.now()) throw new EngineError('LEASE_LOST', 'Worker ownership expired or was replaced', 'retryable');
    return job;
  }
  heartbeat(id: string, owner: string, ttl: number): boolean {
    return this.transaction(() => { const job = this.assertOwner(id, owner); job.leaseUntil = Date.now() + ttl; this.save(job); return job.cancelRequested; });
  }
  cancel(id: string) {
    this.transaction(() => {
      const job = this.get(id);
      if (job.status === 'succeeded') throw new EngineError('JOB_COMPLETE', 'A completed job cannot be cancelled');
      job.cancelRequested = true;
      if (job.status !== 'running' || job.leaseUntil <= Date.now()) { job.status = 'cancelled'; job.owner = null; job.leaseUntil = 0; }
      this.save(job); this.event(id, 'cancel_requested');
    });
  }
  step(id: string, stage: Stage): JobStep | undefined {
    const row = this.db.prepare('SELECT data FROM steps WHERE job_id=? AND stage=?').get(id, stage) as {data: string} | undefined;
    return row ? JobStepSchema.parse(JSON.parse(row.data)) : undefined;
  }
  steps(id: string): JobStep[] { return this.db.prepare('SELECT data FROM steps WHERE job_id=? ORDER BY rowid').all(id).map((r) => JobStepSchema.parse(JSON.parse(r.data as string))); }
  startStep(id: string, stage: Stage, fingerprint: string, owner: string): JobStep {
    return this.transaction(() => {
      const job = this.assertOwner(id, owner);
      if (job.cancelRequested) throw new EngineError('CANCELLED', 'Cancellation requested', 'cancelled');
      const previous = this.step(id, stage);
      const step: JobStep = {schemaVersion: '1.0', jobId: id, stage, status: 'running', attempt: (previous?.attempt ?? 0) + 1, inputFingerprint: fingerprint, outputs: [], error: null, startedAt: new Date().toISOString(), finishedAt: null, owner};
      this.db.prepare('INSERT INTO steps(job_id,stage,data) VALUES(?,?,?) ON CONFLICT(job_id,stage) DO UPDATE SET data=excluded.data').run(id, stage, JSON.stringify(JobStepSchema.parse(step)));
      job.stage = stage; this.save(job); this.event(id, 'step_started', {stage, attempt: step.attempt}); return step;
    });
  }
  endStep(id: string, stage: Stage, owner: string, outputs: Artifact[], error?: unknown) {
    this.transaction(() => {
      const job = this.assertOwner(id, owner);
      if (!error && job.cancelRequested) throw new EngineError('CANCELLED', 'Cancellation requested before commit', 'cancelled');
      const step = this.step(id, stage)!;
      step.error = error ? errorInfo(error) : null;
      step.status = error ? step.error?.classification === 'cancelled' ? 'cancelled' : 'failed' : 'succeeded';
      step.outputs = outputs; step.finishedAt = new Date().toISOString();
      this.db.prepare('UPDATE steps SET data=? WHERE job_id=? AND stage=?').run(JSON.stringify(JobStepSchema.parse(step)), id, stage);
      if (!error) this.db.prepare('INSERT OR IGNORE INTO cache(fingerprint,outputs) VALUES(?,?)').run(step.inputFingerprint, JSON.stringify(outputs));
      this.event(id, `step_${step.status}`, {stage, attempt: step.attempt, error: step.error});
    });
  }
  finish(id: string, owner: string, error?: unknown) {
    this.transaction(() => {
      const job = this.assertOwner(id, owner);
      if (!error && job.cancelRequested) throw new EngineError('CANCELLED', 'Cancellation requested before completion', 'cancelled');
      job.error = error ? errorInfo(error) : null;
      job.status = error ? job.error?.classification === 'cancelled' ? 'cancelled' : 'failed' : 'succeeded';
      job.owner = null; job.leaseUntil = 0;
      this.save(job); this.event(id, job.status, job.error);
    });
  }
}
