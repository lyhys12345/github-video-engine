import type {VisualPlan,SegmentTimeline,VisualStyle} from './plan.js';
import {wrapCaption} from './captions.js';
const C={bg:'#08121e',panel:'#112539',line:'#2b4559',text:'#eef5ed',dim:'#9fb5c6',mint:'#c2ff89',orange:'#ffbc83'};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const txt=(x:number,y:number,s:string,size=24,color:string=C.text,extra='')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" ${extra}>${esc(s)}</text>`;
const stages=['hook','inspect','connect','execute','test','resolve'];
function captionLines(value:string){const out=wrapCaption(value,22);if(out.length>3)throw Error('Caption exceeds continuous safe region');return out;}
function subject(color:string){return `<circle cx="0" cy="-68" r="39" fill="${color}"/><path d="M-71 113V24Q-71-20 0-20Q71-20 71 24V113Z" fill="${color}"/>`;}
/** One persistent authored workspace. Scene values move focus and causal state, never reset objects. */
export function renderContinuousFrame(plan:VisualPlan,timeline:SegmentTimeline,frame:number,provenanceHash:string,style:VisualStyle){
 const cue=timeline.cues.find(c=>frame>=c.startFrame&&frame<c.endFrame)??(frame<timeline.voiceStartFrame?timeline.cues[0]!:timeline.cues.at(-1)!);
 const stage=stages.indexOf(plan.phases[cue.index]!.scene!),stageStart=(name:string)=>timeline.cues[plan.phases.findIndex(p=>p.scene===name)]?.startFrame??timeline.voiceEndFrame;
 const since=(name:string,seconds=.8)=>ease((frame-stageStart(name))/(seconds*30));
 const voiceP=clamp((frame-timeline.voiceStartFrame)/(timeline.voiceEndFrame-timeline.voiceStartFrame));
 const inspect=since('inspect'),connect=since('connect'),execute=since('execute',2),test=since('test'),resolve=since('resolve');
 const local=clamp((frame-cue.startFrame)/(cue.endFrame-cue.startFrame)),enter=ease(local*8),edge=Math.min(ease(frame/12),ease((timeline.totalFrames-1-frame)/12));
 let world='';
 if(plan.kind==='rule-build'){
  const r=plan.rule!,runStart=stageStart('execute'),runEnd=stageStart('test'),runP=clamp((frame-runStart)/Math.max(1,runEnd-runStart));
  const autoAt=(f:number)=>r.from+Math.floor((r.to-r.from)*clamp((f-runStart)/Math.max(1,runEnd-runStart))/r.acceleration)*r.acceleration;
  const handoffFraction=(autoAt(runEnd-1)-r.from)/(r.to-r.from),manualAt=(f:number)=>handoffFraction*(.5+.5*Math.cos((f-runEnd)/25)),speedAt=(f:number)=>f<runEnd?autoAt(f):r.from+(r.to-r.from)*manualAt(f);
  const speed=speedAt(frame),slider=frame<runEnd?runP:manualAt(frame);
  // Integrate this authored speed over frames, so the road accelerates without a phase reset.
  let scroll=0;for(let f=0;f<=frame;f++)scroll+=speedAt(f)*.52;
  const stride=Math.sin(scroll*.09)*7,tokenY=411+148*connect+136*execute;
  world=`<rect x="38" y="291" width="644" height="682" rx="25" fill="${C.panel}" stroke="${C.line}"/>
  ${txt(66,334,'资源 → 源码 → 运行规则',22,C.dim)}
  <rect x="65" y="355" width="590" height="100" rx="15" fill="#0a1929" stroke="${C.line}"/>
  <rect x="82" y="374" width="104" height="62" rx="9" fill="#1a354a"/>${txt(134,413,'页面',24,C.dim,'text-anchor="middle"')}
  <path d="M198 406H261M250 397L262 406L250 415" fill="none" stroke="${C.mint}" stroke-width="3" opacity="${inspect}"/>
  <g transform="translate(${(1-inspect)*42} 0)" opacity="${.28+.72*inspect}"><rect x="277" y="374" width="350" height="62" rx="9" fill="#213c4a" stroke="${C.mint}"/>${txt(301,413,'index.js',29,C.mint)}</g>
  <path d="M360 456V480" stroke="${C.mint}" stroke-width="3" stroke-dasharray="5 7" opacity="${connect}"/>
  <rect x="65" y="481" width="590" height="172" rx="15" fill="#071523" stroke="${connect>.2?C.orange:C.line}" stroke-width="${1+connect}"/>
  ${txt(83,516,'未碰撞分支内 · 官方代码简写',20,C.dim)}
  <rect x="76" y="532" width="567" height="40" rx="6" fill="${C.orange}" opacity="${.04+.1*connect*(1-execute)}"/>
  ${txt(90,561,`if (speed < ${r.conditionMax??'MAX_SPEED'}) {`,27,connect>.1?C.orange:C.dim)}
  <rect x="76" y="575" width="567" height="39" rx="6" fill="${C.mint}" opacity="${.03+.12*execute}"/>
  ${txt(108,604,`speed += ${r.acceleration};`,27,execute>.1?C.mint:C.dim)}${txt(90,638,'}',25,C.dim)}
  <path d="M360 654V685" stroke="${C.mint}" stroke-width="3" opacity="${execute}"/>
  <circle cx="360" cy="${tokenY}" r="5" fill="${C.mint}" opacity="${Math.sin(voiceP*Math.PI)*.8}"/>
  ${txt(67,705,'规则驱动的跑酷示意',22,C.text)}${txt(635,744,speed.toFixed(3),43,C.mint,'text-anchor="end" font-weight="750"')}${txt(635,771,`压缩示意 ${r.from} → ${r.to}`,18,C.dim,'text-anchor="end"')}
  <path d="M66 859H655" stroke="${C.dim}" stroke-width="3"/>
  ${Array.from({length:12},(_,i)=>`<rect x="${66+((i*64-scroll)%580+580)%580}" y="881" width="24" height="4" rx="2" fill="${C.line}"/>`).join('')}
  <g clip-path="url(#game-road)">${Array.from({length:3},(_,i)=>`<g transform="translate(${66+((i*230-scroll)%690+690)%690} 858)" stroke="${style.backdropColor}" stroke-width="9" fill="none"><path d="M0 0V-49M0-19H-14V-37M0-29H15V-47"/></g>`).join('')}</g>
  <g transform="translate(142 762) scale(1.5)" fill="${style.subjectColor}"><path d="M24 3H49V8H55V22H37V27H42V32H35V39H29V46H15V37H9V31H3V19H9V25H15V28H21V22H24Z"/><rect x="43" y="9" width="5" height="5" fill="${C.bg}"/><path d="M17 42V${52+stride}H26 M28 40V${52-stride}H36" fill="none" stroke="${style.subjectColor}" stroke-width="6"/></g>
  <g opacity="${test}"><path d="M346 816H635" stroke="${C.orange}" stroke-width="7" stroke-linecap="round"/><circle cx="${346+289*slider}" cy="816" r="8" fill="${C.mint}"/>${txt(345,845,'手动调速 · 作者预设轨迹',18,C.orange)}</g>
  ${txt(67,925,resolve>.2?'理解并重建规则，不等于复制整个游戏':'每次更新 +0.001 · 不是每秒 +0.001',21,resolve>.2?C.orange:C.dim)}
  <defs><clipPath id="game-road"><rect x="66" y="800" width="590" height="60"/></clipPath></defs>`;
 }else{
  const maskScale=.4+.6*connect,wipe=clamp((frame-stageStart('execute'))/Math.max(30,stageStart('test')-stageStart('execute'))),bgTest=since('test',1.2),bob=Math.sin(frame/38)*2;
  world=`<rect x="38" y="291" width="644" height="682" rx="25" fill="${C.panel}" stroke="${C.line}"/>
  ${txt(66,334,'同一个主体，贯穿整个过程',22,C.dim)}
  <rect x="90" y="366" width="540" height="430" rx="19" fill="url(#checker)"/>
  <rect x="90" y="366" width="540" height="430" rx="19" fill="#ae7298" opacity="${bgTest}"/>
  <g clip-path="url(#photo-bounds)"><g clip-path="url(#remaining-bg)"><use href="#source-photo"/></g><g clip-path="url(#processed-area)"><g mask="url(#foreground-mask)"><use href="#source-photo"/></g></g></g>
  <g transform="translate(${356*(1-connect)} ${268*(1-connect)}) scale(${maskScale})" opacity="${inspect*(1-execute)*.88}"><rect x="105" y="381" width="510" height="400" rx="12" fill="#000" opacity=".78"/><g transform="translate(354 ${610+bob}) scale(1.22)" color="#fff"><use href="#subject-geometry"/></g></g>
  <path d="M${90+540*wipe} 370V792" stroke="${C.mint}" stroke-width="3" opacity="${execute*(1-bgTest)}"/>
  <rect x="90" y="366" width="540" height="430" rx="19" fill="none" stroke="${connect>.2?C.mint:C.line}" stroke-width="2"/>
  <g opacity="${test}"><circle cx="500" cy="485" r="75" fill="#ae7298"/><g clip-path="url(#edge-crop)"><g transform="translate(500 485) scale(2.1) translate(-421 -600)"><g mask="url(#foreground-mask)"><use href="#source-photo"/></g></g></g><circle cx="500" cy="485" r="75" fill="none" stroke="${C.orange}" stroke-width="4"/><path d="M465 550L433 602" stroke="${C.orange}" stroke-width="3"/>${txt(475,669,'同一边缘 ×2.1',19,C.orange)}</g>
  <rect x="90" y="822" width="252" height="47" rx="10" fill="#071523"/>${txt(216,853,'白色：保留主体',21,C.text,'text-anchor="middle"')}
  <rect x="359" y="822" width="271" height="47" rx="10" fill="#071523"/>${txt(495,853,'黑色：移除背景',21,C.dim,'text-anchor="middle"')}
  ${txt(66,925,resolve>.2?'合成教学示意 · 真实效果取决于模型和图像':test>.2?'换上新背景，再检查主体边缘':'预测蒙版 → 应用蒙版 → 透明背景',21,resolve>.2?C.orange:C.dim)}
  <defs><g id="subject-geometry">${subject('currentColor')}</g><g id="source-photo"><rect x="90" y="366" width="540" height="430" fill="${style.backdropColor}"/><circle cx="533" cy="424" r="26" fill="#d6e5ee"/><path d="M90 724L218 541L351 701L488 529L630 738V796H90Z" fill="#315b72"/><g transform="translate(354 ${610+bob}) scale(1.22)" color="${style.subjectColor}"><use href="#subject-geometry"/></g></g><mask id="foreground-mask" maskUnits="userSpaceOnUse" x="90" y="366" width="540" height="430" style="mask-type:luminance"><rect x="90" y="366" width="540" height="430" fill="#000"/><g transform="translate(354 ${610+bob}) scale(1.22)" color="#fff"><use href="#subject-geometry"/></g></mask><clipPath id="photo-bounds"><rect x="90" y="366" width="540" height="430" rx="19"/></clipPath><clipPath id="remaining-bg"><rect x="${90+540*wipe}" y="366" width="${540*(1-wipe)}" height="430"/></clipPath><clipPath id="processed-area"><rect x="90" y="366" width="${540*wipe}" height="430"/></clipPath><clipPath id="edge-crop"><circle cx="500" cy="485" r="75"/></clipPath></defs>`;
 }
 const caption=frame>=timeline.voiceStartFrame&&frame<timeline.voiceEndFrame?cue.text:'';
 const metadata={kind:'continuous-operation-workspace',visualPlanId:plan.id,scene:plan.phases[cue.index]!.scene,sourceShotIds:plan.sourceShotIds,claimIds:plan.claimIds,frame,provenanceSha256:provenanceHash,illustration:true,cueMethod:timeline.cueMethod};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" font-family="GVE Noto, sans-serif"><metadata>${esc(JSON.stringify(metadata))}</metadata><defs><pattern id="checker" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#b9c8d0"/><path d="M0 0H16V16H0ZM16 16H32V32H16Z" fill="#8497a4"/></pattern></defs><rect width="720" height="1280" fill="${C.bg}"/><g opacity="${edge}">${txt(44,65,plan.title,24,C.dim)}${txt(44,130,plan.kind==='rule-build'?'从线索，到可解释的规则':'背景消失，主体留下',41,C.text,'font-weight="800"')}
 <g transform="translate(0 ${(1-enter)*5})">${txt(44,215,cue.label,29,C.mint,'font-weight="650"')}</g>
 ${stages.map((name,i)=>`<circle cx="${53+i*122}" cy="255" r="${i===stage?5:3}" fill="${i<=stage?C.mint:C.line}"/>${i<5?`<path d="M${62+i*122} 255H${166+i*122}" stroke="${C.line}"/>`:''}`).join('')}
 <g>${world}</g><rect x="36" y="1014" width="648" height="148" rx="20" fill="#102233"/>${captionLines(caption).map((line,i)=>txt(360,1062+i*38,line,27,C.text,'text-anchor="middle" font-weight="550"')).join('')}
 <rect x="44" y="1190" width="632" height="3" fill="${C.line}"/><rect x="44" y="1190" width="${632*voiceP}" height="3" fill="${C.mint}"/>${txt(44,1220,'图形教学重建 · 非目标项目实际执行录像',17,C.dim)}${txt(44,1248,plan.labels.disclosure.slice(0,40),16,C.orange)}</g></svg>`;
}
