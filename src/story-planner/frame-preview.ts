import {renderValueTraceFrame} from './value-trace-frame.js';
import {sampleAnimation, type compileAnimation} from './animation.js';
import type {Story} from '../contracts/story.js';

export type PreviewEvidenceContext={story:Story;provenanceSha256:string};
export type PreviewFormat='legacy'|'2'|'3';

function glyph(kind:string|undefined,mix:number,frame:number){
 const subject='<circle cy="-10" r="22" fill="#ffd07b"/><path d="M-38 65 Q-38 12 0 12 Q38 12 38 65Z" fill="#ef815a"/>';
 if(['scene','mask','cutout'].includes(kind??''))return `<rect x="-85" y="-90" width="170" height="170" fill="${kind==='mask'?'#151515':'#557ead'}" opacity="${kind==='cutout'?1-mix:1}"/>${kind==='mask'?subject.replaceAll('#ffd07b','white').replaceAll('#ef815a','white'):subject}`;
 if(kind==='runner')return `<path d="M-48 35 V-15 H-8 V-55 H40 V-10 H10 V35Z" fill="#8cdeaa"/><path d="M-40 35 v20 m38-20 v20" stroke="#8cdeaa" stroke-width="12"/><path d="M-85 80 H85" stroke="white"/><path d="M${-80+(frame%20)*8} 72 h20" stroke="#ffe180" stroke-width="4"/>`;
 if(kind==='gauge')return `<path d="M-65 40 A65 65 0 0 1 65 40" fill="none" stroke="#6ca4e4" stroke-width="15"/><path d="M0 40 L${-50+100*mix} -10" stroke="#ffe180" stroke-width="8"/>`;
 if(kind==='request')return '<rect x="-76" y="-52" width="152" height="104" rx="20" fill="#294b77" stroke="#92caff" stroke-width="5"/><path d="M-46 0H42m-19-19L42 0 23 19" fill="none" stroke="#92caff" stroke-width="8"/>';
 if(kind==='route')return '<path d="M0-68 75 0 0 68-75 0Z" fill="#43386a" stroke="#c9b6ff" stroke-width="5"/><path d="M-24 0-6 18 28-20" fill="none" stroke="#c9b6ff" stroke-width="8"/>';
 if(kind==='response')return '<rect x="-76" y="-52" width="152" height="104" rx="20" fill="#244d43" stroke="#a0e1bd" stroke-width="5"/><path d="M-42-17H42M-42 3H42M-42 23H14" fill="none" stroke="#a0e1bd" stroke-width="7"/>';
 if(kind==='agent')return '<rect x="-45" y="-50" width="90" height="90" rx="22" fill="#89b5eb"/><circle cx="-18" cy="-13" r="7"/><circle cx="18" cy="-13" r="7"/><path d="M-20 15 H20" stroke="#101827" stroke-width="6"/>';
 return '<path d="M-60-80 H30 L60-50 V80 H-60Z" fill="#243b64" stroke="#9cb7ec"/><path d="M-40-35 H40 M-40-10 H25 M-40 15 H40 M-40 40 H10" stroke="#82dfa6" stroke-width="7"/>';
}

function wrapPreviewText(value:string):string[]{
 const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
 const chars=Array.from(segmenter.segment(value.replace(/\s+/gu,' ')),part=>part.segment);
 const lines:string[]=[];
 while(chars.length>40){
  const space=chars.slice(0,41).lastIndexOf(' ');
  const length=space>0?space+1:40;
  lines.push(chars.splice(0,length).join(''));
 }
 if(chars.length)lines.push(chars.join(''));
 return lines;
}

/** Diagnostic SVG frame, not an approved visual design or video renderer. */
export function renderFramePreview(plan: ReturnType<typeof compileAnimation>, frame: number, context?:PreviewEvidenceContext, format:PreviewFormat='3'): string {
 const state=sampleAnimation(plan,frame);
 if(state.confluence)return renderMultiInputFrame(state.confluence,frame,context);
 if(state.causal)return state.causal.operation.valueTrace ? renderValueTraceFrame(state.causal,frame,context) : renderCausalFrame(state.causal,frame,context);
 if(state.independentFlows)return renderIndependentFrame(state,frame,context);
 const destinations=new Map<string,number>();
 if(format==='3'){
  // The token travels along the path; destination captions stay anchored and never cross the source.
  for(const action of state.actions)if(action.kind==='transfer'&&action.progress>0)destinations.set(action.target,action.destinationX??0.8);
 }
 const visualX=(object:typeof state.objects[number])=>destinations.get(object.id)??object.x;
 const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 const operation=state.actions.find(a=>a.kind==='rule-build'||a.kind==='mask-apply');
 const diagram=operation?(()=>{const p=operation.progress;const rule=operation.rule;const value=rule?rule.from+(rule.to-rule.from)*p:0;const source=state.objects.find(o=>o.id===operation.source)!;const target=state.objects.find(o=>o.id===operation.target)!;if(operation.kind==='mask-apply')return '<g transform="translate(130 580)">'+glyph('scene',0,frame)+'</g><text x="235" y="590" fill="white" font-size="28">×</text><g transform="translate(340 580)">'+glyph('mask',0,frame)+'</g><text x="445" y="590" fill="white" font-size="28">→</text><g transform="translate(580 580)" opacity="'+p+'">'+glyph('cutout',p,frame)+'</g><text x="60" y="780" fill="white" font-size="20">原图 × 蒙版 → 保留前景 / 移除背景</text>';return '<g transform="translate(130 510)">'+glyph('code',0,frame)+'</g><text x="40" y="670" fill="white" font-size="22">'+esc(source.label)+'</text><path d="M230 510 H480" stroke="#ffe180" stroke-width="6"/><text x="260" y="470" fill="#ffe180" font-size="22">'+esc(rule!.inputLabel)+' → '+esc(rule!.outputLabel)+'</text><g transform="translate(570 510)" opacity="'+(rule!.effect==='opacity'?value:p)+'">'+glyph(target.visual,p,rule!.effect==='speed'?Math.floor(frame*value):frame)+'</g><g transform="translate(540 820)">'+glyph('gauge',p,frame)+'</g><text x="40" y="910" fill="white" font-size="22">规则输入 → '+esc(target.label)+'；'+esc(rule!.outputLabel)+' '+value.toFixed(2)+esc(rule!.unit)+'（示意）</text>';})():'';
 // Two disjoint, explicitly authored request→response transfers are independent lanes.
 // Never infer an edge between the two requests or between their responses.
 const transfers=state.actions.filter(a=>a.kind==='transfer');
 const independentPairs=state.objects.length===4&&transfers.length===2&&state.actions.every(a=>!a.source||a.kind==='transfer')&&new Set(transfers.flatMap(a=>[a.source,a.target])).size===4&&state.objects.every(o=>Array.from(o.label).reduce((n,c)=>n+(c.codePointAt(0)!>127?1:.6),0)<=12)&&transfers.every(a=>state.objects.find(o=>o.id===a.source)?.visual==='request'&&state.objects.find(o=>o.id===a.target)?.visual==='response');
 const lanes=independentPairs?transfers.map((a,i)=>{const source=state.objects.find(o=>o.id===a.source)!,target=state.objects.find(o=>o.id===a.target)!,y=420+i*280,p=a.progress;const textSize=(s:string)=>Math.max(18,Math.min(36,Math.floor(250/Math.max(1,Array.from(s).reduce((n,c)=>n+(c.codePointAt(0)!>127?1:.6),0)))));return `<g data-independent-lane="${i+1}" opacity="${source.opacity}"><g transform="translate(160 ${y})">${glyph('request',0,frame)}</g><text x="160" y="${y+105}" text-anchor="middle" fill="white" font-size="${textSize(source.label)}">${esc(source.label)}</text><path d="M260 ${y} H460" stroke="#6d809e" stroke-width="5"/><path d="M260 ${y} H${260+200*p}" stroke="#ffe180" stroke-width="7"/><path d="M448 ${y-12} L464 ${y} L448 ${y+12}" fill="none" stroke="#ffe180" stroke-width="5" opacity="${p}"/><g transform="translate(560 ${y})" opacity="${target.opacity}">${glyph('response',0,frame)}</g><text x="560" y="${y+105}" text-anchor="middle" fill="white" font-size="${textSize(target.label)}" opacity="${target.opacity}">${esc(target.label)}</text></g>`;}).join(''):'';
 const objects=state.objects.map((o,i)=>{const construction=state.actions.find(a=>a.kind==='transform'&&a.target===o.id);const progress=construction?.progress??1;const labelUnits=Array.from(o.label).reduce((n,c)=>n+(c.codePointAt(0)!>127?1:0.6),0);const labelSize=labelUnits<=9?28:20;return `<g transform="translate(${(visualX(o)*720).toFixed(2)} ${(o.y*1280).toFixed(2)}) scale(${o.scale.toFixed(3)})" opacity="${o.opacity.toFixed(3)}"><defs><clipPath id="build-${i}"><rect x="-100" y="-100" width="200" height="${200*progress}"/></clipPath></defs><g clip-path="url(#build-${i})">${glyph(o.visual,o.visual==='cutout'?progress:o.mix,frame)}</g><text y="120" text-anchor="middle" fill="white" font-size="${labelSize}">${esc(o.label)}</text>${construction&&progress>0&&progress<1?`<path d="M-100 ${-100+200*progress} H100" stroke="#ffe180" stroke-width="4"/><text y="155" text-anchor="middle" fill="#ffe180" font-size="16">构建 ${Math.round(progress*100)}%</text>`:''}</g>`;}).join('');
 const traces=state.actions.filter(a=>a.source).map(a=>{
  const from=state.objects.find(o=>o.id===a.source)!,to=state.objects.find(o=>o.id===a.target)!;
  const fromX=visualX(from)*720,toX=visualX(to)*720;
  if(format!=='legacy'&&a.kind==='transfer'){
   if(Math.abs(toX-fromX)<24||a.progress===0)return '';
   const token=format==='2'||a.progress<1?`<circle cx="${fromX+(toX-fromX)*a.progress}" cy="530" r="5" fill="#ffe180"/>`:'';
   return `<g data-from="${from.id}" data-to="${to.id}"><path d="M${fromX} 530H${toX}" fill="none" stroke="#ffe180" stroke-width="4" marker-end="url(#flow-arrow)"/>${token}</g>`;
  }
  return `<path d="M${fromX} 640 H${toX}" stroke="#ffe180" stroke-width="4" stroke-dasharray="10 8"/><circle cx="${(from.x+(to.x-from.x)*a.progress)*720}" cy="640" r="9" fill="#ffe180"/>`;
 }).join('');
 const arrow=traces.includes('marker-end=')?'<defs><marker id="flow-arrow" viewBox="0 0 10 10" markerWidth="4" markerHeight="4" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#ffe180"/></marker></defs>':'';
 let evidence=state.actions.flatMap(a=>a.evidence).map(e=>`${e.id}: ${e.kind}; ${e.citations.map((q:any)=>`${q.document}:${q.startLine}-${q.endLine}`).join(', ')}`).join(' | ');
 if(context){const ids=new Set(state.actions.flatMap(a=>a.claimIds));evidence=JSON.stringify({schemaVersion:'1.0',scope:'authored-diagnostic-illustration-not-observed-execution',storyId:context.story.id,storyName:context.story.name,disclosure:context.story.evidence.disclosure,provenance:{path:'../provenance.json',sha256:context.provenanceSha256},claims:context.story.evidence.claims.filter(c=>ids.has(c.id)),sources:context.story.evidence.sources.map(s=>({...s,path:'../sources/'+s.id+'.txt'})),authoredParameters:state.actions.filter(a=>a.rule).map(a=>({rule:a.rule,basis:'author-selected illustrative mapping; citations do not establish these numeric parameters'}))});}
 const legacyContext=context?`<text x="24" y="152" fill="#b8c7e2" font-size="16">${esc(context.story.name.slice(0,38))}</text><text x="24" y="180" fill="#ffe180" font-size="15">${esc(context.story.evidence.disclosure.slice(0,42))}</text><text x="24" y="208" fill="#ffe180" font-size="15">动画参数为人工示意；出处不证明示意数值</text>`:'';
 let contextLabel=legacyContext;
 if(context&&format!=='legacy'){
  const title=wrapPreviewText(context.story.name);
  const disclosure=wrapPreviewText(context.story.evidence.disclosure);
  const lines=(items:string[],firstY:number)=>items.map((line,i)=>`<tspan x="24" y="${firstY+i*19}">${esc(line)}</tspan>`).join('');
  const disclosureY=152+title.length*19+8;
  contextLabel=`<text xml:space="preserve" fill="#b8c7e2" font-size="16">${lines(title,152)}</text><text xml:space="preserve" fill="#ffe180" font-size="15">${lines(disclosure,disclosureY)}</text><text x="24" y="${disclosureY+disclosure.length*19+8}" fill="#ffe180" font-size="15">动画参数为人工示意；出处不证明示意数值</text>`;
 }
 const footer=context?'provenance.json · 完整陈述 / 推断理由 / 引文 / 来源哈希':evidence.slice(0,100);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${esc(evidence)}</metadata><rect width="720" height="1280" fill="#101827"/><text x="24" y="44" fill="white" font-size="20">${esc(state.shotId)} · frame ${frame}</text><text x="24" y="82" fill="#ffe180" font-size="20">实验示意 / 人工编排；非实际执行记录</text><text x="24" y="116" fill="#ffe180" font-size="16">含推断 / 假设重建；不表示已观察到实际结果</text>${contextLabel}${operation?diagram:independentPairs?lanes:arrow+traces+objects}<text x="24" y="1210" fill="#b8c7e2" font-size="12">${esc(footer)}</text></svg>`;
}

function renderIndependentFrame(state:ReturnType<typeof sampleAnimation>,frame:number,context?:PreviewEvidenceContext){
 const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
 const lanes=state.independentFlows!,height=800/lanes.length,small=lanes.length>2;
 const wrap=(s:string,n:number)=>{const chars=Array.from(s),lines:string[]=[];while(chars.length)lines.push(chars.splice(0,n).join(''));return lines;};
 const diagrams=lanes.map((lane,index)=>{
  const top=300+index*height,cy=top+(lanes.length===1?380:small?80:150),scale=lanes.length===1?.8:small?.38:.65,font=small?14:18;
  const x=(id:string)=>80+lane.objectIds.indexOf(id)*560/Math.max(1,lane.objectIds.length-1);
  const actions=state.actions.filter(a=>'flowId'in a&&a.flowId===lane.id);
  const traces=actions.map(a=>{const from=x(a.source!),to=x(a.target),cyToken=cy;return `<g data-flow="${lane.id}" data-operation="${'operationId'in a?a.operationId:''}" data-from="${a.source}" data-to="${a.target}"><path d="M${from+40} ${cyToken}H${to-40}" fill="none" stroke="#ffe180" stroke-width="3" marker-end="url(#independent-arrow)"/><circle cx="${from+40+(to-from-80)*a.progress}" cy="${cyToken}" r="6" fill="#8cdeaa"/></g>`;}).join('');
  const objects=lane.objectIds.map(id=>{const object=state.objects.find(o=>o.id===id)!,action=actions.find(a=>a.target===id),progress=action?.progress??1;return `<g data-semantic-object="${id}" transform="translate(${x(id)} ${cy})"><g transform="scale(${scale})" opacity="${.25+.75*progress}">${glyph('code',progress,frame)}</g><text text-anchor="middle" fill="white" font-size="${font}">${wrap(object.label,6).map((line,i)=>`<tspan x="0" y="${(small?44:75)+i*(font+2)}">${esc(line)}</tspan>`).join('')}</text></g>`;}).join('');
  return `<g data-independent-flow="${lane.id}"><rect x="18" y="${top+3}" width="684" height="${height-10}" rx="12" fill="${index%2?'#1b2538':'#172237'}" stroke="#526683"/><text fill="#b9d8ff" font-size="16">${wrap(lane.label+' · 独立示例',28).map((line,i)=>`<tspan x="34" y="${top+30+i*18}">${esc(line)}</tspan>`).join('')}</text>${traces}${objects}</g>`;
 }).join('');
 const metadata={schemaVersion:'independent-document-frame/1.0',scope:'independent-source-examples-not-executed-or-roundtrip-verified',frame,shotId:state.shotId,flows:lanes,actions:state.actions,...(context?{storyId:context.story.id,evidence:context.story.evidence,provenanceSha256:context.provenanceSha256}:{})};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${esc(JSON.stringify(metadata))}</metadata><defs><marker id="independent-arrow" viewBox="0 0 10 10" markerWidth="4" markerHeight="4" refX="8" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#ffe180"/></marker></defs><rect width="720" height="1280" fill="#101827"/><text x="24" y="44" fill="white" font-size="22">独立文档流程 · 源证据约束的人工动画</text><text x="24" y="82" fill="#ffe180" font-size="18">未执行目标；不表示并发、连续执行或往返保真</text><text x="24" y="118" fill="#b8c7e2" font-size="16">${esc(state.shotId)} · frame ${frame} · 语义事实与听感待审</text>${context?wrapPreviewText(context.story.name).slice(0,3).map((line,i)=>`<text x="24" y="${160+i*23}" fill="white" font-size="18">${esc(line)}</text>`).join(''):''}${diagrams}<text x="24" y="1180" fill="#b8c7e2" font-size="14">各泳道独立；箭头只连接同一来源流程中的对象</text><text x="24" y="1210" fill="#b8c7e2" font-size="12">provenance.json · 全部来源 / 引文 / 操作 / 人工编排</text></svg>`;
}

function renderCausalFrame(state:NonNullable<ReturnType<typeof sampleAnimation>['causal']>,frame:number,context?:PreviewEvidenceContext){
 const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)),op=state.operation;
 const wrap=(value:string,n:number)=>{const tokens=value.match(/[A-Za-z0-9_/.(),-]+|./gu)??[],lines:string[]=[];let line='',weight=0;for(const token of tokens){const w=[...token].reduce((sum,ch)=>sum+(/^[\x00-\x7f]$/.test(ch)?1:2),0);if(line&&weight+w>n*2){lines.push(line);line='';weight=0;}line+=token;weight+=w;}if(line)lines.push(line);return lines;};
 const label=(value:string,x:number,y:number,size=28,columns=10)=>`<text x="${x}" text-anchor="middle" fill="#e8f1ff" font-size="${size}" font-weight="500">${wrap(value,columns).map((line,i)=>`<tspan x="${x}" y="${y+i*(size+5)}">${esc(line)}</tspan>`).join('')}</text>`;
 const title=op.display.title;
 const phase=state.signal.phase==='input-to-tool'?op.display.phases.input:state.signal.phase==='processing'?op.display.phases.processing:op.display.phases.output;
 const outputOpacity=op.effect==='select'?.28+.72*state.output.activation:state.output.construction>0?1:0;
 const metadata={schemaVersion:'causal-operation-frame/1.0',frame,state,visibleText:{title,phase,warning:'未执行目标｜动作与信号为人工示意',review:'来源解释、声音与画面仍待核查',inputLabel:op.input.label,actorLabel:op.actor.label,outputLabel:op.output.label,roles:['输入保留','来源操作','选中对象或独立输出']},context};
 const outputGlyph=glyph(op.output.visual,0,frame),target=op.effect==='derive'?`<defs><clipPath id="causal-output"><rect x="-100" y="-100" width="200" height="${200*state.output.construction}"/></clipPath></defs><g clip-path="url(#causal-output)">${outputGlyph}</g>${state.output.construction>0&&state.output.construction<1?`<path d="M-100 ${-100+200*state.output.construction}H100" stroke="#ffe180" stroke-width="4"/>`:''}`:outputGlyph;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${esc(JSON.stringify(metadata))}</metadata><rect width="720" height="1280" fill="#101827"/><g font-family="GVE Preview,sans-serif"><text x="360" y="112" text-anchor="middle" fill="white" font-size="30" font-weight="500">${esc(title)}</text><text x="360" y="158" text-anchor="middle" fill="#ffe180" font-size="23">${esc(op.display.warning)}</text><text x="360" y="195" text-anchor="middle" fill="#b8c7e2" font-size="22">${esc(op.display.review)}</text><path d="M160 370 C500 370 500 640 360 640 C650 640 650 930 560 930" fill="none" stroke="#334861" stroke-width="8"/><g transform="translate(160 370) scale(1.4)">${glyph(op.input.visual,0,frame)}<circle r="100" fill="none" stroke="#9dcfff" stroke-width="3" opacity="${.2+.7*state.arrival}"/></g>${label(op.input.label,160,540)}<text x="160" y="600" text-anchor="middle" fill="#b8c7e2" font-size="22">${esc(op.display.inputRole)}</text><circle cx="360" cy="640" r="66" fill="#20354c" stroke="#8cdeaa" stroke-width="${3+5*state.actor.activation}"/><circle cx="360" cy="640" r="78" fill="none" stroke="#8cdeaa" stroke-width="5" stroke-dasharray="${490*state.processing} 490" transform="rotate(-90 360 640)"/><path d="M337 640L354 657L384 620" fill="none" stroke="#8cdeaa" stroke-width="8" opacity="${state.processing}"/>${label(op.actor.label,360,750,25,12)}<g transform="translate(560 930) scale(1.4)" opacity="${outputOpacity}">${target}${op.effect==='select'?`<circle r="80" fill="none" stroke="#ffe180" stroke-width="${6*state.output.activation}"/>`:''}</g>${label(op.output.label,560,1070)}${state.signal.visible?`<circle cx="${state.signal.x}" cy="${state.signal.y}" r="13" fill="#ffe180" stroke="#fff2c4" stroke-width="3"/>`:''}<text x="46" y="845" fill="#ffe180" font-size="25">${esc(phase)}</text></g></svg>`;
}

function renderMultiInputFrame(state:NonNullable<ReturnType<typeof sampleAnimation>['confluence']>,frame:number,context?:PreviewEvidenceContext){
 const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!)),op=state.operation,p=state.outputProgress;
 const label=(value:string,x:number,y:number,size=28)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#e8f1ff" font-size="${size}" font-weight="500">${esc(value)}</text>`;
 const pdf=(text:string,color:string)=>`<rect x="-75" y="-95" width="150" height="190" rx="8" fill="#e8eef9" stroke="${color}" stroke-width="6"/><rect x="-75" y="-95" width="150" height="38" fill="${color}"/><text x="0" y="-67" text-anchor="middle" font-size="22" fill="#101827">PDF</text><path d="M-52-32H52M-52-4H52M-52 24H35" stroke="#8b98ae" stroke-width="5"/><text x="0" y="72" text-anchor="middle" font-size="20" fill="#101827">${esc(text)}</text>`;
 const inputDraw=state.inputs.map((s,i)=>{const o=op.inputs[i]!;return `<g data-input="${o.id}">${label(o.label,s.x,240)}<g transform="translate(${s.x} ${s.y})">${op.mode==='ordered-pages'?pdf(o.label,i===0?'#8fbfff':'#ffcf7b'):glyph(i===0?'scene':'mask',0,frame)}</g>${label(op.display.inputRole,s.x,485,22)}${s.signal.visible?`<circle cx="${s.signal.x}" cy="${s.signal.y}" r="12" fill="${i===0?'#8fbfff':'#ffcf7b'}"/>`:''}</g>`;}).join('');
 const ordered=op.mode==='ordered-pages'?op.outputOrder.map((id,i)=>{const sourceIndex=op.inputs.findIndex(o=>o.id===id),o=op.inputs[sourceIndex]!,progress=Math.max(0,Math.min(1,p*2-i));return `<g data-copied-source="${o.id}" transform="translate(${i===0?-85:85} 0) scale(.75)" opacity="${progress}">${pdf(o.label,sourceIndex===0?'#8fbfff':'#ffcf7b')}</g>`;}).join(''):'';
 const checker=Array.from({length:10},(_,y)=>Array.from({length:10},(_,x)=>`<rect x="${-90+x*18}" y="${-90+y*18}" width="18" height="18" fill="${(x+y)%2?'#34415a':'#69758a'}"/>`).join('')).join('');
 const output=op.mode==='masked-image'?`<g opacity="${p>0?1:0}">${checker}<defs><clipPath id="join-result"><rect x="-100" y="-100" width="200" height="${200*p}"/></clipPath></defs><g clip-path="url(#join-result)">${glyph('cutout',1,frame)}</g></g>`:ordered;
 const metadata={schemaVersion:'multi-input-frame/1.0',frame,state,context,visibleText:{...op.display,inputLabels:op.inputs.map(i=>i.label),actorLabel:op.actor.label,outputLabel:op.output.label},warning:'visual objects are source-bound authored illustrations, not accurate pixel composition or actual document contents'};
 if(state.focus&&state.focus.kind!=='converge'){
  const f=state.focus,t=state.focusProgress,inputFocus=f.kind==='inspect-input',chosen=inputFocus?op.inputs.findIndex(o=>o.id===f.objectId):-1;
  const focusLabel=inputFocus?op.inputs[chosen]!.label:op.output.label;
  const displayTitle=inputFocus?op.display.focus!.inputTitle:op.display.focus!.outputTitle;
  const inspection=metadata as typeof metadata&{focusDisplay?:unknown};inspection.focusDisplay={title:displayTitle,label:focusLabel,scope:'camera focus on authored source illustration; not a runtime step',timing:f};
  const inputs=op.inputs.map((o,i)=>{const selected=i===chosen,x=selected?(i===0?180:540)+(360-(i===0?180:540))*t:i===0?120:600,y=selected?350+210*t:330,scale=selected?1+1.05*t:.62;return `<g data-focus-input="${o.id}" transform="translate(${x} ${y}) scale(${scale})">${op.mode==='ordered-pages'?pdf(o.label,i===0?'#8fbfff':'#ffcf7b'):glyph(i===0?'scene':'mask',0,frame)}${selected?'<circle r="112" fill="none" stroke="#ffe180" stroke-width="3"/>':''}</g>${label(o.label,x,selected?850:440,selected?32:23)}`;}).join('');
  const result=inputFocus?'':`<g data-focus-output="${op.output.id}" transform="translate(360 ${940-290*t}) scale(${1+.35*t})">${output}</g>${label(op.output.label,360,920,32)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${esc(JSON.stringify(inspection))}</metadata><rect width="720" height="1280" fill="#101827"/><g font-family="GVE Preview,sans-serif">${label(displayTitle,360,112,32)}<text x="360" y="158" text-anchor="middle" fill="#ffe180" font-size="23">${esc(op.display.warning)}</text>${label(op.display.focus!.scope,360,195,23)}${inputs}${result}${label(inputFocus?op.display.focus!.inputNote:op.display.focus!.outputNote,360,1010,25)}${label(op.display.context,360,1070,23)}</g></svg>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${esc(JSON.stringify(metadata))}</metadata><rect width="720" height="1280" fill="#101827"/><g font-family="GVE Preview,sans-serif"><text x="360" y="112" text-anchor="middle" fill="white" font-size="30" font-weight="500">${esc(op.display.title)}</text><text x="360" y="158" text-anchor="middle" fill="#ffe180" font-size="23">${esc(op.display.warning)}</text><text x="360" y="195" text-anchor="middle" fill="#b8c7e2" font-size="22">${esc(op.display.review)}</text><path d="M180 350C40 350 40 650 360 650M540 350C680 350 680 650 360 650" fill="none" stroke="#334861" stroke-width="7"/>${inputDraw}<circle cx="360" cy="650" r="64" fill="#20354c" stroke="#8cdeaa" stroke-width="${3+5*state.processing}"/><circle cx="360" cy="650" r="76" fill="none" stroke="#8cdeaa" stroke-width="5" stroke-dasharray="${478*state.processing} 478" transform="rotate(-90 360 650)"/><path d="M337 650L354 667L384 630" fill="none" stroke="#8cdeaa" stroke-width="8" opacity="${state.processing}"/>${label(op.actor.label,360,755,25)}<path d="M360 780V830" fill="none" stroke="#334861" stroke-width="7"/><text x="30" y="815" fill="#ffe180" font-size="24">${esc(op.display.phases[state.phase]!)}</text><g data-output="${op.output.id}" transform="translate(360 940)">${output}</g>${label(op.output.label,360,1070)}${label(op.display.context,360,1102,20)}</g></svg>`;
}
