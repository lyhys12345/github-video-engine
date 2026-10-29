import {mkdir, mkdtemp, readFile, realpath, rm, stat, readdir} from 'node:fs/promises';
import {resolve, join, relative, isAbsolute, sep} from 'node:path';
import {parseSpec, VideoSpecSchema, type VideoSpec} from '../contracts/video.js';
import {STAGES, EvaluationResultSchema, type Stage, type Artifact, type Job} from '../contracts/runtime.js';
import {EngineError, checkAbort, errorInfo} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {ArtifactStore} from '../assets/store.js';
import {JobDatabase} from './database.js';
import {environment} from '../providers/local.js';
import {RemotionRenderer, type VideoRenderer} from '../renderer/adapter.js';
import {cleanupOwnedRuntimeTmp} from '../core/owned-runtime.js';
import {verifyMedia} from '../evaluation/media.js';

export interface EngineOptions {
  renderer?: VideoRenderer;
  evaluator?: typeof verifyMedia;
  environment?: () => Promise<Record<string, string>>;
  leaseMs?: number;
  stageTimeoutMs?: number;
  maxAttempts?: number;
  afterStage?: (stage: Stage, job: Job) => Promise<void>;
}
export class Engine {
  readonly db: JobDatabase;
  readonly artifacts: ArtifactStore;
  readonly root: string;
  constructor(root: string, readonly options: EngineOptions = {}) {
    this.root = resolve(root); this.db = new JobDatabase(this.root); this.artifacts = new ArtifactStore(this.root);
  }
  close() { this.db.close(); }
  async submit(value: unknown, specDirectory: string): Promise<Job> {
    const result = VideoSpecSchema.safeParse(value);
    if (!result.success) throw new EngineError('INVALID_SPEC', result.error.issues.map((issue) => `${issue.path.join('.') || 'spec'}: ${issue.message}`).join('; '));
    const spec = result.data;
    const env = await (this.options.environment ?? environment)();
    // Asset bytes must match declared hashes even on a deduplicated request.
    await this.readAssets(spec, specDirectory);
    return this.db.create({spec, specDirectory: resolve(specDirectory), environment: env, inputFingerprint: sha256(canonical({spec, environment: env}))});
  }
  async readAssets(spec: VideoSpec, specDirectory: string): Promise<Record<string, Buffer>> {
    const base = await realpath(specDirectory); const assets: Record<string, Buffer> = {};
    for (const asset of spec.assets) {
      const path = await realpath(resolve(base, asset.path)); const rel = relative(base, path);
      if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new EngineError('ASSET_PATH', `Asset ${asset.id} must be inside the spec directory`);
      if ((await stat(path)).size > 5_000_000) throw new EngineError('ASSET_SIZE', `Asset ${asset.id} exceeds 5 MB`);
      const bytes = await readFile(path);
      if (sha256(bytes) !== asset.sha256) throw new EngineError('ASSET_HASH', `Asset ${asset.id} differs from its declared hash; update the spec to invalidate dependent renders`);
      if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) > 4096 || bytes.readUInt32BE(20) > 4096) throw new EngineError('ASSET_FORMAT', `Asset ${asset.id} must be a PNG up to 4096x4096`);
      assets[asset.id] = bytes;
    }
    return assets;
  }
  async status(id: string) {
    const job = this.db.get(id); const steps = this.db.steps(id);
    const artifacts = steps.flatMap((s) => s.outputs);
    const integrity = [];
    for (const artifact of artifacts) { try { await this.artifacts.verify(artifact); integrity.push({hash: artifact.sha256, valid: true}); } catch (error) { integrity.push({hash: artifact.sha256, valid: false, error: errorInfo(error)}); } }
    const video = steps.find((s) => s.stage === 'RENDER')?.outputs[0];
    return {job, steps, integrity, events: this.db.events(id), output: job.status === 'succeeded' && integrity.every((i) => i.valid) && video ? this.artifacts.path(video) : null};
  }
  private fingerprint(stage: Stage, job: Job, outputs: Map<Stage, Artifact[]>): string {
    const hashes = (s: Stage) => (outputs.get(s) ?? []).map((a) => a.sha256);
    const dependency = stage === 'VALIDATE' ? job.spec : stage === 'RESOLVE_ASSETS' ? job.spec.assets
      : stage === 'RENDER' ? {spec: hashes('VALIDATE'), assets: hashes('RESOLVE_ASSETS')}
      : stage === 'VERIFY_MEDIA' ? {render: hashes('RENDER'), video: job.spec.video, scenes: job.spec.scenes.map((s) => s.durationFrames), audio: job.spec.audio}
      : {job: job.id, prior: [...outputs.entries()].map(([s, list]) => [s, list.map((a) => a.sha256)])};
    return sha256(canonical({stage, dependency, environment: stage === 'RESOLVE_ASSETS' ? {resolver: 'png-v1'} : job.environment}));
  }
  async run(id: string, externalSignal?: AbortSignal): Promise<Job> {
    const job = this.db.get(id);
    const env = await (this.options.environment ?? environment)();
    if (canonical(env) !== canonical(job.environment)) throw new EngineError('ENVIRONMENT_CHANGED', 'Source, dependency, browser or tool version changed. Submit the spec again to create a fresh job; old artifacts remain intact.');
    if (job.status === 'succeeded') {
      for (const step of this.db.steps(id)) for (const artifact of step.outputs) await this.artifacts.verify(artifact);
      return job;
    }
    const ttl = this.options.leaseMs ?? 30_000;
    const owner = this.db.claim(id, ttl);
    const controller = new AbortController();
    const cancel = () => controller.abort(externalSignal?.reason ?? new EngineError('CANCELLED', 'Execution cancelled', 'cancelled'));
    externalSignal?.addEventListener('abort', cancel, {once: true}); if (externalSignal?.aborted) cancel();
    const heartbeat = setInterval(() => {
      try { if (this.db.heartbeat(id, owner, ttl)) controller.abort(new EngineError('CANCELLED', 'Cancellation requested', 'cancelled')); }
      catch (error) { controller.abort(error); }
    }, Math.max(50, Math.min(1000, ttl / 3)));
    const outputs = new Map<Stage, Artifact[]>();
    try {
      await mkdir(join(this.root, 'tmp'), {recursive: true});
      for (const entry of await readdir(join(this.root, 'tmp'))) if (entry.startsWith(`${id}-`)) {const stale=join(this.root,'tmp',entry);await cleanupOwnedRuntimeTmp(stale);await rm(stale, {recursive: true, force: true, maxRetries: 3});}
      for (const stage of STAGES) {
        checkAbort(controller.signal);
        const fingerprint = this.fingerprint(stage, job, outputs);
        const prior = this.db.step(id, stage);
        if (prior?.status === 'succeeded') {
          if (prior.inputFingerprint !== fingerprint) throw new EngineError('CHECKPOINT_MISMATCH', `Checkpoint ${stage} no longer matches its dependencies`);
          for (const artifact of prior.outputs) await this.artifacts.verify(artifact);
          outputs.set(stage, prior.outputs); this.db.event(id, 'checkpoint_reused', {stage}); continue;
        }
        const cached = this.db.cached(fingerprint);
        if (cached) {
          for (const artifact of cached) await this.artifacts.verify(artifact);
          this.db.startStep(id, stage, fingerprint, owner); this.db.endStep(id, stage, owner, cached);
          outputs.set(stage, cached); this.db.event(id, 'cache_reused', {stage}); continue;
        }
        const maxAttempts = this.options.maxAttempts ?? 2;
        if ((prior?.attempt ?? 0) >= maxAttempts) throw new EngineError('RETRY_EXHAUSTED', `${stage} exhausted its ${maxAttempts} total attempts; inspect the error and submit corrected inputs`);
        for (let attempt = (prior?.attempt ?? 0) + 1; attempt <= maxAttempts; attempt++) {
          checkAbort(controller.signal); this.db.startStep(id, stage, fingerprint, owner);
          const stageController = new AbortController();
          const abortStage = () => stageController.abort(controller.signal.reason);
          controller.signal.addEventListener('abort', abortStage, {once: true});
          const timer = setTimeout(() => stageController.abort(new EngineError('TIMEOUT', `${stage} exceeded its stage deadline`, 'retryable')), this.options.stageTimeoutMs ?? 180_000);
          let directory: string | undefined;
          try {
            try {
              await mkdir(join(this.root, 'tmp'), {recursive: true});
              directory = await mkdtemp(join(this.root, 'tmp', `${id}-${stage}-`));
            } catch (error) { throw new EngineError('STAGE_SETUP', `${stage} could not create its attempt directory: ${error instanceof Error ? error.message : String(error)}`); }
            const result = await this.execute(stage, job, fingerprint, outputs, directory, stageController.signal);
            checkAbort(stageController.signal); this.db.endStep(id, stage, owner, result); outputs.set(stage, result); break;
          } catch (error) {
            this.db.endStep(id, stage, owner, error instanceof EngineError ? error.artifacts : [], error);
            if (errorInfo(error).classification !== 'retryable' || attempt === maxAttempts || controller.signal.aborted) throw error;
            this.db.event(id, 'retry_scheduled', {stage, nextAttempt: attempt + 1});
          } finally {
            clearTimeout(timer); controller.signal.removeEventListener('abort', abortStage);
            if (directory) {await cleanupOwnedRuntimeTmp(directory);await rm(directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});}
          }
        }
        // Fault injection is an API seam for tests only; CLI has no hidden fault switches.
        await this.options.afterStage?.(stage, this.db.get(id));
      }
      checkAbort(controller.signal); this.db.finish(id, owner); return this.db.get(id);
    } catch (error) {
      try { this.db.finish(id, owner, error); } catch { /* A fenced worker cannot modify the new owner's state. */ }
      throw error;
    } finally { clearInterval(heartbeat); externalSignal?.removeEventListener('abort', cancel); }
  }
  private async execute(stage: Stage, job: Job, fingerprint: string, outputs: Map<Stage, Artifact[]>, directory: string, signal: AbortSignal): Promise<Artifact[]> {
    checkAbort(signal);
    const json = (value: unknown) => this.artifacts.commit(canonical(value), 'application/json', stage, fingerprint);
    if (stage === 'VALIDATE') return [await json(parseSpec(job.spec))];
    if (stage === 'RESOLVE_ASSETS') {
      const bytes = await this.readAssets(job.spec, job.specDirectory); const result: Artifact[] = []; const resolved: Record<string, Artifact> = {};
      for (const asset of job.spec.assets) { checkAbort(signal); const blob = await this.artifacts.commit(bytes[asset.id]!, asset.mediaType, stage, fingerprint); result.push(blob); resolved[asset.id] = blob; }
      result.push(await json(resolved)); return result;
    }
    if (stage === 'RENDER') {
      const assetOutputs = outputs.get('RESOLVE_ASSETS')!;
      const resolved = await this.artifacts.readJson<Record<string, Artifact>>(assetOutputs.at(-1)!); const assets: Record<string, string> = {};
      for (const [id, artifact] of Object.entries(resolved)) { await this.artifacts.verify(artifact); assets[id] = `data:image/png;base64,${(await readFile(this.artifacts.path(artifact))).toString('base64')}`; }
      const path = await (this.options.renderer ?? new RemotionRenderer()).render({spec: job.spec, assets, directory, signal});
      checkAbort(signal);
      return [await this.artifacts.commit(await readFile(path), 'video/mp4', stage, fingerprint)];
    }
    if (stage === 'VERIFY_MEDIA') {
      const video = outputs.get('RENDER')![0]!; await this.artifacts.verify(video);
      const report = EvaluationResultSchema.parse(await (this.options.evaluator ?? verifyMedia)(this.artifacts.path(video), job.spec, video, signal));
      const artifact = await json(report);
      if (!report.passed) throw new EngineError('MEDIA_INVALID', `Media checks failed. Report: ${this.artifacts.path(artifact)}`, 'permanent', [artifact]);
      return [artifact];
    }
    // Final publication is a manifest, never an overwrite of the render artifact.
    for (const refs of outputs.values()) for (const artifact of refs) await this.artifacts.verify(artifact);
    return [await json({schemaVersion: '1.0', jobId: job.id, project: job.spec.project, inputFingerprint: job.inputFingerprint,
      environment: job.environment, artifacts: Object.fromEntries(outputs), evidence: job.spec.evidenceReferences,
      disclaimer: 'Synthetic M0 fixture. No repository content was fetched or executed. Silent audio policy.'})];
  }
}
