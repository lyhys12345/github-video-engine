import {sourceFrameAt, type SourceAnchor} from './showcase-timing';
import {showcaseOutputSize,showcasePanelLayout,showcasePanels,showcasePanelVisible,showcaseShotProgress,showcaseViewport,unitProgress} from './showcase-geometry';
import type {ShowcasePanel,ShowcaseOverlay} from './showcase-reel-contract';
import React from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender,OffthreadVideo,Freeze,Img} from 'remotion';
type Crop={x:number;y:number;width:number;height:number};
type Media={file:string;type:'image'|'video';width:number;height:number;frames?:number};
type Panel=ShowcasePanel&{media?:Media};
type Shot=Media&{sourceAnchors?:SourceAnchor[];start:number;end:number;crop:Crop;cropEnd?:Crop;label?:string;annotation?:string;panels?:Panel[];startFrame?:number;endFrame?:number;overlays?:ShowcaseOverlay[]};
export type ShowcaseProps={frames:number;theme:'paper'|'copper'|'classroom';layout?:'standard'|'immersive'|'cinematic';cinematic?:{safeInset?:number;captionSize?:number;accent?:string};projectLabel:string;shots:Shot[];captions:{text:string;start:number;end:number}[]};
const palettes={paper:{bg:'#f3efe5',ink:'#1e211e',soft:'#736e60',accent:'#e96530'},copper:{bg:'#151413',ink:'#fff4e8',soft:'#ccaa8c',accent:'#e49c62'},classroom:{bg:'#f7f5ff',ink:'#25213c',soft:'#77718b',accent:'#8d48ec'}};
const Reel:React.FC<ShowcaseProps>=p=>{
 const cinema=p.layout==='cinematic';
 const inset=p.cinematic?.safeInset??76;
 const f=useCurrentFrame(),c=cinema?{bg:'#0b1211',ink:'#f5efe4',soft:'#b8beb3',accent:p.cinematic?.accent??'#d4bd95'}:palettes[p.theme],[handle]=React.useState(()=>delayRender('font'));
 React.useEffect(()=>{const font=new FontFace('showcase',`url(${staticFile('font.ttf')})`);void font.load().then(a=>{document.fonts.add(a);continueRender(handle)}).catch(cancelRender)},[handle]);
 const shot=p.shots.find(s=>f>=s.start&&f<s.end),caption=p.captions.find(c=>f>=c.start&&f<c.end),immersive=p.layout==='immersive';
 const progress=shot?showcaseShotProgress(f,shot):0;
 const viewport=showcaseViewport(p.layout,inset);
 const label=shot?.label??'官方资料 · 非本次运行';
 return <AbsoluteFill style={{background:cinema?'radial-gradient(ellipse at 80% 35%, #29332b, '+c.bg+' 65%)':c.bg,color:c.ink,fontFamily:'showcase,sans-serif'}}>
  <div style={{position:'absolute',left:cinema?inset:38,right:cinema?inset:38,top:cinema?92:immersive?44:48,fontSize:cinema?34:27,fontWeight:cinema?500:750,color:cinema?c.accent:c.ink,letterSpacing:cinema?5:0,borderBottom:cinema?'1px solid '+c.accent:undefined,paddingBottom:cinema?28:0}}>{p.projectLabel}</div>
  {shot&&<>
   {showcasePanels(shot).map((panel:Panel,i)=>{
    if(!showcasePanelVisible(panel,progress))return null;
    const media=panel.media??shot,geometry=showcasePanelLayout(panel,progress,media,viewport),style:React.CSSProperties={position:'absolute',maxWidth:'none',...geometry.source};
    const sourceStart=panel.startFrame??(panel.media?0:shot.startFrame??0),sourceEnd=panel.endFrame??(panel.media?media.frames:shot.endFrame??shot.frames);
    return <div key={i} style={{position:'absolute',...geometry.destination,overflow:'hidden',background:c.bg}}><div style={{position:'absolute',overflow:'hidden',...geometry.crop}}>{media.type==='image'?<Img src={staticFile(media.file)} style={style}/>:<Freeze frame={shot.sourceAnchors && !panel.media && panel.startFrame===undefined && panel.endFrame===undefined ? sourceFrameAt(f,shot.sourceAnchors) : Math.min(sourceStart+f-shot.start,sourceEnd!-1)}><OffthreadVideo src={staticFile(media.file)} muted style={style}/></Freeze>}</div></div>;
   })}
   {(shot.overlays??[]).map((o,i)=>{
    const u=unitProgress(progress,o.start,o.end);if(u===0)return null;const color=c[o.tone??'accent'],left=viewport.x+o.x*viewport.w,top=viewport.y+o.y*viewport.h,width=o.width*viewport.w,height=o.height*viewport.h;
    if(o.kind==='label')return <div key={'overlay'+i} style={{position:'absolute',left,top,width,minHeight:height,color,opacity:u,transform:`translateY(${(1-u)*12}px)`,fontSize:o.fontSize??38,lineHeight:1.3,fontWeight:700,textAlign:'center',whiteSpace:'pre-line',textShadow:`0 2px 8px ${c.bg}`}}>{o.text}</div>;
    return <svg key={'overlay'+i} style={{position:'absolute',left,top,width,height,overflow:'visible'}} viewBox="0 0 100 100" preserveAspectRatio="none">{o.kind==='arrow'?<><path d="M 3 8 C 3 50 92 40 92 86" pathLength={1} fill="none" stroke={color} strokeWidth={3} strokeDasharray={1} strokeDashoffset={1-u}/><path d="M 84 76 L 92 88 L 99 76" fill="none" stroke={color} strokeWidth={3} opacity={unitProgress(u,.8,1)}/></>:<ellipse cx="50" cy="50" rx="47" ry="47" pathLength={1} fill="none" stroke={color} strokeWidth={4} strokeDasharray={1} strokeDashoffset={1-u}/>}</svg>;
   })}
   <div style={{position:'absolute',left:cinema?inset:48,right:cinema?inset:48,top:cinema?1498:immersive?1595:1580,fontSize:cinema?24:21,color:c.soft,display:'flex',justifyContent:'space-between'}}><span>{label}</span>{!immersive&&!cinema&&<span>{Math.floor(f/30).toString().padStart(2,'0')} / {Math.ceil(p.frames/30)}</span>}</div>
   {shot.annotation&&<div style={{position:'absolute',left:62,bottom:370,padding:'11px 19px',fontSize:32,fontWeight:650,background:c.bg+'ee',color:c.ink,borderLeft:`4px solid ${c.accent}`,maxWidth:900}}>{shot.annotation}</div>}
  </>}
  <div style={{position:'absolute',left:cinema?inset:immersive?48:55,right:cinema?inset:immersive?48:55,top:cinema?1560:1650,height:immersive?145:137,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontSize:cinema?(p.cinematic?.captionSize??42):47,lineHeight:1.5,fontWeight:cinema?500:720,letterSpacing:.2}}>{caption?.text??''}</div>
  {!immersive&&!cinema&&<><div style={{position:'absolute',bottom:80,left:44,right:44,height:2,background:c.soft,opacity:.22}}/><div style={{position:'absolute',bottom:80,left:44,width:992*f/p.frames,height:3,background:c.accent}}/></>}
 </AbsoluteFill>;
};
registerRoot(()=> <Composition id="ShowcaseReel" component={Reel} fps={30} width={showcaseOutputSize.width} height={showcaseOutputSize.height} durationInFrames={30} defaultProps={{frames:30,theme:'paper',projectLabel:'',shots:[],captions:[]}} calculateMetadata={({props})=>({durationInFrames:props.frames})}/>);


