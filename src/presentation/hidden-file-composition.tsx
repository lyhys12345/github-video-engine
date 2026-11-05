import React from 'react';
import type {CompiledHiddenFiles} from './hidden-file-policy.js';
import {FILE_PATH_LINE_HEIGHT, FILE_PATH_SIZE, FILE_REPOSITORY_SIZE, FILE_RESULT_WIDTH, FILE_RESULT_CONTINUATION_WIDTH, FILE_TITLE_SIZE,
  FILE_TREE_INDENT, FILE_TREE_MARKER_WIDTH, FILE_TREE_STATUS_WIDTH,
  type HiddenFileLayout} from './hidden-file-layout.js';

const copy = {
  'en-US': {
    notice: 'Synthetic example · Target not run',
    tree: 'Example directory',
    default: 'Default policy',
    includeHidden: 'Include hidden',
    result: 'Illustrative paths',
    pending: 'Evaluating example…',
    scope: 'Ignore rules unchecked · Order illustrative',
    decisions: {'enter-directory': 'Entered', 'include-file': 'Included', 'skip-hidden-file': 'Dot file skipped',
      'prune-hidden-directory': 'Dir skipped', 'unvisited-ancestor': 'Model: unvisited'},
  },
  'zh-CN': {
    narratedNotice: '本机旁白 · 合成示例 · 未运行目标项目',
    notice: '合成示例 · 未运行目标项目',
    tree: '示例目录',
    default: '默认规则',
    includeHidden: '包含隐藏项',
    result: '示意结果路径',
    pending: '示例判断中…',
    scope: '未检查忽略规则 · 顺序仅为示意',
    decisions: {'enter-directory': '进入', 'include-file': '列出', 'skip-hidden-file': '跳过隐藏文件',
      'prune-hidden-directory': '跳过此目录', 'unvisited-ancestor': '模型未遍历'},
  },
} as const;

export function hiddenFileNotice(plan: CompiledHiddenFiles, narrated = false) {
  return narrated ? copy['zh-CN'].narratedNotice : copy[plan.language].notice;
}

export function validateHiddenFileWidths(plan: CompiledHiddenFiles, layout: HiddenFileLayout, narrated = false) {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('Cannot measure the hidden-file preview with the pinned browser font.');
  const check = (lines: string[], width: number, size: number, weight: number, field: string) => {
    context.font = weight + ' ' + size + 'px "GVE Presentation"';
    const overflow = lines.find(line => context.measureText(line).width > width - 2);
    if (overflow !== undefined) {
      throw new Error('The mobile preview field exceeds its pinned browser width: ' + field + ' (' +
        Math.ceil(context.measureText(overflow).width) + 'px for ' + width + 'px).');
    }
  };
  check([hiddenFileNotice(plan, narrated)], 612, 25, 700, 'illustration notice');
  check(layout.repository, 612, FILE_REPOSITORY_SIZE, 700, 'repository');
  for (const title of layout.titles) check(title.lines, 612, FILE_TITLE_SIZE, 800, 'title');
  for (const node of layout.tree) check(node.lines, node.width, FILE_PATH_SIZE, 700, 'tree path');
  for (const result of layout.results) for (const path of result.paths) {
    check(path.lines, FILE_RESULT_WIDTH - (layout.markResultContinuation ? FILE_RESULT_CONTINUATION_WIDTH : 0),
      FILE_PATH_SIZE, 700, 'result path');
  }
  const labels = copy[plan.language];
  check(Object.values(labels.decisions), FILE_TREE_STATUS_WIDTH, 23, 400, 'tree status');
  check([labels.scope], 612, 23, 650, 'scope');
}

const border = '#b7cdc7';
const ink = '#122d38';
const accent = '#006c70';

export function HiddenFilePolicy({plan, frame, layout}: {plan: CompiledHiddenFiles; frame: number; layout: HiddenFileLayout}) {
  const index = frame < plan.beats[1]!.start ? 0 : 1;
  const {frame: anchor, mode, motionFrames, model} = plan.trace[index]!;
  const progress = Math.max(0, Math.min(1, (frame - anchor) / motionFrames));
  const focus = progress === 1 || frame < anchor ? null : model.consideredIds[Math.floor(progress * model.consideredIds.length)];
  const evaluated = new Set(model.consideredIds.slice(0, Math.floor(progress * model.consideredIds.length)));
  const result = progress === 1;
  const text = copy[plan.language];
  const paths = layout.results[index]!.paths;
  const pathText = {fontSize: FILE_PATH_SIZE, lineHeight: FILE_PATH_LINE_HEIGHT + 'px', whiteSpace: 'pre' as const,
    color: ink, fontWeight: 700};
  return <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: accent, height: 44}}>
      <span style={{fontSize: 30, fontWeight: 800}}>{mode === 'default' ? text.default : text.includeHidden}</span>
      {mode === 'include-hidden' && <span style={{padding: '5px 13px', borderRadius: 10, background: '#dcefeb', fontSize: 24, fontWeight: 700}}>--hidden</span>}
    </div>
    <div style={{border: '2px solid ' + border, borderRadius: 18, background: '#fafaf2', padding: '12px 15px'}}>
      <div style={{fontSize: 26, lineHeight: '30px', fontWeight: 700, marginBottom: 6}}>{text.tree}</div>
      {plan.nodes.map((node, rowIndex) => {
        const row = model.rows[rowIndex]!;
        const shown = evaluated.has(node.id) || (row.blockedBy !== null && evaluated.has(row.blockedBy));
        const skipped = row.decision === 'prune-hidden-directory' || row.decision === 'skip-hidden-file';
        const rowColor = skipped || row.blockedBy ? '#783221' : '#0b5257';
        const rowLayout = layout.tree[rowIndex]!;
        return <div key={node.id} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) ' + FILE_TREE_STATUS_WIDTH + 'px',
          alignItems: 'start', boxSizing: 'border-box', columnGap: 12, height: rowLayout.height,
          borderRadius: 6, background: node.id === focus ? '#dcefeb' : 'transparent', padding: '2px 8px'}}>
          <div style={{display: 'flex', paddingLeft: (node.depth - 1) * FILE_TREE_INDENT}}>
            {node.depth > 1 && <div style={{width: FILE_TREE_MARKER_WIDTH, flexShrink: 0, fontSize: 19, lineHeight: '36px'}}>└</div>}
            <div style={pathText}>{rowLayout.lines.map((line, i) => <div key={i}>{line}</div>)}</div>
          </div>
          <div style={{fontSize: 23, lineHeight: '36px', whiteSpace: 'nowrap', textAlign: 'right', color: rowColor}}>
            {shown ? text.decisions[row.decision] : ''}
          </div>
        </div>;
      })}
    </div>
    <div style={{border: '2px solid ' + border, borderRadius: 18, background: '#e8f1eb', padding: '10px 16px'}}>
      <div style={{fontSize: 26, lineHeight: '30px', fontWeight: 800, marginBottom: 6, color: accent}}>{text.result}</div>
      {result ? paths.map((path, index) => <div key={path.id} style={{...pathText, marginTop: index ? 4 : 0}}>
        {path.lines.map((line, i) => layout.markResultContinuation && i > 0
          ? <div key={i} style={{position: 'relative', paddingLeft: FILE_RESULT_CONTINUATION_WIDTH}}>
            <span aria-hidden="true" style={{position: 'absolute', left: 5, top: 8, width: 13, height: 13,
              borderLeft: '3px solid ' + accent, borderBottom: '3px solid ' + accent}}/>
            {line}
          </div>
          : <div key={i}>{line}</div>)}
      </div>) :
        <div style={{fontSize: 24}}>{text.pending}</div>}
    </div>
    <div style={{fontSize: 23, lineHeight: '30px', fontWeight: 650, color: '#5c5241'}}>{text.scope}</div>
  </div>;
}
