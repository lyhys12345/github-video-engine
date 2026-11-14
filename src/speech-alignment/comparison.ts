import {roundedSeconds, type TimeSpan} from './audio.js';
import type {SpeechAlignmentRequest, TimingPhrase} from './contracts.js';

type ComparisonUnit = {value: string; index: number};
type RecognizedWord = TimingPhrase['words'][number] & {rejected: boolean};
type Proposed = TimeSpan & {confidence: number | null};

function candidateSpan(words: RecognizedWord[]): Proposed | undefined {
  const first = words[0];
  const last = words.at(-1);
  if (!first || !last || words.some(word => word.rejected || word.startSeconds === null)
    || first.startSeconds === null || last.endSeconds === null) return;
  return {
    startSeconds: first.startSeconds,
    endSeconds: last.endSeconds,
    confidence: words.every(word => word.confidence !== null) ? Math.min(...words.map(word => word.confidence!)) : null,
  };
}

const comparisonUnits = (text: string) => text.normalize('NFC').toLowerCase()
  .match(/[\p{Script=Han}]|[\p{L}\p{M}\p{N}]+/gu)?.flatMap(group =>
    group.match(/[\p{Script=Han}]|[^\p{Script=Han}]+/gu) ?? []) ?? [];

function orderedMatches(expected: ComparisonUnit[], actual: ComparisonUnit[]) {
  const width = actual.length + 1;
  const scores = new Uint16Array((expected.length + 1) * width);
  for (let i = expected.length - 1; i >= 0; i--) {
    for (let j = actual.length - 1; j >= 0; j--) {
      const offset = i * width + j;
      scores[offset] = expected[i]!.value === actual[j]!.value
        ? scores[offset + width + 1]! + 1 : Math.max(scores[offset + width]!, scores[offset + 1]!);
    }
  }
  const matched = new Map<number, number>();
  let left = 0;
  let right = 0;
  while (left < expected.length && right < actual.length) {
    const offset = left * width + right;
    if (expected[left]!.value === actual[right]!.value) {
      matched.set(left++, right++);
    } else if (scores[offset + width]! >= scores[offset + 1]!) {
      left++;
    } else {
      right++;
    }
  }
  return matched;
}

export function timelineComparison(request: SpeechAlignmentRequest, phrases: TimingPhrase[]) {
  const segmenter = new Intl.Segmenter(request.locale, {granularity: 'word'});
  const expectedWords = [...segmenter.segment(request.transcript)].filter(word => word.isWordLike);
  const recognizedWords: RecognizedWord[] = phrases.flatMap(phrase =>
    phrase.words.map(word => ({...word, rejected: phrase.rejected})));
  const expected = expectedWords.flatMap((word, index) => comparisonUnits(word.segment).map(value => ({value, index})));
  const actual = recognizedWords.flatMap((word, index) => comparisonUnits(word.text).map(value => ({value, index})));

  // Caller and backend phrase segmentation may differ, especially for Chinese.
  // Compare in order using Han characters and lexical runs, then retain complete backend ranges only.
  if (expected.length > 4_000 || actual.length > 4_000 || recognizedWords.length > 4_000) {
    throw Error('Speech timing evidence exceeds the 4,000-unit comparison limit.');
  }
  const matching = orderedMatches(expected, actual);
  const expectedUnitsByWord = new Map<number, number[]>();
  for (const [index, unit] of expected.entries()) {
    const indices = expectedUnitsByWord.get(unit.index) ?? [];
    indices.push(index);
    expectedUnitsByWord.set(unit.index, indices);
  }
  const actualOwners = new Map<number, Set<number>>();
  const matchedUnitsByActualWord = new Map<number, number>();
  const actualIndexByExpectedWord = new Map<number, Set<number>>();
  for (const [i, j] of matching) {
    const expectedWord = expected[i]!.index;
    const actualWord = actual[j]!.index;
    const actualWordOwners = actualOwners.get(actualWord) ?? new Set<number>();
    actualWordOwners.add(expectedWord);
    actualOwners.set(actualWord, actualWordOwners);
    matchedUnitsByActualWord.set(actualWord, (matchedUnitsByActualWord.get(actualWord) ?? 0) + 1);
    const expectedWordMatches = actualIndexByExpectedWord.get(expectedWord) ?? new Set<number>();
    expectedWordMatches.add(actualWord);
    actualIndexByExpectedWord.set(expectedWord, expectedWordMatches);
  }
  const timedSlice = (indices: number[], expectedStart: number, expectedEnd: number) => {
    if (!indices.every((index, i) => (i === 0 || index === indices[i - 1]! + 1)
      && comparisonUnits(recognizedWords[index]!.text).length === matchedUnitsByActualWord.get(index)
      && [...actualOwners.get(index)!].every(owner => owner >= expectedStart && owner <= expectedEnd))) return;
    return candidateSpan(indices.map(index => recognizedWords[index]!));
  };
  const words = expectedWords.map((word, index) => {
    const units = expectedUnitsByWord.get(index) ?? [];
    const matchedUnitCount = units.filter(index => matching.has(index)).length;
    const matched = units.length > 0 && matchedUnitCount === units.length;
    const indices = [...(actualIndexByExpectedWord.get(index) ?? [])];
    return {
      index, text: word.segment, transcriptUtf16Offset: word.index, matchedUnitCount, expectedUnitCount: units.length,
      recognition: matched ? 'matched' as const : matchedUnitCount ? 'partial' as const : 'unmatched' as const,
      timing: matched ? timedSlice(indices, index, index) ?? null : null,
    };
  });
  let cursor = 0;
  let nextWord = 0;
  const approvedPhrases = request.phrases.map(phrase => {
    cursor += phrase.text.length;
    const from = nextWord;
    while (nextWord < expectedWords.length && expectedWords[nextWord]!.index < cursor) nextWord++;
    const selected = words.slice(from, nextWord);
    const matched = selected.length > 0 && selected.every(word => word.recognition === 'matched');
    const indices = [...new Set(selected.flatMap(word => [...(actualIndexByExpectedWord.get(word.index) ?? [])]))];
    return {
      id: phrase.id, text: phrase.text, wordIndices: selected.map(word => word.index),
      timing: matched ? timedSlice(indices, from, nextWord - 1) ?? null : null,
    };
  });
  return {
    approvedPhrases, words,
    unmatchedRecognitionWords: recognizedWords.flatMap((word, index) => {
      const unitCount = comparisonUnits(word.text).length;
      const unmatchedUnits = unitCount - (matchedUnitsByActualWord.get(index) ?? 0);
      return unmatchedUnits > 0 ? [{...word, unmatchedUnits}] : [];
    }),
  };
}

export function buildFindings(
  request: SpeechAlignmentRequest,
  timeline: ReturnType<typeof timelineComparison>,
  phrases: TimingPhrase[],
  silence: (TimeSpan & {durationSeconds: number; kind: 'internal' | 'leading' | 'trailing' | 'entire'; intentionalPauseId: string | null})[],
  contentEvidence: 'recognition' | 'forced-alignment' | 'unavailable',
) {
  const findings: Record<string, unknown>[] = [];
  if (contentEvidence === 'unavailable') {
    findings.push({kind: 'speech-timing-unavailable', review: 'required'});
  } else {
    for (const [index, phrase] of phrases.entries()) {
      if (phrase.rejected || phrase.confidence === null || phrase.confidence < request.settings.minimumConfidence) {
        findings.push({kind: 'low-confidence-recognized-phrase', phraseIndex: index, confidence: phrase.confidence, rejected: phrase.rejected, review: 'required'});
      }
    }
    for (const word of timeline.words) {
      if (word.recognition !== 'matched') {
        findings.push({kind: contentEvidence === 'recognition' ? 'possible-missing-word' : 'unmatched-alignment-word',
          wordIndex: word.index, text: word.text, recognition: word.recognition, review: 'required'});
      } else if (!word.timing || word.timing.confidence === null || word.timing.confidence < request.settings.minimumConfidence) {
        findings.push({kind: 'low-confidence-word-timing', wordIndex: word.index, text: word.text,
          confidence: word.timing?.confidence ?? null, reason: word.timing ? 'provider-confidence' : 'no-distinct-timed-range',
          review: 'required'});
      }
    }
    for (const phrase of timeline.approvedPhrases) {
      if (!phrase.timing || phrase.timing.confidence === null || phrase.timing.confidence < request.settings.minimumConfidence) {
        findings.push({kind: 'low-confidence-approved-phrase-timing', phraseId: phrase.id,
          confidence: phrase.timing?.confidence ?? null, review: 'required'});
      }
    }
    for (const word of timeline.unmatchedRecognitionWords) {
      findings.push({kind: 'unmatched-recognition-word', ...word, review: 'required'});
    }
  }

  for (const span of silence) {
    if (span.kind === 'entire') findings.push({kind: 'entire-recording-silence', startSeconds: span.startSeconds,
      endSeconds: span.endSeconds, durationSeconds: span.durationSeconds, review: 'required'});
    if (span.kind !== 'internal' || span.durationSeconds < request.settings.longPauseSeconds || span.intentionalPauseId) continue;
    findings.push({kind: 'long-internal-pause', startSeconds: span.startSeconds, endSeconds: span.endSeconds,
      durationSeconds: span.durationSeconds, review: 'required'});
  }

  const actionAnchors = request.actionAnchors.map(anchor => {
    const target = anchor.target;
    const timing = target.kind === 'phrase'
      ? timeline.approvedPhrases.find(phrase => phrase.id === target.phraseId)?.timing
      : timeline.words[target.wordIndex]?.timing;
    const observedSeconds = timing ? (anchor.edge === 'start' ? timing.startSeconds : timing.endSeconds) : null;
    const offsetSeconds = observedSeconds === null ? null : roundedSeconds(observedSeconds - anchor.expectedSeconds);
    const confidence = timing?.confidence ?? null;
    const discrepancy = offsetSeconds !== null && Math.abs(offsetSeconds) > anchor.toleranceSeconds;
    const status = offsetSeconds === null ? 'UNAVAILABLE' : discrepancy ? 'OFFSET_EXCEEDS_TOLERANCE' : 'WITHIN_TOLERANCE';
    const confidenceStatus = confidence === null ? 'UNKNOWN' : confidence < request.settings.minimumConfidence ? 'LOW' : 'ABOVE_THRESHOLD';
    if (status !== 'WITHIN_TOLERANCE' || confidenceStatus !== 'ABOVE_THRESHOLD') {
      findings.push({kind: status === 'OFFSET_EXCEEDS_TOLERANCE' ? 'action-anchor-offset' : 'action-anchor-needs-review',
        anchorId: anchor.id, status, confidenceStatus, review: 'required'});
    }
    return {...anchor, observedSeconds, offsetSeconds, status, confidence, confidenceStatus};
  });

  return {actionAnchors, findings};
}
