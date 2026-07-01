/*
 * product-twin-toggle.js
 * ----------------------------------------------------------------------------------------------
 * Bascule Poster <-> Toile SANS rechargement de page (soft-navigation).
 *
 * La bascule (snippet product-format-toggle.liquid) est un vrai lien <a href="{url jumeau}"> :
 * elle fonctionne SANS JS (navigation classique) et reste crawlable/partageable. Ce module
 * l'enrichit : au clic, on récupère la page de la fiche jumelle en fetch, on remplace le contenu
 * de <main id="MainContent"> par celui du jumeau, puis on met à jour l'URL (history.pushState).
 *
 * Pourquoi ça marche : le thème est 100 % custom elements — remplacer le DOM déclenche les
 * connectedCallback (galerie, sélecteurs de variantes, visualiseur 3D, avis, FAQ, recommandations,
 * fil d'ariane…) et les disconnectedCallback (ex. teardown WebGL) tout seuls. Seules les options
 * poster (cadre couleur + contour blanc) ont une init « run-once » : on la rejoue via
 * window.mmaInitPosterOptions() (cf. main-product.js).
 *
 * Conventions reprises de collection-tag-filter.js / tw-header.js (fetch + DOMParser + swap DOM +
 * history.pushState + window.removeSkeletonOnImagesLoad).
 */
(function () {
  'use strict';

  // Garde anti double-inclusion du script (cf. gotcha tw-global.js inclus 2×).
  if (window.__mmaTwinToggleLoaded) return;
  window.__mmaTwinToggleLoaded = true;

  // ---- Registre des scripts déjà chargés (seedé une fois, au 1er chargement) ---------------------
  // Empêche de recharger un asset déjà présent (sinon customElements.define() re-throw), tout en
  // permettant de charger à la volée un script dont SEULE la fiche jumelle a besoin (ex.
  // component-perspective-canvas.js sur un poster « nu » qui bascule vers une toile).
  const loadedScripts = new Set();
  document.querySelectorAll('script[src]').forEach((s) => {
    try { loadedScripts.add(new URL(s.src, location.href).href); } catch (e) { /* noop */ }
  });

  function ensureScripts(container) {
    container.querySelectorAll('script[src]').forEach((old) => {
      const raw = old.getAttribute('src');
      if (!raw) return;
      let abs;
      try { abs = new URL(raw, location.href).href; } catch (e) { return; }
      if (loadedScripts.has(abs)) return; // déjà chargé -> ne rien faire
      loadedScripts.add(abs);
      const s = document.createElement('script'); // créé programmatiquement -> s'exécute (contrairement à innerHTML)
      if (old.type) s.type = old.type;
      s.src = abs;
      s.defer = true;
      document.head.appendChild(s);
    });
  }

  // ---- Mise à jour des métadonnées <head> (SEO / partage social) après swap ----------------------
  const HEAD_META = [
    ['link[rel="canonical"]', 'href'],
    ['meta[property="og:url"]', 'content'],
    ['meta[property="og:type"]', 'content'],
    ['meta[property="og:title"]', 'content'],
    ['meta[property="og:description"]', 'content'],
    ['meta[property="og:image"]', 'content'],
    ['meta[name="description"]', 'content'],
  ];
  function updateHead(doc) {
    const title = doc.querySelector('title');
    if (title) document.title = title.textContent;
    HEAD_META.forEach(([selector, attr]) => {
      const src = doc.querySelector(selector);
      const dst = document.querySelector(selector);
      if (src && dst) dst.setAttribute(attr, src.getAttribute(attr) || '');
    });
  }

  // ---- Moteur de soft-navigation (singleton) -----------------------------------------------------
  const SoftNav = {
    busy: false,

    async navigate(url, options) {
      const push = !options || options.push !== false;
      const main = document.getElementById('MainContent');
      if (!main || this.busy) return;
      this.busy = true;

      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
        const newMain = doc.getElementById('MainContent');
        if (!newMain) throw new Error('#MainContent introuvable');

        // 1) Charger les scripts que la fiche jumelle exige et qui manquent (perspective-canvas, like…).
        ensureScripts(newMain);
        // 2) Remplacer le CONTENU de #MainContent (wrapper conservé). On DÉPLACE directement les nœuds issus
        //    de DOMParser (document sans browsing context -> custom elements NON construits). Surtout PAS
        //    innerHTML NI importNode : tous deux construisent les <painting-variant-picker> TROP TÔT (parse
        //    d'un fragment / clone détaché) alors que l'ANCIENNE fiche est encore en place -> le constructeur
        //    (VariantPicker) lit le variants-data-json de l'ANCIEN produit et grise à tort les options (bug
        //    cadres tout en gris + non cliquables après un aller-retour). Avec replaceChildren sur les nœuds
        //    DOMParser, l'upgrade (constructeur + connectedCallback) se déclenche à la CONNEXION, quand tout
        //    le nouveau sous-arbre (dont SON variants-data-json) est déjà en place -> prix/dispo/cadre corrects.
        //    Les <script src> hérités de DOMParser sont « already started » -> ils NE s'exécutent PAS (aucun
        //    customElements.define rejoué). disconnectedCallback (teardown WebGL) tiré sur l'ancien contenu.
        main.replaceChildren(...newMain.childNodes);
        // 3) Options poster (cadre/couleur + contour blanc) : reset du drapeau pp + ré-init idempotente.
        document.body.classList.remove('poster-pp-on');
        if (typeof window.mmaInitPosterOptions === 'function') window.mmaInitPosterOptions();
        // 4) Dé-flouter les images injectées (helper thème, tw-global.js).
        if (typeof window.removeSkeletonOnImagesLoad === 'function') window.removeSkeletonOnImagesLoad(main);
        // 5) URL + <title> + métadonnées <head>.
        updateHead(doc);
        if (push) history.pushState({ mmaSoftNav: true }, '', url);
        // 6) a11y : ancrer le focus près de la nouvelle bascule (l'ancien élément cliqué a disparu).
        const toggle = main.querySelector('product-twin-toggle');
        if (toggle) {
          toggle.setAttribute('tabindex', '-1');
          toggle.focus({ preventScroll: true });
        }
      } catch (err) {
        window.location.href = url; // repli robuste : navigation classique
      } finally {
        this.busy = false;
      }
    },
  };
  window.MMASoftNav = SoftNav;

  // Retour / avance navigateur : re-swap vers l'URL courante (sans re-push). Échec -> reload.
  if (!window.__mmaSoftNavPopstate) {
    window.__mmaSoftNavPopstate = true;
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.mmaSoftNav) SoftNav.navigate(location.href, { push: false });
    });
  }

  // ---- Custom element : intercepte le clic du lien jumeau ----------------------------------------
  if (!customElements.get('product-twin-toggle')) {
    class ProductTwinToggle extends HTMLElement {
      connectedCallback() {
        const link = this.querySelector('a[data-twin-url]');
        if (!link) return;
        link.addEventListener('click', (e) => {
          // Comportement natif préservé : nouvel onglet, clic milieu, modificateurs, origine tierce.
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          const url = link.href;
          try { if (new URL(url, location.href).origin !== location.origin) return; } catch (err) { return; }
          e.preventDefault();
          this.setAttribute('aria-busy', 'true');
          this.classList.add('opacity-60', 'pointer-events-none');
          SoftNav.navigate(url).finally(() => {
            // Succès : cet élément a été remplacé (reset sans effet). Échec silencieux : on ré-active.
            this.removeAttribute('aria-busy');
            this.classList.remove('opacity-60', 'pointer-events-none');
          });
        });
      }
    }
    customElements.define('product-twin-toggle', ProductTwinToggle);
  }
})();
