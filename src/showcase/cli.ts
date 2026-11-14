import {join, resolve} from 'node:path';
import {sha256} from '../core/util.js';
import {boundedFile} from '../story-planner/runtime.js';
import {Hash, MAX_JSON, SOURCE_KIND, SourceInput, fail, json, openShowcase, showcaseStoryboardSha256, taskId} from './inputs.js';
import {exportShowcase, importShowcase} from './portable.js';
import {PreviewOptions, RENDER_KIND, renderShowcase, resumeShowcase, reviewShowcase, showcaseStatus} from './runtime.js';
import {lockShowcaseWorkspace, readShowcasePointer, workspaceShowcaseSource, writeShowcasePointer} from './workspace.js';

const help = 'showcase storyboard --spec <draft-manifest> | showcase render --spec <manifest> (--data <state> | --workspace <URL workspace> --review <script report>) [--out <new-dir>] | showcase status/resume/export/review --data <state> --task <id> | showcase import --package <bundle> --digest <sha256> --workspace <new-dir>';
const previewFlags = ['frames-only', 'skip-stills', 'still-frames'];
const allowed = {
  storyboard: ['spec'],
  render: ['spec', 'data', 'workspace', 'review', 'out', ...previewFlags],
  status: ['data', 'workspace', 'task'],
  resume: ['data', 'workspace', 'task', 'out', ...previewFlags],
  review: ['data', 'workspace', 'task', 'review'],
  export: ['data', 'workspace', 'task', 'out'],
  import: ['package', 'digest', 'workspace'],
} as const;
const usage = () => fail(help, 'USAGE');
function preview(flags: Record<string, unknown>) {
  const selected = flags['still-frames'];
  if (flags['skip-stills'] && selected !== undefined || selected !== undefined &&
      (typeof selected !== 'string' || !/^\d{1,4}(,\d{1,4}){0,299}$/.test(selected))) usage();
  return PreviewOptions.parse({mode: flags['frames-only'] ? 'frames-only' : 'movie',
    stills: typeof selected === 'string' ? [...new Set(selected.split(',').map(Number))].sort((a, b) => a - b) :
      flags['skip-stills'] ? [] : 'default'});
}

async function checkWorkspaceTask(data: string, id: string, expectedSourceSha256: string) {
  const runner = await openShowcase(data);
  try {
    const task = runner.get(Hash.parse(id));
    const sourceId = task?.kind === SOURCE_KIND ? task.id : task?.kind === RENDER_KIND ?
      Hash.parse((task.input as {sourceTaskId?: string}).sourceTaskId) : undefined;
    const source = sourceId ? runner.get(sourceId) : undefined;
    if (!source || source.kind !== SOURCE_KIND || source.state !== 'succeeded') {
      fail('Use a source or render task from this URL workspace.', 'SHOWCASE_TASK');
    }
    const sourceInput = SourceInput.parse(source.input);
    if (taskId(SOURCE_KIND, sourceInput) !== source.id || sourceInput.provenance?.sourceSha256 !== expectedSourceSha256 ||
        (task?.kind === RENDER_KIND && taskId(RENDER_KIND, task.input) !== task.id)) {
      fail('Showcase task belongs to another source capture or a standalone run.', 'SHOWCASE_TASK');
    }
  } finally { runner.close(); }
}

export async function showcaseCommand(pos: string[], flags: Record<string, unknown>, signal: AbortSignal): Promise<unknown> {
  const action = pos[1] as keyof typeof allowed;
  const entries = Object.entries(flags);
  if (pos.length !== 2 || !Object.hasOwn(allowed, action) ||
      entries.some(([key, value]) => value !== undefined &&
        (!(allowed[action] as readonly string[]).includes(key) || typeof value !== (key === 'frames-only' || key === 'skip-stills' ? 'boolean' : 'string')))) usage();
  const value = (key: string) => typeof flags[key] === 'string' ? flags[key] as string : undefined;
  const need = (key: string) => value(key) || usage();
  const workspace = value('workspace'), out = value('out');
  if (action === 'storyboard') return {schemaVersion: 'showcase-storyboard/1.0',
    storyboardSha256: showcaseStoryboardSha256(json(await boundedFile(resolve(need('spec')), MAX_JSON)))};
  if (action === 'import') return importShowcase(need('package'), need('digest'), need('workspace'), signal);
  if (workspace && value('data')) usage();
  const data = workspace ? join(resolve(workspace), 'state') : need('data');
  if (action === 'status') {
    if (workspace && !value('task')) {
      const current = await readShowcasePointer(workspace);
      return {current: current ?? null, tasks: await showcaseStatus(data, current?.taskId)};
    }
    return showcaseStatus(data, value('task'));
  }
  if (action === 'render') {
    const spec = need('spec');
    if (!workspace) {
      if (value('review')) usage();
      return renderShowcase(data, spec, preview(flags), signal, out);
    }
    const reviewPath = need('review');
    const release = await lockShowcaseWorkspace(resolve(workspace));
    try {
      const source = await workspaceShowcaseSource(workspace, signal);
      const review = await boundedFile(resolve(reviewPath), MAX_JSON);
      const result = await renderShowcase(data, spec, preview(flags), signal, out, {source, review});
      if (result.candidateSha256) await writeShowcasePointer(workspace, {
        taskId: result.taskId, sourceTaskId: result.sourceTaskId, candidateSha256: result.candidateSha256,
      });
      return result;
    } finally { await release(); }
  }
  const task = need('task');
  if (action === 'resume') {
    const options = previewFlags.some(flag => flags[flag] !== undefined) ? preview(flags) : undefined;
    if (!workspace) return resumeShowcase(data, task, signal, out, options);
    const release = await lockShowcaseWorkspace(resolve(workspace));
    try {
      await checkWorkspaceTask(data, task, sha256(await workspaceShowcaseSource(workspace, signal)));
      const result = await resumeShowcase(data, task, signal, out, options);
      if (result.candidateSha256) await writeShowcasePointer(workspace, {
        taskId: result.taskId, sourceTaskId: result.sourceTaskId, candidateSha256: result.candidateSha256,
      });
      return result;
    } finally { await release(); }
  }
  if (action === 'review') return reviewShowcase(data, task, resolve(need('review')), signal);
  if (action === 'export') return exportShowcase(data, task, need('out'), signal);
  return usage();
}
