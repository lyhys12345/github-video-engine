import React,{useEffect,useMemo,useState} from 'react';
import {AbsoluteFill,Composition,Sequence,cancelRender,continueRender,delayRender,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import type {FrameProps} from './input.js';
import {EASE,mix,ramp,softShadow,springAt,graphSchedule,splitNode} from './motion.js';
import {fitText,type TitleLayout} from './text-layout.js';

const FONT='GVE Noto Sans SC';
const FontGate:React.FC<{font:FrameProps['font'];children:React.ReactNode}>=({font,children})=>{
 const [handle]=useState(()=>delayRender('Load exact local Noto Sans SC font')), [ready,setReady]=useState(false);
 useEffect(()=>{let stopped=false;const face=new FontFace(FONT,`url(${JSON.stringify(staticFile(font.file))})`,{weight:'100 900',style:'normal'});
  void face.load().then(async loaded=>{document.fonts.add(loaded);await document.fonts.ready;if(!document.fonts.check(`400 32px "${FONT}"`)||loaded.status!=='loaded')throw Error('Locked font did not load; fallback is forbidden');if(!stopped){console.log('GVE_FONT_READY '+JSON.stringify({family:FONT,sha256:font.sha256,status:loaded.status}));setReady(true);continueRender(handle);}}).catch(e=>cancelRender(e));return()=>{stopped=true;};
 },[font.file,font.sha256,handle]);return ready?<>{children}</>:null;
};
function useLayouts(props:FrameProps,index:number){const {design,captions,project}=props,scene=design.scenes[index]!;
 return useMemo(()=>{const context=document.createElement('canvas').getContext('2d');if(!context)throw Error('Canvas glyph measurement unavailable');const fit=(text:string,max:number,min:number,width:number,height:number,lineHeight=1.2,weight=500)=>fitText(text,(s,size)=>{context.font=`${weight} ${size}px "${FONT}"`;return context.measureText(s).width;},max,min,width,height,lineHeight);
  return{title:fit(scene.title,82,58,849,214,1.12,800),subtitle:fit(scene.subtitle,40,32,849,100,1.35),header:fit(project.name,29,22,610,78,1.2,650),project:fit(project.name,132,54,790,260,1.08,800),repository:fit(project.repository.replace(/^https:\/\//,''),34,26,790,130,1.35),caption:fit(captions[scene.scriptId]!,design.style.captionSize*1.5,44,835,168,1.25,600),source:fit(scene.sourceLabel,30,26,849,100,1.25),labels:scene.labels.map(t=>fit(t,46,34,740,scene.labels.length>3?61:130,1.2,650)),nodes:scene.labels.map(t=>{const n=splitNode(t);return{title:fit(n.title,46,32,720,86,1.12,700),detail:n.detail?fit(n.detail,31,28,720,42,1.2):null};})};
 },[scene,captions,project,design.style.captionSize]);
}
const Text:React.FC<{layout:TitleLayout;style?:React.CSSProperties}>=({layout,style})=><div style={{fontSize:layout.fontSize,whiteSpace:'pre-line',...style}}>{layout.lines.join('\n')}</div>;

/** Pure portrait adaptation of the reviewed edge-before-node recipe; all node labels retain original order/text. */
const Cascade:React.FC<{props:FrameProps;index:number;layouts:ReturnType<typeof useLayouts>}>=({props,index,layouts})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),{design,readthrough}=props,scene=design.scenes[index]!,s=design.style,duration=readthrough.lines[index]!.allocatedFrames,t=graphSchedule(duration,fps),ys=[650,850,1050,1250],cx=505,w=820,h=156,pull=ramp(frame,0,Math.round(2.6*fps),EASE.smooth);
 return <div data-recipe="portrait-cascade-derived-v2" style={{position:'absolute',inset:0,transform:`translateY(${mix(64,0,pull)}px) scale(${mix(1.045,1,pull)})`,transformOrigin:'505px 570px'}}>
  <svg width={1080} height={1920} style={{position:'absolute',inset:0}}><defs><linearGradient id={`edge-${index}`} x1="0" x2="0" y1="500" y2="1350" gradientUnits="userSpaceOnUse"><stop stopColor={s.accent}/><stop offset="1" stopColor={s.foreground}/></linearGradient></defs>
   {scene.labels.map((_label,i)=>{const at=t.root+i*t.nodeGap-t.edgeLead,p=ramp(frame,at,t.edgeDuration,EASE.out),y1=i===0?550:ys[i-1]!+h/2+6,y2=ys[i]!-h/2-6,len=y2-y1;return p>0?<g key={i}><path d={`M ${cx} ${y1} V ${y2}`} stroke={s.accent+'22'} strokeWidth={14}/><path d={`M ${cx} ${y1} V ${y2}`} stroke={`url(#edge-${index})`} strokeWidth={4} strokeDasharray={`${len} ${len}`} strokeDashoffset={len*(1-p)}/>{p<1?<circle cx={cx} cy={mix(y1,y2,p)} r={9} fill={s.accent}/>:null}<circle cx={cx} cy={y2} r={6*ramp(frame,at+Math.max(1,t.edgeDuration-5),6,EASE.out)} fill={s.background} stroke={s.accent} strokeWidth={3}/></g>:null;})}
  </svg>
  {scene.labels.map((label,i)=>{const at=t.root+i*t.nodeGap;if(frame<at)return null;const pop=springAt(frame,at,fps),n=layouts.nodes[i]!,active=frame>=at&&frame<at+t.nodeGap;return <div key={label} data-node-index={i} style={{position:'absolute',left:cx-w/2,top:ys[i]!-h/2,width:w,height:h,borderRadius:25,padding:'19px 30px',boxSizing:'border-box',background:'#FFFFFFE8',border:`${active?3:2}px solid ${active?s.accent:s.foreground+'30'}`,boxShadow:softShadow(active?12:6,{color:s.foreground,strength:.65}),opacity:ramp(frame,at,6,EASE.linear),transform:`translateY(${(1-pop)*-20}px) scale(${.78+.22*pop})`,transformOrigin:'50% 0%'}}>
   <div style={{display:'flex',gap:21,alignItems:'flex-start'}}><span style={{fontSize:25,color:s.accent,fontWeight:700,paddingTop:8}}>0{i+1}</span><div><Text layout={n.title} style={{fontWeight:700,lineHeight:1.12}}/>{n.detail?<Text layout={n.detail} style={{marginTop:8,color:s.muted,lineHeight:1.2,opacity:ramp(frame,at+7,10)}}/>:null}</div></div>
  </div>;})}
 </div>;
};

const Cards:React.FC<{props:FrameProps;index:number;layouts:ReturnType<typeof useLayouts>}>=({props,index,layouts})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig(),scene=props.design.scenes[index]!,s=props.design.style,n=scene.labels.length,compare=scene.layout==='compare',base=compare?630:625,step=compare?320:n>3?125:220,h=compare?265:n>3?105:170;
 return <div style={{position:'absolute',inset:0}}>{scene.labels.map((label,i)=>{const start=Math.round((.3+i*(compare?.9:.65))*fps),p=springAt(f,start,fps),highlight=f>=start&&f<start+Math.round(1.4*fps);return <React.Fragment key={i}>{scene.layout==='loop'&&i<n-1?<svg width={1080} height={1920} style={{position:'absolute',inset:0}}><path d={`M 505 ${base+i*step+h} V ${base+(i+1)*step}`} fill="none" stroke={s.accent+'55'} strokeWidth={3} strokeDasharray="8 7" opacity={ramp(f,start+fps/2,fps/2)}/></svg>:null}<div style={{position:'absolute',left:88,top:base+i*step,width:825,height:h,boxSizing:'border-box',padding:compare?'45px 30px':'22px 28px',background:'#FFFFFFC9',border:`${highlight?3:2}px solid ${highlight?s.accent:s.foreground+'25'}`,borderRadius:28,boxShadow:softShadow(highlight?16:4,{color:s.foreground,strength:.5}),display:'flex',alignItems:'center',gap:25,opacity:ramp(f,start,8,EASE.linear),transform:`translate(${(1-p)*(i%2?-55:55)}px,${(1-p)*25}px) scale(${.92+.08*p})`}}><div style={{width:58,height:58,borderRadius:18,background:s.accent,color:s.background,fontSize:27,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>0{i+1}</div><Text layout={layouts.labels[i]!} style={{fontWeight:650,lineHeight:1.2}}/></div></React.Fragment>;})}</div>;
};
const Identity:React.FC<{props:FrameProps;index:number;layouts:ReturnType<typeof useLayouts>}>=({props,index,layouts})=>{const f=useCurrentFrame(),{fps}=useVideoConfig(),s=props.design.style,closing=props.design.scenes[index]!.layout==='closing',p=springAt(f,Math.round(.45*fps),fps),spin=ramp(f,0,3*fps,EASE.smooth);return <div style={{position:'absolute',left:88,top:closing?650:610,width:825,height:660}}>
 <div style={{position:'absolute',left:122,top:20,width:565,height:565,border:`2px solid ${s.accent}28`,borderRadius:100,transform:`rotate(${mix(-13,0,spin)}deg) scale(${mix(.86,1,spin)})`}}/><div style={{position:'absolute',left:76,top:73,width:660,height:435,borderRadius:48,background:'#FFFFFFD9',border:`2px solid ${s.foreground}25`,boxShadow:softShadow(22,{color:s.foreground,strength:.8}),display:'flex',justifyContent:'center',alignItems:'center',padding:35,boxSizing:'border-box',opacity:ramp(f,3,12),transform:`translateY(${(1-p)*65}px) scale(${.86+.14*p})`}}><Text layout={layouts.project} style={{fontWeight:800,lineHeight:1.08,textAlign:'center',color:s.accent}}/></div>
 <div style={{position:'absolute',top:closing?555:560,left:20,right:20,opacity:ramp(f,Math.round(1.5*fps),Math.round(.4*fps)),transform:`translateY(${mix(15,0,ramp(f,fps,Math.round(.8*fps)))}px)`}}><Text layout={layouts.repository} style={{lineHeight:1.35,textAlign:'center',color:s.muted}}/></div>
 </div>;};

export const FinalScene:React.FC<{props:FrameProps;index:number}>=({props,index})=>{
 const f=useCurrentFrame(),{fps}=useVideoConfig(),{design,readthrough,project}=props,scene=design.scenes[index]!,duration=readthrough.lines[index]!.allocatedFrames,s=design.style,layouts=useLayouts(props,index),enter=ramp(f,0,Math.round(.42*fps),EASE.out),exit=1-ramp(f,duration-Math.round(.3*fps),Math.round(.3*fps),EASE.smooth);
 return <AbsoluteFill data-scene-id={scene.id} data-claim-ids={scene.claimIds.join(',')} style={{fontFamily:`"${FONT}"`,color:s.foreground,background:s.background,overflow:'hidden'}}>
  <AbsoluteFill style={{backgroundImage:`linear-gradient(${s.foreground}08 1px,transparent 1px),linear-gradient(90deg,${s.foreground}08 1px,transparent 1px)`,backgroundSize:'72px 72px'}}/>
  <AbsoluteFill style={{opacity:enter*exit,transform:`translateY(${mix(24,0,enter)}px)`}}>
   <div style={{position:'absolute',left:81,right:150,top:115,display:'flex',alignItems:'flex-start',justifyContent:'space-between',color:s.muted}}><div><Text layout={layouts.header} style={{fontWeight:650,lineHeight:1.2}}/><div style={{fontSize:23,marginTop:7,letterSpacing:3}}>图形讲解</div></div><div style={{fontSize:27,fontVariantNumeric:'tabular-nums'}}>{String(index+1).padStart(2,'0')} / {design.scenes.length}</div></div>
   <div style={{position:'absolute',left:81,top:245,width:849,height:214}}><Text layout={layouts.title} style={{fontWeight:800,lineHeight:1.12,letterSpacing:'-.025em'}}/></div>
   <div style={{position:'absolute',left:81,top:455,width:849,height:100}}><Text layout={layouts.subtitle} style={{color:s.muted,lineHeight:1.35}}/></div>
   {scene.layout==='path'?<Cascade props={props} index={index} layouts={layouts}/>:scene.labels.length?<Cards props={props} index={index} layouts={layouts}/>:<Identity props={props} index={index} layouts={layouts}/>}
   <div style={{position:'absolute',left:81,top:1365,width:849,height:100,opacity:ramp(f,Math.round(.5*fps),12)}}><Text layout={layouts.source} style={{color:s.muted,lineHeight:1.25}}/></div>
   {props.variant==='captioned'?<div style={{position:'absolute',left:81,top:1475,width:849,height:180,borderRadius:22,background:s.background+'F0',padding:'6px 7px',boxSizing:'border-box'}}><Text layout={layouts.caption} style={{fontWeight:600,textAlign:'center',lineHeight:1.25}}/></div>:null}
   <div style={{position:'absolute',left:81,top:1785,fontSize:23,color:s.muted,opacity:.8}}>{project.repository.replace(/^https:\/\//,'')}</div>
  </AbsoluteFill>
  <div style={{position:'absolute',left:81,right:150,bottom:72,height:4,background:s.foreground+'18'}}><div style={{height:4,width:`${(index+Math.min(1,f/duration))/design.scenes.length*100}%`,background:s.accent}}/></div>
 </AbsoluteFill>;
};
export const FinalVideo:React.FC<FrameProps>=(props)=>{let from=0;return <FontGate font={props.font}><AbsoluteFill>{props.design.scenes.map((scene,index)=>{const at=from,duration=props.readthrough.lines[index]!.allocatedFrames;from+=duration;return <Sequence key={scene.id} from={at} durationInFrames={duration}><FinalScene props={props} index={index}/></Sequence>;})}</AbsoluteFill></FontGate>;};
const Root=()=> <Composition id="FinalExplainer" component={FinalVideo} width={1080} height={1920} fps={30} durationInFrames={900} defaultProps={{} as FrameProps} calculateMetadata={({props})=>({durationInFrames:props.readthrough.totalFrames,fps:props.readthrough.fps})}/>;
registerRoot(Root);
