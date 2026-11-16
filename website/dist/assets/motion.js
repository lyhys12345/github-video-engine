let cleanUp = () => {};
export function setupMotion(t) {
  cleanUp();
  const video = document.getElementById('hero-motion');
  const button = document.getElementById('motion-toggle');
  if (!video || !button) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let wantsMotion = !reduced.matches && !navigator.connection?.saveData;
  let visible = false;
  let disposed = false;
  function updateButton() {
    button.setAttribute('aria-label', video.paused ? t('Play preview motion','播放动态预览') : t('Pause preview motion','暂停动态预览'));
    button.firstElementChild.textContent = video.paused ? '▶' : 'Ⅱ';
  }
  function sync() {
    if (disposed) return;
    if (visible && wantsMotion && !document.hidden && !document.querySelector('dialog[open]')) {
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      video.play().catch(updateButton);
    } else video.pause();
  }
  button.addEventListener('click', () => { wantsMotion = video.paused; sync(); });
  video.addEventListener('play',updateButton);
  video.addEventListener('pause',updateButton);
  const observer = new IntersectionObserver(entries => {visible=entries[0].isIntersecting;sync();},{threshold:0.15});
  observer.observe(video);
  const preference = () => { wantsMotion = !reduced.matches && !navigator.connection?.saveData; sync(); };
  const dialog = document.querySelector('dialog');
  const modalObserver = new MutationObserver(sync);
  if(dialog) modalObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
  reduced.addEventListener('change',preference);
  document.addEventListener('visibilitychange',sync);
  cleanUp = () => { disposed=true;observer.disconnect();modalObserver.disconnect();reduced.removeEventListener('change',preference);document.removeEventListener('visibilitychange',sync);video.pause();video.removeAttribute('src');video.load(); };
}
