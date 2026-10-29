import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender} from 'remotion';

const C={bg:'#080E1B',panel:'#131F34',line:'#2B3A50',text:'#F1F5F4',dim:'#9AA9BC',mint:'#B5FF83',orange:'#FFB36B',violet:'#BAA6FF'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-Math.pow(1-clamp(n),3);
const mix=(a:number,b:number,p:number)=>a+(b-a)*clamp(p);
const phases=[0,135,315,525,750];
const captions=[{from:12,to:114,text:'这个小恐龙，终于能慢下来了。'},{from:147,to:289,text:'它原本从六开始，\n每次更新，加快一点。'},{from:327,to:490,text:'一点点累积，就越跑越快；\n过了门槛，才停下来。'},{from:537,to:722,text:'REA 帮助手找到这条规则，\n再做成能调速的小演示。'}];

function Dino({frame,color=C.mint}:{frame:number;color?:string}){const stride=Math.sin(frame*.6)*5;return <g fill={color} shapeRendering="crispEdges"><path d="M24 3H49V8H55V22H37V27H42V32H35V39H29V46H15V37H9V31H3V19H9V25H15V28H21V22H24Z"/><rect x={43} y={9} width={5} height={5} fill={C.bg}/><path d="M37 20H53" stroke={C.bg} strokeWidth={3}/><path d={`M17 42V${52+stride}H26 M28 40V${52-stride}H36`} fill="none" stroke={color} strokeWidth={6}/></g>}
function travel(frame:number,kind:string){let value=0;for(let f=0;f<=frame;f++){const s=kind==='manual'?(f<135?mix(10,6,ease((f-13)/70)):f>=525?mix(9,6,ease((f-545)/60)):6):kind==='rule'?(f>=315&&f<525?Math.min(13.001,6+(f-315)/17):f>=135&&f<315?6+Math.min(2,Math.floor((f-135)/32))*.001:6):(f<135?6+f/55:9.5);value+=s*1.3;}return value;}
function Lane({frame,speed,label,color,offset=0,kind='auto'}:{frame:number;speed:number;label:string;color:string;offset?:number;kind?:string}){
 const scroll=travel(frame,kind)+offset,xs=[0,1].map(i=>((700+i*500-scroll)%1000+1000)%1000),jump=Math.max(...xs.map(x=>x>100&&x<310?70*Math.sin(Math.PI*(310-x)/210):0));return <svg width="900" height="230" viewBox="0 0 900 230" style={{display:'block'}}>
 <text x="30" y="43" fill={C.dim} fontSize="24">{label}</text><text x="860" y="43" textAnchor="end" fill={color} fontSize="34" fontWeight="700">{speed.toFixed(1)}</text>
 <line x1="25" y1="191" x2="875" y2="191" stroke={C.line} strokeWidth="3"/>
 {Array.from({length:14},(_,i)=><rect key={i} x={((i*80-scroll*.55)%1060+1060)%1060-80} y={205+(i%3)*6} width={i%2?19:8} height="3" fill={C.line}/>)}
 {[0,1].map(i=>{const x=((700+i*500-scroll)%1000+1000)%1000;return <g key={i} transform={`translate(${x},121)`} fill={color} opacity=".65"><rect x="16" y="0" width="12" height="70" rx="3"/><path d="M5 19V40H19M39 10V34H28" fill="none" stroke={color} strokeWidth="9"/></g>})}
 <g transform={`translate(146,${74-jump}) scale(2)`}><Dino frame={frame} color={color}/></g>
 </svg>;
}
function Slider({value,pointer=false}:{value:number;pointer?:boolean}){const x=70+(value-6)/4*690;return <svg width="900" height="150" viewBox="0 0 900 150"><text x="35" y="29" fill={C.dim} fontSize="26">手动控制</text><text x="860" y="29" textAnchor="end" fill={C.mint} fontSize="28">固定速度 {value.toFixed(1)}</text><line x1="70" y1="77" x2="760" y2="77" stroke={C.line} strokeWidth="14" strokeLinecap="round"/><line x1="70" y1="77" x2={x} y2="77" stroke={C.mint} strokeWidth="14" strokeLinecap="round"/><circle cx={x} cy="77" r="22" fill={C.mint}/><circle cx={x} cy="77" r="34" fill="none" stroke={C.mint} opacity=".2" strokeWidth="8"/>{pointer?<path d={`M${x+7} 95l9 42 12-15 18-3z`} fill="white" stroke={C.bg} strokeWidth="3"/>:null}<text x="70" y="137" fill={C.dim} fontSize="22">慢</text><text x="760" y="137" fill={C.dim} fontSize="22" textAnchor="end">快</text></svg>}

const Teaser:React.FC=()=>{
 const frame=useCurrentFrame(),stage=frame<135?0:frame<315?1:frame<525?2:3,local=frame-phases[stage]!,pop=ease(local/14);
 const [handle]=useState(()=>delayRender('Load locked Noto font'));const [ready,setReady]=useState(false);
 useEffect(()=>{const font=new FontFace('GVE Noto',`url(${JSON.stringify(staticFile('font.ttf'))})`,{weight:'100 900'});void font.load().then(f=>{document.fonts.add(f);setReady(true);continueRender(handle)}).catch(cancelRender);},[handle]);
 if(!ready)return null;
 const manual=stage===0?mix(10,6,ease((frame-13)/70)):stage===3?mix(9,6,ease((local-20)/60)):6;
 const speed=stage===1?6+Math.min(2,Math.floor(local/32))*.001:stage===2?Math.min(13.001,6+local/17):6;
 const title=[<>终于，<br/><span style={{color:C.mint}}>能慢下来了。</span></>,<>为什么<br/><span style={{color:C.mint}}>越跑越快？</span></>,<>一点点累积，<br/><span style={{color:C.orange}}>就快起来了。</span></>,<>看懂规则，<br/><span style={{color:C.mint}}>再自己控制。</span></>][stage];
 const subtitle=['拖一下，速度就听你的。','从 6 开始，每次更新加一点。','达到判断门槛后，不再增加。','REA 提供线索，助手理解和制作。'][stage];
 const cap=captions.find(c=>frame>=c.from&&frame<c.to);
 return <AbsoluteFill style={{background:C.bg,fontFamily:'GVE Noto',color:C.text,overflow:'hidden'}}>
 <AbsoluteFill style={{backgroundImage:'radial-gradient(ellipse at 80% 0%, #1A344950, transparent 55%)'}}/>
 <div style={{position:'absolute',left:78,top:112,color:C.dim,fontSize:25,letterSpacing:3}}>REA / SOFTWARE EXPLAINED</div>
 <div style={{position:'absolute',left:78,top:207,fontSize:88,lineHeight:1.18,fontWeight:800,letterSpacing:-2,opacity:pop,transform:`translateY(${(1-pop)*18}px)`}}>{title}</div>
 <div style={{position:'absolute',left:80,top:452,fontSize:32,color:C.dim}}>{subtitle}</div>
 <div style={{position:'absolute',left:65,top:545,width:900,border:`2px solid ${C.line}`,borderRadius:32,background:C.panel,overflow:'hidden',boxShadow:'0 25px 80px #0005'}}>
 {(stage===0||stage===3)?<><Lane frame={frame} speed={stage===0?6+frame/55:9.5} label="自动加速 · 压缩示意" color={C.orange}/><div style={{height:1,background:C.line,margin:'0 25px'}}/><Lane frame={frame} speed={manual} label="手动模式 · 教学演示" color={C.mint} offset={380} kind="manual"/><Slider value={manual} pointer/></>:<>
 <Lane frame={frame} speed={speed} label="按找到的速度规则演示" color={C.mint} kind="rule"/>
 <div style={{margin:'0 30px',height:1,background:C.line}}/>
 <div style={{padding:'28px 36px 22px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:24,color:C.dim}}>当前速度</div><div style={{fontSize:86,lineHeight:1.25,fontWeight:750,fontVariantNumeric:'tabular-nums',color:C.mint}}>{speed.toFixed(3)}</div></div><div style={{fontSize:stage===1?48:32,fontWeight:650,color:stage===1?C.orange:C.text,padding:'20px 23px',background:'#253147',borderRadius:18}}>{stage===1?'+ 0.001':speed<13?'小于 13 → 继续加':'达到门槛 → 停止加'}</div></div>
 <svg width="900" height="170" viewBox="0 0 900 170"><line x1="40" y1="135" x2="850" y2="135" stroke={C.line} strokeWidth="2"/><line x1="40" y1="30" x2="850" y2="30" stroke={C.orange} strokeWidth="2" strokeDasharray="8 9" opacity=".5"/><text x="835" y="22" textAnchor="end" fontSize="20" fill={C.orange}>约13的判断门槛</text><path d="M40 135L650 30H850" fill="none" stroke={C.mint} strokeWidth="5" pathLength="1" strokeDasharray="1" strokeDashoffset={1-(stage===1?.09:clamp(local/170))}/><text x="40" y="162" fill={C.dim} fontSize="20">更新次数压缩示意 · 不是每秒增量</text></svg>
 </>}
 </div>
 <div style={{position:'absolute',left:82,top:1234,width:840}}>{stage===1?<div style={{display:'flex',gap:12}}>{['6.000','6.001','6.002'].map((n,i)=><div key={n} style={{background:Math.floor(local/32)>=i?'#203B2B':'#151E2D',color:Math.floor(local/32)>=i?C.mint:C.dim,borderRadius:16,padding:'17px 25px',fontSize:42,fontWeight:650}}>{n}</div>)}</div>:stage===2?<div style={{fontSize:27,color:C.dim}}>先判断，再相加；最后一次可能略超过 13。</div>:stage===3?<div style={{display:'flex',alignItems:'center',gap:18,fontSize:27}}>{['REA 找到线索','助手理解规则','做成小演示'].map((x,i)=><React.Fragment key={x}>{i>0?<span style={{color:C.dim}}>→</span>:null}<div style={{color:i===2?C.mint:C.text}}>{x}</div></React.Fragment>)}</div>:<div style={{fontSize:28,color:C.dim}}>原来的规则 / 自己的节奏</div>}</div>
 {cap?<div style={{position:'absolute',left:78,top:1480,width:850,minHeight:140,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontSize:43,fontWeight:550,lineHeight:1.5,whiteSpace:'pre-line',background:'#0C1424ED',borderRadius:20,padding:'12px 16px',boxSizing:'border-box'}}>{cap.text}</div>:null}
 <div style={{position:'absolute',left:82,top:1710,color:C.dim,fontSize:23}}>官方案例讲解 · 原创教学动画 · 样片待审</div>
 <div style={{position:'absolute',left:82,right:152,top:1770,display:'flex',gap:10}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,height:5,background:C.line,borderRadius:3,overflow:'hidden'}}><div style={{height:5,background:C.mint,width:`${clamp((frame-phases[i]!)/(phases[i+1]!-phases[i]!))*100}%`}}/></div>)}</div>
 </AbsoluteFill>;
};
registerRoot(()=> <Composition id="DinoTeaser" component={Teaser} width={1080} height={1920} fps={30} durationInFrames={750}/>);
