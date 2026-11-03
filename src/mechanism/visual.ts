import {fixed, type MechanismPlan} from './plan.js';
import {evaluateMechanism, mechanismFrame} from './state.js';
import {isXmlText} from './xml.js';

function xml(value: string) {
  if (!isXmlText(value)) throw new Error('MECHANISM: invalid XML 1.0 character');
  return value.replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[char]!));
}
const line = (value: string, x: number, y: number, size = 28, fill = '#eaf2ff') =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}">${xml(value)}</text>`;
const card = (x: number, y: number, width: number, height: number, focus: boolean) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="26" fill="#111f35" stroke="${focus ? '#59edc7' : '#243c5b'}" stroke-width="3"/>`;
const width = (text: string) => [...text].reduce((total, char) => total + (/[^\x00-\x7f]/.test(char) ? 2 : 1), 0);
function wrap(text: string, size: number) {
  const rows: string[] = [];
  let row = '';
  for (const word of text.split(/\s+/)) {
    if (row && width(row + ' ' + word) > size) {
      rows.push(row);
      row = '';
    }
    for (const char of (row ? ' ' : '') + word) {
      if (width(row + char) > size) {
        rows.push(row);
        row = '';
      }
      row += char;
    }
  }
  return [...rows, row];
}
const resultLabel = {
  initial: 'Awaiting update', added: 'Guard passed · increment applied',
  ineligible: 'Eligibility false · branch skipped', threshold: 'Threshold reached · branch skipped',
  assigned: 'Manual input · fixed assignment',
};
const bounded = (value: number) => Math.max(0, Math.min(1, value));

function worldGlyph(projection: MechanismPlan['projection'], value: number, integrated: number, collision: boolean) {
  if (projection.glyph === 'vessel') {
    const fraction = bounded(value * projection.scale);
    const height = fraction * 83;
    return `<g data-glyph="vessel">
    <rect x="142" y="445" width="430" height="96" rx="10" fill="#0b1928" stroke="#6183a9" stroke-width="3"/>
    <rect x="149" y="${534 - height}" width="416" height="${height}" fill="#52e0ca" opacity="${fraction}"/>
    <path d="M578 457h25m-25 19h13m-13 19h25m-25 19h13m-13 19h25" stroke="#6183a9" stroke-width="3"/>
    ${line(Math.round(fraction * 100) + '% display fill', 53, 568, 17, '#a7bad2')}
    </g>`;
  }
  const shift = ((integrated * projection.scale) % 90 + 90) % 90;
  return `<g data-glyph="track">
  <defs><clipPath id="lane"><rect x="53" y="450" width="614" height="103"/></clipPath></defs>
  <g clip-path="url(#lane)">
  <path d="M53 529H667" stroke="#6183a9" stroke-width="4"/>
  ${Array.from({length: 9}, (_, i) => `<rect x="${53 + i * 90 - shift}" y="538" width="46" height="4" rx="2" fill="#456a94"/>`).join('')}
  <rect x="160" y="464" width="56" height="47" rx="11" fill="#ffbf6a"/><circle cx="171" cy="521" r="8" fill="#fff0db"/><circle cx="205" cy="521" r="8" fill="#fff0db"/>
  ${collision ? `<g data-condition="collision"><rect x="216" y="477" width="54" height="49" rx="4" fill="#a74d4d" stroke="#ffaf85" stroke-width="3"/>
  <path d="m231 490 22 21m0-21-22 21" stroke="#ffe6d2" stroke-width="4"/>
  <path d="M216 469v-13m-9 18-13-11m30 7 10-15" stroke="#ffbf6a" stroke-width="4"/>
  ${line('Collision blocks this increment', 299, 503, 21, '#ffbf6a')}</g>` : ''}
  </g></g>`;
}

function slider(control: MechanismPlan['controls'][number], current: number, target: number, applied: boolean) {
  const min = fixed(control.min) / 10000;
  const max = fixed(control.max) / 10000;
  const position = (value: number) => 69 + 565 * bounded((value - min) / (max - min));
  return `<g data-glyph="slider">
    <path d="M69 777H634" stroke="#456a94" stroke-width="8" stroke-linecap="round"/>
    <circle cx="${position(target)}" cy="777" r="13" fill="none" stroke="#59edc7" stroke-width="3"/>
    <circle cx="${position(current)}" cy="777" r="8" fill="${applied ? '#59edc7' : '#ffbf6a'}"/>
    ${line(control.min, 58, 807, 15, '#a7bad2')}${line(control.max, 620, 807, 15, '#a7bad2')}
  </g>`;
}

export function mechanismSvg(plan: MechanismPlan, evaluation: ReturnType<typeof evaluateMechanism>, timeMs: number) {
  const frame = mechanismFrame(evaluation, timeMs);
  const {beat, state, value, integrated} = frame;
  const entity = plan.entities.find(entity => entity.id === beat.focus)!;
  const world = plan.entities.find(entity => entity.id === plan.projection.entity)!;
  const scalar = plan.entities.find(entity => entity.id === plan.state.entity)!;
  const event = beat.event;
  const rule = event.kind === 'conditional-add' ? plan.rules.find(rule => rule.id === event.rule)! : undefined;
  const activeResult = state.beat === beat.id ? state.result : undefined;
  const gateFill = activeResult === 'added' || activeResult === 'assigned' ? '#59edc7' :
    activeResult === 'threshold' || activeResult === 'ineligible' ? '#ffbf6a' : '#829cb7';
  const gate = activeResult === 'added' ? 'PASS' : activeResult === 'assigned' ? 'SET' :
    activeResult ? 'SKIP' : 'WAIT';
  const visibleResult = state.beat === beat.id ? resultLabel[state.result] :
    event.kind === 'context' ? 'Context · state carried forward' :
    event.kind === 'conditional-add' ? 'Compare current value · update pending' : 'Manual assignment pending';
  const collision = rule?.eligibilityVisual === 'collision' && event.kind === 'conditional-add' &&
    !event.eligible && activeResult === 'ineligible';
  const control = event.kind === 'manual-assignment' ? plan.controls.find(control => control.id === event.control)! : undefined;
  const compared = activeResult ? state.before / 10000 : value;
  const threshold = rule ? fixed(rule.lessThan.decimal) / 10000 : 0;
  const excerpt = beat.excerpt;
  const shown = excerpt?.citation.quote.split('\n')
    .slice(excerpt.from - excerpt.citation.startLine, excerpt.to - excerpt.citation.startLine + 1)
    .map(line => line.trim().replace(/<\/?[a-z][^>]*>/gi, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).filter(Boolean) ?? [];
  const status = rule ? [rule.provenance.status, rule.lessThan.provenance.status,
    rule.addPerEligibleUpdate.provenance.status].join(' / ') : entity.provenance.status;
  const source = excerpt ? `${excerpt.citation.source} · ${excerpt.from === excerpt.to ?
    'line ' + excerpt.from : `lines ${excerpt.from}–${excerpt.to}`}` : 'Author-selected focus';
  const rows = shown.flatMap(row => wrap(row, 67));
  const code = rows.length > 3 ? [...rows.slice(0, 2), [...rows[2]!].slice(0, 62).join('') + ' …'] : rows;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1000" viewBox="0 0 720 1000" font-family="Segoe UI, Microsoft YaHei, sans-serif">
  <rect width="720" height="1000" fill="#091524"/>
  ${line('RULE MODEL  /  SILENT PREVIEW', 32, 45, 20, '#59edc7')}
  ${wrap(plan.title, 34).slice(0, 2).map((row, index) => line(row, 32, 91 + index * 38, 35)).join('')}
  ${line(`${evaluation.timeline.indexOf(beat) + 1} / ${evaluation.timeline.length}   ·   ${state.mode.toUpperCase()}`, 32, 150, 20, '#a7bad2')}
  ${card(30, 174, 660, 198, beat.focus === scalar.id)}
  ${line(scalar.label, 53, 207, 23, '#a7bad2')}
  ${line(String(value), 53, 279, 65, '#59edc7')}
  ${line(plan.state.unit, 53, 310, 19, '#a7bad2')}
  ${line(`Update ${state.update} · ${visibleResult}`, 53, 348, 22)}
  ${event.kind !== 'context' ? `<path d="M602 202L652 251L602 300L552 251Z" fill="#152e43" stroke="${gateFill}" stroke-width="3"/>
  ${line(gate, 580, 258, 18, gateFill)}
  ${activeResult ? line(`from ${state.before / 10000}`, 488, 320, 17, '#a7bad2') : ''}
  ${rule ? `<g data-compare="threshold">
  <rect x="360" y="214" width="174" height="73" rx="12" fill="#152e43" stroke="#456a94"/>
  ${line('Before vs. limit', 373, 237, 16, '#a7bad2')}
  ${line(`${compared} ${compared < threshold ? '<' : '≥'} ${threshold}`, 373, 266, 20, compared < threshold ? '#59edc7' : '#ffbf6a')}
  </g>` : ''}` : ''}
  ${card(30, 392, 660, 190, beat.focus === world.id)}
  ${line(world.label + ' · ' + world.provenance.status, 53, 430, 23, '#a7bad2')}
  ${worldGlyph(plan.projection, value, integrated, collision)}
  ${card(30, 602, 660, 236, ![scalar.id, world.id].includes(entity.id))}
  ${line(entity.label, 53, 640, 25)}
  ${line(source, 53, 667, 18, '#a7bad2')}
  ${rule ? line(`value < ${rule.lessThan.decimal}   /   +${rule.addPerEligibleUpdate.decimal} per eligible update`, 53, 699, 21, '#59edc7') : ''}
  ${event.kind === 'manual-assignment' ? line(`Set ${event.value.decimal} · illustrative scenario`, 53, 699, 21, '#59edc7') : ''}
  ${code.slice(0, control ? 1 : 3).map((row, index) => line(
    row + (control && (code.length > 1 || (excerpt && excerpt.to < excerpt.citation.endLine)) ? ' …' : ''),
    53, 727 + index * 23, 17)).join('')}
  ${control && event.kind === 'manual-assignment' ? slider(control, value, Number(event.value.decimal), activeResult === 'assigned') :
    line(status, 53, 815, 17, '#a7bad2')}
  ${event.kind === 'conditional-add' ? `<circle cx="470" cy="809" r="6" fill="${event.eligible ? '#59edc7' : '#ffbf6a'}"/>
  ${line(`${rule!.eligibilityLabel}: ${event.eligible ? 'yes' : 'no'}`, 484, 815, 17, gateFill)}` : ''}
  ${wrap(beat.caption, 50).slice(0, 3).map((row, index) => line(row, 34, 873 + index * 29, 25)).join('')}
  ${line('Illustrative projection · compressed model time', 34, 980, 17, '#a7bad2')}
  </svg>`;
}
