/*
 * posthog-tracking.js — la mesure de la boutique par PostHog (fiche-3d, ticket 06)
 * ----------------------------------------------------------------------------------------------
 * Chargé par snippets/posthog.liquid (jeton, hôte, taux d'enregistrement), sur tous les layouts.
 *
 * Ce fichier est léger ; la bibliothèque PostHog (119 Ko compressés), non. Elle ne se charge donc que
 * s'il y a quelque chose à envoyer (une fiche, ou un ajout au panier ailleurs), une fois ces quatre
 * portes ouvertes :
 *   1. un vrai geste du visiteur (souris, doigt, molette, clavier). C'est le filtre des robots :
 *      en septembre 2026, 93 % des 90 000 sessions GA4 venaient d'eux. Sans geste, rien ne se
 *      charge et rien n'est compté, et Lighthouse ne voit pas PostHog ;
 *   2. la fin du chargement de la page ;
 *   3. le repos du navigateur ;
 *   4. le consentement analytique de Shopify (Shopify.customerPrivacy). Refusé : rien ne se charge.
 *      Retiré ensuite : PostHog cesse de capter et d'enregistrer.
 * Une vue de fiche est donc une vue avec au moins un geste. Thème non publié : aucun suivi.
 *
 * Événements, et rien d'autre (ni clics automatiques, ni pages vues) :
 *   product_viewed               fiche affichée, y compris à chaque bascule toile/poster
 *   product_option_selected      option choisie par le visiteur (option, option_value)
 *   floating_buy_button_clicked  clic sur le bouton d'achat flottant
 *   product_added_to_cart        ajout réussi (source, quantity, value)
 * Tous portent la devise du marché (currency). Ceux de la fiche portent la fiche
 * (#product-tracking-json, sections/main-product.liquid) et le choix du visiteur (window.MMASelection,
 * assets/product-selection.js).
 *
 * Chaque chemin d'ajout au panier annonce sa réussite par UN événement sur `document` :
 *   document.dispatchEvent(new CustomEvent('mma:cart-add', { detail: { source, items } }));
 *   source : 'main' | 'float' | 'bundle' | 'studio' ; items : `items` de la réponse de /cart/add.js.
 *
 * Enregistrements de visites : fiches d'œuvres seulement (toile, poster), jamais les personnalisés
 * (photos et prénoms des clients), pour les sessions tirées au sort. Le tirage est fait ici et non
 * dans PostHog, qui chargerait les 69 Ko compressés de l'enregistreur et le ferait tourner chez
 * tout le monde avant de jeter ce qui n'est pas retenu. La durée minimale et le masquage se règlent
 * dans le projet PostHog. Les lignes du panier (cart-item) sont bloquées : texte libre, aperçus.
 *
 * Le calcul et le suivi sont testés : scripts/posthog-tracking.test.cjs.
 */
(function () {
  'use strict';

  // ---- Calcul pur ------------------------------------------------------------------------------

  // Tirage au sort d'une session, stable : même identifiant, même réponse, sur toutes les pages.
  function inSample(sessionId, rate) {
    let hash = 2166136261; // FNV-1a sur 32 bits
    for (let i = 0; i < sessionId.length; i += 1) {
      hash = Math.imul(hash ^ sessionId.charCodeAt(i), 16777619);
    }
    return ((hash >>> 0) % 10000) / 10000 < rate;
  }

  // product : contenu de #product-tracking-json. selection : détail de mma:selection-change ou
  // window.MMASelection.read() (assets/product-selection.js), null sur une fiche sans ce sélecteur.
  function productProperties(product, selection) {
    const properties = {
      product_id: product.id,
      product_handle: product.handle,
      product_kind: product.kind || null,
      product_template: product.template,
    };
    if (!selection) return properties;
    // La clé du métaobjet ne change pas avec la langue : on la préfère à la valeur traduite.
    const optionOf = (kind) => {
      const option = selection.options.find((o) => o.kind === kind);
      return option ? option.key || option.value : null;
    };
    return {
      ...properties,
      variant_id: selection.variant ? selection.variant.id : null,
      price: selection.variant ? selection.variant.price / 100 : null,
      size: optionOf('size'),
      border: optionOf('border'),
      frame: selection.frameColor ? selection.frameColor.key : optionOf('frame'),
      white_border: selection.whiteBorder,
    };
  }

  // changed : l'option que le visiteur vient de choisir (selection.changed). Pas de propriété
  // `value` ici : celle de l'ajout au panier est un nombre, et PostHog ne type une propriété qu'une fois.
  function optionProperties(properties, changed) {
    const value = changed === 'whiteBorder' ? properties.white_border : properties[changed];
    return { ...properties, option: changed, option_value: String(value) };
  }

  // detail : celui de mma:cart-add, dont `items` vient de /cart/add.js, prix en centimes. Les
  // propriétés de ligne (prénoms, aperçu personnalisé) restent ici : seuls les champs nommés partent.
  function cartProperties(detail, shownProduct) {
    const first = detail.items[0];
    const sum = (field) => detail.items.reduce((total, item) => total + item[field], 0);
    const product =
      shownProduct && shownProduct.product_id === first.product_id
        ? shownProduct
        : { product_id: first.product_id, product_handle: first.handle };
    return {
      ...product,
      variant_id: first.variant_id,
      source: detail.source,
      quantity: sum('quantity'),
      value: sum('final_line_price') / 100,
    };
  }

  // ---- Portes ----------------------------------------------------------------------------------

  // Gestes qu'un robot ne produit pas : ceux qui viennent du matériel. Le défilement n'en fait pas
  // partie : un script peut le provoquer, et il arrive après touchstart ou wheel chez un humain.
  const GESTURES = ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown'];

  function firstGesture(win) {
    return new Promise((resolve) => {
      const onGesture = (e) => {
        if (!e.isTrusted) return;
        GESTURES.forEach((type) => win.removeEventListener(type, onGesture, true));
        resolve();
      };
      GESTURES.forEach((type) => win.addEventListener(type, onGesture, { capture: true, passive: true }));
    });
  }

  function pageLoaded(win, doc) {
    return new Promise((resolve) => {
      if (doc.readyState === 'complete') resolve();
      else win.addEventListener('load', resolve, { once: true });
    });
  }

  function browserIdle(win) {
    return new Promise((resolve) => {
      if (win.requestIdleCallback) win.requestIdleCallback(resolve, { timeout: 2000 });
      else win.setTimeout(resolve, 200);
    });
  }

  // Chargée par cookie-banner sur tous les layouts ; redemandée ici pour ne pas dépendre de l'ordre.
  function consentApi(win) {
    return new Promise((resolve) => {
      if (win.Shopify.customerPrivacy) resolve();
      else {
        win.Shopify.loadFeatures([{ name: 'consent-tracking-api', version: '0.1' }], (error) => {
          if (!error) resolve();
        });
      }
    });
  }

  // ---- Suivi -----------------------------------------------------------------------------------

  function postHogOptions(apiHost) {
    return {
      api_host: apiHost,
      defaults: '2026-08-30',
      person_profiles: 'identified_only',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_scroll_properties: true,
      disable_surveys: true,
      disable_conversations: true,
      disable_product_tours: true,
      advanced_disable_feature_flags: true,
      disable_session_recording: true,
      session_recording: { maskAllInputs: true, blockSelector: 'cart-item', captureJsonLd: false },
    };
  }

  function startTracking({ win, doc, config }) {
    // Aperçu d'un thème non publié, `shopify theme dev` : seule la boutique en ligne est mesurée.
    if (win.Shopify.theme && win.Shopify.theme.role !== 'main') return;

    const queue = []; // ce qui attend le démarrage, en mémoire seulement : rien n'est écrit ni transmis
    let consent = 'pending'; // 'pending' : une porte reste à ouvrir ; 'granted' ; 'refused' : retiré
    let posthog = null; // prêt à capter
    let requested = false; // bibliothèque demandée, une fois par page

    function track(name, properties) {
      if (consent === 'refused') return;
      const event = { ...properties, currency: win.Shopify.currency.active };
      if (posthog) {
        posthog.capture(name, event);
        return;
      }
      queue.push([name, event]);
      if (consent === 'granted') loadLibrary();
    }

    function currentProductProperties(selection) {
      const node = doc.getElementById('product-tracking-json');
      if (!node) return null;
      const chosen = selection || (win.MMASelection ? win.MMASelection.read() : null);
      return productProperties(JSON.parse(node.textContent), chosen);
    }

    function trackView() {
      const product = currentProductProperties();
      if (product) track('product_viewed', product);
    }

    // Écouteurs posés une seule fois sur `document`, qui survit au remplacement de #MainContent
    // (bascule toile/poster) : le bouton flottant vit d'ailleurs hors de #MainContent, sur <body>.
    doc.addEventListener('DOMContentLoaded', trackView, { once: true });
    doc.addEventListener('mma:soft-navigation', trackView);
    doc.addEventListener('mma:selection-change', (e) => {
      if (!e.detail.changed) return;
      track('product_option_selected', optionProperties(currentProductProperties(e.detail), e.detail.changed));
    });
    doc.addEventListener('mma:cart-add', (e) => {
      track('product_added_to_cart', cartProperties(e.detail, currentProductProperties()));
    });
    doc.addEventListener(
      'click',
      (e) => {
        if (e.target.closest('.float-buy-button')) track('floating_buy_button_clicked', currentProductProperties());
      },
      true,
    );

    // Au démarrage, et quand le consentement retiré revient. PostHog garde un retrait d'une page à l'autre.
    function captureAndRecord() {
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing({ captureEventName: false });
      const product = currentProductProperties();
      if (product && product.product_kind && inSample(posthog.get_session_id(), config.replayRate)) {
        posthog.startSessionRecording();
      }
    }

    function startPostHog() {
      if (consent !== 'granted') return;
      posthog = win.posthog;
      posthog.init(config.token, postHogOptions(config.apiHost));
      captureAndRecord();
      queue.splice(0).forEach(([name, event]) => posthog.capture(name, event));
    }

    function loadLibrary() {
      if (requested) {
        if (win.posthog) startPostHog(); // arrivée pendant un refus, et restée de côté
        return;
      }
      requested = true;
      const script = doc.createElement('script');
      script.src = `${config.apiHost.replace('.i.posthog.com', '-assets.i.posthog.com')}/static/array.js`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = startPostHog;
      doc.head.appendChild(script);
    }

    // La bannière redonne le consentement à chaque page : ici, rien à faire s'il n'avait pas été retiré.
    function grant() {
      const wasRefused = consent === 'refused';
      consent = 'granted';
      if (posthog && wasRefused) captureAndRecord();
      if (!posthog && queue.length > 0) loadLibrary();
    }

    function refuse() {
      consent = 'refused';
      queue.length = 0;
      if (!posthog) return;
      posthog.opt_out_capturing();
      posthog.stopSessionRecording(); // l'enregistreur tournerait encore, seul son envoi étant coupé
    }

    Promise.all([firstGesture(win), pageLoaded(win, doc)])
      .then(() => browserIdle(win))
      .then(() => consentApi(win))
      .then(() => {
        const allowed = () => win.Shopify.customerPrivacy.analyticsProcessingAllowed();
        doc.addEventListener('visitorConsentCollected', () => (allowed() ? grant() : refuse()));
        if (allowed()) grant();
      });
  }

  // Node (tests) : rien ne démarre, le calcul et le suivi sont exportés.
  if (typeof window === 'undefined') {
    module.exports = { inSample, productProperties, optionProperties, cartProperties, startTracking };
    return;
  }

  // ---- Navigateur ------------------------------------------------------------------------------

  const { token, apiHost, replayRate } = document.currentScript.dataset;
  startTracking({ win: window, doc: document, config: { token, apiHost, replayRate: Number(replayRate) } });
})();
