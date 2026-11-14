import gsap from 'gsap';

export function mountDetailMotion(viewer, currentCard, onClose=()=>{}) {
  const dialog = viewer.querySelector('.detail-dialog');
  const disclosure = viewer.querySelector('.detail-disclosure');
  const summary = disclosure.querySelector('summary');
  const body = document.createElement('div');
  body.className = 'detail-disclosure-body';
  body.append(...[...disclosure.children].filter(child => child !== summary));
  disclosure.append(body);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let transition;
  let closing = false;
  let expanded = false;

  function resetNotes() {
    gsap.killTweensOf(body);
    expanded = false;
    disclosure.open = false;
    summary.setAttribute('aria-expanded', 'false');
    gsap.set(body, { clearProps: 'height,opacity' });
  }

  summary.addEventListener('click', event => {
    event.preventDefault();
    expanded = !expanded;
    const opening = expanded;
    summary.setAttribute('aria-expanded', String(opening));
    gsap.killTweensOf(body);
    const height = disclosure.open ? body.getBoundingClientRect().height : 0;
    const opacity = disclosure.open ? gsap.getProperty(body, 'opacity') : 0;
    disclosure.open = true;
    gsap.fromTo(body, { height, opacity }, {
      height: opening ? body.scrollHeight : 0, opacity: opening ? 1 : 0,
      duration: reduced() ? 0 : .28, ease: 'power2.inOut',
      onComplete: () => { disclosure.open = opening; gsap.set(body, { clearProps: 'height,opacity' }); }
    });
  });

  function cardTransform(card) {
    if (!card) return { x: 0, y: 0, scaleX: .96, scaleY: .96 };
    const source = card.getBoundingClientRect();
    const target = dialog.getBoundingClientRect();
    return { x: source.left - target.left, y: source.top - target.top, scaleX: source.width / target.width, scaleY: source.height / target.height };
  }

  function open(trigger) {
    transition?.kill();
    closing = false;
    viewer.hidden = false;
    document.body.classList.add('viewer-open');
    gsap.set(viewer, { clearProps: 'opacity,visibility,pointerEvents' });
    gsap.set(dialog, { clearProps: 'transform,height' });
    // Freeze the collapsed footprint; disclosure content scrolls inside it.
    dialog.style.height = `${dialog.getBoundingClientRect().height}px`;
    const origin = trigger?.closest('[data-combo-product], .cart-product') ?? trigger?.closest('.product-item')?.querySelector('.product-visual') ?? currentCard();
    gsap.set(dialog, { transformOrigin: '0 0' });
    transition = gsap.timeline();
    transition.fromTo(viewer, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced() ? .12 : .22 }, 0);
    if (!reduced()) transition.fromTo(dialog, cardTransform(origin), {
      x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .52, ease: 'expo.out', clearProps: 'transform'
    }, 0);
    viewer.querySelector('#viewer-close').focus({ preventScroll: true });
  }

  function close(lastFocused,{afterClose,restoreFocus=true,returnToCard=true}={}) {
    if (viewer.hidden) {afterClose?.();return;}
    if(closing) return;
    closing = true;
    transition?.kill();
    const card = currentCard();
    if (card && returnToCard) {
      const rect = card.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight) card.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    // Preserve an interrupted entrance while measuring the full-size destination.
    const current = Object.fromEntries(['x','y','scaleX','scaleY'].map(key => [key, gsap.getProperty(dialog, key)]));
    gsap.set(dialog, { x: 0, y: 0, scaleX: 1, scaleY: 1 });
    const destination = cardTransform(card);
    gsap.set(dialog, current);
    transition = gsap.timeline({ onComplete: () => {
      viewer.hidden = true;
      closing = false;
      document.body.classList.remove('viewer-open');
      gsap.set(dialog, { clearProps: 'transform,height' });
      onClose();
      const sameCard = card && lastFocused?.isConnected && lastFocused?.closest?.('.product-item') === card.closest('.product-item');
      const focusTarget = sameCard ? lastFocused : card ?? lastFocused;
      if (restoreFocus && focusTarget instanceof HTMLElement && focusTarget.isConnected) focusTarget.focus({ preventScroll: true });
      afterClose?.();
    } });
    if (!reduced()) transition.to(dialog, { ...destination, duration: .36, ease: 'power3.inOut' }, 0);
    transition.to(viewer, { autoAlpha: 0, duration: reduced() ? .12 : .18 }, reduced() ? 0 : .18);
  }

  resetNotes();
  return { open, close, resetNotes };
}
