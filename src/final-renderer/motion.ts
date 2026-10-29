/** Progressive edge/node choreography derived from video-shotcraft DiagramCascadeBuild/PortraitCascade,
 * commit43bd349a136651865ecfa6ea1cf012f6e957d304 (Apache-2.0). See ATTRIBUTION.md and upstream/LICENSE.
 * This small adaptation replaces fixed30fps/system-font/purple-style assumptions with measured timing and declared style. */
import {spring} from 'remotion';
export {EASE,mix,ramp,softShadow} from './upstream/Polish.js';
export const springAt=(frame:number,start:number,fps:number)=>spring({frame:frame-start,fps,config:{damping:20,stiffness:170,mass:1}});
export function graphSchedule(duration:number,fps:number){const reveal=Math.min(duration-fps,Math.round(5.5*fps)),root=Math.round(.6*fps),nodeGap=Math.max(1,Math.floor((reveal-root)/3));return{root,nodeGap,edgeLead:Math.round(.35*fps),edgeDuration:Math.round(.35*fps),reveal,hold:duration-Math.round(.45*fps)};}
export function splitNode(label:string){const at=label.indexOf('/');return at<0?{title:label,detail:''}:{title:label.slice(0,at).trim(),detail:label.slice(at+1).trim()};}
