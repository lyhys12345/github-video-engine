import type { sampleCausalOperation } from './causal-operation.js';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({
 '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
}[char]!));

/** A shared illustration of reading a value without consuming its original. */
export function renderValueTraceFrame(state: ReturnType<typeof sampleCausalOperation>, frame: number, context: unknown) {
 const op = state.operation;
 const label = `值 ${op.valueTrace!}`;
 const y = state.signal.phase === 'input-to-tool' ? 323 + 274 * state.arrival : 597 + 290 * state.outputProgress;
 const fit = (value: string, size: number, width: number) => {
  const units = Array.from(value).reduce((total, char) => total + (/\p{Script=Han}/u.test(char) ? 1 : 0.66), 0);
  return Math.min(size, Math.floor(width / Math.max(1, units)));
 };
 const text = (value: string, y: number, size: number, fill: string, x=316, width=330, anchor='start') =>
  `<text x="${x}" y="${y}" font-size="${fit(value, size, width)}" text-anchor="${anchor}" fill="${fill}" font-weight="700">${escape(value)}</text>`;
 const tag = (y: number) => `<g transform="translate(181 ${y})"><path d="M-112 -34H84L112 -6V34H-112Z" fill="#ffda59"/><path d="M84 -34V-6H112" fill="none" stroke="#a86d00" stroke-width="2"/><text y="10" text-anchor="middle" font-size="${fit(label, 33, 188)}" font-weight="800" fill="#272014">${escape(label)}</text></g>`;
 if (op.valueTraceFocus === 'result') {
  const lift = 14 * Math.sin(Math.PI * state.processing);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${escape(JSON.stringify({frame,state,context}))}</metadata><rect width="720" height="1280" fill="#fbf4e8"/><g font-family="GVE Preview, sans-serif">${text('图解示意 · 未执行',154,25,'#534532',360,600,'middle')}<rect x="57" y="364" width="606" height="300" rx="34" fill="#24201c"/>${text(op.output.label,488,82,'#fff8ed',360,552,'middle')}<g transform="translate(179 ${-lift})">${tag(588)}</g></g></svg>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${escape(JSON.stringify({frame,state,context}))}</metadata><rect width="720" height="1280" fill="#fbf4e8"/><g font-family="GVE Preview, sans-serif">${text('图解示意 · 未执行',154,25,'#534532',360,600,'middle')}<path d="M181 323V887M165 503L181 523L197 503M165 738L181 758L197 738" stroke="#906d31" stroke-width="6" fill="none"/><path d="M69 408H650M69 693H650" stroke="#ded1bb" stroke-width="2"/>${text(op.input.label,317,40,'#312519')}${text('原值保留',362,28,'#65553e')}${tag(323)}${text(op.actor.label,592,38,'#1b403d')}${text('读取并复制',638,28,'#42605b')}${text(op.output.label,880,38,'#312519')}${text(state.outputProgress>0?'副本写入':'等待读取',925,28,'#65553e')}<g opacity="${state.outputProgress}">${tag(887)}</g>${state.signal.visible?tag(y):''}</g></svg>`;
}
