// Start the hero independently of the catalog API and shopping interface.
const appReady = new Promise(resolve => window.addEventListener('catalog-ready', resolve, { once: true }));
const minimum = new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - performance.now())));
const canvas = document.querySelector('#scene-canvas');
const sceneReady = canvas
  ? import('./scene.js').then(({ mountPerfumeScene }) => mountPerfumeScene(canvas, {
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  })).catch(() => document.documentElement.classList.add('webgl-fallback'))
  : Promise.resolve();

Promise.allSettled([minimum, appReady, sceneReady, document.fonts.ready]).then(() => window.dismissStartup());
