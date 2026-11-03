import {Composition, Img, registerRoot, useCurrentFrame} from 'remotion';
import type {MechanismMediaProps} from './media-spec.js';

const Frame = ({frames}: MechanismMediaProps) => {
  const frame = useCurrentFrame();
  return <Img style={{width: '100%', height: '100%'}} src={'data:image/svg+xml;base64,' + frames[frame]}/>;
};

function Root() {
  return <Composition id="MechanismPreview" component={Frame} defaultProps={{frames: []}}
    width={720} height={1000} fps={24} durationInFrames={192}/>;
}
registerRoot(Root);
