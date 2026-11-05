import {EngineError} from '../core/errors.js';
import {fontMetrics} from './caption-layout.js';
import {CAPTION_FONT_SIZE} from './caption-layout-style.js';
import type {CompiledHiddenFiles} from './hidden-file-policy.js';

export const HIDDEN_FILE_MOBILE_LAYOUT = 'hidden-file-mobile-layout/1';
export const FILE_PATH_SIZE = 30;
export const FILE_PATH_LINE_HEIGHT = 36;
export const FILE_TREE_STATUS_WIDTH = 190;
export const FILE_TREE_INDENT = 18;
export const FILE_TREE_MARKER_WIDTH = 20;
export const FILE_REPOSITORY_SIZE = 26;
export const FILE_TITLE_SIZE = 42;
const NAME_WIDTH = 360;
export const FILE_RESULT_WIDTH = 576;
const PANEL_FIXED_HEIGHT = 240;
const MAX_CONTENT_HEIGHT = 860;
const fail = (message: string): never => {throw new EngineError('PRESENTATION_HIDDEN_FILE_LAYOUT', message);};

export function hiddenFileLayout(font: Buffer, plan: CompiledHiddenFiles) {
  const advance = fontMetrics(font, fail);
  function lines(text: string, width: number, size: number, boundary = '/') {
    const characters = [...text];
    const result: string[] = [];
    let start = 0;
    while (start < characters.length) {
      let end = start, used = 0;
      while (end < characters.length) {
        // Leave room for weight variation and glyph ink.
        used += advance(characters[end]!.codePointAt(0)!) * size / CAPTION_FONT_SIZE + 1;
        if (used > width - 8) break;
        end++;
      }
      if (end === start) return fail('A path character exceeds the mobile display width.');
      if (end < characters.length) {
        const cut = characters.slice(start, end).lastIndexOf(boundary);
        if (cut >= 0) end = start + cut + 1;
      }
      result.push(characters.slice(start, end).join(''));
      start = end;
    }
    return result;
  }

  const repository = lines(new URL(plan.binding.repository).pathname.slice(1), 612, FILE_REPOSITORY_SIZE);
  if (repository.length > 2) return fail('The full repository label exceeds two lines.');
  const titles = plan.beats.map(beat => {
    const title = lines(beat.title, 612, FILE_TITLE_SIZE, ' ');
    if (title.length > 2) return fail('Beat ' + beat.id + ' title exceeds two lines. Shorten it to keep paths readable.');
    return {beatId: beat.id, lines: title};
  });
  const tree = plan.nodes.map(node => {
    const inset = (node.depth - 1) * FILE_TREE_INDENT + (node.depth > 1 ? FILE_TREE_MARKER_WIDTH : 0);
    const width = NAME_WIDTH - inset;
    const nameLines = lines(node.name + (node.kind === 'directory' ? '/' : ''), width, FILE_PATH_SIZE);
    return {id: node.id, lines: nameLines, width, height: Math.max(42, nameLines.length * FILE_PATH_LINE_HEIGHT + 4)};
  });
  const treeHeight = tree.reduce((sum, row) => sum + row.height, 0);
  const results = plan.trace.map(event => {
    const paths = event.model.resultIds.map(id => {
      const path = plan.nodes.find(node => node.id === id)!.path;
      return {id, lines: lines(path, FILE_RESULT_WIDTH, FILE_PATH_SIZE)};
    });
    const lineCount = paths.reduce((sum, path) => sum + path.lines.length, 0);
    const contentHeight = PANEL_FIXED_HEIGHT + treeHeight + lineCount * FILE_PATH_LINE_HEIGHT + (paths.length - 1) * 4;
    if (contentHeight > MAX_CONTENT_HEIGHT) {
      return fail('The complete paths and status column exceed the mobile display height. Use fewer entries or shorter names.');
    }
    const minimumHoldFrames = Math.max(72, 36 + 12 * lineCount);
    const beat = plan.beats.find(row => row.id === event.beatId)!;
    if (beat.end - event.frame - event.motionFrames < minimumHoldFrames) {
      return fail('Beat ' + beat.id + ' needs at least ' + minimumHoldFrames + ' frames after evaluation to display all result paths.');
    }
    return {beatId: beat.id, paths, minimumHoldFrames, contentHeight};
  });
  return {repository, titles, tree, results};
}

export type HiddenFileLayout = ReturnType<typeof hiddenFileLayout>;
