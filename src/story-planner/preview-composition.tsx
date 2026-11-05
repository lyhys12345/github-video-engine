import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import {renderFramePreview, type PreviewEvidenceContext} from './frame-preview.js';
import {AudienceScene} from './audience-scene.js';
import type {AudiencePlan} from './audience-plan.js';
import type {compileAnimation} from './animation.js';

export const PREVIEW_WIDTH = 720;
export const PREVIEW_HEIGHT = 1280;
export type PreviewProps = {
  animation: ReturnType<typeof compileAnimation>;
  context: PreviewEvidenceContext;
  timeline: {totalFrames: number; fps: number};
  mode: 'silent' | 'narrated';
  audience?: AudiencePlan;
};

const Preview: React.FC<PreviewProps> = ({animation, context, mode, audience}) => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender('Load pinned preview font'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const font = new FontFace('GVE Preview', `url(${JSON.stringify(staticFile('font.ttf'))})`);
    void font.load().then((loaded) => {
      document.fonts.add(loaded);
      setReady(true);
      continueRender(handle);
    }).catch(cancelRender);
  }, [handle]);
  if (audience) return ready ? <AbsoluteFill style={{fontFamily: 'GVE Preview, sans-serif'}}>
    <AudienceScene plan={audience} frame={frame}/>
  </AbsoluteFill> : null;
  return ready ? <AbsoluteFill style={{fontFamily: 'GVE Preview, sans-serif', backgroundColor: '#101827'}}>
    <div dangerouslySetInnerHTML={{__html: renderFramePreview(animation, frame, context)}}/>
    {!['1.2','1.3','1.4'].includes(animation.schemaVersion)&&<div style={{position: 'absolute', bottom: 16, left: 24, color: '#ffe180', fontSize: 16}}>
      Authored illustration · No observed execution
    </div>}
  </AbsoluteFill> : null;
};

registerRoot(() => <Composition id="BoundedStorySegment" component={Preview}
  width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fps={30} durationInFrames={30}
  defaultProps={{} as PreviewProps}
  calculateMetadata={({props}) => ({durationInFrames: props.timeline.totalFrames, fps: props.timeline.fps})}/>);
