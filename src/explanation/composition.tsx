import React from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame,staticFile} from 'remotion';
import {ExplanationSchema,sampleEntity,sampleDriver,type ExplanationPlan} from '../contracts/explanation.js';
export function Explanation({plan:raw}:{plan:ExplanationPlan}){
 const p=ExplanationSchema.parse(raw),t=useCurrentFrame()/30,b=p.beats.find(b=>t>=b.start&&t<b.end)??p.beats.at(-1)!;
 return <AbsoluteFill style={{background:'#101727',fontFamily:'Noto',color:'white'}}><style>{`@font-face{font-family:Noto;src:url('${staticFile('font.ttf')}')}`}</style>
 <svg viewBox="0 0 1080 1920" width="100%" height="100%">
 <defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" stroke="#283249" fill="none"/></pattern></defs>
 <rect width="1080" height="1920" fill="url(#grid)"/>
 <text x="72" y="130" fill="#90e8c2" fontSize="38">{p.projectName}</text><text x="72" y="185" fill="#b8c5d9" fontSize="24">无声视觉验证 · 非成片</text>
 {p.entities.map(e=>{const s=sampleEntity(e,t,p.drivers);return <g key={e.id} opacity={s.opacity} transform={`translate(${s.x} ${s.y}) scale(${s.scale})`}>{e.shapes.map((v,i)=>v.kind==='rect'?<rect key={i} x={v.x} y={v.y} width={v.w} height={v.h} rx={v.radius??0} fill={v.fill}/>:v.kind==='path'?<path key={i} d={v.d} fill={v.fill}/>:<text key={i} x={v.x} y={v.y} fontSize={v.size} fill={v.fill}>{v.text}</text>)}</g>})}
 {p.drivers.filter(d=>t>=d.start&&t<d.end).map(d=>{const v=sampleDriver(d,t),pulse=v.lastEvent===null?1:Math.min(1,(t-v.lastEvent)/.55);return <g key={d.id}>
 <rect x="140" y="525" width="800" height="86" rx="18" fill="#263953"/>
 <text x="165" y="580" fill="#ffffff" fontSize="30">{d.label} · 运动 {v.multiplier.toFixed(1)}×</text>
 <rect x={145+pulse*620} y="625" width="165" height="48" rx="15" fill="#f9bb72" opacity={pulse<1?1:0}/>
 <text x={175+pulse*620} y="659" fill="#101727" fontSize="25" opacity={pulse<1?1:0}>更新一次</text>
 <text x="540" y="1420" textAnchor="middle" fill="#b8c5d9" fontSize="26">时间压缩原理示意；更新事件直接驱动画面速度</text>
 </g>})}
 <rect x="48" y="1510" width="984" height="200" rx="28" fill="#101727"/>
 {b.caption.split('|').map((s,i)=><text key={i} x="540" y={1580+i*66} textAnchor="middle" fontSize="43" fill="white">{s}</text>)}
 <text x="540" y="1790" textAnchor="middle" fill="#aab8ce" fontSize="23">{p.disclosure}</text>
 <rect x="72" y="1830" width={936*t/p.durationSeconds} height="5" fill="#90e8c2"/>
 </svg></AbsoluteFill>;
}
registerRoot(()=> <Composition id="Explanation" component={Explanation} width={1080} height={1920} fps={30} durationInFrames={540} defaultProps={{plan:{} as ExplanationPlan}} calculateMetadata={({props})=>({durationInFrames:ExplanationSchema.parse(props.plan).durationSeconds*30})}/>);
