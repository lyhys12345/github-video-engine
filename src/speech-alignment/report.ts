import {dirname, resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {checkAbort, EngineError} from '../core/errors.js';
import {canonical, sha256} from '../core/util.js';
import {ancestors, boundedFile} from '../story-planner/runtime.js';
import {inspectWav, maxWavBytes, roundedSeconds} from './audio.js';
import {ImportedSpeechTimings, ShowcaseApproval, ShowcaseScript, SpeechAlignmentRequest, TranscriptApproval, type TimingPhrase} from './contracts.js';
import {buildFindings, timelineComparison} from './comparison.js';
import {recognizeWindowsSpeech, type WindowsRecognition} from './windows.js';
import {draftCaptionTimingFromSavedReport, SpeechCaptionDraftInput} from './caption-draft.js';

const maxJsonBytes = 2_000_000;
const decode = (bytes: Buffer): unknown => JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
const fail = (message: string): never => { throw new EngineError('ALIGNMENT_BINDING', message); };

function verifyApproval(request: SpeechAlignmentRequest, receipt: Buffer, script?: Buffer) {
  if (sha256(receipt) !== request.approval.sha256) fail('Approval receipt hash differs from the alignment request.');
  if (request.approval.kind === 'transcript-approval') {
    if (script !== undefined) fail('Use --script only with a showcase script approval.');
    const approval = TranscriptApproval.parse(decode(receipt));
    if (approval.transcript !== request.transcript || approval.transcriptSha256 !== request.transcriptSha256) {
      fail('Approval receipt does not cover the exact transcript.');
    }
    return;
  }
  const approval = ShowcaseApproval.parse(decode(receipt));
  if (!script || sha256(script) !== approval.scriptSha256 || approval.scriptSha256 !== request.approval.scriptSha256) {
    return fail('Showcase alignment requires the exact approved script file.');
  }
  const lineId = request.approval.lineId;
  const matchingLines = ShowcaseScript.parse(decode(script)).lines.filter(([id]) => id === lineId);
  if (matchingLines.length !== 1 || matchingLines[0]?.[1] !== request.transcript) {
    fail('The approved showcase script does not contain the exact transcript at the requested line.');
  }
}

function verifyExpectedRanges(request: SpeechAlignmentRequest, duration: number) {
  if (!request.intentionalPauses.every(pause => pause.endSeconds <= duration)
    || !request.actionAnchors.every(anchor => anchor.expectedSeconds <= duration)) {
    fail('Action anchors and intentional pauses must use the original WAV clock.');
  }
}

function verifyTimingRanges(phrases: TimingPhrase[], duration: number) {
  let lastPhraseEnd = 0;
  for (const phrase of phrases) {
    const limit = 0.001;
    if (phrase.startSeconds + limit < lastPhraseEnd || phrase.endSeconds > duration + limit) {
      fail('Speech timing phrases overlap or exceed the decoded WAV duration.');
    }
    lastPhraseEnd = phrase.endSeconds;
    let lastWordEnd = phrase.startSeconds;
    for (const word of phrase.words) {
      if (word.startSeconds === null || word.endSeconds === null) continue;
      if (word.startSeconds + limit < lastWordEnd || word.endSeconds > phrase.endSeconds + limit
        || word.endSeconds > duration + limit) {
        fail('Speech timing words overlap or fall outside their phrase/audio range.');
      }
      lastWordEnd = word.endSeconds;
    }
  }
}

type AlignmentSource = {
  request: unknown;
  approval: Buffer;
  script?: Buffer;
  audio: Buffer;
  timingEvidence?: Buffer;
  windowsSpeech?: boolean;
  signal: AbortSignal;
};

export async function inspectSpeechAlignment({request: raw, audio, approval, script, timingEvidence, windowsSpeech, signal}: AlignmentSource) {
  checkAbort(signal);
  const request = SpeechAlignmentRequest.parse(raw);
  if (sha256(request.transcript) !== request.transcriptSha256
    || request.phrases.map(phrase => phrase.text).join('') !== request.transcript) {
    fail('Ordered phrase text must concatenate to the exact approved transcript and match its SHA-256.');
  }
  if (audio.length !== request.audio.bytes || sha256(audio) !== request.audio.sha256) fail('WAV hash or byte count differs.');
  verifyApproval(request, approval, script);

  const words = [...new Intl.Segmenter(request.locale, {granularity: 'word'}).segment(request.transcript)]
    .filter(word => word.isWordLike);
  if (words.length === 0) fail('Approved transcript must contain at least one usable word.');
  let offset = 0;
  let wordIndex = 0;
  for (const phrase of request.phrases) {
    offset += phrase.text.length;
    const firstWord = wordIndex;
    while (wordIndex < words.length && words[wordIndex]!.index < offset) wordIndex++;
    if (firstWord === wordIndex || words[wordIndex - 1]!.index + words[wordIndex - 1]!.segment.length > offset) {
      fail('Each phrase must contain at least one complete transcript word and preserve word boundaries.');
    }
  }
  const ids = [request.phrases, request.actionAnchors, request.intentionalPauses];
  if (ids.some(rows => new Set(rows.map(item => item.id)).size !== rows.length)) fail('Alignment request contains duplicate IDs.');
  for (const anchor of request.actionAnchors) {
    const target = anchor.target;
    if (target.kind === 'word'
      ? !words[target.wordIndex]
      : !request.phrases.some(phrase => phrase.id === target.phraseId)) fail('Action anchor targets an unknown transcript phrase or word.');
  }
  if (timingEvidence && windowsSpeech) fail('Choose one timing adapter per report.');

  const imported = timingEvidence ? ImportedSpeechTimings.parse(decode(timingEvidence)) : undefined;
  if (imported && (imported.audioSha256 !== request.audio.sha256 || imported.transcriptSha256 !== request.transcriptSha256
    || Intl.getCanonicalLocales(imported.locale)[0] !== Intl.getCanonicalLocales(request.locale)[0])) {
    fail('Timing evidence differs from the exact transcript, WAV, or locale.');
  }

  let windows: WindowsRecognition | undefined;
  let unavailableReason: string | undefined;
  const wav = await inspectWav(audio, request.settings, signal, windowsSpeech ? async (path, childSignal) => {
    try {
      windows = await recognizeWindowsSpeech(path, request.locale, childSignal);
    } catch (error) {
      checkAbort(childSignal);
      unavailableReason = error instanceof Error ? error.message : String(error);
    }
  } : undefined);
  verifyExpectedRanges(request, wav.durationSeconds);

  const adapter = imported && timingEvidence
    ? {kind: 'imported-local' as const, method: imported.method, provider: imported.provider,
      providerVersion: imported.providerVersion, model: imported.model, confidenceMeaning: imported.confidenceMeaning,
      evidenceSha256: sha256(timingEvidence), provenanceVerification: 'caller-declared local tool and model'}
    : windows
      ? {kind: 'windows-desktop-speech' as const, method: 'recognition' as const, provider: 'Microsoft System.Speech',
        providerVersion: windows.engineVersion, model: windows.recognizer.id, modelDescription: windows.recognizer.description,
        confidenceMeaning: 'Raw recognizer confidence on a 0–1 scale. Scores are backend-specific.',
        evidenceSha256: windows.outputSha256, recognitionAudioSha256: windows.recognitionAudioSha256, adapterSha256: windows.adapterSha256}
      : {kind: 'unavailable' as const, requested: windowsSpeech ? 'windows-desktop-speech' : null,
        reason: unavailableReason ?? 'No local timing adapter was selected.'};
  const phrases = imported?.phrases ?? windows?.phrases ?? [];
  verifyTimingRanges(phrases, wav.durationSeconds);
  const timeline = timelineComparison(request, phrases);
  const silence = wav.spans.map(span => {
    const leading = span.startSeconds < 0.001;
    const trailing = Math.abs(span.endSeconds - wav.durationSeconds) < 0.001;
    const kind = leading && trailing ? 'entire' as const
      : leading ? 'leading' as const : trailing ? 'trailing' as const : 'internal' as const;
    const pause = request.intentionalPauses.find(pause => pause.startSeconds <= span.startSeconds + 0.001
      && pause.endSeconds >= span.endSeconds - 0.001);
    return {...span, kind, durationSeconds: roundedSeconds(span.endSeconds - span.startSeconds), intentionalPauseId: pause?.id ?? null};
  });
  const findings = buildFindings(request, timeline, phrases, silence, adapter.kind === 'unavailable' ? 'unavailable' : adapter.method);
  checkAbort(signal);
  return {
    schemaVersion: 'speech-alignment-report/1.0' as const,
    status: (adapter.kind === 'unavailable' ? 'AUDIO_DIAGNOSTICS_ONLY' : 'PROPOSED_UNREVIEWED') as
      'AUDIO_DIAGNOSTICS_ONLY' | 'PROPOSED_UNREVIEWED',
    renderable: false as const,
    review: {speechContent: 'UNVERIFIED', timing: 'UNVERIFIED', naturalness: 'UNVERIFIED', ownerAcceptance: 'pending'} as const,
    binding: {requestSha256: sha256(canonical(request)), transcriptSha256: request.transcriptSha256,
      audio: request.audio, approval: request.approval, locale: request.locale},
    adapter,
    audio: {durationSeconds: wav.durationSeconds, ffmpegVersion: wav.ffmpegVersion, silence,
      intentionalPauses: request.intentionalPauses},
    settings: request.settings,
    phrases: timeline.approvedPhrases,
    words: timeline.words.map(word => adapter.kind === 'unavailable' ? {...word, recognition: 'unavailable' as const} : word),
    backendPhrases: phrases,
    ...findings,
  };
}

async function writeReport(outputPath: string, value: unknown, signal: AbortSignal) {
  const output = resolve(outputPath);
  await ancestors(dirname(output));
  checkAbort(signal);
  await writeFile(output, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  return output;
}

async function captionDraftCommand(args: Record<string, unknown>, signal: AbortSignal) {
  const {spec, request, out} = args;
  if (Object.entries(args).some(([key, value]) => value !== undefined && !['spec', 'request', 'out'].includes(key))
    || typeof spec !== 'string' || typeof request !== 'string' || typeof out !== 'string') {
    throw new EngineError('USAGE', 'Usage: pnpm gve alignment cues --spec <caption-draft-input> --request <alignment-request> --out <new-json>');
  }
  const specPath = resolve(spec);
  const [specBytes, requestBytes] = await Promise.all([
    boundedFile(specPath, maxJsonBytes), boundedFile(resolve(request), maxJsonBytes),
  ]);
  const input = SpeechCaptionDraftInput.parse(decode(specBytes));
  const report = await boundedFile(resolve(dirname(specPath), input.reportPath), maxJsonBytes);
  const draft = draftCaptionTimingFromSavedReport(report, input.reportSha256, decode(requestBytes), input.clock);
  return {...draft, output: await writeReport(out, draft, signal)};
}

export async function speechAlignmentCommand(positionals: string[], args: Record<string, unknown>, signal: AbortSignal) {
  if (positionals.join(' ') === 'alignment cues') return captionDraftCommand(args, signal);
  const {request, audio, approval, script, timings, out, 'windows-speech': windowsSpeech} = args;
  const allowed = ['request', 'audio', 'approval', 'script', 'timings', 'out', 'windows-speech'];
  if (positionals.join(' ') !== 'alignment report'
    || Object.entries(args).some(([key, value]) => value !== undefined && !allowed.includes(key))
    || typeof request !== 'string' || typeof audio !== 'string' || typeof approval !== 'string'
    || (script !== undefined && typeof script !== 'string') || (timings !== undefined && typeof timings !== 'string')
    || (out !== undefined && typeof out !== 'string') || (timings && windowsSpeech)) {
    throw new EngineError('USAGE', 'Usage: pnpm gve alignment report --request <json> --audio <wav> --approval <receipt> [--script <approved-showcase-script>] [--timings <json> | --windows-speech] [--out <new-json>]');
  }
  const jsonFile = (file: string) => boundedFile(resolve(file), maxJsonBytes);
  const [requestBytes, audioBytes, approvalBytes, scriptBytes, timingEvidence] = await Promise.all([
    jsonFile(request), boundedFile(resolve(audio), maxWavBytes), jsonFile(approval),
    script ? jsonFile(script) : undefined, timings ? jsonFile(timings) : undefined,
  ]);
  const report = await inspectSpeechAlignment({request: decode(requestBytes), audio: audioBytes, approval: approvalBytes,
    script: scriptBytes, timingEvidence, windowsSpeech: windowsSpeech === true, signal});
  if (!out) return report;
  return {...report, output: await writeReport(out, report, signal)};
}
