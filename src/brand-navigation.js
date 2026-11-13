import gsap from 'gsap';
import './brand-navigation.css';

export function mountBrandNavigation(grid, smoothScroll) {
  const shell = document.createElement('div');
  shell.className = 'catalog-shell';
  grid.before(shell);
  const left = document.createElement('div');
  left.className = 'brand-rail brand-rail-left';
  left.setAttribute('aria-hidden', 'true');
  const mobile = document.createElement('select');
  mobile.className = 'brand-jump';
  mobile.setAttribute('aria-label', 'Ir a una marca');
  shell.append(mobile, left, grid);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1200px) and (min-height: 720px)');
  let items = [], dirty = true, enabled = false;
  const markDirty = () => { dirty = true; };

  function navigate(index) {
    const item = items[index];
    if (!item) return;
    history.replaceState(null, '', `#${item.section.id}`);
    smoothScroll.scrollTo(item.section, desktop.matches ? 24 : 86);
  }
  const onClick = event => {
    const link = event.target.closest('.brand-title-link');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return;
    event.preventDefault(); event.stopPropagation();
    navigate(Number(link.dataset.brandIndex));
  };
  const onSelect = () => { if (mobile.value !== '') navigate(Number(mobile.value)); mobile.value = ''; };

  function update() {
    if (!dirty || !items.length) return;
    dirty = false;
    // The h3 reserves the destination. Its one anchor is the actual moving
    // title, so there is never a second visible copy in a navigation rail.
    const bounds = items.map(item => item.slot.getBoundingClientRect());
    let current = 0;
    items.forEach((item, index) => { if (item.section.getBoundingClientRect().top <= innerHeight * .36) current = index; });
    const rail = left.getBoundingClientRect();
    const targets = items.map((item, index) => {
      const slot = bounds[index];
      if (!enabled || !desktop.matches || reduced.matches) return { x: 0, y: 0, scale: 1, progress: 1 };
      const count = items.length;
      const order = index;
      const step = Math.min(32, rail.height / count);
      const railY = gsap.utils.clamp(order * step, rail.height - (count - order) * step, slot.top - rail.top);
      const scale = Math.min(12 / item.fontSize, (rail.width - 10) / Math.max(item.width, 1));
      const railX = rail.left;
      const arrive = gsap.utils.clamp(0, 1, (innerHeight * .88 - slot.top) / (innerHeight * .54));
      const leave = gsap.utils.clamp(0, 1, (slot.bottom + 60) / 100);
      const progress = arrive * leave;
      return { x: (railX - slot.left) * (1 - progress), y: (rail.top + railY - slot.top) * (1 - progress), scale: gsap.utils.interpolate(scale, 1, progress), progress };
    });
    items.forEach((item, index) => {
      const target = targets[index];
      if (index === current) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
      item.link.classList.toggle('is-docked', target.progress > .95);
      if (reduced.matches || !desktop.matches || !enabled) {
        item.x.tween.pause(); item.y.tween.pause(); item.scaleX.tween.pause(); item.scaleY.tween.pause();
        gsap.set(item.link, { x: 0, y: 0, scale: 1 });
      }
      else { item.x(target.x); item.y(target.y); item.scaleX(target.scale); item.scaleY(target.scale); }
    });
  }
  function clear() {
    for (const item of items) {
      item.x.tween.kill(); item.y.tween.kill(); item.scaleX.tween.kill(); item.scaleY.tween.kill();
      gsap.set(item.link, { clearProps: 'transform' });
    }
  }
  function refresh() {
    clear();
    const sections = [...grid.querySelectorAll('.brand-section')];
    enabled = sections.length > 1;
    shell.classList.toggle('has-brand-index', enabled);
    mobile.replaceChildren(new Option('Ir a una marca', ''));
    items = sections.map((section, index) => {
      const slot = section.querySelector('h3');
      const brand = slot.textContent;
      section.id = `marca-${brand.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      const link = document.createElement('a');
      link.className = 'brand-title-link'; link.textContent = brand;
      link.href = `#${section.id}`; link.dataset.brandIndex = String(index);
      link.setAttribute('aria-label', `Ir a ${brand}`);
      slot.replaceChildren(link);
      mobile.append(new Option(brand, String(index)));
      return { section, slot, link, width: link.offsetWidth, fontSize: parseFloat(getComputedStyle(link).fontSize),
        x: gsap.quickTo(link, 'x', { duration: .5, ease: 'power2.out' }),
        y: gsap.quickTo(link, 'y', { duration: .5, ease: 'power2.out' }),
        scaleX: gsap.quickTo(link, 'scaleX', { duration: .5, ease: 'power2.out' }),
        scaleY: gsap.quickTo(link, 'scaleY', { duration: .5, ease: 'power2.out' }) };
    });
    markDirty(); update();
  }
  const resize = () => {
    items.forEach(item => { item.width = item.link.offsetWidth; item.fontSize = parseFloat(getComputedStyle(item.link).fontSize); });
    markDirty();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(grid);
  grid.addEventListener('click', onClick);
  mobile.addEventListener('change', onSelect);
  window.addEventListener('scroll', markDirty, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  reduced.addEventListener('change', markDirty);
  gsap.ticker.add(update);
  window.addEventListener('pagehide', () => {
    clear(); gsap.ticker.remove(update); resizeObserver.disconnect();
    grid.removeEventListener('click', onClick); mobile.removeEventListener('change', onSelect);
    window.removeEventListener('scroll', markDirty); window.removeEventListener('resize', resize);
    reduced.removeEventListener('change', markDirty);
  }, { once: true });
  return { refresh };
}
