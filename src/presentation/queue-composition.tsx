import React from 'react';
import type {CompiledQueue} from './concurrency-queue.js';
import {queueFrame, queueSlotY} from './queue-frame.js';
import {zh, ZH_CARD_HEIGHT, ZH_TASK_LABEL_SIZE, ZH_TASK_STATE_SIZE} from './visual-locale.js';

const palette = ['#194b6e', '#28655c', '#783c57', '#555196', '#825019', '#51485c', '#435a28', '#793e2c'];
const phaseName = {submitting: 'Joining queue', entering: 'Entering slot', leaving: 'Leaving slot', shifting: 'Waiting'};
const columnWidth = 198;

export function ConcurrencyQueue({plan, frame, localized}: {plan: CompiledQueue; frame: number; localized: boolean}) {
  const {state, active, cards, ended} = queueFrame(plan, frame);
  const counters = [String(state.pending.length), active + '/' + plan.capacity.value, String(state.settled.length)];
  const full = active === plan.capacity.value && state.pending.length > 0;
  const note = localized ? (ended ? (plan.scenario.ending === 'paused' ? zh.paused : zh.settled) : full ? zh.full : '') :
    ended ? (plan.scenario.ending === 'paused' ? 'Demonstration pauses here' : 'All shown tasks settled') :
    full ? 'All slots occupied · queued tasks wait' : '';
  const capacityLabel = plan.capacity.basis === 'illustrative' ?
    (localized ? zh.illustrativeCapacity : 'Example concurrency limit') : (localized ? zh.capacity : 'Concurrency limit');
  const motionLabels = localized ? zh.phase : phaseName;
  return <div style={{position: 'relative', height: 655}}>
    <div style={{fontSize: localized ? 28 : 25, fontWeight: 700}}>{capacityLabel} · {plan.capacity.value}</div>
    <div style={{marginTop: 6, fontSize: localized ? 22 : 19, color: '#536970'}}>
      {localized ? zh.timing : 'Tasks running at once · Timing is illustrative'}
    </div>
    {[plan.labels.waiting, plan.labels.slots, plan.labels.results].map((label, index) =>
      <div key={index} style={{position: 'absolute', top: 72, left: 4 + index * 206, width: columnWidth, height: 518,
        border: '1px solid #b7cdc7', background: '#fafaf2', borderRadius: 16, boxSizing: 'border-box'}}>
        <div style={{height: 44, padding: '7px 8px', lineHeight: 1.05, overflowWrap: 'anywhere',
          ...(localized && {whiteSpace: 'nowrap'}), fontSize: localized ? 22 : label.length > 12 ? 14 : 19,
          textAlign: 'center', fontWeight: 700}}>
          {label} · {counters[index]}
        </div>
      </div>)}
    {state.activeSlots.map((id, index) =>
      <div key={index} style={{position: 'absolute', left: 218, top: queueSlotY(index), height: localized ? ZH_CARD_HEIGHT : 50, width: 174,
        display: 'grid', placeItems: 'center', border: '2px dashed #adc2bd', boxSizing: 'border-box', borderRadius: 8,
        color: '#607079', fontSize: localized ? 22 : 17}}>{localized
          ? (id === null ? zh.openSlot(index + 1) : zh.occupiedSlot(index + 1))
          : (id === null ? 'Open slot ' + (index + 1) : 'Slot ' + (index + 1))}</div>)}
    {cards.map((card, index) => card.opacity > 0 && <div key={card.id}
      style={{position: 'absolute', left: card.x, top: card.y, width: 174, height: localized ? ZH_CARD_HEIGHT : 50, boxSizing: 'border-box',
        zIndex: plan.endingTitle && card.active && !card.phase ? 3 : card.phase ? 2 : 1, opacity: card.opacity, background: palette[index], color: 'white', borderRadius: 8,
        padding: localized ? '2px 8px' : '4px 7px',
        fontSize: localized ? ZH_TASK_LABEL_SIZE : plan.endingTitle ? (card.label.length > 12 ? 15 : 17) : (card.label.length > 12 ? 12 : 15),
        lineHeight: localized ? '26px' : plan.endingTitle ? '15px' : '14px', fontWeight: 700,
        ...(localized && {whiteSpace: 'nowrap'})}}>
      <div style={{overflowWrap: 'anywhere'}}>{card.label}</div>
      <div style={{fontWeight: 400, fontSize: localized ? ZH_TASK_STATE_SIZE : plan.endingTitle ? 16 : 14,
        ...(localized && {lineHeight: '22px'}), opacity: .94}}>
        {card.phase ? motionLabels[card.phase] : card.active ? (localized ? zh.running : 'Running') + ' ' + '·'.repeat(1 + Math.floor(frame / 8) % 3) :
          card.outcome === 'fulfilled' ? (localized ? zh.fulfilled : 'Fulfilled') :
          card.outcome === 'rejected' ? (localized ? zh.rejected : 'Rejected') : (localized ? zh.waiting : 'Waiting')}
      </div>
    </div>)}
    <div style={{position: 'absolute', bottom: 34, fontSize: localized ? 24 : 21, color: '#823f2c', fontWeight: 700}}>{note}</div>
    <div style={{position: 'absolute', bottom: 6, maxWidth: 610, fontSize: 14, color: '#536970',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
      {plan.binding.repository.split('/').slice(-2).join('/')} · {plan.binding.commit.slice(0, 7)}
    </div>
  </div>;
}
