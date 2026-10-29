export interface TitleLayout {lines: string[]; fontSize: number}
export type TextMeasure = (text: string, fontSize: number) => number;

function wrapLine(text: string, fontSize: number, width: number, measure: TextMeasure, preferWords = true): string[] {
  let rest = text; const lines: string[] = [];
  while (rest && measure(rest, fontSize) > width) {
    const chars = Array.from(rest); let count = 0;
    while (count < chars.length && measure(chars.slice(0, count + 1).join(''), fontSize) <= width) count++;
    if (!count) throw new Error('A title character cannot fit within the video title area');
    const prefix = chars.slice(0, count).join('');
    const space = prefix.lastIndexOf(' ');
    const cut = preferWords && space > 0 ? space : prefix.length;
    lines.push(rest.slice(0, cut).trimEnd()); rest = rest.slice(cut).trimStart();
  }
  lines.push(rest); return lines;
}

// Fit actual glyph widths, keeping explicit line breaks and all non-space content.
export function fitText(text: string, measure: TextMeasure, maximumFontSize: number, minimumFontSize: number, width: number, height: number, lineHeight: number): TitleLayout {
  for (let fontSize = maximumFontSize; fontSize >= minimumFontSize; fontSize--) {
    const lines = text.split(/\r?\n/).flatMap((line) => wrapLine(line, fontSize, width, measure));
    if (lines.length * fontSize * lineHeight <= height) return {lines, fontSize};
  }
  // Dense boundary input can wrap within words; preserve content rather than clip it.
  const lines = text.split(/\r?\n/).flatMap((line) => wrapLine(line, minimumFontSize, width, measure, false));
  if (lines.length * minimumFontSize * lineHeight <= height) return {lines, fontSize: minimumFontSize};
  throw new Error('Text cannot fit legibly; shorten it or reduce explicit line breaks');
}
export function fitTitle(text: string, measure: TextMeasure, maximumFontSize: number, width = 612, height = 240): TitleLayout {
  return fitText(text, measure, maximumFontSize, 32, width, height, 1.04);
}
