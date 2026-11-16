/* Reflet des vitres des vignettes de poster : vignettes de collection des nouveaux produits (snippets/
   card-product.liquid, branche « vignette » ; CSS dans input.css, « Vignette d'œuvre » ; décision 18 du dossier
   .scratch/fiche-3d). Quand la carte monte, le reflet d'une porte-fenêtre glisse sur la vitre.

   Le CSS le fait seul là où le navigateur lie une animation au défilement (animation-timeline: view() :
   Chrome, Edge, Samsung Internet, Safari 26 et plus) : le script s'arrête alors aussitôt. Ailleurs (Firefox,
   Safari avant 26) :
   - chaque vitre reçoit une fois une animation Web en pause, sur la course du CSS, dont le script règle
     l'instant (currentTime). Un style réécrit à chaque image obligerait le navigateur à recomposer tous les
     calques de la page : 5 fois plus de travail, mesuré au banc (.scratch/fiche-3d/vignettes-collection) ;
   - un IntersectionObserver garde les vitres proches de l'écran ; un seul écouteur de défilement passif,
     regroupé par requestAnimationFrame, ne met à jour qu'elles ;
   - rien ne bouge quand le visiteur demande moins de mouvement (le CSS fige aussi le reflet) ;
   - un MutationObserver suit les cartes qui arrivent ou s'en vont : filtres (assets/collection-tag-filter.js),
     défilement infini (assets/collection.js), « Mes j'aime » (assets/my-likes.js).

   Chargé en module par la carte d'un poster sous verre : une seule exécution par page, quel que soit le
   nombre de cartes, et rien sur une page qui n'en a pas. Tests : scripts/oeuvre-card-reflet.test.cjs, qui le
   fait tourner dans une page réduite. */
(() => {
  // La course du reflet, celle du CSS (input.css : @keyframes oeuvre-card-glare et animation-range) : la
  // porte-fenêtre entre en haut de la vitre à 12 % de la traversée de l'écran par la carte, et sort en bas à
  // 88 %. À changer ensemble.
  const COURSE = { from: '0 -100%', to: '0 96%', start: 0.12, end: 0.88 }
  const DURATION = 1000

  /* L'instant de l'animation du reflet (ms) d'une vitre dont le haut est à `top` px du haut de l'écran. Sa
     traversée va de son entrée en bas de l'écran (0) à sa sortie en haut (1) : 0 jusqu'à 12 %, DURATION à
     partir de 88 %. */
  function glareTime(top, height, viewport) {
    const crossed = (viewport - top) / (viewport + height)
    const progress = (crossed - COURSE.start) / (COURSE.end - COURSE.start)
    return Math.round(Math.min(1, Math.max(0, progress)) * DURATION)
  }

  if (CSS.supports('animation-timeline: view()') || !Element.prototype.animate) return

  const GLASS = '.oeuvre-card-glass'
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const keyframes = [{ translate: COURSE.from }, { translate: COURSE.to }]
  const anims = new Map() // vitre → animation (en pause) de son reflet
  const near = new Set() // vitres proches de l'écran : les seules mises à jour
  let frame = 0

  function update() {
    frame = 0
    if (reducedMotion.matches) return
    // D'abord toutes les lectures, puis les écritures : une seule mise en page par image.
    const times = [...near].map((glass) => {
      const { top, height } = glass.getBoundingClientRect()
      return [glass, glareTime(top, height, innerHeight)]
    })
    for (const [glass, time] of times) {
      const anim = anims.get(glass)
      if (anim.currentTime !== time) anim.currentTime = time
    }
  }
  const schedule = () => {
    if (!frame && near.size) frame = requestAnimationFrame(update)
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      // Une annonce restée en file peut arriver après le départ de sa carte (sync l'a déjà oubliée).
      if (!anims.has(entry.target)) continue
      if (entry.isIntersecting) near.add(entry.target)
      else near.delete(entry.target)
    }
    schedule()
  }, { rootMargin: '15% 0px' })

  /* Une animation par vitre, créée dès que la carte est là et retirée avec elle : créer ou retirer des
     calques pendant le défilement donnait des tâches longues. */
  function sync() {
    for (const [glass, anim] of anims) {
      if (glass.isConnected) continue
      anim.cancel()
      anims.delete(glass)
      near.delete(glass)
      io.unobserve(glass)
    }
    for (const glass of document.querySelectorAll(GLASS)) {
      if (anims.has(glass)) continue
      const anim = glass.firstElementChild.animate(keyframes, { duration: DURATION, fill: 'both' })
      anim.pause()
      anim.currentTime = DURATION / 2
      anims.set(glass, anim)
      io.observe(glass)
    }
  }

  const holdsGlass = (nodes) => [...nodes].some((node) => node.nodeType === 1 && (node.matches(GLASS) || node.querySelector(GLASS)))
  new MutationObserver((records) => {
    if (records.some((record) => holdsGlass(record.addedNodes) || holdsGlass(record.removedNodes))) sync()
  }).observe(document.body, { childList: true, subtree: true })

  addEventListener('scroll', schedule, { passive: true })
  addEventListener('resize', schedule, { passive: true })
  sync()
})()
