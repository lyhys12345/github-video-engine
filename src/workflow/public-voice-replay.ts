import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {Hash} from '../contracts/video.js';
import {EngineError, checkAbort} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {boundedFile, readTask} from '../story-planner/runtime.js';
import {readLocalTts} from '../tts/runtime.js';
import {NarrativeRunApproval} from './candidate-review.js';
import {isCompositionLanguage, publicVoicePresets} from './narration-voice-policy.js';
import type {prepareNarrativeRecording} from './narration-voice.js';
import {NarrativeCaptionSafeSpec, statusNarrativeCaptionSafe} from './narrative-audio-safe.js';
import {loadNarrativePlan} from './narrative.js';

const ImportMarker = z.object({schemaVersion: z.literal('portable-project-import/1.0'), digest: Hash});
const Project = z.object({
  schemaVersion: z.literal('repository-session-agent-project/1.0'), portableDigest: Hash,
  source: z.strictObject({schemaVersion: z.literal('repository-narrative-run-source/1.0'), taskId: Hash, bindingSha256: Hash}),
  currentTask: Hash, profile: z.literal('complete-technical-preview/1.0'),
});
const NarratedInput = z.object({narrativeTaskId: Hash, spec: NarrativeCaptionSafeSpec, runApproval: NarrativeRunApproval});
type Approval = z.infer<typeof NarrativeRunApproval>;
type Recording = Awaited<ReturnType<typeof prepareNarrativeRecording>>;
const fail = (message: string): never => {throw new EngineError('PUBLIC_VOICE_REPLAY', message);};

async function json(path: string) {
  return JSON.parse((await boundedFile(path, 16_000)).toString('utf8'));
}

/** Replay only the selected imported preview for the same exact previously reviewed candidate. */
export async function restorePortablePublicSpeech(
  workspace: string, source: z.infer<typeof Project>['source'], approval: Approval,
  scenes: {id: string; narration: string; execution: {kind: string}}[], language: string, signal: AbortSignal,
) {
  const recordings = new Map<string, Recording>();
  const markerPath = join(workspace, 'portable-import.json');
  try {await lstat(markerPath);} catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return recordings;
    throw error;
  }
  checkAbort(signal);
  const marker = ImportMarker.parse(await json(markerPath));
  const project = Project.parse(await json(join(workspace, 'project.json')));
  if (marker.digest !== project.portableDigest || canonical(source) !== canonical(project.source)) {
    return fail('Imported preview source or package binding differs.');
  }
  const data = join(workspace, 'state');
  const selected = await readTask(data, project.currentTask, null);
  const parsed = NarratedInput.safeParse(selected.input);
  if (!parsed.success || parsed.data.runApproval.authorSha256 !== approval.authorSha256) return recordings;
  const {narrativeTaskId, runApproval, spec} = parsed.data;
  if (canonical(runApproval) !== canonical(approval)) return recordings;
  if (!isCompositionLanguage(language) || spec.schemaVersion !== 'narrative-complete-narrated-preview/1.0' ||
      spec.language !== language || spec.importedVoiceLabel !== undefined) {
    return fail('Imported preview differs from the reviewed public preset selection.');
  }
  const parent = await loadNarrativePlan(data, narrativeTaskId, signal);
  if (parent.summary.startTaskId !== source.taskId || sha256(canonical(parent.plan.binding)) !== source.bindingSha256) {
    return fail('Imported narration belongs to a different pinned source.');
  }
  const status = await statusNarrativeCaptionSafe(data, project.currentTask, signal);
  if (status.schemaVersion !== 'narrative-complete-narrated-status/1.0') {
    return fail('Imported project has no verified complete narrated preview.');
  }
  const produced = scenes.filter(scene => scene.execution.kind === 'supported-story');
  if (spec.clips.length !== produced.length) return fail('Imported preview does not cover the selected scenes.');
  for (const scene of produced) {
    const clip = spec.clips.find(clip => clip.beatId === scene.id);
    if (!clip || clip.transcript !== scene.narration || clip.transcriptSha256 !== sha256(scene.narration)) {
      return fail('Imported clip differs from its exact scene transcript.');
    }
    const audio = await readLocalTts(data, clip.receiptFingerprint, signal);
    if (audio.input.text !== clip.transcript || audio.receiptArtifact.sha256 !== clip.receiptSha256 ||
        audio.receipt.artifact.sha256 !== clip.sourceAudioSha256 || !('publicVoice' in audio) || !audio.publicVoice ||
        audio.publicVoice.language !== language || audio.publicVoice.speaker !== publicVoicePresets[language]) {
      return fail('Imported clip does not bind the exact public voice generation and audio.');
    }
    const {captions: _captions, ...binding} = clip;
    recordings.set(scene.id, {samples: audio.publicVoice.samples * 3, generationTaskId: audio.publicVoice.taskId,
      generation: true, import: true, source: 'generated', clip: binding});
  }
  return recordings;
}
