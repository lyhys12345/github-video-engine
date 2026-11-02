import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender} from 'remotion';
import {renderSegmentFrame} from './frame.js';
import type {VisualPlan,SegmentTimeline,VisualStyle} from './plan.js';
export type SegmentProps={plan:VisualPlan;timeline:SegmentTimeline;provenanceHash:string;visualStyle?:VisualStyle};
const Segment:React.FC<SegmentProps>=({plan,timeline,provenanceHash,visualStyle})=>{
 const frame=useCurrentFrame(),[handle]=useState(()=>delayRender('Load locked Chinese font')),[ready,setReady]=useState(false);
 useEffect(()=>{const font=new FontFace('GVE Noto',`url(${JSON.stringify(staticFile('font.ttf'))})`,{weight:'100 900'});void font.load().then(f=>{document.fonts.add(f);setReady(true);continueRender(handle);}).catch(cancelRender);},[handle]);
 return ready?<AbsoluteFill style={{background:'#080e1b'}}><div style={{width:720,height:1280,transform:'scale(1.5)',transformOrigin:'top left'}} dangerouslySetInnerHTML={{__html:renderSegmentFrame(plan,timeline,frame,provenanceHash,visualStyle)}}/></AbsoluteFill>:null;
};
const Root=()=> <Composition id="BoundedStorySegment" component={Segment} width={1080} height={1920} fps={30} durationInFrames={30} defaultProps={{} as SegmentProps} calculateMetadata={({props})=>({durationInFrames:props.timeline.totalFrames})}/>;
registerRoot(Root);
