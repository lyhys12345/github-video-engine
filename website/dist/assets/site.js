import {createContent} from './content.js';
import {bindGuideTools} from './guide.js';
import {setupMotion} from './motion.js';
import {captureGuideDraft,restoreGuideDraft} from './guide-draft.js';
import {bindFilms} from './player.js';
const page=document.body.dataset.page;
let lang=new URLSearchParams(location.search).get('lang');
if(!['en','zh'].includes(lang))lang=document.documentElement.lang.startsWith('zh')?'zh':'en';
let content=createContent(page,lang);
let {t,href,doc,demos,name,pair,steps}=content;
function updateWorkflow(index) {
 document.querySelectorAll('[data-step]').forEach((b,i)=>{b.setAttribute('aria-selected',i===index);b.tabIndex=i===index?0:-1;});
 const panel=document.getElementById('workflow-panel');
 panel.setAttribute('aria-labelledby',`step-${index}`);
 panel.innerHTML=content.workflowPanel(index);
}
function updateAgent(agent) {
 document.querySelectorAll('[data-agent]').forEach(b=>{b.setAttribute('aria-selected',b.dataset.agent===agent);b.tabIndex=b.dataset.agent===agent?0:-1;});
 const panel=document.getElementById('agent-panel');panel.setAttribute('aria-labelledby',`${agent}-tab`);
 panel.innerHTML=content.agentPanel(agent);
}
let guideDraft;let workflowStep=0;let selectedAgent='codex';let selectedFilter='all';
function plainClick(event){return !event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0;}
function bind() { if (page === "guide") bindGuideTools({t}); setupMotion(t);
 document.getElementById('language').addEventListener('click',event=>{if(!plainClick(event))return;event.preventDefault();const scroll=window.scrollY;if(page==='guide')guideDraft=captureGuideDraft();lang=lang==='en'?'zh':'en';const url=new URL(location.href);url.pathname=`${lang==='zh'?'/zh':''}${page==='home'?'/':`/${page}/`}`;url.searchParams.delete('lang');history.replaceState(null,'',url);render();document.getElementById('language').focus();window.scrollTo(0,scroll);});
 const menu=document.getElementById('menu');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',open);menu.setAttribute('aria-label',open?t('Close navigation','关闭导航'):t('Open navigation','展开导航'));document.querySelector('.header').classList.toggle('menu-open',open);if(open)document.querySelector('#navigation a').focus();});
 document.addEventListener('keydown',closeMenuOnEscape,{signal:events.signal});
 bindFilms(content,lang);
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{selectedFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(f=>f.setAttribute('aria-pressed',f===b));let count=0;document.querySelectorAll('.showcase-films .film-card').forEach(card=>{card.hidden=b.dataset.filter!=='all'&&card.dataset.category!==b.dataset.filter;if(!card.hidden)count++;});document.getElementById('result-count').textContent=t(`${count} ${count===1?'film':'films'}`,`${count} 条作品`);}));
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{workflowStep=Number(b.dataset.step);updateWorkflow(workflowStep);}));
 document.querySelectorAll('[data-agent]').forEach(b=>b.addEventListener('click',()=>{selectedAgent=b.dataset.agent;updateAgent(selectedAgent);}));
 document.querySelectorAll('[role="tablist"]').forEach(list=>list.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...list.querySelectorAll('[role="tab"]')];let i=tabs.indexOf(document.activeElement);if(i<0)return;i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+tabs.length)%tabs.length;tabs[i].click();tabs[i].focus();}));
 document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const text=document.getElementById(b.dataset.copy).textContent;try{await navigator.clipboard.writeText(text);b.textContent=t('Copied ✓','已复制 ✓');}catch{const range=document.createRange();range.selectNodeContents(document.getElementById(b.dataset.copy));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);b.textContent=t('Select & copy','请手动复制');}setTimeout(()=>{if(b.isConnected)b.textContent=t('Copy','复制');},2000);}));
}
function closeMenuOnEscape(e){if(e.key==='Escape'&&document.getElementById('menu').getAttribute('aria-expanded')==='true'){document.getElementById('menu').click();document.getElementById('menu').focus();}}
let events = new AbortController();
function render(reuseHTML=false) {
 events.abort();events=new AbortController();document.documentElement.lang=lang==='zh'?'zh-CN':'en';content=createContent(page,lang);({t,href,doc,demos,name,pair,steps}=content);
 document.title=page==='home'?t('GitHub Video Engine — Give your code an audience','GitHub Video Engine — 让好项目被看见'):t(`${page==='showcase'?'Showcase':'Get started'} — GitHub Video Engine`,`${page==='showcase'?'作品库':'使用指南'} — GitHub Video Engine`);
 if(!reuseHTML)document.getElementById('app').innerHTML=content.body();
 document.querySelector('link[rel="canonical"]').href=`https://github-video-engine-studio.luyuhao123qq.chatgpt.site${content.href(page==='home'?'/':`/${page}/`)}`;
 if(page==='home')updateWorkflow(workflowStep);if(page==='guide')updateAgent(selectedAgent);bind();if(page==='showcase')document.querySelector(`[data-filter="${selectedFilter}"]`)?.click();if(page==='guide'&&guideDraft)restoreGuideDraft(guideDraft);document.documentElement.classList.remove('no-js');
}
render(lang===(document.documentElement.lang.startsWith('zh')?'zh':'en'));
