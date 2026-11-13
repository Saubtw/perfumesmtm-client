import gsap from 'gsap';

// A single, repeatable soft focus entrance. No image copies or sliced layers.
export function mountCatalogMotion(grid) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map(), entered = new Set();
  let observer;
  function finish(element) {
    const entry = active.get(element);
    if (!entry) return;
    active.delete(element);
    entry.animation.kill();
    entry.context.revert();
  }
  function enter(element) {
    if (entered.has(element)) return;
    entered.add(element);
    element.dataset.entered = 'true';
    element.dataset.entryCount = String(Number(element.dataset.entryCount || 0) + 1);
    let animation;
    const context = gsap.context(() => {
      animation = gsap.fromTo(element, { opacity: .3, filter: 'blur(3px)', willChange: 'opacity,filter' }, {
        opacity: 1, filter: 'blur(0px)', duration: 1.05, ease: 'power1.out',
        onComplete: () => finish(element)
      });
    }, grid);
    active.set(element, { animation, context });
  }
  function reset() {
    observer?.disconnect();
    for (const element of [...active.keys()]) finish(element);
    entered.clear();
    grid.querySelectorAll('[data-entered]').forEach(element => {
      delete element.dataset.entered;
      delete element.dataset.entryCount;
    });
  }
  function refresh() {
    reset();
    if (media.matches) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= .08) enter(entry.target);
        else if (entry.boundingClientRect.bottom <= 0 || entry.boundingClientRect.top >= innerHeight) {
          finish(entry.target);
          entered.delete(entry.target);
          delete entry.target.dataset.entered;
        }
      }
    }, { threshold: [0, .08] });
    grid.querySelectorAll('.product-item').forEach(element => observer.observe(element));
  }
  const onFocus = event => {
    const element = event.target.closest('.product-item');
    if (element) finish(element);
  };
  grid.addEventListener('focusin', onFocus);
  media.addEventListener('change', refresh);
  window.addEventListener('pagehide', () => {
    reset();
    grid.removeEventListener('focusin', onFocus);
    media.removeEventListener('change', refresh);
  }, { once: true });
  return { refresh, reset };
}
