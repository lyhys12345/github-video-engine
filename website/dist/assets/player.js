import {buildFilmLink, isShowcasePath, parseFilmHash} from './film-link.js';

let disposeFilms;

export function bindFilms(content,lang){
 // Language renders replace the dialog. Release the old media and global listener.
 disposeFilms?.();
 const {t}=content;
 const dialog=document.getElementById('film-dialog');
 const video=dialog.querySelector('video');
 const shell=dialog.querySelector('.video-shell');
 video.controlsList?.add('nofullscreen');
 video.disablePictureInPicture=true;
 const lifetime=new AbortController();
 const listenerOptions={signal:lifetime.signal};
 const allowedIds=content.demos.map(d=>d.id);
 const bar=document.createElement('div');bar.className='film-caption-bar';bar.hidden=true;
 // Keep translations outside the image; never cover original product details.
 bar.setAttribute('aria-label',t('English subtitle translation','英文字幕翻译'));
 dialog.querySelector('.video-shell').append(bar);
 const info=dialog.querySelector('.dialog-info');
 const label=document.createElement('label');label.className='caption-control';label.hidden=true;
 const toggle=document.createElement('input');toggle.type='checkbox';
 label.append(toggle,document.createTextNode(t('English subtitles','英文字幕')));
 const controls=document.createElement('div');controls.className='player-tools';controls.append(label);shell.append(controls);
 const fullscreenButton=document.createElement('button');fullscreenButton.type='button';fullscreenButton.className='player-expand';
 fullscreenButton.textContent=t('Expand player','放大播放器');
 controls.append(fullscreenButton);
 const playStatus=dialog.querySelector('.play-error');shell.append(playStatus);
 const captionError=document.createElement('p');captionError.className='caption-error';captionError.hidden=true;captionError.setAttribute('role','status');shell.append(captionError);

 const share=document.createElement('div');share.className='film-share';
 const copyButton=document.createElement('button');copyButton.type='button';copyButton.className='button film-copy-link';
 copyButton.textContent=t('Copy film link','复制作品链接');
 const copyStatus=document.createElement('p');copyStatus.className='film-copy-status';copyStatus.setAttribute('role','status');
 const fallback=document.createElement('input');fallback.type='text';fallback.readOnly=true;fallback.hidden=true;fallback.className='film-link-fallback';
 fallback.setAttribute('aria-label',t('Film link — select and copy','作品链接：选中后复制'));
 share.append(copyButton,copyStatus,fallback);
 info.insertBefore(share,document.getElementById('film-notes'));

 let activeTrigger,track,activeId;
 let captionAvailable=false,openedFromHash=false,nativeFullscreen=false;
 let filmEvents=new AbortController();
 const renderCaption=()=>{bar.hidden=!captionAvailable||!toggle.checked||track?.track.mode==='showing';bar.textContent=Array.from(track?.track.activeCues||[]).map(cue=>cue.text).join(' ');};
 const applyCaptionMode=()=>{if(track)track.track.mode=nativeFullscreen&&toggle.checked?'showing':'hidden';renderCaption();};
 toggle.addEventListener('change',applyCaptionMode,listenerOptions);
 const fullscreenChanged=()=>{nativeFullscreen=document.fullscreenElement===video;applyCaptionMode();};
 document.addEventListener('fullscreenchange',fullscreenChanged,listenerOptions);
 // Some mobile browsers promote only the video to fullscreen; keep a native subtitle fallback.
 video.addEventListener('webkitbeginfullscreen',()=>{nativeFullscreen=true;applyCaptionMode();},listenerOptions);
 video.addEventListener('webkitendfullscreen',()=>{nativeFullscreen=false;applyCaptionMode();},listenerOptions);
 video.textTracks.addEventListener('change',()=>{if(track?.track.mode==='disabled')toggle.checked=false;if(track?.track.mode==='showing')toggle.checked=true;renderCaption();},listenerOptions);
 // In-page expansion works inside embedded browsers and keeps translations visible.
 fullscreenButton.addEventListener('click',()=>{const expanded=dialog.classList.toggle('player-expanded');fullscreenButton.textContent=expanded?t('Show details','显示作品说明'):t('Expand player','放大播放器');},listenerOptions);
 const clearMedia=()=>{
  if(document.fullscreenElement===shell)document.exitFullscreen().catch(()=>{});
  filmEvents.abort();video.pause();video.removeAttribute('src');video.replaceChildren();video.load();
  track=null;activeId=null;captionAvailable=false;nativeFullscreen=false;bar.hidden=true;bar.textContent='';captionError.hidden=true;
  document.body.classList.remove('modal-open');dialog.classList.remove('player-expanded');fullscreenButton.textContent=t('Expand player','放大播放器');
 };
 const openFilm=(id,{trigger=null,autoplay=false,fromHash=false}={})=>{
  const d=content.demos.find(item=>item.id===id);
  if(!d)return;
  filmEvents.abort();filmEvents=new AbortController();
  video.pause();activeTrigger=trigger;activeId=id;openedFromHash=fromHash;captionAvailable=false;track=null;
  video.replaceChildren();bar.hidden=true;bar.textContent='';captionError.hidden=true;
  copyButton.disabled=false;copyStatus.textContent='';fallback.hidden=true;
  fallback.value=buildFilmLink(location.origin,content.href('/showcase/'),id,allowedIds);
  document.getElementById('film-dialog-title').textContent=content.name(d);
  document.getElementById('film-description').textContent=content.pair(d.description);
  document.getElementById('film-provenance').textContent=content.pair(d.detail);
  dialog.querySelector('.dialog-meta').textContent=`${d.duration} · 9:16 · ${t('Chinese narration','中文配音')}`;
  const source=document.getElementById('film-source');source.href=d.repo;source.textContent=t('Explore the repository ↗','查看项目仓库 ↗');
  const notes=document.getElementById('film-notes');notes.replaceChildren();
  const heading=document.createElement('h3');heading.textContent=t('THE STORY IN THREE BEATS','这条视频讲了什么');
  const list=document.createElement('ol');
  for(const beat of content.demoNotes[d.id]||[]){const li=document.createElement('li');li.textContent=content.pair(beat);list.append(li);}
  notes.append(heading,list);
  const hasCaptions=['artcraft-demo','engine-flagship','voicestudio-demo','openmaic-b-demo','worldknow-demo'].includes(d.id);
  label.hidden=!hasCaptions;toggle.checked=lang==='en';
  document.getElementById('film-language-note').textContent=hasCaptions?t('Original Chinese audio and on-screen text. English translations follow the original display timings, not word-level alignment.','保留原始中文音轨与画面文字。英文翻译沿用原字幕显示时间，并非逐词对齐。'):t('Original Chinese audio and on-screen text. The summary above is a viewing guide, not a timed transcript.','保留原始中文音轨与画面文字。上方摘要帮助理解内容，并非逐句字幕。');
  if(hasCaptions){
   track=document.createElement('track');track.kind='subtitles';track.srclang='en';track.label='English translation';track.src=`/assets/captions/${d.id}.en.vtt`;
   video.append(track);track.track.mode='hidden';
   track.addEventListener('load',()=>{captionAvailable=true;renderCaption();},{signal:filmEvents.signal});
   track.track.addEventListener('cuechange',renderCaption,{signal:filmEvents.signal});
   track.addEventListener('error',()=>{label.hidden=true;bar.hidden=true;captionError.hidden=false;captionError.textContent=t('English subtitles could not load. The film details include a story summary.','英文字幕未能加载，作品说明中有内容摘要。');document.getElementById('film-language-note').textContent=captionError.textContent;},{signal:filmEvents.signal});
  }
  video.autoplay=false;video.poster=`/assets/${d.id}.jpg`;video.src=`/assets/${d.id}.mp4`;
  dialog.querySelector('.play-error').textContent='';
  if(!dialog.open)dialog.showModal();
  document.body.classList.add('modal-open');
  const requestSignal=filmEvents.signal;
  if(autoplay){
   video.play().catch(error=>{if(requestSignal.aborted||!dialog.open||error.name==='AbortError')return;dialog.querySelector('.play-error').textContent=error.name==='NotAllowedError'?t('Press play to start the film.','点击播放按钮观看视频。'):t('The video could not load. Please close it and try again.','视频未能加载，请关闭后重试。');});
  }else{
   // A shared URL may open a film, but never starts audible playback by itself.
   video.pause();
   dialog.querySelector('.play-error').textContent=t('Press play to start the film.','点击播放按钮观看视频。');
  }
 };
 copyButton.addEventListener('click',async()=>{
  if(!activeId)return;
  const requestSignal=filmEvents.signal;
  const link=buildFilmLink(location.origin,content.href('/showcase/'),activeId,allowedIds);
  copyButton.disabled=true;copyStatus.textContent='';fallback.hidden=true;
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(link);
   if(!requestSignal.aborted)copyStatus.textContent=t('Film link copied.','作品链接已复制。');
  }catch{
   if(!requestSignal.aborted){
    fallback.value=link;fallback.hidden=false;
    copyStatus.textContent=t('Copy this link manually:','请手动复制这个链接：');
    fallback.focus();fallback.select();
   }
  }finally{if(!requestSignal.aborted)copyButton.disabled=false;}
 },listenerOptions);

 document.querySelectorAll('[data-play]').forEach(trigger=>trigger.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
  const id=trigger.dataset.play;
  if(!allowedIds.includes(id))return;
  event.preventDefault();openFilm(id,{trigger,autoplay:true});
 },listenerOptions));
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close(),listenerOptions);
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();},listenerOptions);
 dialog.addEventListener('close',()=>{
  clearMedia();openedFromHash=false;
  if(parseFilmHash(location.hash,allowedIds)){
   const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);
  }
  if(activeTrigger?.isConnected&&activeTrigger.getClientRects().length)activeTrigger.focus();
  else document.querySelector('.filters button[aria-pressed="true"]')?.focus();
 },listenerOptions);
 video.addEventListener('error',()=>{if(video.getAttribute('src'))dialog.querySelector('.play-error').textContent=t('The video could not load. Please close it and try again.','视频未能加载，请关闭后重试。');},listenerOptions);
 video.addEventListener('playing',()=>{dialog.querySelector('.play-error').textContent='';},listenerOptions);
 const syncHash=()=>{
  if(!isShowcasePath(location.pathname))return;
  const id=parseFilmHash(location.hash,allowedIds);
  if(id){
   if(!dialog.open||activeId!==id){
    const trigger=[...document.querySelectorAll('[data-play]')].find(el=>el.dataset.play===id);
    openFilm(id,{trigger,fromHash:true});
   }
  }else if(!location.hash&&openedFromHash&&dialog.open){dialog.close();}
 };
 window.addEventListener('hashchange',syncHash,listenerOptions);
 disposeFilms=()=>{
  lifetime.abort();clearMedia();
  if(dialog.open)dialog.close();
  bar.remove();controls.remove();captionError.remove();share.remove();
 };
 syncHash();
}
