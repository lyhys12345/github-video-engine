import {sourceCropLayout,panelPosition,unitProgress} from './showcase-geometry';
import type {ShowcasePanel,ShowcaseOverlay} from './showcase-reel-contract';
import React from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender,OffthreadVideo,Freeze,Img} from 'remotion';
type Crop={x:number;y:number;width:number;height:number};
type Media={file:string;type:'image'|'video';width:number;height:number;frames?:number};
type Panel=ShowcasePanel&{media?:Media};
type Shot=Media&{start:number;end:number;crop:Crop;cropEnd?:Crop;label?:string;annotation?:string;panels?:Panel[];startFrame?:number;endFrame?:number;overlays?:ShowcaseOverlay[]};
type Props={frames:number;theme:'paper'|'copper'|'classroom';layout?:'standard'|'immersive';projectLabel:string;shots:Shot[];captions:{text:string;start:number;end:number}[]};
const palettes={paper:{bg:'#f3efe5',ink:'#1e211e',soft:'#736e60',accent:'#e96530'},copper:{bg:'#151413',ink:'#fff4e8',soft:'#ccaa8c',accent:'#e49c62'},classroom:{bg:'#f7f5ff',ink:'#25213c',soft:'#77718b',accent:'#8d48ec'}};
const Reel:React.FC<Props>=p=>{
 const f=useCurrentFrame(),c=palettes[p.theme],[handle]=React.useState(()=>delayRender('font'));
 React.useEffect(()=>{const font=new FontFace('showcase',`url(${staticFile('font.ttf')})`);void font.load().then(a=>{document.fonts.add(a);continueRender(handle)}).catch(cancelRender)},[handle]);
 const shot=p.shots.find(s=>f>=s.start&&f<s.end),caption=p.captions.find(c=>f>=c.start&&f<c.end),immersive=p.layout==='immersive';
 const progress=shot?unitProgress((f-shot.start)/(shot.end-shot.start)):0,t=progress*progress*(3-2*progress),mix=(a:number,b:number)=>a+(b-a)*t;
 const viewport=immersive?{x:0,y:125,w:1080,h:1460}:{x:0,y:135,w:1080,h:1450};
 const label=shot?.label??'官方资料 · 非本次运行';
 return <AbsoluteFill style={{background:c.bg,color:c.ink,fontFamily:'showcase,sans-serif'}}>
  <div style={{position:'absolute',left:38,right:38,top:immersive?44:48,fontSize:27,fontWeight:750,color:c.ink}}>{p.projectLabel}</div>
  {shot&&<>
   {(shot.panels??[{crop:shot.crop,cropEnd:shot.cropEnd,x:0,y:0,width:1,height:1}]).map((panel:Panel,i)=>{
    if(progress<(panel.reveal??0))return null;
    const media=panel.media??shot,rect=panelPosition(panel,progress),r={x:mix(panel.crop.x,panel.cropEnd?.x??panel.crop.x),y:mix(panel.crop.y,panel.cropEnd?.y??panel.crop.y),width:mix(panel.crop.width,panel.cropEnd?.width??panel.crop.width),height:mix(panel.crop.height,panel.cropEnd?.height??panel.crop.height)},w=viewport.w*rect.width,h=viewport.h*rect.height,geometry=sourceCropLayout(media.width,media.height,r,w,h,panel.fit),style:React.CSSProperties={position:'absolute',maxWidth:'none',...geometry.source};
    const sourceStart=panel.startFrame??(panel.media?0:shot.startFrame??0),sourceEnd=panel.endFrame??(panel.media?media.frames:shot.endFrame??shot.frames);
    return <div key={i} style={{position:'absolute',left:viewport.x+viewport.w*rect.x,top:viewport.y+viewport.h*rect.y,width:w,height:h,overflow:'hidden',background:c.bg}}><div style={{position:'absolute',overflow:'hidden',...geometry.crop}}>{media.type==='image'?<Img src={staticFile(media.file)} style={style}/>:<Freeze frame={Math.min(sourceStart+f-shot.start,sourceEnd!-1)}><OffthreadVideo src={staticFile(media.file)} muted style={style}/></Freeze>}</div></div>;
   })}
   {(shot.overlays??[]).map((o,i)=>{
    const u=unitProgress(progress,o.start,o.end);if(u===0)return null;const color=c[o.tone??'accent'],left=viewport.x+o.x*viewport.w,top=viewport.y+o.y*viewport.h,width=o.width*viewport.w,height=o.height*viewport.h;
    if(o.kind==='label')return <div key={'overlay'+i} style={{position:'absolute',left,top,width,minHeight:height,color,opacity:u,transform:`translateY(${(1-u)*12}px)`,fontSize:o.fontSize??38,lineHeight:1.3,fontWeight:700,textAlign:'center',whiteSpace:'pre-line',textShadow:`0 2px 8px ${c.bg}`}}>{o.text}</div>;
    return <svg key={'overlay'+i} style={{position:'absolute',left,top,width,height,overflow:'visible'}} viewBox="0 0 100 100" preserveAspectRatio="none">{o.kind==='arrow'?<><path d="M 3 8 C 3 50 92 40 92 86" pathLength={1} fill="none" stroke={color} strokeWidth={3} strokeDasharray={1} strokeDashoffset={1-u}/><path d="M 84 76 L 92 88 L 99 76" fill="none" stroke={color} strokeWidth={3} opacity={unitProgress(u,.8,1)}/></>:<ellipse cx="50" cy="50" rx="47" ry="47" pathLength={1} fill="none" stroke={color} strokeWidth={4} strokeDasharray={1} strokeDashoffset={1-u}/>}</svg>;
   })}
   <div style={{position:'absolute',left:48,right:48,top:immersive?1595:1580,fontSize:21,color:c.soft,display:'flex',justifyContent:'space-between'}}><span>{label}</span>{!immersive&&<span>{Math.floor(f/30).toString().padStart(2,'0')} / {Math.ceil(p.frames/30)}</span>}</div>
   {shot.annotation&&<div style={{position:'absolute',left:62,bottom:370,padding:'11px 19px',fontSize:32,fontWeight:650,background:c.bg+'ee',color:c.ink,borderLeft:`4px solid ${c.accent}`,maxWidth:900}}>{shot.annotation}</div>}
  </>}
  <div style={{position:'absolute',left:immersive?48:55,right:immersive?48:55,top:1650,height:immersive?145:137,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontSize:47,lineHeight:1.5,fontWeight:720,letterSpacing:.2}}>{caption?.text??''}</div>
  {!immersive&&<><div style={{position:'absolute',bottom:80,left:44,right:44,height:2,background:c.soft,opacity:.22}}/><div style={{position:'absolute',bottom:80,left:44,width:992*f/p.frames,height:3,background:c.accent}}/></>}
 </AbsoluteFill>;
};
registerRoot(()=> <Composition id="ShowcaseReel" component={Reel} fps={30} width={1080} height={1920} durationInFrames={30} defaultProps={{frames:30,theme:'paper',projectLabel:'',shots:[],captions:[]}} calculateMetadata={({props})=>({durationInFrames:props.frames})}/>);


