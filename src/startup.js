// The photographic hero loads independently of the catalog API.
const appReady = new Promise(resolve => window.addEventListener('catalog-ready', resolve, { once: true }));
const minimum = new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - performance.now())));
Promise.allSettled([minimum, appReady, document.fonts.ready]).then(() => window.dismissStartup());
