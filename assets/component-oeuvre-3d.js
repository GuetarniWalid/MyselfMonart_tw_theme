/*
 * component-oeuvre-3d.js — <oeuvre-3d>, la scène de la fiche d'œuvre (fiche-3d, ticket 07)
 * ----------------------------------------------------------------------------------------------
 * Balisage : snippets/oeuvre-3d-stage.liquid, rendu par sections/main-product.liquid quand le modèle
 * de page demande la scène 3D (réglage media_display). Le moteur est assets/oeuvre-3d-engine.js.
 *
 * Arrivée : la vraie image s'affiche d'abord. Au premier geste du visiteur, ou 8 s après le chargement
 * s'il n'en fait aucun, three.js et le moteur se téléchargent, tout se prépare derrière la photo,
 * puis la 3D apparaît en fondu sans rien décaler. Rien de lourd ne dispute donc le processeur à la
 * page pendant qu'elle s'installe.
 * Le prix et le bouton ne dépendent pas de la 3D : ils changent au clic, par le sélecteur.
 *
 * La scène suit les choix par `mma:selection-change` (assets/product-selection.js). Retoucher une
 * option déjà choisie ne fait pas de `change` : le clic rejoue sa mise en scène.
 *
 * Sans 3D (animations réduites, économie de données, appareil faible, WebGL absent ou perdu) : les
 * photos du produit, à passer une à une, en simples fondus (décision 5). La scène garde sa taille :
 * rien ne bouge dans la page, à l'arrivée comme si la 3D s'arrête en route.
 *
 * La bascule toile/poster remplace #MainContent : disconnectedCallback rend tout à la carte graphique
 * et retire les écouteurs posés sur `document`.
 *
 * L'état se lit sur l'élément : data-state = arrival, 3d ou photos (le repli).
 * Le choix du mode est testé : scripts/oeuvre-3d-stage.test.cjs.
 */
(function () {
  'use strict';

  // ---- Calcul pur ------------------------------------------------------------------------------

  const slowNetwork = ({ saveData, effectiveType }) => !!saveData || /2g/.test(effectiveType || '');

  // env : voir environment(). Une valeur absente ne dit rien : Safari ne donne ni mémoire ni réseau.
  function stageMode(env) {
    const weakDevice = (env.deviceMemory && env.deviceMemory <= 2) || (env.cores && env.cores <= 2);
    return env.reducedMotion || slowNetwork(env) || weakDevice || !env.webgl2 ? 'photos' : '3d';
  }

  // La source complète des gros plans pèse près d'un Mo : pas sur un réseau lent.
  const wantsDetail = (env) => !slowNetwork(env) && !/3g/.test(env.effectiveType || '');

  // Node (tests) : seul le calcul pur est exporté.
  if (typeof window === 'undefined') {
    module.exports = { stageMode, wantsDetail };
    return;
  }

  // ---- Navigateur ------------------------------------------------------------------------------

  // La bascule toile/poster peut recharger ce script.
  if (customElements.get('oeuvre-3d')) return;

  const OPTION_RADIO = 'painting-variant-picker input[type="radio"]';
  const CLOSE_UP_OPTIONS = '[data-option-kind="border"], [data-option-kind="frame"]'; // celles qui zooment

  function environment() {
    const connection = navigator.connection || {};
    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      saveData: connection.saveData,
      effectiveType: connection.effectiveType,
      deviceMemory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
      webgl2: 'WebGL2RenderingContext' in window,
    };
  }

  /* Le démarrage de la 3D : au premier geste, les mêmes que pour PostHog (assets/posthog-tracking.js),
     avec un filet pour qui regarde sans toucher. Arrivé par la bascule toile/poster, le visiteur vient
     de cliquer et la page est chargée : pas d'attente. */
  const QUIET_AFTER_LOAD_MS = 8000;
  const GESTURES = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown'];

  function whenWanted(task) {
    if (document.readyState === 'complete') {
      whenIdle(task);
      return;
    }
    let timer = 0;
    let wanted = false;
    const go = () => {
      if (wanted) return;
      wanted = true;
      clearTimeout(timer);
      GESTURES.forEach((type) => window.removeEventListener(type, go, true));
      whenIdle(task);
    };
    GESTURES.forEach((type) => window.addEventListener(type, go, { capture: true, passive: true }));
    window.addEventListener('load', () => { if (!wanted) timer = setTimeout(go, QUIET_AFTER_LOAD_MS); }, { once: true });
  }

  // Ne pas disputer le processeur à la page : on attend la fin du chargement et un creux, avec une
  // minuterie de secours (Safari n'a pas requestIdleCallback, d'autres le retardent).
  function whenIdle(task) {
    let done = false;
    const once = () => {
      if (done) return;
      done = true;
      task();
    };
    const go = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(once, { timeout: 1500 });
      setTimeout(once, 'requestIdleCallback' in window ? 2000 : 200);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  function imageLoaded(image) {
    return new Promise((resolve, reject) => {
      if (image.complete) {
        if (image.naturalWidth) resolve();
        else reject(new Error('image de la scène absente'));
        return;
      }
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', reject, { once: true });
    });
  }

  const fullUrl = (url) => new URL(url, window.location.href).href;

  class Oeuvre3d extends HTMLElement {
    connectedCallback() {
      this.stage = this.querySelector('[data-stage]');
      this.art = this.querySelector('[data-art]');
      this.canvas = this.querySelector('[data-gl]');
      this.dims = this.querySelector('[data-dims]');
      this.dimWidth = this.querySelector('[data-dim-width]');
      this.dimHeight = this.querySelector('[data-dim-height]');
      this.hint = this.querySelector('[data-hint]');
      this.tools = this.querySelector('[data-tools]');
      this.config = JSON.parse(this.querySelector('[data-config]').textContent);
      this.env = environment();
      this.baseLabel = this.canvas.getAttribute('aria-label');
      this.session = {}; // disparaît quand la scène s'arrête : une suite asynchrone périmée se tait
      this.run = { active: false, times: [] }; // un vrai parcours : un choix ou un glisser
      this.densityCap = Infinity;

      const header = document.querySelector('header');
      if (header) this.style.setProperty('--header-h', `${header.offsetHeight}px`);

      if (stageMode(this.env) === 'photos') {
        this.showPhotos();
        return;
      }
      this.listen();
      whenWanted(this.start);
    }

    disconnectedCallback() {
      this.stop3D();
    }

    listen() {
      document.addEventListener('mma:selection-change', this.onSelection);
      document.addEventListener('click', this.onClick);
      document.addEventListener('keydown', this.onKeydown);
      document.addEventListener('pointerdown', this.onApproach);
      document.addEventListener('focusin', this.onApproach);
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerup', this.onPointerEnd);
      this.canvas.addEventListener('pointercancel', this.onPointerEnd);
      this.querySelector('[data-front]').addEventListener('click', this.onFront);
      this.querySelector('[data-back]').addEventListener('click', this.onBack);
      this.resizer = new ResizeObserver(this.onResize);
      this.resizer.observe(this.stage);
    }

    unlisten() {
      document.removeEventListener('mma:selection-change', this.onSelection);
      document.removeEventListener('click', this.onClick);
      document.removeEventListener('keydown', this.onKeydown);
      document.removeEventListener('pointerdown', this.onApproach);
      document.removeEventListener('focusin', this.onApproach);
      if (this.resizer) this.resizer.disconnect();
    }

    // Arrête la 3D et rend tout à la carte graphique. La scène ne repart plus ensuite.
    stop3D() {
      this.session = null;
      this.live = false;
      this.drag = null;
      this.unlisten();
      cancelAnimationFrame(this.raf);
      this.canvas.removeEventListener('webglcontextlost', this.showPhotos);
      if (this.reliefs) this.reliefs.stop();
      if (this.detailReady) this.engine.closeImage(this.detailReady);
      this.detailReady = null;
      if (this.scene) this.scene.dispose();
      this.scene = null;
      this.director = null;
    }

    /* ---- Démarrage ---- */

    start = async () => {
      const { session } = this;
      if (!session) return;
      const stale = () => session !== this.session;
      try {
        await imageLoaded(this.art);
        const engineLoaded = import(fullUrl(this.config.engine)).then((engine) => {
          if (!stale()) this.reliefs = engine.startReliefs(); // en parallèle de three.js
          return engine;
        });
        const [THREE, engine] = await Promise.all([import(fullUrl(this.config.three)), engineLoaded]);
        if (stale()) return;
        this.engine = engine;

        const variants = JSON.parse(document.getElementById('variants-data-json').textContent);
        const sizes = engine.sizesFromVariants(variants);
        if (!sizes.length) throw new Error('produit sans taille en cm');
        const room = engine.neutralRoom(sizes);
        const selection = window.MMASelection.read();
        this.remember(selection);
        this.product = engine.productFromSelection(selection);
        this.director = engine.createDirector({ room, product: { ...this.product } });

        const [weave, artImage] = await Promise.all([this.reliefs.weave, engine.decodeImage(this.art)]);
        if (stale()) {
          engine.closeImage(artImage);
          return;
        }
        this.reliefs.stop(); // le grain du papier ne sert pas à la toile
        this.scene = engine.createScene(THREE, {
          canvas: this.canvas, artImage, weave, room, woodImage: fullUrl(this.config.wood), sizes,
        });
        this.canvas.addEventListener('webglcontextlost', this.showPhotos);
        this.scene.onNeedsRender = this.requestRender;
        await engine.breathe();
        if (stale()) return;
        this.measure();
        this.fitStage();

        // La photo reste affichée pendant que tout se prépare. Le coût d'une image fixe la densité
        // ici, une seule fois : une fois la 3D visible, un changement de netteté se verrait.
        const at = performance.now();
        const frameCost = await this.scene.prepare(this.director.view(at, this.aspect), at);
        if (stale()) return;
        const density = this.scene.density();
        this.densityCap = engine.densityForCost(density, frameCost);
        if (engine.isTooSlow(density, frameCost, this.densityCap)) throw new Error('appareil trop lent');
        if (this.densityCap < density) this.fitStage();
      } catch (error) {
        if (stale()) return;
        console.warn('3D indisponible, retour aux photos :', error);
        this.showPhotos();
        return;
      }
      this.reveal(session);
    };

    reveal(session) {
      this.live = true;
      this.draw(performance.now());
      this.requestRender(); // un choix fait pendant la préparation continue sa transition
      if (this.pendingGroup) this.play(this.pendingGroup); // et celui fait avant le moteur commence la sienne
      if (this.detailWanted) this.askDetail();
      whenIdle(() => {
        if (session === this.session) this.scene.loadWood();
      });
      // Fondu : la 3D apparaît par-dessus la photo, qui reste opaque dessous jusqu'au bout.
      requestAnimationFrame(() => {
        if (session !== this.session) return;
        this.dataset.state = '3d';
        this.canvas.removeAttribute('aria-hidden');
        this.canvas.classList.replace('opacity-0', 'opacity-100');
        this.hint.classList.remove('hidden');
        this.tools.classList.remove('hidden');
        setTimeout(() => {
          if (session !== this.session) return;
          this.art.classList.add('opacity-0');
          this.art.setAttribute('aria-hidden', 'true');
        }, 500);
      });
    }

    /* ---- Rendu à la demande ---- */

    measure() {
      const { width, height } = this.stage.getBoundingClientRect();
      this.width = Math.max(1, Math.round(width));
      this.height = Math.max(1, Math.round(height));
    }

    get aspect() {
      return this.width / this.height;
    }

    // Densité de rendu : celle de l'écran, sous le plafond fixé une fois pour toutes à l'arrivée.
    fitStage() {
      const fit = this.engine.renderDensity({ dpr: window.devicePixelRatio || 1, width: this.width, height: this.height });
      this.scene.resize(this.width, this.height, Math.min(this.densityCap, fit));
    }

    // Redimensionner efface le canvas : on redessine aussitôt, avant que l'écran ne se rafraîchisse.
    onResize = () => {
      if (!this.scene) return;
      this.measure();
      this.fitStage();
      if (this.live) this.draw(performance.now());
    };

    requestRender = () => {
      if (!this.raf && this.live) this.raf = requestAnimationFrame(this.frame);
    };

    draw(at) {
      const view = this.director.view(at, this.aspect);
      this.scene.render(view, at);
      this.placeDims(view);
    }

    frame = (now) => {
      this.raf = 0;
      if (!this.live) return;
      this.draw(now);
      if (this.run.active) this.run.times.push(now);
      if (this.director.isMoving(now) || this.scene.isFading(now) || this.drag) {
        this.raf = requestAnimationFrame(this.frame);
        return;
      }
      if (this.run.active) this.endRun();
      if (this.live) this.swapDetail();
    };

    // Trop lent pour de vrai, malgré le calibrage de l'arrivée : la fiche repasse sur les photos.
    endRun() {
      const { times } = this.run;
      this.run = { active: false, times: [] };
      if (this.engine.isSluggishRun(times)) this.showPhotos();
    }

    placeDims({ dims }) {
      this.dims.style.opacity = dims.opacity.toFixed(3);
      if (dims.opacity < 0.01) return;
      const left = this.scene.toScreen(dims.width.a);
      const right = this.scene.toScreen(dims.width.b);
      Object.assign(this.dimWidth.style, { left: `${left.x}px`, top: `${left.y}px`, width: `${right.x - left.x}px` });
      this.dimWidth.firstElementChild.textContent = dims.width.text;
      const bottom = this.scene.toScreen(dims.height.a);
      const top = this.scene.toScreen(dims.height.b);
      Object.assign(this.dimHeight.style, { left: `${bottom.x}px`, top: `${top.y}px`, height: `${bottom.y - top.y}px` });
      this.dimHeight.firstElementChild.textContent = dims.height.text;
    }

    /* ---- Choix du visiteur ---- */

    play(group) {
      this.director.choose(group, { ...this.product }, performance.now());
      this.run.active = true;
      this.requestRender();
    }

    remember(selection) {
      this.chosen = Object.fromEntries(selection.options.map((option) => [option.kind, option.value]));
      const values = selection.options.map((option) => option.value).join(' · ');
      this.canvas.setAttribute('aria-label', `${this.baseLabel} : ${values}`);
    }

    onSelection = ({ detail }) => {
      this.remember(detail);
      if (!this.director) {
        this.pendingGroup = detail.changed || this.pendingGroup;
        return;
      }
      this.product = this.engine.productFromSelection(detail);
      this.play(detail.changed || 'front');
    };

    // Le clic arrive avant le `change` : une option nouvelle n'est pas encore celle retenue ici.
    replay(input) {
      if (!this.live || !input.matches(OPTION_RADIO)) return;
      const row = input.closest('[data-option-kind]');
      if (row && input.value === this.chosen[row.dataset.optionKind]) this.play(row.dataset.optionKind);
    }

    onClick = ({ target }) => {
      if (!(target instanceof Element)) return;
      // « Toile » dans la bascule, déjà choisie : le tableau refait son tour.
      if (this.live && target.closest('product-twin-toggle [aria-current]')) this.play('material');
      else this.replay(target);
    };

    // Au clavier, Espace et Entrée ne font pas de clic sur une option déjà cochée.
    onKeydown = ({ key, repeat, target }) => {
      if ((key === ' ' || key === 'Enter') && !repeat && target instanceof Element) this.replay(target);
    };

    onFront = () => this.play('front');

    // Le tour du tableau est la mise en scène du choix de la matière (toile ou poster).
    onBack = () => this.play('material');

    /* ---- Source complète de l'œuvre, pour les gros plans ---- */

    // Demandée quand on s'approche d'une option qui zoome, jamais à l'arrivée.
    onApproach = ({ target }) => {
      if (!(target instanceof Element) || !target.closest(CLOSE_UP_OPTIONS)) return;
      document.removeEventListener('pointerdown', this.onApproach);
      document.removeEventListener('focusin', this.onApproach);
      this.askDetail();
    };

    askDetail() {
      if (!this.live) {
        this.detailWanted = true;
        return;
      }
      if (this.detailAsked || !wantsDetail(this.env)) return;
      this.detailAsked = true;
      const { session } = this;
      this.engine.decodeImage(fullUrl(this.config.detail)).then((image) => {
        if (session !== this.session) {
          this.engine.closeImage(image);
          return;
        }
        this.detailReady = image;
        this.swapDetail();
      }, () => {}); // pas de source complète : on garde l'image de l'arrivée
    }

    // L'envoi au GPU prend quelques dizaines de ms : il attend que tout soit immobile.
    swapDetail() {
      if (!this.detailReady || this.drag || this.director.isMoving(performance.now())) return;
      this.scene.useArtImage(this.detailReady);
      this.detailReady = null;
      this.requestRender();
    }

    /* ---- Inclinaison au doigt ---- */

    onPointerDown = (event) => {
      if (!this.live || (event.pointerType === 'mouse' && event.button !== 0)) return;
      this.drag = { x: event.clientX, y: event.clientY, id: event.pointerId };
      this.director.grab(performance.now());
      this.run.active = true;
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch (e) {
        // Le doigt peut déjà être relâché.
      }
      this.requestRender();
    };

    onPointerMove = (event) => {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      this.director.drag((event.clientX - this.drag.x) / this.width, (event.clientY - this.drag.y) / this.height, performance.now());
      this.hint.classList.add('opacity-0');
      this.requestRender();
    };

    onPointerEnd = (event) => {
      if (!this.drag || event.pointerId !== this.drag.id) return;
      this.drag = null;
      this.director.release(performance.now());
      this.requestRender();
    };

    /* ---- Sans 3D : les photos, en simples fondus ---- */

    showPhotos = () => {
      this.stop3D();
      this.dataset.state = 'photos';
      this.canvas.classList.replace('opacity-100', 'opacity-0');
      this.canvas.setAttribute('aria-hidden', 'true');
      this.canvas.classList.add('pointer-events-none');
      this.art.classList.remove('opacity-0');
      this.art.removeAttribute('aria-hidden');
      this.dims.classList.add('hidden');
      this.hint.classList.add('hidden');
      this.tools.classList.add('hidden');

      const nav = this.querySelector('[data-photo-nav]');
      const photos = Array.from(this.querySelector('[data-photos]').content.children);
      if (!photos.length) return;
      this.photos = [this.art, ...photos];
      this.photo = 0;
      this.photoCount = this.querySelector('[data-photo-count]');
      nav.querySelector('[data-previous]').addEventListener('click', () => this.showPhoto(this.photo - 1));
      nav.querySelector('[data-next]').addEventListener('click', () => this.showPhoto(this.photo + 1));
      this.showPhotoCount();
      nav.classList.remove('hidden');
    };

    showPhotoCount() {
      this.photoCount.textContent = `${this.photo + 1}/${this.photos.length}`;
    }

    showPhoto(index) {
      const next = (index + this.photos.length) % this.photos.length;
      const image = this.photos[next];
      if (!image.isConnected) this.stage.insertBefore(image, this.tools);
      const fade = () => {
        this.photos[this.photo].classList.add('opacity-0');
        image.classList.remove('opacity-0');
        this.photo = next;
        this.showPhotoCount();
      };
      image.decode().then(fade, fade);
    }
  }

  customElements.define('oeuvre-3d', Oeuvre3d);
})();
