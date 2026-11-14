import {extname, resolve} from 'node:path';
import {sha256} from '../core/util.js';
import {draftCaptionTimingFromSavedReport} from '../speech-alignment/caption-draft.js';
import {SpeechAlignmentRequest} from '../speech-alignment/contracts.js';
import {boundedFile} from '../story-planner/runtime.js';
import type {AudienceAuditRequest} from './audience-contract.js';
import {MAX_JSON, fail, json, type Manifest} from './inputs.js';
import type {showcaseTimeline} from './timeline.js';

export type AudienceSpeechLine = {
  draft: ReturnType<typeof draftCaptionTimingFromSavedReport>;
  method: 'recognition' | 'forced-alignment' | null;
  requestBytes: Buffer;
  reportBytes: Buffer;
};

export async function loadAudienceSpeech(
  alignments: AudienceAuditRequest['speechAlignment'], base: string, manifest: Manifest, assets: ReadonlyMap<string, Buffer>,
  timeline: ReturnType<typeof showcaseTimeline>,
) {
  const lines = new Map<string, AudienceSpeechLine>();
  for (const alignment of alignments) {
    const {lineId, request, report} = alignment;
    const line = manifest.narration.find(row => row.id === lineId);
    const segment = timeline.timeline.segments.find(row => row.id === lineId);
    if (!line || !segment || extname(line.path).toLowerCase() !== '.wav') {
      fail('Speech evidence needs an exact original WAV narration line: ' + lineId, 'SHOWCASE_AUDIENCE_BINDING');
    }
    const [requestBytes, reportBytes] = await Promise.all([
      boundedFile(resolve(base, request.path), MAX_JSON), boundedFile(resolve(base, report.path), MAX_JSON),
    ]);
    if (sha256(requestBytes) !== request.sha256 || sha256(reportBytes) !== report.sha256) {
      fail('Saved speech request or report bytes differ for line ' + lineId, 'SHOWCASE_AUDIENCE_BINDING');
    }
    const rawRequest = json(requestBytes);
    const parsed = SpeechAlignmentRequest.parse(rawRequest);
    if (parsed.approval.kind !== 'showcase-script-approval' || parsed.approval.sha256 !== manifest.approval.sha256 ||
        parsed.approval.scriptSha256 !== manifest.script.sha256 || parsed.approval.lineId !== lineId ||
        parsed.audio.sha256 !== line.sha256 || parsed.audio.bytes !== assets.get(line.path)!.length ||
        parsed.transcript !== segment.text || parsed.transcriptSha256 !== line.transcriptSha256 ||
        sha256(parsed.transcript) !== line.transcriptSha256) {
      fail('Saved speech evidence differs from the exact approved WAV and transcript for line ' + lineId, 'SHOWCASE_AUDIENCE_BINDING');
    }
    const draft = draftCaptionTimingFromSavedReport(reportBytes, report.sha256, rawRequest,
      {audioSha256: line.sha256, audioStartFrame: segment.startFrame, fps: 30});
    const saved = json(reportBytes) as {status: string; audio: {durationSeconds: number}};
    const method = draft.adapter.kind !== 'unavailable' && (draft.adapter.method === 'recognition' ||
      draft.adapter.method === 'forced-alignment') ? draft.adapter.method : null;
    if ((draft.adapter.kind === 'unavailable') !== (saved.status === 'AUDIO_DIAGNOSTICS_ONLY') ||
        (draft.adapter.kind !== 'unavailable' && method === null) ||
        (draft.adapter.kind === 'windows-desktop-speech' && method !== 'recognition') ||
        Math.abs(saved.audio.durationSeconds - segment.sourceSamples / 24000) > 0.001 ||
        draft.cues.some((cue, index) => {
          const previous = draft.cues.slice(0, index).findLast(other => other.sourceTiming !== null);
          return cue.sourceTiming !== null && previous?.sourceTiming &&
            previous.sourceTiming.endSeconds > cue.sourceTiming.startSeconds;
        })) {
      fail('Saved speech evidence has contradictory provenance or original WAV timing for line ' + lineId, 'SHOWCASE_AUDIENCE_BINDING');
    }
    lines.set(lineId, {draft, method, requestBytes, reportBytes});
  }
  return lines;
}

