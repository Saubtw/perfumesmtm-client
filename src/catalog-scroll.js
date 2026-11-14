// Scrolling is never intercepted. Only settle the last few pixels towards a
// nearby brand after user input AND native/Lenis momentum have both stopped.
export function mountCatalogScroll(grid, smoothScroll) {
  const shell = grid.closest('.catalog-shell');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let stops = [], timer, armed = false, settling = false, touching = false;
  let previous = scrollY, direction = 1;
  const offset = () => matchMedia('(min-width: 1024px)').matches ? 24 : 86;
  const blocked = target => target.closest('input,textarea,select,dialog,[contenteditable="true"],.sort-menu') || document.querySelector('dialog[open]');

  function cancel() {
    clearTimeout(timer);
    armed = false;
    if (settling) smoothScroll.cancelScroll();
    settling = false;
  }
  function refresh() {
    cancel();
    stops = [...grid.querySelectorAll('.brand-section')].map(section => Math.max(0, Math.round(scrollY + section.getBoundingClientRect().top - offset())));
    previous = scrollY;
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(settle, 180); }
  function settle() {
    if (!armed || touching || reduced.matches || !stops.length || document.querySelector('dialog[open]')) return;
    if (smoothScroll.isScrolling()) { schedule(); return; }
    armed = false;
    const nearest = stops.filter(top => (top-scrollY)*direction >= 0)
      .reduce((best, top) => Math.abs(top-scrollY) < Math.abs(best-scrollY) ? top : best, Infinity);
    const distance = Math.abs(nearest-scrollY);
    // Never pull against the visitor's direction, and never snap whole rows.
    if (distance < 2 || distance > 24) return;
    settling = true;
    smoothScroll.scrollTo(nearest, 0, {
      duration: .24, easing: t => 1-(1-t)*(1-t),
      onComplete: () => { settling = false; }
    });
  }
  function onWheel(event) {
    cancel();
    if (reduced.matches || event.ctrlKey || blocked(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    armed = true;
    direction = Math.sign(event.deltaY) || direction;
    schedule();
  }
  function onScroll() {
    if (armed && scrollY !== previous) direction = Math.sign(scrollY-previous);
    previous = scrollY;
    if (armed) schedule();
  }
  function onKey(event) {
    if (!['PageDown','PageUp','ArrowDown','ArrowUp',' ','Home','End'].includes(event.key)) return;
    cancel();
    if (reduced.matches || blocked(event.target) || event.metaKey || event.ctrlKey || event.altKey || event.target.closest('button,a')) return;
    const rect = grid.getBoundingClientRect();
    if (rect.top <= innerHeight && rect.bottom > 0) { armed = true; schedule(); }
  }
  function onTouch(event) {
    cancel(); touching = true;
    if (!reduced.matches && !blocked(event.target)) armed = true;
  }
  function onTouchEnd() { touching = false; if (armed) schedule(); }
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(grid);
  shell.addEventListener('wheel', onWheel, {passive:true});
  shell.addEventListener('touchstart', onTouch, {passive:true});
  window.addEventListener('touchend', onTouchEnd, {passive:true});
  window.addEventListener('touchcancel', onTouchEnd, {passive:true});
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', refresh);
  reduced.addEventListener('change', refresh);
  window.addEventListener('pagehide', () => {
    cancel(); resizeObserver.disconnect();
    shell.removeEventListener('wheel', onWheel); shell.removeEventListener('touchstart', onTouch);
    window.removeEventListener('touchend', onTouchEnd); window.removeEventListener('touchcancel', onTouchEnd);
    window.removeEventListener('scroll', onScroll); window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', refresh); reduced.removeEventListener('change', refresh);
  }, {once:true});
  return {refresh};
}
