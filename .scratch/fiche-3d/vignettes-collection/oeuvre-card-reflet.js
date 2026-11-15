/* Reflet des vitres. Le CSS le fait seul là où le navigateur sait lier une animation au défilement
   (animation-timeline: view()). Ailleurs, ce petit script : un IntersectionObserver garde les vitres
   proches de l'écran, un seul écouteur de défilement passif, regroupé par requestAnimationFrame, règle
   l'instant de l'animation du reflet de ces vitres-là (0 quand la carte entre en bas de l'écran, 1 quand
   elle sort en haut). */
export function oeuvreGlass({ scope = document, scroller = null, force = false } = {}) {
  const root = document.documentElement;
  const sda = !force && window.CSS && CSS.supports('animation-timeline: view()');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (sda || !Element.prototype.animate) { root.classList.remove('oc-js'); return { refresh() {}, stop() {} }; }
  root.classList.add('oc-js');
  // La même course que le CSS : la fenêtre entre en haut de la vitre à 12 % de la traversée de l'écran,
  // en sort en bas à 88 %.
  const KEYS = [{ translate: '0 -100%' }, { translate: '0 96%' }];
  const anims = new Map();                      // vitre → animation (en pause) de son reflet
  const near = new Set();                       // vitres proches de l'écran : les seules mises à jour
  let raf = 0;
  const target = scroller || window;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
  function update() {
    raf = 0;
    if (!near.size || reduce.matches || root.classList.contains('rm')) return;
    const vh = scroller ? scroller.clientHeight : innerHeight;
    const top0 = scroller ? scroller.getBoundingClientRect().top : 0;
    const times = [];
    for (const glass of near) {                 // d'abord toutes les lectures…
      const r = glass.getBoundingClientRect();
      const p = (vh - (r.top - top0)) / (vh + r.height);
      times.push(glass, Math.round(Math.min(1, Math.max(0, (p - 0.12) / 0.76)) * 1000));
    }
    for (let i = 0; i < times.length; i += 2) { // …puis les écritures
      const anim = anims.get(times[i]);
      if (anim.currentTime !== times[i + 1]) anim.currentTime = times[i + 1];
    }
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) { if (e.isIntersecting) near.add(e.target); else near.delete(e.target); }
    schedule();
  }, { root: scroller, rootMargin: '15% 0px' });
  target.addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  const clear = () => { anims.forEach((a) => a.cancel()); anims.clear(); near.clear(); };
  // Les animations sont créées une fois, pour toutes les vitres : créer ou retirer un calque pendant le
  // défilement obligerait le navigateur à recomposer la page. À rappeler quand des cartes arrivent
  // (défilement infini, nouvelle page de collection).
  const refresh = () => {
    clear(); io.disconnect();
    scope.querySelectorAll('.oeuvre-card-glass').forEach((g) => {
      const anim = g.firstElementChild.animate(KEYS, { duration: 1000, fill: 'both' });
      anim.pause();
      anim.currentTime = 500;
      anims.set(g, anim);
      io.observe(g);
    });
  };
  refresh();
  return {
    refresh,
    stop() { clear(); io.disconnect(); target.removeEventListener('scroll', schedule); removeEventListener('resize', schedule); root.classList.remove('oc-js'); },
  };
}
