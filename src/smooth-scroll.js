import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export function mountSmoothScroll(gsap, ScrollTrigger) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let lenis;
  const tick = time => lenis?.raf(time * 1000);
  function configure() {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
    if (media.matches) return;
    lenis = new Lenis({
      lerp: .1,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -90 },
      prevent: node => node.matches?.('dialog, .image-viewer, .advisor-panel, input, textarea, select'),
      virtualScroll: () => !document.querySelector('dialog[open]') && !document.body.classList.contains('viewer-open')
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
  }
  configure();
  media.addEventListener('change', configure);
  window.addEventListener('pagehide', () => {
    gsap.ticker.remove(tick);
    lenis?.destroy();
    media.removeEventListener('change', configure);
  }, { once: true });
}
