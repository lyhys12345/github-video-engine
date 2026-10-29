import React,{useMemo} from 'react';
import {AbsoluteFill,Composition,Sequence,interpolate,registerRoot,useCurrentFrame} from 'remotion';
import type {ProductionPackage,Readthrough} from '../contracts/production.js';
import {fitText} from './text-layout.js';
export type ProductionProps={design:ProductionPackage;readthrough:Readthrough;captions:Record<string,string>;mode:'style'|'animatic'|'motion'|'production'};
export const ProductionScene=({design,readthrough,captions,mode,index}:{index:number}&ProductionProps)=>{
  const scene=design.scenes[index]!,timing=readthrough.lines[index]!,f=useCurrentFrame(),s=design.style;
  const sceneFrames=mode==='motion'?Math.round(design.authorization.motionSeconds*readthrough.fps):timing.allocatedFrames;
  const enter=mode==='style'?1:interpolate(f,[0,15],[0,1],{extrapolateRight:'clamp'}),exit=mode==='style'?1:interpolate(f,[sceneFrames-12,sceneFrames-1],[1,0],{extrapolateLeft:'clamp'});
  const vivid=mode!=='animatic',labels=scene.labels;
  const textLayouts=useMemo(()=>{const context=document.createElement('canvas').getContext('2d');if(!context)throw new Error('Canvas text measurement unavailable');
    const fit=(value:string,max:number,min:number,width:number,height:number,lineHeight:number,weight=400)=>fitText(value,(text,size)=>{context.font=`${weight} ${size}px '${s.fontFamily}',sans-serif`;return context.measureText(text).width;},max,min,width,height,lineHeight);
    return{title:fit(scene.title,56,40,566,132,1.28,800),subtitle:fit(scene.subtitle,27,24,566,80,1.4),labels:labels.map(t=>fit(t,28,26,518,60,1.1,600)),caption:fit(captions[scene.scriptId]??'',s.captionSize,30,542,126,1.35)};
  },[scene,s,captions,labels]);
  const box:React.CSSProperties={border:`2px solid ${s.foreground}25`,borderRadius:22,background:'#FFFFFF88',padding:'12px 22px',fontSize:27,fontWeight:600,boxSizing:'border-box'};
  const label=(t:string,i:number)=>{const reveal=mode==='style'?1:interpolate(f,[12+i*16,28+i*16],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});const layout=textLayouts.labels[i]!;return <div key={i} style={{...box,height:88,fontSize:layout.fontSize,lineHeight:1.1,whiteSpace:'pre-line',opacity:reveal,transform:`translateY(${vivid?(1-reveal)*24:0}px)`,borderColor:i===Math.min(labels.length-1,Math.floor(f/30))?s.accent:s.foreground+'25',color:i===0?s.accent:s.foreground}}>{layout.lines.join('\n')}</div>;};
  return <AbsoluteFill style={{background:s.background,color:s.foreground,fontFamily:`'${s.fontFamily}',sans-serif`,overflow:'hidden'}}>
    <div style={{position:'absolute',inset:0,opacity:.08,backgroundImage:`linear-gradient(${s.foreground} 1px,transparent 1px),linear-gradient(90deg,${s.foreground} 1px,transparent 1px)`,backgroundSize:'48px 48px'}}/>
    <div style={{position:'absolute',left:54,right:100,top:100,display:'flex',justifyContent:'space-between',fontSize:20,letterSpacing:2,color:s.muted}}><span>REA / 沿着证据理解功能</span><span>{String(index+1).padStart(2,'0')} / {design.scenes.length}</span></div>
    <div style={{position:'absolute',left:54,right:100,top:172,height:238,opacity:enter*exit,transform:`translateY(${vivid?(1-enter)*32:0}px)`}}>
      <div style={{position:'absolute',top:0,height:132,fontSize:textLayouts.title.fontSize,fontWeight:800,lineHeight:1.28,whiteSpace:'pre-line'}}>{textLayouts.title.lines.join('\n')}</div>
      <div style={{position:'absolute',top:148,height:80,fontSize:textLayouts.subtitle.fontSize,lineHeight:1.4,color:s.muted,whiteSpace:'pre-line'}}>{textLayouts.subtitle.lines.join('\n')}</div>
    </div>
    <div style={{position:'absolute',left:54,right:100,top:430,opacity:exit}}>
      {scene.layout==='hook'?<><div style={{fontSize:88,fontWeight:800,color:s.accent,marginBottom:32,opacity:enter}}>复制 → ?</div><div style={{...box,fontSize:31,lineHeight:1.7}}>一段富文本<br/><span style={{color:s.accent}}>从界面走到系统剪贴板</span></div></>:null}
      {scene.layout==='path'?labels.map((l,i)=><React.Fragment key={i}>{label(l,i)}{i<labels.length-1?<div style={{height:22,lineHeight:'22px',textAlign:'center',fontSize:22,color:s.accent}}>↓</div>:null}</React.Fragment>):null}
      {['purpose','loop'].includes(scene.layout)?labels.map((l,i)=><div key={i} style={{marginBottom:22}}>{label(l,i)}</div>):null}
      {scene.layout==='compare'?<><div style={{...box,marginBottom:24,height:184}}><div style={{color:s.accent,marginBottom:14}}>原生二进制</div><div style={{fontSize:textLayouts.labels[0]!.fontSize,lineHeight:1.1,whiteSpace:'pre-line'}}>{textLayouts.labels[0]!.lines.join('\n')}</div><div style={{fontSize:23,color:s.muted,marginTop:14}}>依目标与已安装分析工具而定</div></div><div style={{...box,height:184}}><div style={{color:s.accent,marginBottom:14}}>静态 JavaScript</div><div style={{fontSize:textLayouts.labels[1]!.fontSize,lineHeight:1.1,whiteSpace:'pre-line'}}>{textLayouts.labels[1]!.lines.join('\n')}</div><div style={{fontSize:23,color:s.muted,marginTop:14}}>不需要原生反编译器</div></div></>:null}
      {scene.layout==='limits'?labels.map((l,i)=><div key={i} style={{marginBottom:18}}>{label(l,i)}</div>):null}
      {scene.layout==='closing'?<><div style={{fontSize:80,fontWeight:800,color:s.accent}}>REA</div><div style={{...box,marginTop:30,lineHeight:1.8}}>结论要有证据<br/>未知仍是未知</div><div style={{fontSize:29,color:s.muted,marginTop:35}}>github.com/morluto/rea</div></>:null}
    </div>
    <div style={{position:'absolute',left:54,right:100,top:880,height:140,fontSize:textLayouts.caption.fontSize,lineHeight:1.35,textAlign:'center',padding:'7px 12px',boxSizing:'border-box',background:s.background,borderRadius:10,whiteSpace:'pre-line'}}>{textLayouts.caption.lines.join('\n')}</div>
    <div style={{position:'absolute',left:54,right:100,top:1050,fontSize:18,lineHeight:1.5,color:s.muted}}>{scene.sourceLabel}<br/>图形讲解 · 官方文档案例 · 未运行目标软件</div>
    {mode==='animatic'||mode==='motion'?<div style={{position:'absolute',left:54,bottom:90,fontSize:22,color:s.accent}}>预演 · 临时本地声音 · {mode==='motion'?'代表镜头动效试片':'全片 Animatic'}</div>:null}
    <div style={{position:'absolute',left:54,right:100,bottom:50,height:4,background:s.foreground+'22'}}><div style={{width:`${(index+f/timing.allocatedFrames)/design.scenes.length*100}%`,background:s.accent,height:4}}/></div>
  </AbsoluteFill>;
};
const Film=(props:ProductionProps)=>{let from=0;return <AbsoluteFill>{props.design.scenes.map((scene,index)=>{const start=from;from+=props.readthrough.lines[index]!.allocatedFrames;return <Sequence key={scene.id} from={start} durationInFrames={props.readthrough.lines[index]!.allocatedFrames}><ProductionScene {...props} index={index}/></Sequence>;})}</AbsoluteFill>;};
registerRoot(()=> <Composition id="Explainer" component={Film} width={720} height={1280} fps={30} durationInFrames={1500} defaultProps={{} as ProductionProps} calculateMetadata={({props})=>({durationInFrames:props.readthrough.totalFrames,fps:props.readthrough.fps})}/>);
