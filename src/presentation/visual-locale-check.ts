import {EngineError} from '../core/errors.js';
import {fontMetrics} from './caption-layout.js';
import {CAPTION_FONT_SIZE} from './caption-layout-style.js';
import type {CompiledPresentation} from './compile.js';
import {zhTextSlots} from './visual-locale.js';

function fail(message: string): never {throw new EngineError('PRESENTATION_VISUAL_LOCALE', message);}

export function checkZhVisualText(font: Buffer, plan: CompiledPresentation) {
  let field = 'presentation font';
  const advance = fontMetrics(font, reason => fail(field + ': ' + reason));
  for (const slot of zhTextSlots(plan)) {
    field = slot.field;
    const text = slot.text;
    if (!text || /[\p{C}\p{Zl}\p{Zp}]/u.test(text) || (slot.authored && !/\p{Script=Han}/u.test(text))) {
      fail(field + ' needs short Chinese display text. Keep source code in the evidence-backed parameters.');
    }
    let width = 0;
    for (const character of text) width += advance(character.codePointAt(0)!) * slot.size / CAPTION_FONT_SIZE + 1;
    if (width > slot.width - 4) fail(field + ' exceeds its display width. Shorten the author label.');
  }
}
