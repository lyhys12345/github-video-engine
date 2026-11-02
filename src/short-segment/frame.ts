import type {VisualPlan,SegmentTimeline,VisualStyle} from './plan.js';
import {renderContinuousFrame} from './continuous.js';
import {wrapCaption} from './captions.js';
const C={bg:'#080e1b',panel:'#131f34',line:'#293b50',text:'#f1f5f4',dim:'#a2b3c7',mint:'#b5ff83',orange:'#ffb36b'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function text(x:number,y:number,s:string,size=24,color:string=C.text,extra=''){return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${esc(s)}</text>`;}
function lines(value:string,limit:number){const chars=Array.from(value),result:string[]=[];while(chars.length)result.push(chars.splice(0,limit).join(''));return result;}
/** Preserve code/filename tokens such as index.js when wrapping mixed Chinese captions. */
export const captionLines=wrapCaption;
function person(color:string){return `<circle cx="0" cy="-48" r="26" fill="${color}"/><path d="M-50 76V22Q-50-12 0-12Q50-12 50 22V76Z" fill="${color}"/>`;}
function photo(x:number,y:number,mode:'original'|'mask'|'cutout',progress=1){const bg=mode==='mask'?'#000':mode==='original'?'#527eae':'url(#checker)',fg=mode==='mask'?'#fff':'#ef9a70',scenery='<circle cx="55" cy="-70" r="17" fill="#c9ddec"/><path d="M-85 72L-45 22L-10 70L45 5L86 65V110H-86Z" fill="#356584"/>';return `<g transform="translate(${x} ${y})"><rect x="-86" y="-112" width="172" height="224" rx="16" fill="${bg}"/>${mode==='original'?scenery:mode==='cutout'?`<g opacity="${1-progress}"><rect x="-86" y="-112" width="172" height="224" rx="16" fill="#527eae"/>${scenery}</g>`:''}${person(fg)}<rect x="-86" y="-112" width="172" height="224" rx="16" fill="none" stroke="${C.line}" stroke-width="2"/></g>`;}
/** Bounded presentation of authored operations; separate from immutable diagnostic SVGs. */
export function renderSegmentFrame(plan:VisualPlan,timeline:SegmentTimeline,frame:number,provenanceHash:string,visualStyle?:VisualStyle){
 if(!Number.isInteger(frame)||frame<0||frame>=timeline.totalFrames)throw Error('Segment frame outside range');
 if(plan.presentation==='continuous-explainer'){if(!visualStyle)throw Error('Continuous workspace requires captured visual style');return renderContinuousFrame(plan,timeline,frame,provenanceHash,visualStyle);}
 const cue=timeline.cues.find(c=>frame>=c.startFrame&&frame<c.endFrame)??(frame<timeline.voiceStartFrame?timeline.cues[0]!:timeline.cues.at(-1)!);
 const local=clamp((frame-cue.startFrame)/(cue.endFrame-cue.startFrame)),overall=clamp((frame-timeline.voiceStartFrame)/(timeline.voiceEndFrame-timeline.voiceStartFrame));
 const edge=Math.min(clamp(frame/9),clamp((timeline.totalFrames-1-frame)/9)),enter=1-Math.pow(1-clamp(local*6),3);
 let drawing='';
 if(plan.kind==='rule-build'){
  const r=plan.rule!,phase=cue.index,driveStart=timeline.cues.at(-1)!.startFrame,driveEnd=timeline.voiceEndFrame;
  const valueAt=(f:number)=>r.from+Math.floor((r.to-r.from)*clamp((f-driveStart)/(driveEnd-driveStart))/r.acceleration+1e-8)*r.acceleration;
  const speed=valueAt(frame);let scroll=0;for(let f=0;f<=frame;f++)scroll+=valueAt(f)*.42;
  const stride=Math.sin(scroll*.08)*5;
  drawing=`<rect x="42" y="315" width="636" height="640" rx="28" fill="${C.panel}" stroke="${C.line}"/>${text(74,365,'index.js',30,C.mint)}${text(74,413,'官方案例 · 未碰撞分支内 · 代码简写',21,C.dim)}<rect x="66" y="447" width="588" height="156" rx="15" fill="#0a1424" stroke="${phase>=1?C.orange:C.line}"/>
  ${text(84,490,`if (speed < ${r.conditionMax??'MAX_SPEED'}) {`,25,phase>=1?C.orange:C.dim,'font-family="monospace"')}${text(100,531,`speed += ${r.acceleration};`,25,C.text,'font-family="monospace"')}${text(84,574,'}',25,C.dim,'font-family="monospace"')}
  ${text(77,654,`本段示意 ${r.from} → ${r.to} · 非实际测速`,22,C.dim)}${text(638,729,speed.toFixed(3),52,C.mint,'text-anchor="end" font-weight="750"')}${text(78,728,'速度',24,C.dim)}<path d="M75 861H646" stroke="${C.line}" stroke-width="3"/>
  ${Array.from({length:10},(_,i)=>`<rect x="${75+((i*70-scroll)%570+570)%570}" y="880" width="18" height="3" fill="${C.line}"/>`).join('')}
  <g transform="translate(166 769) scale(1.5)" fill="${C.mint}"><path d="M24 3H49V8H55V22H37V27H42V32H35V39H29V46H15V37H9V31H3V19H9V25H15V28H21V22H24Z"/><rect x="43" y="9" width="5" height="5" fill="${C.bg}"/><path d="M17 42V${52+stride}H26 M28 40V${52-stride}H36" fill="none" stroke="${C.mint}" stroke-width="6"/></g>
  ${text(75,928,'更新次数压缩示意 · 并非每秒增量',19,C.orange)}`;
 }else{
  const applyStart=timeline.cues[Math.floor(timeline.cues.length/2)]!.startFrame,p=clamp((frame-applyStart)/(timeline.voiceEndFrame-applyStart)),maskGlow=clamp(overall*3),resultGlow=clamp((frame-applyStart)/18);
  drawing=`<rect x="30" y="345" width="660" height="570" rx="28" fill="${C.panel}" stroke="${C.line}"/>${text(60,396,'同一张图，同一个前景',25,C.text)}
  ${photo(143,590,'original')}${photo(360,590,'mask')}${photo(577,590,'cutout',p)}
  ${text(143,756,'原图',23,C.dim,'text-anchor="middle"')}${text(360,756,'预测蒙版',23,C.mint,'text-anchor="middle"')}${text(577,756,'透明背景',23,C.mint,'text-anchor="middle"')}
  <path d="M236 589H262M254 580L264 589L254 598" fill="none" stroke="${C.mint}" stroke-width="4" opacity="${maskGlow}"/><path d="M452 589H478M470 580L480 589L470 598" fill="none" stroke="${C.mint}" stroke-width="4" opacity="${resultGlow}"/>
  ${text(60,824,'白色 → 保留前景',23,C.text)}${text(60,864,'黑色 → 背景透明',23,C.dim)}${text(637,866,'合成示意',19,C.orange,'text-anchor="end"')}`;
 }
 const caption=frame>=timeline.voiceStartFrame&&frame<timeline.voiceEndFrame?cue.text:'';
 const capLines=captionLines(caption,22);if(capLines.length>3)throw Error('Caption exceeds bounded safe region');
 const metadata=JSON.stringify({kind:'authored-continuous-segment-frame',visualPlanId:plan.id,sourceShotIds:plan.sourceShotIds,claimIds:plan.claimIds,frame,provenanceSha256:provenanceHash,illustration:true,cueMethod:timeline.cueMethod});
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" font-family="GVE Noto, sans-serif"><metadata>${esc(metadata)}</metadata><defs><pattern id="checker" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#d0d8df"/><path d="M0 0H14V14H0ZM14 14H28V28H14Z" fill="#95a4b4"/></pattern><radialGradient id="wash"><stop stop-color="#1b384e"/><stop offset="1" stop-color="${C.bg}"/></radialGradient></defs><rect width="720" height="1280" fill="${C.bg}"/><rect width="720" height="720" fill="url(#wash)" opacity=".5"/><g opacity="${edge}">
 ${text(44,65,plan.title.toUpperCase(),23,C.dim,'letter-spacing="2"')}${text(44,126,'看懂一条规则',46,C.text,'font-weight="800"')}
 <g opacity="${.55+.45*enter}" transform="translate(0 ${(1-enter)*8})">${lines(cue.label,20).map((s,i)=>text(44,198+i*40,s,31,C.mint,'font-weight="650"')).join('')}</g>
 ${drawing}<rect x="36" y="1014" width="648" height="148" rx="20" fill="#101c2e"/>${capLines.map((s,i)=>text(360,1062+i*38,s,27,C.text,'text-anchor="middle" font-weight="550"')).join('')}
 ${text(44,1211,'图形教学重建 · 助手定位演绎 · 非实际执行录像',17,C.dim)}${text(44,1241,plan.labels.disclosure.slice(0,43),16,C.orange)}<rect x="44" y="1190" width="632" height="3" rx="1.5" fill="${C.line}"/><rect x="44" y="1190" width="${632*overall}" height="3" rx="1.5" fill="${C.mint}"/></g></svg>`;
}
