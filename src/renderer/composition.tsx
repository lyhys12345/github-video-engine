import React, {useMemo} from 'react';
import {AbsoluteFill, Composition, Img, Sequence, interpolate, registerRoot, useCurrentFrame} from 'remotion';
import {totalFrames, type VideoSpec, type SceneSpec} from '../contracts/video.js';
import defaultSpec from '../../examples/demo.v1.json';
import {fitTitle, fitText} from './text-layout.js';
type Props = {spec: VideoSpec; assets: Record<string, string>};
const Scene = ({scene, spec, assets, index}: Props & {scene: SceneSpec; index: number}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, scene.animation.entranceFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exit = interpolate(frame, [scene.durationFrames - 10, scene.durationFrames - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const text = (role: string) => scene.elements.find((e) => e.role === role)?.text;
  const title = text('title')!;
  const titleLayout = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Canvas text measurement unavailable');
    return fitTitle(title, (value, size) => { context.font = `700 ${size}px Arial, sans-serif`; return context.measureText(value).width; }, scene.layout === 'closing' ? 76 : 84);
  }, [title, scene.layout]);
  const body = text('body') ?? '';
  const bodyLayout = useMemo(() => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Canvas text measurement unavailable');
    return fitText(body, (value, size) => { context.font = `${size}px Arial, sans-serif`; return context.measureText(value).width; }, 27, 20, 580, 170, 1.4);
  }, [body]);
  return <AbsoluteFill style={{background: spec.style.background, color: spec.style.foreground, fontFamily: 'Arial, sans-serif', overflow: 'hidden'}}>
    <div style={{position: 'absolute', width: 740, height: 740, borderRadius: '50%', top: 200, left: 220 + Math.sin(frame / 35) * 20, background: `radial-gradient(circle, ${spec.style.accent}19, transparent 65%)`}} />
    <div style={{position: 'absolute', left: 54, top: 60, fontSize: 19, letterSpacing: 3, color: spec.style.accent}}>GITHUB VIDEO ENGINE</div>
    <div style={{position: 'absolute', right: 54, top: 62, fontSize: 16, opacity: 0.5}}>M0</div>
    <div style={{position: 'absolute', left: 54, right: 54, top: 160, opacity: t * exit, transform: `translateY(${(1 - t) * 30}px)`}}>
      <div style={{fontSize: 20, letterSpacing: 4, color: spec.style.accent, marginBottom: 30, overflowWrap: 'anywhere'}}>{text('eyebrow')}</div>
      <div style={{fontSize: titleLayout.fontSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: -3, whiteSpace: 'pre-line', overflowWrap: 'anywhere'}}>{titleLayout.lines.join('\n')}</div>
      <div style={{marginTop: 28, maxWidth: 580, fontSize: bodyLayout.fontSize, lineHeight: 1.4, color: '#B1BDD4', whiteSpace: 'pre-line', overflowWrap: 'anywhere'}}>{bodyLayout.lines.join('\n')}</div>
    </div>
    {scene.layout === 'architecture' ? <div style={{position: 'absolute', left: 54, right: 54, top: 660, opacity: exit}}>
      {['VideoSpec', 'Durable jobs / SQLite', 'Remotion + FFmpeg', 'Immutable MP4'].map((name, i) => {
        const enter = interpolate(frame, [12 + i * 8, 25 + i * 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return <div key={name} style={{opacity: enter, transform: `translateX(${(1-enter)*25}px)`}}><div style={{border: `1px solid ${i === 2 ? spec.style.accent : '#33415C'}`, background: '#131E32', padding: '17px 24px', borderRadius: 15, fontSize: 25, display: 'flex', justifyContent: 'space-between'}}><span>{name}</span><span style={{color: spec.style.accent}}>0{i+1}</span></div>{i < 3 && <div style={{height: 25, textAlign: 'center', color: spec.style.accent, fontSize: 24}}>↓</div>}</div>;
      })}
    </div> : <div style={{position: 'absolute', top: 735, left: 54, right: 54, height: 250, border: '1px solid #33415C', borderRadius: 24, background: '#131E32', padding: 35, opacity: t * exit, transform: `scale(${0.95+t*0.05})`}}>
      <div style={{fontSize: 17, letterSpacing: 3, color: spec.style.accent}}>{scene.layout === 'title' ? 'VALIDATED INPUT' : 'VERIFIED OUTPUT'}</div>
      <div style={{fontFamily: 'Consolas, monospace', fontSize: 27, lineHeight: 1.7, marginTop: 22}}>{scene.layout === 'title' ? <>schema: <span style={{color: spec.style.accent}}>1.0</span><br/>scenes: {spec.scenes.length}<br/>duration: {totalFrames(spec)/spec.video.fps} seconds</> : <>H.264 / {spec.video.width} × {spec.video.height}<br/>{spec.video.fps} fps / {totalFrames(spec)} frames<br/><span style={{color: spec.style.accent}}>SHA-256 artifacts</span></>}</div>
    </div>}
    {scene.assetIds.map((id, i) => <Img key={id} src={assets[id]!} style={{position: 'absolute', width: 36, height: 36, right: 54 + i * 44, bottom: 135}} />)}
    <div style={{position: 'absolute', bottom: 100, left: 54, right: 54, fontSize: 20, color: spec.style.accent, overflowWrap: 'anywhere'}}>{text('label')}</div>
    <div style={{position: 'absolute', bottom: 58, left: 54, right: 54, height: 3, background: '#273149'}}><div style={{height: 3, width: `${((index + frame / scene.durationFrames) / spec.scenes.length)*100}%`, background: spec.style.accent}} /></div>
    <div style={{position: 'absolute', bottom: 24, left: 54, fontSize: 13, letterSpacing: 1, color: '#8490A9'}}>SYNTHETIC FIXTURE · LOCAL RENDER · NO REPOSITORY EXECUTION</div>
  </AbsoluteFill>;
};
const Video = ({spec, assets}: Props) => {
  let from = 0;
  return <AbsoluteFill>{spec.scenes.map((scene, index) => { const start = from; from += scene.durationFrames; return <Sequence key={scene.id} from={start} durationInFrames={scene.durationFrames}><div style={{width: 720, height: 1280, transform: `scale(${spec.video.width/720}, ${spec.video.height/1280})`, transformOrigin: 'top left', position: 'absolute'}}><Scene spec={spec} assets={assets} scene={scene} index={index} /></div></Sequence>; })}</AbsoluteFill>;
};
registerRoot(() => <Composition id="Demo" component={Video} width={720} height={1280} fps={30} durationInFrames={360}
  defaultProps={{spec: defaultSpec as VideoSpec, assets: {}}} calculateMetadata={({props}) => ({width: props.spec.video.width, height: props.spec.video.height, fps: props.spec.video.fps, durationInFrames: totalFrames(props.spec)})} />);
