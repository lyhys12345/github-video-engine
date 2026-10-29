import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender} from 'remotion';
const bg='#080F1B',mint='#B5FF83',orange='#FFB36B',dim='#9BACBD';
const c=(x:number)=>Math.max(0,Math.min(1,x)),e=(x:number)=>{x=c(x);return x*x*(3-2*x)};
const captions=[[0,3.5,'想让小恐龙慢一点，该改哪里？'],[3.5,7.5,'REA 帮助手找到\n网页加载的代码。'],[7.5,10.2,'助手从里面看懂：'],[10.2,13.5,'原来，每次更新，\n速度都会加一点。'],[13.5,17.3,'有了这条线索，就能照着规则，'],[17.3,20,'做出能调速的小演示。'],[20,23.3,'找到线索、理解规则，\n再把想法做出来。']] as const;
function Dino({f}:{f:number}){return <g fill={mint} shapeRendering="crispEdges"><path d="M24 3H49V8H55V22H37V27H42V32H35V39H29V46H15V37H9V31H3V19H9V25H15V28H21V22H24Z"/><rect x="43" y="9" width="5" height="5" fill={bg}/><path d={`M17 42V${52+Math.sin(f*.5)*4}H26 M28 40V${52-Math.sin(f*.5)*4}H36`} fill="none" stroke={mint} strokeWidth="6"/></g>}
const Scene=()=>{const f=useCurrentFrame(),t=f/30;const[h]=useState(()=>delayRender('font'));const[ready,setReady]=useState(false);useEffect(()=>{const font=new FontFace('GVE',`url(${JSON.stringify(staticFile('font.ttf'))})`,{weight:'100 900'});void font.load().then(x=>{document.fonts.add(x);setReady(true);continueRender(h)}).catch(cancelRender)},[h]);if(!ready)return null;
 const depart=e((t-3.3)/1.4),returning=e((t-16.4)/1.5),cam=depart*(1-returning),slow=e((t-.45)/1.7),again=e((t-18)/1.6),speed=t<17?12-6*slow:10-4*again;
 let dist=0;for(let i=0;i<=f;i++){const s=i/30;dist+=(s<17?12-6*e((s-.45)/1.7):10-4*e((s-18)/1.6))*1.5;}
 const xs=[0,1,2].map(i=>((800+i*420-dist)%1260+1260)%1260),jump=Math.max(...xs.map(x=>x>100&&x<360?105*Math.sin(Math.PI*(360-x)/260):0));
 const rule=e((t-8)/.65),pulse=(Math.sin(f*.25)+1)/2,caption=captions.find(x=>t>=x[0]+.15&&t<x[1]+.15)?.[2];
 return <AbsoluteFill style={{background:bg,color:'white',fontFamily:'GVE',overflow:'hidden'}}>
 <AbsoluteFill style={{background:'radial-gradient(ellipse at 30% 50%,#193348,transparent 75%)'}}/>
 <div style={{position:'absolute',left:75,top:120,color:dim,fontSize:26,letterSpacing:2}}>REA / 从画面，看到代码线索</div>
 <div style={{position:'absolute',left:75,top:230,fontSize:74,fontWeight:800,lineHeight:1.2,opacity:1-cam}}>快慢，<span style={{color:mint}}>自己调。</span></div>
 <div style={{position:'absolute',left:75,top:230,fontSize:68,fontWeight:800,lineHeight:1.25,opacity:cam}}>REA 找线索，<br/><span style={{color:orange}}>助手看懂规则。</span></div>
 <div style={{position:'absolute',left:0,top:470,width:2200,height:900,transform:`translateX(${-1030*cam}px)`,transformOrigin:'0 0'}}>
 <div style={{position:'absolute',left:65,top:0,width:940,height:720,border:'2px solid #40536B',borderRadius:32,background:'#132338',overflow:'hidden',transform:`scale(${1-.15*cam})`,transformOrigin:'right center'}}>
 <div style={{padding:'30px 35px',fontSize:30,color:dim,display:'flex',justifyContent:'space-between'}}><span>{t>17?'按规则制作的新演示':'调速效果 · 教学示意'}</span><span style={{color:mint}}>速度 {speed.toFixed(1)}</span></div>
 <svg width="940" height="400" viewBox="0 0 940 400"><path d="M20 322H920" stroke="#50647A" strokeWidth="3"/>{xs.map((x,i)=><g key={i} transform={`translate(${x},242)`} fill={orange}><rect x="15" width="16" height="80" rx="4"/><path d="M1 20V46H15M46 8V35H31" stroke={orange} strokeWidth="10" fill="none"/></g>)}<g transform={`translate(150,${180-jump}) scale(2.6)`}><Dino f={f}/></g>{Array.from({length:13},(_,i)=><path key={i} d={`M${((i*85-dist*.5)%1100+1100)%1100} 350h23`} stroke="#425770" strokeWidth="3"/>)}</svg>
 <div style={{padding:'5px 40px',fontSize:28,color:dim}}>拖动滑杆，立刻慢下来</div><svg width="940" height="160"><path d="M90 70H850" stroke="#3E536C" strokeWidth="16" strokeLinecap="round"/><path d={`M90 70H${90+(speed-6)/6*760}`} stroke={mint} strokeWidth="16" strokeLinecap="round"/><circle cx={90+(speed-6)/6*760} cy="70" r="27" fill={mint}/><path d={`M${100+(speed-6)/6*760} 82l12 45 12-17 21-5z`} fill="white"/></svg>
 </div>
 <svg style={{position:'absolute',left:900,top:250}} width="280" height="180"><path d="M0 90H260" stroke={mint} strokeWidth="6" strokeDasharray="12 14" strokeDashoffset={-f*2}/><path d="M235 68L260 90L235 112" stroke={mint} strokeWidth="6" fill="none"/></svg>
 <div style={{position:'absolute',left:1110,top:0,width:860,height:780,border:'2px solid #40536B',borderRadius:30,background:'#121D30',overflow:'hidden',transform:`scale(${1+rule*.025})`}}>
 <div style={{padding:'30px',fontSize:34,color:mint,background:'#20372D'}}>REA → 页面加载的 index.js</div>
 <div style={{padding:'30px',fontFamily:'monospace',fontSize:29,lineHeight:2,color:'#63788F'}}><div>function update() {'{'}</div><div>　drawBackground();</div><div style={{background:`rgba(181,255,131,${rule*(.1+pulse*.04)})`,borderLeft:`5px solid ${rule>.1?mint:'transparent'}`,paddingLeft:12,color:rule>.1?'#F0F6F6':'#63788F'}}>　if (speed &lt; MAX_SPEED) {'{'}<br/><span style={{color:rule>.1?orange:'inherit'}}>　　speed += ACCELERATION;</span><br/>　{'}'}</div><div>　drawCharacter();</div><div>{'}'}</div></div>
 <div style={{position:'absolute',bottom:35,left:30,right:30,padding:20,background:'#293349',borderRadius:18,fontSize:34,opacity:rule}}>助手：每次更新，<span style={{color:orange}}>速度加一点</span></div>
 </div></div>
 <div style={{position:'absolute',left:75,top:1320,fontSize:31,color:dim,opacity:returning}}>REA 提供线索 <span style={{color:mint}}>→</span> 助手理解并制作</div>
 <div style={{position:'absolute',left:70,top:1490,width:900,fontSize:43,lineHeight:1.5,textAlign:'center',whiteSpace:'pre-line'}}>{caption}</div>
 <div style={{position:'absolute',left:75,top:1750,fontSize:22,color:dim}}>官方案例原理讲解 · 教学重建 · 非实际操作录像</div>
 </AbsoluteFill>};
registerRoot(()=> <Composition id="DinoTeaser" component={Scene} width={1080} height={1920} fps={30} durationInFrames={720}/>);
