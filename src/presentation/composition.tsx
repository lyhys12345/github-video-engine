import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import {CAPTION_FONT_SIZE, CAPTION_FONT_WEIGHT, CAPTION_TEXT_WIDTH, type CaptionLine} from './caption-layout-style.js';
import type {CompiledLegacy, CompiledPresentation} from './compile.js';
import {ConcurrencyQueue} from './queue-composition.js';
import {queueTitle} from './queue-frame.js';
import {httpResponseArrived, imageResultPanels, presentationFrame} from './frame-state.js';
import {type VisualLocaleProfile, ZH_TITLE_SIZE, zh, zhTextSlots} from './visual-locale.js';

const ink = '#122d38';
const muted = '#607079';
const accent = '#006c70';
const border = '#b7cdc7';
const panel: React.CSSProperties = {border: '2px solid ' + border, borderRadius: 24, background: '#fafaf2', padding: '24px 28px'};
const token: React.CSSProperties = {borderRadius: 16, padding: '12px 20px', color: 'white', background: accent,
  textAlign: 'center', lineHeight: 1.2, overflowWrap: 'anywhere', fontWeight: 700};
const value = (plan: CompiledLegacy, key: string) => String(plan.parameters[key]?.value ?? '');
const characters = (text: string) => [...text].length;

function Http({plan, frame}: {plan: CompiledLegacy; frame: ReturnType<typeof presentationFrame>}) {
  const has = (kind: string) => frame.events.some(event => event.kind === kind);
  const hasRequest = has('request'), matched = has('match'), responded = has('respond');
  const arrived = httpResponseArrived(frame);
  const request = value(plan, 'method') + ' ' + value(plan, 'path');
  // Keep the request on the connector so it never covers the listener or port.
  const requestY = !matched ? 140 + 130 * frame.progress : 270;
  const clientText = arrived ? value(plan, 'body') : hasRequest ? request : '';
  const clientSize = characters(clientText) > 50 ? 18 : characters(clientText) > 27 ? 24 : 34;
  return <div style={{position: 'relative', height: 655}}>
    <div style={{...panel, height: 112}}>
      <div style={{color: muted, fontSize: 25}}>{plan.labels.request}</div>
      <div style={{fontSize: clientSize, fontWeight: 700, overflowWrap: 'anywhere'}}>{clientText}</div>
    </div>
    <div style={{position: 'absolute', left: '50%', top: 142, height: 207, borderLeft: '5px dashed ' + border}}/>
    <div style={{...panel, position: 'absolute', top: 348, left: 0, right: 0, height: 220, background: '#e5efea'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', gap: 15, fontWeight: 700, fontSize: 34}}>
        <span style={{overflowWrap: 'anywhere'}}>{plan.labels.listener}</span>
        {has('listen') && <span style={{color: accent}}>:{value(plan, 'port')}</span>}
      </div>
      <div style={{...token, marginTop: 65, background: matched ? ink : '#788f92', fontSize: 27}}>{plan.labels.handler}</div>
    </div>
    {hasRequest && !responded && <div style={{...token, position: 'absolute', width: 350, left: 'calc(50% - 175px)', top: requestY,
      fontSize: characters(request) > 24 ? 19 : 27, background: matched ? '#264657' : accent}}>{request}</div>}
    {responded && !arrived && <div style={{...token, position: 'absolute', width: 270, left: 'calc(50% - 135px)',
      top: 440 - 355 * frame.progress, fontSize: 27, background: '#994d3a'}}>{plan.labels.response}</div>}
    {arrived && <div style={{position: 'absolute', bottom: 2, fontSize: 24, color: muted}}>{plan.labels.response}</div>}
  </div>;
}

function Subject({plan, form}: {plan: CompiledLegacy; form: 'input' | 'cutout' | 'mask'}) {
  const asset = plan.asset!.content;
  return <svg role="img" aria-label={plan.labels[form]} viewBox={`0 0 ${asset.viewport.join(' ')}`} style={{width: '100%', display: 'block', borderRadius: 15}}>
    <defs><pattern id={`grid-${form}`} width="20" height="20" patternUnits="userSpaceOnUse">
      <path fill="#e4eae6" d="M0 0h20v20H0z"/><path fill="#c3d3ce" d="M0 0h10v10H0zM10 10h10v10H10z"/>
    </pattern></defs>
    <rect width="360" height="200" fill={form === 'mask' ? '#10191d' : form === 'input' ? '#f1dca2' : `url(#grid-${form})`}/>
    {form === 'input' && <><circle cx="50" cy="54" r="26" fill="#fff0bd"/><path d="M0 164 96 111 214 168 360 119V200H0Z" fill="#83a194"/></>}
    {asset.subject.map((path, index) => <path key={index} d={path.d} fill={form === 'mask' ? '#fff' : path.fill}/>)}
  </svg>;
}

function ImageChoice({plan, frame}: {plan: CompiledLegacy; frame: ReturnType<typeof presentationFrame>}) {
  const {state} = frame;
  const choice = state.startsWith('mask') ? 'mask' : state.startsWith('cutout') ? 'cutout' : undefined;
  const {forms, opacity} = imageResultPanels(frame);
  return <div style={{height: 655}}>
    <div style={{...panel, maxWidth: 385, margin: '0 auto', opacity: state === 'ready' ? .35 : 1}}>
      <div style={{fontSize: 25, marginBottom: 8}}>{plan.labels.input}</div>
      <Subject plan={plan} form="input"/>
    </div>
    <div style={{height: 108, display: 'grid', alignContent: 'center', gap: 8}}>
      {(choice || state === 'comparison') && (state === 'comparison' ? ['cutout', 'mask'] : [choice]).map(option => {
        const command = value(plan, option + 'Command');
        return <div key={option} style={{...token, fontFamily: 'monospace', fontSize: command.length > 60 ? 13 : command.length > 48 ? 17 : 20}}>{command}</div>;
      })}
    </div>
    <div style={{display: 'flex', justifyContent: 'center', gap: 16}}>
      {forms.map(form => <div key={form} style={{...panel, width: forms.length === 2 ? '48%' : '63%', opacity}}>
        <div style={{fontSize: 24, marginBottom: 8}}>{plan.labels[form]}</div><Subject plan={plan} form={form}/>
      </div>)}
    </div>
  </div>;
}

type Cue = {startFrame: number; endFrame: number; transcript: string; lines: CaptionLine[]};
type Props = CompiledPresentation & {cues?: Cue[]; visualLocaleProfile?: VisualLocaleProfile};
const lineStyle: React.CSSProperties = {fontFamily: 'GVE Presentation', fontSize: CAPTION_FONT_SIZE,
  fontWeight: CAPTION_FONT_WEIGHT, fontKerning: 'none', fontVariantLigatures: 'none', lineHeight: '34px',
  whiteSpace: 'pre', direction: 'ltr'};
const lineText = (cue: Cue, line: CaptionLine) => cue.transcript.slice(line.startChar, line.endChar);

function validateCaptionWidths(cues: Cue[]) {
  const line = document.createElement('span');
  line.style.fontFamily = 'GVE Presentation';
  line.style.fontSize = CAPTION_FONT_SIZE + 'px';
  line.style.fontWeight = String(CAPTION_FONT_WEIGHT);
  line.style.fontKerning = 'none';
  line.style.fontVariantLigatures = 'none';
  line.style.whiteSpace = 'pre';
  line.style.direction = 'ltr';
  line.style.position = 'absolute';
  line.style.visibility = 'hidden';
  document.body.append(line);
  try {
    for (const [index, cue] of cues.entries()) {
      for (const range of cue.lines) {
        line.textContent = lineText(cue, range);
        if (line.getBoundingClientRect().width > CAPTION_TEXT_WIDTH - 4) {
          throw new Error('Caption cue ' + (index + 1) + ' exceeds the pinned browser width. Use shorter cues in presentation-voice-bindings/1.1.');
        }
      }
    }
  } finally {
    line.remove();
  }
}

function validateZhWidths(plan: CompiledPresentation) {
  const line = document.createElement('span');
  Object.assign(line.style, {fontFamily: 'GVE Presentation', whiteSpace: 'pre', position: 'absolute', visibility: 'hidden'});
  document.body.append(line);
  try {
    for (const slot of zhTextSlots(plan)) {
      line.style.fontSize = slot.size + 'px';
      line.style.fontWeight = String(slot.weight);
      line.textContent = slot.text;
      if (line.getBoundingClientRect().width > slot.width - 4) {
        throw new Error('Chinese visual label exceeds pinned browser width: ' + slot.field);
      }
    }
  } finally {line.remove();}
}

const Presentation: React.FC<Props> = (plan) => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender('Load pinned presentation font'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const font = new FontFace('GVE Presentation', `url(${JSON.stringify(staticFile('font.ttf'))})`);
    void font.load().then(loaded => {
      document.fonts.add(loaded);
      if (plan.cues) validateCaptionWidths(plan.cues);
      if (plan.visualLocaleProfile) validateZhWidths(plan);
      setReady(true);
      continueRender(handle);
    }).catch(cancelRender);
  }, [handle, plan.cues, plan.visualLocaleProfile]);
  if (!ready) return null;
  const beat = plan.beats.find(row => frame >= row.start && frame < row.end);
  if (!beat) throw new Error('Frame outside presentation timeline');
  const localized = !!plan.visualLocaleProfile;
  const title = plan.moduleId === 'concurrency-queue/1' ? queueTitle(plan, beat, frame, localized ? zh : undefined) : beat.title;
  const titleLength = characters(title);
  const cue = plan.cues?.find(item => frame >= item.startFrame && frame < item.endFrame);
  return <AbsoluteFill style={{fontFamily: 'GVE Presentation, sans-serif', background: '#f3f1e7', color: ink, padding: '54px 54px 45px'}}>
    <div style={{color: '#8c4736', fontSize: localized ? 25 : 22, fontWeight: 700}}>{localized ? zh.illustratedNarration :
      plan.cues ? 'Local voice · Illustration · No observed execution' : 'Silent · Illustration · No observed execution'}</div>
    <div style={{fontSize: localized ? ZH_TITLE_SIZE : titleLength > 45 ? 30 : titleLength > 25 ? 38 : 48, fontWeight: 800, lineHeight: 1.12,
      height: 175, marginTop: 22, overflowWrap: 'anywhere'}}>{title}</div>
    {plan.moduleId === 'concurrency-queue/1' ? <ConcurrencyQueue plan={plan} frame={frame} localized={localized}/> :
      plan.moduleId === 'http-exchange/1' ? <Http plan={plan} frame={presentationFrame(plan, frame)}/> :
      <ImageChoice plan={plan} frame={presentationFrame(plan, frame)}/>}
    <div style={{position: 'absolute', bottom: plan.cues ? 170 : 130, left: 54, right: 54, height: 6, borderRadius: 6, background: border}}>
      <div style={{width: `${100 * (frame + 1) / plan.timeline.totalFrames}%`, height: '100%', borderRadius: 6, background: accent}}/>
    </div>
    {cue && <div style={{position: 'absolute', bottom: 40, left: 54, right: 54, color: '#fff', background: ink, padding: '10px 16px',
      borderRadius: 12, textAlign: 'center', ...lineStyle}}>
      {cue.lines.map(line => <div key={line.startChar}>{lineText(cue, line)}</div>)}
    </div>}
  </AbsoluteFill>;
};

registerRoot(() => <Composition id="BoundedStorySegment" component={Presentation} width={720} height={1280}
  fps={24} durationInFrames={24} defaultProps={{} as Props}
  calculateMetadata={({props}) => ({durationInFrames: props.timeline.totalFrames, fps: props.timeline.fps})}/>);
