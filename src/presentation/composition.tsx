import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import type {CompiledPresentation} from './compile.js';
import {presentationFrame} from './frame-state.js';

const ink = '#122d38';
const muted = '#607079';
const accent = '#006c70';
const border = '#b7cdc7';
const panel: React.CSSProperties = {border: '2px solid ' + border, borderRadius: 24, background: '#fafaf2', padding: '24px 28px'};
const token: React.CSSProperties = {borderRadius: 16, padding: '12px 20px', color: 'white', background: accent,
  textAlign: 'center', lineHeight: 1.2, overflowWrap: 'anywhere', fontWeight: 700};
const value = (plan: CompiledPresentation, key: string) => String(plan.parameters[key]?.value ?? '');
const characters = (text: string) => [...text].length;

function Http({plan, frame}: {plan: CompiledPresentation; frame: ReturnType<typeof presentationFrame>}) {
  const has = (kind: string) => frame.events.some(event => event.kind === kind);
  const hasRequest = has('request'), matched = has('match'), responded = has('respond');
  const request = value(plan, 'method') + ' ' + value(plan, 'path');
  // Keep the request on the connector so it never covers the listener or port.
  const requestY = !matched ? 140 + 130 * frame.progress : 270;
  const clientText = responded && frame.progress >= .75 ? value(plan, 'body') : hasRequest ? request : '';
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
    {responded && frame.progress < .75 && <div style={{...token, position: 'absolute', width: 270, left: 'calc(50% - 135px)',
      top: 440 - 355 * frame.progress, fontSize: 27, background: '#994d3a'}}>{plan.labels.response}</div>}
    {responded && frame.progress >= .75 && <div style={{position: 'absolute', bottom: 2, fontSize: 24, color: muted}}>{plan.labels.response}</div>}
  </div>;
}

function Subject({plan, form}: {plan: CompiledPresentation; form: 'input' | 'cutout' | 'mask'}) {
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

function ImageChoice({plan, frame}: {plan: CompiledPresentation; frame: ReturnType<typeof presentationFrame>}) {
  const {state} = frame;
  const choice = state.startsWith('mask') ? 'mask' : state.startsWith('cutout') ? 'cutout' : undefined;
  const forms: ('cutout' | 'mask')[] = state === 'comparison' ? ['cutout', 'mask'] : state === 'cutout' || state === 'mask' ? [state] : [];
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
      {forms.map(form => <div key={form} style={{...panel, width: forms.length === 2 ? '48%' : '63%', opacity: .35 + .65 * frame.progress}}>
        <div style={{fontSize: 24, marginBottom: 8}}>{plan.labels[form]}</div><Subject plan={plan} form={form}/>
      </div>)}
    </div>
  </div>;
}

type Props = CompiledPresentation & {cues?: {startFrame: number; endFrame: number; transcript: string}[]};
const Presentation: React.FC<Props> = (plan) => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender('Load pinned presentation font'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const font = new FontFace('GVE Presentation', `url(${JSON.stringify(staticFile('font.ttf'))})`);
    void font.load().then(loaded => {document.fonts.add(loaded);setReady(true);continueRender(handle);}).catch(cancelRender);
  }, [handle]);
  if (!ready) return null;
  const current = presentationFrame(plan, frame);
  const titleLength = characters(current.beat.title);
  const cue = plan.cues?.find(item => frame >= item.startFrame && frame < item.endFrame);
  return <AbsoluteFill style={{fontFamily: 'GVE Presentation, sans-serif', background: '#f3f1e7', color: ink, padding: '54px 54px 45px'}}>
    <div style={{color: '#8c4736', fontSize: 22, fontWeight: 700}}>{plan.cues ? 'Local voice · Illustration · No observed execution' : 'Silent · Illustration · No observed execution'}</div>
    <div style={{fontSize: titleLength > 45 ? 30 : titleLength > 25 ? 38 : 48, fontWeight: 800, lineHeight: 1.12,
      height: 175, marginTop: 22, overflowWrap: 'anywhere'}}>{current.beat.title}</div>
    {plan.moduleId === 'http-exchange/1' ? <Http plan={plan} frame={current}/> : <ImageChoice plan={plan} frame={current}/>}
    <div style={{position: 'absolute', bottom: 130, left: 54, right: 54, height: 6, borderRadius: 6, background: border}}>
      <div style={{width: `${100 * (frame + 1) / plan.timeline.totalFrames}%`, height: '100%', borderRadius: 6, background: accent}}/>
    </div>
    {cue && <div style={{position: 'absolute', bottom: 23, left: 54, right: 54, color: '#fff', background: ink, padding: '10px 16px',
      borderRadius: 12, textAlign: 'center', fontSize: cue.transcript.length > 60 ? 18 : 25, lineHeight: 1.15,
      overflowWrap: 'anywhere', whiteSpace: 'pre-wrap'}}>
      {cue.transcript}
    </div>}
  </AbsoluteFill>;
};

registerRoot(() => <Composition id="BoundedStorySegment" component={Presentation} width={720} height={1280}
  fps={24} durationInFrames={24} defaultProps={{} as Props}
  calculateMetadata={({props}) => ({durationInFrames: props.timeline.totalFrames, fps: props.timeline.fps})}/>);
