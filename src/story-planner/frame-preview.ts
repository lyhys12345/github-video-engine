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
 const objects=state.objects.map((o,i)=>{const construction=state.actions.find(a=>a.kind==='transform'&&a.target===o.id);const progress=construction?.progress??1;return `<g transform="translate(${(visualX(o)*720).toFixed(2)} ${(o.y*1280).toFixed(2)}) scale(${o.scale.toFixed(3)})" opacity="${o.opacity.toFixed(3)}"><defs><clipPath id="build-${i}"><rect x="-100" y="-100" width="200" height="${200*progress}"/></clipPath></defs><g clip-path="url(#build-${i})">${glyph(o.visual,o.visual==='cutout'?progress:o.mix,frame)}</g><text y="120" text-anchor="middle" fill="white" font-size="20">${esc(o.label)}</text>${construction&&progress>0&&progress<1?`<path d="M-100 ${-100+200*progress} H100" stroke="#ffe180" stroke-width="4"/><text y="155" text-anchor="middle" fill="#ffe180" font-size="16">构建 ${Math.round(progress*100)}%</text>`:''}</g>`;}).join('');
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
 return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><metadata>${esc(evidence)}</metadata><rect width="720" height="1280" fill="#101827"/><text x="24" y="44" fill="white" font-size="20">${esc(state.shotId)} · frame ${frame}</text><text x="24" y="82" fill="#ffe180" font-size="20">实验示意 / 人工编排；非实际执行记录</text><text x="24" y="116" fill="#ffe180" font-size="16">含推断 / 假设重建；不表示已观察到实际结果</text>${contextLabel}${operation?diagram:arrow+traces+objects}<text x="24" y="1210" fill="#b8c7e2" font-size="12">${esc(footer)}</text></svg>`;
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
