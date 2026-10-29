import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender} from 'remotion';
import {travel,assembly} from '../../../../src/evidence-planner/continuity.js';
const bg='#07131B',mint='#B5FF83',orange='#FFB36B',dim='#9BACBD',cyan='#63D9EF';
const clamp=(x:number)=>Math.max(0,Math.min(1,x)),ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x)},mix=(a:number,b:number,x:number)=>a+(b-a)*ease(x);
const captions=[[0,2,'小恐龙跑太快？'],[2,4.2,'调慢一点，就好跳多了。'],[4.2,5.2,'该改哪里？'],[5.2,9.8,'REA 把网页加载的代码交给助手。'],[9.8,11.3,'助手找到规则：'],[11.3,14,'每次更新，速度就加一点。'],[14,17.8,'看，更新不断累积，恐龙也越跑越快。'],[17.8,20.5,'弄懂原因，就能照着规则，'],[20.5,24,'做出可以调速的小演示。'],[24,28.7,'难的不是拖滑杆，是找到该改的地方。']] as const;
function Dino({f}:{f:number}){return <g fill={mint} shapeRendering="crispEdges"><path d="M24 3H49V8H55V22H37V27H42V32H35V39H29V46H15V37H9V31H3V19H9V25H15V28H21V22H24Z"/><rect x="43" y="9" width="5" height="5" fill={bg}/><path d={`M17 42V${52+Math.sin(f*.55)*4}H26 M28 40V${52-Math.sin(f*.55)*4}H36`} fill="none" stroke={mint} strokeWidth="6"/></g>}
function speedAt(t:number){return t<4?mix(12,6,(t-.5)/1.3):t<12.5?6:t<20.8?6+6*clamp((t-12.5)/7.5):t<24?mix(12,6,(t-21.1)/1.6):t<26?mix(6,10,(t-24)/1):mix(10,6,(t-26)/1.2)}
const Scene=()=>{const f=useCurrentFrame(),t=f/30;const[h]=useState(()=>delayRender('font'));const[ready,setReady]=useState(false);useEffect(()=>{const font=new FontFace('GVE',`url(${JSON.stringify(staticFile('font.ttf'))})`,{weight:'100 900'});void font.load().then(x=>{document.fonts.add(x);setReady(true);continueRender(h)}).catch(cancelRender)},[h]);if(!ready)return null;
 const enter=ease((t-4)/1.1),leave=ease((t-20.4)/1.2),detail=enter*(1-leave),gameY=490+360*detail,gameScale=1-.10*detail,speed=speedAt(t),rule=clamp((t-12.5)/7.5),updates=Math.floor(rule*6000);
 let dist=0;for(let i=0;i<=f;i++)dist+=speedAt(i/30)*1.7;
 const xs=[0,1,2].map(i=>((900+i*450-dist)%1350+1350)%1350),jump=Math.max(...xs.map(x=>x>105&&x<385?110*Math.sin(Math.PI*(385-x)/280):0));
 const hand=clamp((t-5.6)/3.3),packetX=mix(160,780,hand),packetY=650-Math.sin(hand*Math.PI)*140;
 const codeVisible=t>=9.8&&t<12.5,causal=t>=12.5&&t<20.8,caption=captions.find(x=>t>=x[0]+.15&&t<x[1]+.15)?.[2];
 return <AbsoluteFill style={{background:bg,color:'white',fontFamily:'GVE',overflow:'hidden'}}>
 <AbsoluteFill style={{background:'radial-gradient(ellipse at 45% 45%,#183C49,transparent 74%)'}}/>
 <div style={{position:'absolute',left:75,top:110,fontSize:25,color:dim}}>REA / 给 AI 助手找到代码线索</div>
 <div style={{position:'absolute',left:75,top:210,fontSize:74,fontWeight:800,opacity:1-detail,lineHeight:1.3}}>{t<4?<><span style={{color:mint}}>慢一点，</span>就跳过了。</>:<>从代码线索，<br/><span style={{color:mint}}>做出可调速演示。</span></>}</div>
 {/* The same game remains on screen throughout the handoff and explanation. */}
 <div style={{position:'absolute',left:65,top:gameY,width:940,height:710,border:'2px solid #426075',borderRadius:28,background:'#102535',overflow:'hidden',transform:`scale(${gameScale})`,transformOrigin:'center top'}}>
 <div style={{height:80,padding:'22px 30px',boxSizing:'border-box',fontSize:29,color:dim,display:'flex',justifyContent:'space-between'}}><span>{t<4?'调速结果 · 教学重建':t<20.8?'同一游戏 · 规则驱动':'助手制作的新教学演示'}</span><span style={{color:mint}}>速度 {speed.toFixed(3)}</span></div>
 <svg width="940" height="410" viewBox="0 0 940 410"><path d="M20 322H920" stroke="#587384" strokeWidth="3"/>{xs.map((x,i)=><g key={i} transform={`translate(${x},242)`} fill={orange}><rect x="15" width="16" height="80" rx="4"/><path d="M1 20V46H15M46 8V35H31" stroke={orange} strokeWidth="10" fill="none"/></g>)}<g transform={`translate(160,${180-jump}) scale(2.6)`}><Dino f={f*speed/6}/></g>{Array.from({length:15},(_,i)=><path key={i} d={`M${((i*85-dist*.65)%1100+1100)%1100} 350h${15+speed*2}`} stroke="#526E81" strokeWidth="3"/>)}{speed>9&&[0,1,2].map(i=><path key={i} d={`M${60+i*25} ${220+i*30}h-45`} stroke={cyan} opacity={(speed-9)/5} strokeWidth="4"/>)}</svg>
 <div style={{fontSize:28,color:dim,padding:'0 40px'}}>{causal?'原游戏规则 · 自动加速':t<4?'拖动速度，动作立刻改变':t<20.8?'代码线索正在分析':'新教学演示 · 现在可以调速'}</div>
 <svg width="940" height="150" style={{opacity:t<4?1:assembly((t-20.2)/2).control}}><path d="M90 65H850" stroke="#3E536C" strokeWidth="16" strokeLinecap="round"/><path d={`M90 65H${90+(speed-6)/6*760}`} stroke={mint} strokeWidth="16" strokeLinecap="round"/><circle cx={90+(speed-6)/6*760} cy="65" r="25" fill={mint}/>{!causal&&<path d={`M${100+(speed-6)/6*760} 77l12 45 12-17 21-5z`} fill="white"/>}</svg></div>
 {t>=4&&t<9.8&&<div style={{opacity:enter}}>
 <div style={{position:'absolute',left:80,top:250,fontSize:52,fontWeight:750}}>画面背后，有代码。</div>
 <svg style={{position:'absolute',left:70,top:430}} width="940" height="500" viewBox="0 0 940 500">
 <path d="M110 240C310 0 620 0 830 240" fill="none" stroke="#315365" strokeWidth="5"/>
 <g transform="translate(30,175)"><rect width="170" height="150" rx="16" fill="#203E4B" stroke={cyan} strokeWidth="3"/><path d="M0 35H170" stroke={cyan}/><text x="85" y="90" textAnchor="middle" fill="white" fontSize="31">网页</text><text x="85" y="125" textAnchor="middle" fill={dim} fontSize="22">已加载代码</text></g>
 <g transform="translate(380,35)"><circle cx="85" cy="85" r="82" fill="#224B46" stroke={mint} strokeWidth="4"/><text x="85" y="98" textAnchor="middle" fill={mint} fontSize="40" fontWeight="700">REA</text><text x="85" y="205" textAnchor="middle" fill={dim} fontSize="27">取出 · 交给</text></g>
 <g transform="translate(740,175)"><rect width="170" height="150" rx="32" fill="#40372B" stroke={orange} strokeWidth="3"/><circle cx="55" cy="55" r="9" fill={orange}/><circle cx="115" cy="55" r="9" fill={orange}/><path d="M55 85Q85 110 115 85" fill="none" stroke={orange} strokeWidth="5"/><text x="85" y="133" textAnchor="middle" fill="white" fontSize="28">AI 助手</text></g>
 </svg><div style={{position:'absolute',left:packetX-65,top:packetY,width:150,height:100,background:'#D8FBE3',borderRadius:12,color:'#16382D',fontFamily:'monospace',fontSize:35,textAlign:'center',lineHeight:'100px',boxShadow:'0 0 35px #8FFF8770',transform:`rotate(${Math.sin(hand*Math.PI)*-12}deg)`}}>{'{ }'}</div>
 <div style={{position:'absolute',left:75,top:920,fontSize:29,color:dim}}>REA 提供线索；助手负责理解。</div></div>}
 {t>=9.8&&t<22.3&&(()=>{const scan=clamp((t-9.8)/2.7),token=travel((t-12.1)/1.3,{x:490,y:555,scale:1},{x:500,y:650,scale:1}),attach=travel((t-19.6)/2.3,token,{x:540,y:1070,scale:.45}),fade=1-ease((t-21.8)/.5);return <div style={{opacity:fade}}>
 <svg style={{position:'absolute',left:0,top:0}} width="1080" height="1500">
 <g opacity={1-ease((t-13.1)/.8)}><rect x="180" y="355" width="620" height="320" rx="24" fill="#142A36" stroke="#426075" strokeWidth="3"/><text x="220" y="410" fill={dim} fontSize="26">收到的游戏代码</text>{[460,505,550,595].map((y,i)=><path key={y} d={`M220 ${y}H${[650,730,680,560][i]}`} stroke={dim} strokeWidth="8" opacity=".5"/>)}<rect x="205" y={435+scan*120} width="560" height="42" rx="8" fill={mint} opacity=".25"/></g>
 <g transform="translate(885 430)"><rect x="-70" y="-65" width="140" height="130" rx="30" fill="#40372B" stroke={orange} strokeWidth="3"/><circle cx="-23" cy="-10" r="8" fill={orange}/><circle cx="23" cy="-10" r="8" fill={orange}/><path d="M-22 20H22" stroke={orange} strokeWidth="4"/><text y="105" fill="white" textAnchor="middle" fontSize="26">助手</text></g>
 <path d="M815 450L780 500" stroke={orange} strokeWidth="4" strokeDasharray="8 9"/>
 <g transform={`translate(${attach.x} ${attach.y}) scale(${attach.scale})`} opacity={ease((t-11.3)/.5)}><rect x="-235" y="-47" width="470" height="94" rx="18" fill={mint}/><text x="0" y="12" textAnchor="middle" fontSize="31" fill="#16382D">速度 += 一点点</text></g>
 {t>=13.2&&t<19.8&&[0,1,2].map(i=>{const u=((t-13.2+i*.33)%1);return <circle key={i} cx="500" cy={710+u*130} r={10+u*4} fill={mint} opacity={1-u}/>;})}
 {t>=20.3&&<path d="M160 1045H920" stroke={mint} strokeWidth="3" opacity={1-assembly((t-20.2)/2).ready}/>}
 </svg></div>;})()}
 <div style={{position:'absolute',left:70,top:1510,width:940,fontSize:42,lineHeight:1.5,textAlign:'center',whiteSpace:'pre-line'}}>{caption}</div>
 <div style={{position:'absolute',left:75,top:1750,fontSize:22,color:dim}}>官方案例原理讲解 · 教学重建 · 非实际操作录像</div>
 </AbsoluteFill>};
registerRoot(()=> <Composition id="DinoTeaser" component={Scene} width={1080} height={1920} fps={30} durationInFrames={900}/>);
