import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile,delayRender,continueRender,cancelRender} from 'remotion';
const mint='#B5FF83',dim='#94A6BE',orange='#FFB36B',bg='#080E1B';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
const caps:[[number,number,string],...Array<[number,number,string]>]=[[0,2.25,'想让小恐龙跑慢一点？'],[2.25,4.3,'先找出它怎么加速。'],[4.3,7.3,'REA 帮助手找到\n网页加载的代码。'],[7.3,9.2,'助手从里面找出规则：'],[9.2,12.5,'原来，每次更新，\n速度都会加一点。'],[12.5,14.8,'有了这条线索，就能照着规则，'],[14.8,16.95,'做出能调速的小演示。'],[16.95,18.6,'REA 负责提供线索，'],[18.6,21,'助手负责理解和制作。']];
function Dino({f}:{f:number}){return <g fill={mint} shapeRendering="crispEdges"><path d="M24 3H49V8H55V22H37V27H42V32H35V39H29V46H15V37H9V31H3V19H9V25H15V28H21V22H24Z"/><rect x="43" y="9" width="5" height="5" fill={bg}/><path d={`M17 42V${52+Math.sin(f*.6)*4}H26 M28 40V${52-Math.sin(f*.6)*4}H36`} stroke={mint} strokeWidth="6" fill="none"/></g>}
const Teaser=()=>{const f=useCurrentFrame(),t=f/30;const [h]=useState(()=>delayRender('font'));const [ready,setReady]=useState(false);useEffect(()=>{const font=new FontFace('GVE',`url(${JSON.stringify(staticFile('font.ttf'))})`,{weight:'100 900'});void font.load().then(x=>{document.fonts.add(x);setReady(true);continueRender(h)}).catch(cancelRender)},[h]);if(!ready)return null;
 const unfold=ease((t-3.4)/1),payoff=ease((t-13.6)/1.2),slow=ease((t-.6)/1.5),speed=10-4*slow;
 let distance=0;for(let i=0;i<=f;i++)distance+=(10-4*ease((i/30-.6)/1.5))*1.4;
 const obstacles=[0,1,2].map(i=>((750+i*350-distance)%1050+1050)%1050),jump=Math.max(...obstacles.map(x=>x>90&&x<330?90*Math.sin(Math.PI*(330-x)/240):0));
 const caption=caps.find(c=>t>=c[0]+.15&&t<c[1]+.15)?.[2];
 const codeIn=ease((t-4.3)/.7),rule=ease((t-7.5)/.6),end=ease((t-16.8)/.7);
 return <AbsoluteFill style={{background:bg,color:'white',fontFamily:'GVE',overflow:'hidden'}}>
 <AbsoluteFill style={{background:'radial-gradient(ellipse at 70% 40%,#193043,transparent 70%)'}}/>
 <div style={{position:'absolute',left:75,top:125,fontSize:25,color:dim,letterSpacing:3}}>REA · 看懂软件的线索</div>
 <div style={{position:'absolute',left:75,top:205,fontSize:72,fontWeight:800,lineHeight:1.3}}>让 AI 改游戏，<br/><span style={{color:mint}}>先让它看懂。</span></div>
 <div style={{position:'absolute',left:65,top:460-unfold*45,width:900,height:420,border:'2px solid #35465B',borderRadius:30,background:'#142035',overflow:'hidden'}}>
 <div style={{padding:'20px 28px',fontSize:25,color:dim,display:'flex',justifyContent:'space-between'}}><span>{payoff>.5?'按规则制作的调速演示':'小恐龙 · 教学示意'}</span><span style={{color:mint}}>速度 {speed.toFixed(1)}</span></div>
 <svg width="900" height="250" viewBox="0 0 900 250"><path d="M25 202H875" stroke="#526078" strokeWidth="3"/>{obstacles.map((x,i)=><g key={i} transform={`translate(${x},140)`} fill={orange}><rect x="14" width="12" height="62" rx="3"/><path d="M2 14V36H15M37 7V29H25" stroke={orange} strokeWidth="8" fill="none"/></g>)}<g transform={`translate(140,${85-jump}) scale(2.1)`}><Dino f={f}/></g>{Array.from({length:12},(_,i)=><path key={i} d={`M${((i*85-distance*.5)%1000+1000)%1000} 225h18`} stroke="#3A4D64" strokeWidth="3"/>)}</svg>
 <svg width="900" height="95"><text x="30" y="32" fill={dim} fontSize="25">拖动调速</text><path d="M230 30H820" stroke="#40536C" strokeWidth="12" strokeLinecap="round"/><path d={`M230 30H${230+590*(1-slow)}`} stroke={mint} strokeWidth="12"/><circle cx={230+590*(1-slow)} cy="30" r="19" fill={mint}/><path d={`M${240+590*(1-slow)} 40l8 34 10-12 15-3z`} fill="white"/></svg>
 </div>
 <svg style={{position:'absolute',left:0,top:800,opacity:unfold*(1-payoff*.35)}} width="1080" height="180"><path d="M510 10V85H170V150" fill="none" stroke={mint} strokeWidth="4" pathLength="1" strokeDasharray="1" strokeDashoffset={1-codeIn}/><circle cx="510" cy={10+75*clamp((t-4.3)/.7)} r="7" fill={mint}/></svg>
 <div style={{position:'absolute',left:65,top:955,width:900,opacity:codeIn,transform:`translateY(${(1-codeIn)*35}px)`,border:'2px solid #35465B',borderRadius:24,background:'#111C2D',overflow:'hidden'}}>
 <div style={{padding:'18px 28px',background:'#203329',fontSize:31,color:mint}}>REA 找到代码线索 <span style={{color:dim,fontSize:24}}>· 页面加载的 index.js</span></div>
 <div style={{padding:'22px 28px',fontSize:29,fontFamily:'monospace',lineHeight:1.8,color:'#BCCBDC',background:`rgba(181,255,131,${rule*.07})`}}><div>if (speed &lt; MAX_SPEED) {'{'}</div><div style={{color:rule>.1?orange:'#BCCBDC',transform:`translateX(${rule*8}px)`}}>　speed += ACCELERATION;</div><div>{'}'}</div></div>
 <div style={{padding:'15px 28px',fontSize:30,color:orange,opacity:rule,borderTop:'1px solid #35465B'}}>助手理解：每次更新，速度加一点</div>
 </div>
 <div style={{position:'absolute',left:65,top:1375,width:900,display:'flex',gap:15,alignItems:'center',opacity:payoff,fontSize:29}}><span style={{color:mint}}>代码线索</span><span>→</span><span style={{color:orange}}>助手理解规则</span><span>→</span><span>制作调速演示</span></div>
 <div style={{position:'absolute',left:65,top:1500,width:900,textAlign:'center',fontSize:43,fontWeight:550,lineHeight:1.5,whiteSpace:'pre-line'}}>{caption??(end>.5?'找到线索，才有依据。':'')}</div>
 <div style={{position:'absolute',left:75,top:1740,fontSize:23,color:dim}}>官方案例原理讲解 · 教学重建 · 非实际操作录像</div>
 </AbsoluteFill>};
registerRoot(()=> <Composition id="DinoTeaser" component={Teaser} width={1080} height={1920} fps={30} durationInFrames={690}/>);
