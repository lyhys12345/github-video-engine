import {EngineError} from '../core/errors.js';
import {CAPTION_FONT_SIZE, CAPTION_TEXT_WIDTH, type CaptionLine} from './caption-layout-style.js';

const graphemes = new Intl.Segmenter('und', {granularity: 'grapheme'});
const asciiToken = /^[!-~]$/u;
const supported = /^[\u0020-\u007E\p{Script=Han}\p{Script=Latin}，。！？、；：‘’“”「」『』（）《》〈〉【】〔〕…—–·％＋－＝]$/u;
const opening = /^[([{<‘“「『（《〈【〔]$/u;
const closing = /^[)\]}>’”」』）》〉】〕，。！？、；：,.!?:;%％…]$/u;
const sentenceEnd = /^[。！？.!?]$/u;
const clauseEnd = /^[、，；：,;:]$/u;

function reject(reason: string): never {
  throw new EngineError('PRESENTATION_CAPTION_LAYOUT',
    reason + ' Use shorter cues in presentation-voice-bindings/1.1 and keep the original transcript.');
}

// Read the default advances from the SHA-256-pinned Noto Sans SC sfnt. The
// styled Chromium run also measures the actual layout at the displayed weight.
export function fontMetrics(font: Buffer, invalid = reject) {
  const offsets = new Map<string, number>();
  for (let i = 0; i < font.readUInt16BE(4); i++) {
    const record = 12 + 16 * i;
    offsets.set(font.toString('ascii', record, record + 4), font.readUInt32BE(record + 8));
  }
  const table = (tag: string) => offsets.get(tag) ?? invalid('Missing caption font table ' + tag + '.');
  const cmap = table('cmap');
  let unicode = 0;
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const record = cmap + 4 + 8 * i;
    if (font.readUInt16BE(record) === 3 && font.readUInt16BE(record + 2) === 10) {
      unicode = cmap + font.readUInt32BE(record + 4);
    }
  }
  if (!unicode || font.readUInt16BE(unicode) !== 12) invalid('Missing caption font Unicode map.');
  const groups = font.readUInt32BE(unicode + 12);
  const units = font.readUInt16BE(table('head') + 18);
  const advances = font.readUInt16BE(table('hhea') + 34);
  const hmtx = table('hmtx');
  return (codePoint: number) => {
    let low = 0, high = groups - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const record = unicode + 16 + 12 * mid;
      const start = font.readUInt32BE(record);
      if (codePoint < start) high = mid - 1;
      else if (codePoint > font.readUInt32BE(record + 4)) low = mid + 1;
      else {
        const glyph = font.readUInt32BE(record + 8) + codePoint - start;
        if (glyph) return font.readUInt16BE(hmtx + 4 * Math.min(glyph, advances - 1)) * CAPTION_FONT_SIZE / units;
        break;
      }
    }
    return invalid('The pinned font lacks U+' + codePoint.toString(16).toUpperCase() + '.');
  };
}

export function layoutCaptions(font: Buffer, transcripts: readonly string[], options: {
  fontSize: number;
  width: number;
} = {fontSize: CAPTION_FONT_SIZE, width: CAPTION_TEXT_WIDTH}): CaptionLine[][] {
  const advance = fontMetrics(font);
  return transcripts.map((text, index) => {
    const width = [0];
    const pieces = [...graphemes.segment(text)];
    for (const {segment} of pieces) {
      const composed = segment.normalize('NFC');
      if (!supported.test(composed)) reject('Cue ' + (index + 1) + ' contains a grapheme outside the supported caption repertoire.');
      // Keep 1px per grapheme plus outer slack for variation/ink differences.
      width.push(width.at(-1)! + advance(composed.codePointAt(0)!) * options.fontSize / CAPTION_FONT_SIZE + 1);
    }
    const end = pieces.length;
    const positions = [...pieces.map(piece => piece.index), text.length];
    const breaks = [0];
    for (let i = 1; i < end; i++) {
      const before = pieces[i - 1]!.segment;
      const after = pieces[i]!.segment;
      const standaloneSlash = after === '/' && (!pieces[i + 1] || pieces[i + 1]!.segment === ' ');
      if (after === ' ' || opening.test(before) || closing.test(after) ||
          standaloneSlash || (asciiToken.test(before) && asciiToken.test(after))) continue;
      breaks.push(i);
    }
    breaks.push(end);
    const line = (start: number, stop: number) => width[stop]! - width[start]!;
    const valid = (start: number, stop: number) => start < stop && line(start, stop) <= options.width - 8 &&
      !!text.slice(positions[start], positions[stop]).trim() &&
      (stop === end || !opening.test(text.slice(positions[start], positions[stop]).trimEnd().at(-1)!));
    if (valid(0, end)) return [{startChar: 0, endChar: text.length}];

    const penalty = (cut: number) => {
      let prior = cut - 1;
      while (prior > 0 && pieces[prior]!.segment === ' ') prior--;
      const previous = pieces[prior]!.segment;
      if (sentenceEnd.test(previous)) return 0;
      if (clauseEnd.test(previous)) return 15000;
      return pieces[cut - 1]!.segment === ' ' ? 20000 : 55000;
    };
    for (const lineCount of [2, 3]) {
      let best: {cuts: number[]; score: number} | undefined;
      for (const first of breaks.slice(1, -1)) {
        if (!valid(0, first)) continue;
        const seconds = lineCount === 2 ? [end] : breaks.slice(1, -1);
        for (const second of seconds) {
          if (!valid(first, second) || (lineCount === 3 && !valid(second, end))) continue;
          const cuts = lineCount === 2 ? [0, first, end] : [0, first, second, end];
          const widths = cuts.slice(1).map((stop, i) => line(cuts[i]!, stop));
          const score = (Math.max(...widths) - Math.min(...widths)) ** 2 +
            penalty(first) + (lineCount === 3 ? penalty(second) : 0);
          if (!best || score < best.score) best = {cuts, score};
        }
      }
      if (best) return best.cuts.slice(1).map((stop, i) => ({startChar: positions[best.cuts[i]!]!, endChar: positions[stop]!}));
    }
    return reject('Cue ' + (index + 1) + ' cannot fit in three ' + options.fontSize + 'px lines without splitting a token.');
  });
}
