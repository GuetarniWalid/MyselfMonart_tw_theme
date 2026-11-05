// Tests de assets/posthog-tracking.js : le calcul pur, puis le suivi à la frontière du navigateur
// (Shopify, PostHog et le DOM sont des faux ; le module est vu de l'extérieur).
// Lancer : node --test scripts/posthog-tracking.test.cjs  (lanceur intégré de Node, sans dépendance)
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  inSample,
  trafficSource,
  pageViewProperties,
  productProperties,
  optionProperties,
  cartProperties,
  startTracking,
} = require('../assets/posthog-tracking.js');

// ---- Tirage au sort des enregistrements ----

test('tirage : une même session reçoit toujours la même réponse', () => {
  const sessionId = '019a4f3e-7c21-7d10-9f4e-3b8e1c2a6d55';
  const first = inSample(sessionId, 0.25);
  for (let i = 0; i < 20; i += 1) assert.equal(inSample(sessionId, 0.25), first);
});

test('tirage : un taux de 0 ne retient personne, un taux de 1 retient tout le monde', () => {
  assert.equal(inSample('019a4f3e-7c21-7d10-9f4e-3b8e1c2a6d55', 0), false);
  assert.equal(inSample('019a4f3e-7c21-7d10-9f4e-3b8e1c2a6d55', 1), true);
});

test('tirage : sur 10 000 sessions, le taux de 25 % retient bien environ le quart', () => {
  let kept = 0;
  for (let i = 0; i < 10000; i += 1) {
    const suffix = i.toString(16).padStart(12, '0');
    if (inSample(`019a4f3e-7c21-7d10-9f4e-${suffix}`, 0.25)) kept += 1;
  }
  assert.ok(kept > 2300 && kept < 2700, `${kept} sessions retenues sur 10 000`);
});

// ---- La source d'une page ----

const SITE = 'https://www.myselfmonart.com';

test('source : arrivé de Google, le site d’origine est gardé', () => {
  assert.deepEqual(trafficSource(`${SITE}/collections/tableau-salon`, 'https://www.google.com/'), {
    $referrer: 'https://www.google.com/',
    $referring_domain: 'www.google.com',
  });
});

test('source : sans site d’origine, l’arrivée est directe', () => {
  assert.deepEqual(trafficSource(`${SITE}/`, ''), { $referrer: '$direct', $referring_domain: '$direct' });
});

test('source : l’appli Google sur Android est reconnue comme PostHog la reconnaît', () => {
  const referrer = 'android-app://com.google.android.googlequicksearchbox/';
  assert.equal(trafficSource(`${SITE}/`, referrer).$referring_domain, 'com.google.android.googlequicksearchbox');
});

test('source : un clic interne ne dit rien, la visite garde le site d’origine de sa 1re page', () => {
  assert.deepEqual(trafficSource(`${SITE}/products/bonsai`, `${SITE}/collections/tableau-zen?page=2`), {});
});

test('source : la campagne et les identifiants de publicité de l’adresse sont gardés, rien d’autre', () => {
  const href = `${SITE}/products/bonsai?variant=1&utm_source=pinterest&utm_medium=social&utm_campaign=noel&gclid=abc&utm_term=&ca_job=42`;
  assert.deepEqual(trafficSource(href, 'https://www.pinterest.fr/'), {
    utm_source: 'pinterest',
    utm_medium: 'social',
    utm_campaign: 'noel',
    gclid: 'abc',
    $referrer: 'https://www.pinterest.fr/',
    $referring_domain: 'www.pinterest.fr',
  });
});

test('source : un lien interne de campagne garde la campagne, pas le site lui-même comme origine', () => {
  assert.deepEqual(trafficSource(`${SITE}/?utm_source=bandeau`, `${SITE}/cart`), { utm_source: 'bandeau' });
});

test('page vue : l’adresse sans son fragment, le chemin et la source', () => {
  const location = new URL(`${SITE}/collections/tableau-zen?page=2#avis`);
  assert.deepEqual(pageViewProperties(location, { utm_source: 'pinterest' }), {
    utm_source: 'pinterest',
    $current_url: `${SITE}/collections/tableau-zen?page=2`,
    $host: 'www.myselfmonart.com',
    $pathname: '/collections/tableau-zen',
  });
});

// ---- Ce qui part à PostHog ----

const TOILE = { id: 9667258319195, handle: 'toile-le-petit-prince', kind: 'toile', template: 'painting' };
// Relevé sur la fiche en ligne (window.MMASelection.read()), prix en centimes.
const TOILE_SELECTION = {
  changed: null,
  variant: { id: 49806793441627, title: '30x40 cm / Bordure blanche / Sans cadre', price: 6250, compareAtPrice: null, available: true },
  options: [
    { position: 1, kind: 'size', value: '30x40 cm', key: null },
    { position: 2, kind: 'border', value: 'Bordure blanche', key: 'bordure-blanche' },
    { position: 3, kind: 'frame', value: 'Sans cadre', key: 'sans-cadre' },
  ],
  frameColor: null,
  whiteBorder: null,
};
const POSTER = { id: 7001, handle: 'poster-le-petit-prince', kind: 'poster', template: 'poster' };
const POSTER_SELECTION = {
  changed: 'frame',
  variant: { id: 202, title: '30x40 cm / Avec cadre', price: 4790, compareAtPrice: null, available: true },
  options: [
    { position: 1, kind: 'size', value: '30x40 cm', key: null },
    { position: 2, kind: 'frame', value: 'Avec cadre', key: null },
  ],
  frameColor: { name: 'Chêne clair', key: 'cadre-chene-clair' },
  whiteBorder: false,
};

test('fiche toile : le produit, la variante, le prix hors centimes et les options, par leur clé stable', () => {
  assert.deepEqual(productProperties(TOILE, TOILE_SELECTION), {
    product_id: 9667258319195,
    product_handle: 'toile-le-petit-prince',
    product_kind: 'toile',
    product_template: 'painting',
    variant_id: 49806793441627,
    price: 62.5,
    size: '30x40 cm',
    border: 'bordure-blanche',
    frame: 'sans-cadre',
    white_border: null,
  });
});

test('fiche poster : la couleur du cadre tient lieu de cadre, et le contour blanc est transmis', () => {
  const properties = productProperties(POSTER, POSTER_SELECTION);
  assert.equal(properties.frame, 'cadre-chene-clair');
  assert.equal(properties.border, null);
  assert.equal(properties.white_border, false);
  assert.equal(properties.price, 47.9);
});

test('fiche sans sélecteur (tapisserie, gourde) : seul le produit est décrit', () => {
  const tapisserie = { id: 12, handle: 'tapisserie', kind: '', template: 'tapestry' };
  assert.deepEqual(productProperties(tapisserie, null), {
    product_id: 12,
    product_handle: 'tapisserie',
    product_kind: null,
    product_template: 'tapestry',
  });
});

test('combinaison absente du catalogue : la variante et le prix sont nuls, les options restent', () => {
  const properties = productProperties(TOILE, { ...TOILE_SELECTION, variant: null });
  assert.equal(properties.variant_id, null);
  assert.equal(properties.price, null);
  assert.equal(properties.size, '30x40 cm');
});

test('choix d’option : dit quelle option a changé et sa nouvelle valeur', () => {
  const fiche = productProperties(POSTER, POSTER_SELECTION);
  assert.deepEqual(optionProperties(fiche, 'frame'), { ...fiche, option: 'frame', option_value: 'cadre-chene-clair' });
  assert.equal(optionProperties(fiche, 'size').option_value, '30x40 cm');
  assert.equal(optionProperties(fiche, 'whiteBorder').option_value, 'false');
});

// Réponse de /cart/add.js : `items`, prix en centimes.
const CART_ITEM = {
  id: 49806793441627,
  product_id: 9667258319195,
  variant_id: 49806793441627,
  handle: 'toile-le-petit-prince',
  quantity: 1,
  final_line_price: 6250,
  properties: { Prénoms: 'Léa et Tom', _preview: 'https://exemple.test/apercu.jpg' },
};

test('ajout au panier depuis la fiche : garde la fiche, ajoute la source, la quantité et le montant', () => {
  const fiche = productProperties(TOILE, TOILE_SELECTION);
  assert.deepEqual(cartProperties({ source: 'float', items: [CART_ITEM] }, fiche), {
    ...fiche,
    source: 'float',
    quantity: 1,
    value: 62.5,
  });
});

test('ajout au panier : la variante ajoutée prime sur celle que montrait la fiche', () => {
  const fiche = productProperties(TOILE, TOILE_SELECTION);
  const item = { ...CART_ITEM, id: 555, variant_id: 555, final_line_price: 9900 };
  const properties = cartProperties({ source: 'main', items: [item] }, fiche);
  assert.equal(properties.variant_id, 555);
  assert.equal(properties.value, 99);
});

test('lot ajouté depuis le tiroir : décrit le 1er produit et cumule quantités et montants, hors fiche', () => {
  const items = [
    { ...CART_ITEM, product_id: 1, variant_id: 11, handle: 'lot-a', quantity: 2, final_line_price: 10000 },
    { ...CART_ITEM, product_id: 2, variant_id: 22, handle: 'lot-b', quantity: 2, final_line_price: 8000 },
  ];
  const fiche = productProperties(TOILE, TOILE_SELECTION);
  assert.deepEqual(cartProperties({ source: 'bundle', items }, fiche), {
    product_id: 1,
    product_handle: 'lot-a',
    variant_id: 11,
    source: 'bundle',
    quantity: 4,
    value: 180,
  });
});

test('ajout au panier : le texte libre de la ligne (prénoms, aperçu) ne part jamais', () => {
  const properties = cartProperties({ source: 'studio', items: [CART_ITEM] }, null);
  assert.doesNotMatch(JSON.stringify(properties), /Léa|apercu/);
});

// ---- Le suivi, à la frontière du navigateur ----

// Cible d'événements minimale : elle compte ses écouteurs, et ses événements portent isTrusted,
// qu'un vrai Event ne laisse pas poser.
function eventTarget() {
  const listeners = {};
  return {
    addEventListener(type, listener, options) {
      (listeners[type] = listeners[type] || []).push({ listener, once: !!(options && options.once) });
    },
    removeEventListener(type, listener) {
      listeners[type] = (listeners[type] || []).filter((entry) => entry.listener !== listener);
    },
    emit(type, event = {}) {
      (listeners[type] || []).slice().forEach((entry) => {
        if (entry.once) this.removeEventListener(type, entry.listener);
        entry.listener({ type, ...event });
      });
    },
    listenerCount(type) {
      return (listeners[type] || []).length;
    },
  };
}

const settled = () => new Promise((resolve) => setImmediate(resolve));

// Le sessionStorage d'un onglet : le passer à deux fausses pages, c'est rester dans le même onglet.
function fakeTab() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    get length() {
      return items.size;
    },
  };
}

function fakeBrowser({
  consent = true,
  product = TOILE,
  selection = TOILE_SELECTION,
  role = 'main',
  replayRate = 1,
  url = `${SITE}/products/toile-le-petit-prince`,
  referrer = 'https://www.google.com/',
  tab = fakeTab(),
} = {}) {
  const win = eventTarget();
  const doc = eventTarget();
  const scripts = [];
  const idleCallbacks = [];
  const posthog = {
    inits: [],
    captured: [],
    recordingsStarted: 0,
    recordingsStopped: 0,
    optedOut: false,
    init(token, options) {
      this.inits.push({ token, options });
      return this;
    },
    capture(name, properties, options) {
      this.captured.push(options ? { name, properties, options } : { name, properties });
    },
    get_session_id: () => '019a4f3e-7c21-7d10-9f4e-3b8e1c2a6d55',
    startSessionRecording() {
      this.recordingsStarted += 1;
    },
    stopSessionRecording() {
      this.recordingsStopped += 1;
    },
    opt_out_capturing() {
      this.optedOut = true;
    },
    opt_in_capturing() {
      this.optedOut = false;
    },
    has_opted_out_capturing() {
      return this.optedOut;
    },
  };
  const browser = {
    win,
    doc,
    scripts,
    posthog,
    consent,
    product,
    selection,
    // Ce que fait le vrai navigateur, dans l'ordre où le test le décide.
    contentLoaded() {
      doc.emit('DOMContentLoaded');
    },
    // La bascule toile/poster, dans l'ordre du vrai module : l'adresse d'abord, l'annonce ensuite.
    softNavigate(path) {
      win.location = new URL(path, SITE);
      doc.emit('mma:soft-navigation', { detail: { url: path } });
    },
    leave() {
      win.emit('pagehide');
    },
    async gesture(type = 'pointerdown') {
      win.emit(type, { isTrusted: true });
      await settled();
    },
    async pageLoaded() {
      doc.readyState = 'complete';
      win.emit('load');
      await settled();
    },
    async idle() {
      idleCallbacks.splice(0).forEach((callback) => callback());
      await settled();
    },
    libraryLoaded() {
      win.posthog = posthog;
      scripts[0].onload();
    },
    captured(name) {
      return posthog.captured.filter((event) => event.name === name);
    },
  };
  win.Shopify = {
    theme: { role },
    currency: { active: 'EUR' },
    customerPrivacy: { analyticsProcessingAllowed: () => browser.consent },
  };
  win.requestIdleCallback = (callback) => idleCallbacks.push(callback);
  win.MMASelection = { read: () => browser.selection };
  win.location = new URL(url);
  win.sessionStorage = tab;
  doc.referrer = referrer;
  doc.readyState = 'interactive';
  doc.head = { appendChild: (element) => scripts.push(element) };
  doc.createElement = () => ({});
  doc.getElementById = (id) =>
    id === 'product-tracking-json' && browser.product ? { textContent: JSON.stringify(browser.product) } : null;
  startTracking({ win, doc, config: { token: 'phc_test', apiHost: 'https://eu.i.posthog.com', replayRate } });
  return browser;
}

// La page est lue : la fiche est là, tout reste à venir.
function displayedPage(options) {
  const browser = fakeBrowser(options);
  browser.contentLoaded();
  return browser;
}

// Le visiteur bouge, la page finit de charger, le navigateur souffle.
async function gatesOpen(browser) {
  await browser.gesture();
  await browser.pageLoaded();
  await browser.idle();
  return browser;
}

const visit = (options) => gatesOpen(displayedPage(options));

test('robot : sans aucun geste, PostHog ne se charge jamais', async () => {
  const browser = displayedPage();
  await browser.pageLoaded();
  await browser.idle();
  assert.equal(browser.scripts.length, 0);
});

test('robot : un geste simulé par un script ne compte pas', async () => {
  const browser = displayedPage();
  browser.win.emit('pointerdown', { isTrusted: false });
  await browser.pageLoaded();
  await browser.idle();
  assert.equal(browser.scripts.length, 0);
});

test('visiteur : un vrai geste, la page chargée, le navigateur au repos : PostHog se charge depuis l’Europe', async () => {
  const browser = await visit();
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.scripts[0].src, 'https://eu-assets.i.posthog.com/static/array.js');
  assert.equal(browser.scripts[0].async, true);
});

for (const gesture of ['pointerdown', 'pointermove', 'touchstart', 'wheel', 'keydown']) {
  test(`visiteur : ${gesture} suffit à prouver un humain`, async () => {
    const browser = displayedPage();
    await browser.gesture(gesture);
    await browser.pageLoaded();
    await browser.idle();
    assert.equal(browser.scripts.length, 1);
  });
}

test('chargement : rien avant la fin du chargement de la page', async () => {
  const browser = displayedPage();
  await browser.gesture();
  await browser.idle();
  assert.equal(browser.scripts.length, 0);
});

test('chargement : rien tant que le navigateur n’est pas au repos', async () => {
  const browser = displayedPage();
  await browser.gesture();
  await browser.pageLoaded();
  assert.equal(browser.scripts.length, 0);
  await browser.idle();
  assert.equal(browser.scripts.length, 1);
});

test('chargement : sans requestIdleCallback (Safari), un délai court tient lieu de repos', async () => {
  const browser = displayedPage();
  const timers = [];
  browser.win.requestIdleCallback = undefined;
  browser.win.setTimeout = (callback) => timers.push(callback);
  await browser.gesture();
  await browser.pageLoaded();
  assert.equal(browser.scripts.length, 0);
  timers.forEach((callback) => callback());
  await settled();
  assert.equal(browser.scripts.length, 1);
});

test('chargement : les gestes suivants ne rechargent rien et les écouteurs de geste sont retirés', async () => {
  const browser = await visit();
  await browser.gesture();
  await browser.gesture('keydown');
  await browser.idle();
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.win.listenerCount('pointermove'), 0);
  assert.equal(browser.win.listenerCount('pointerdown'), 0);
});

test('démarrage : le jeton du projet, et rien d’automatique (ni clics, ni page vue, ni enregistrement) sauf la sortie de page', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  assert.equal(browser.posthog.inits.length, 1);
  const { token, options } = browser.posthog.inits[0];
  assert.equal(token, 'phc_test');
  assert.equal(options.api_host, 'https://eu.i.posthog.com');
  assert.equal(options.autocapture, false);
  assert.equal(options.capture_pageview, false);
  assert.equal(options.capture_pageleave, true);
  assert.equal(options.disable_session_recording, true);
  assert.equal(options.person_profiles, 'identified_only');
  assert.equal(options.session_recording.maskAllInputs, true);
});

// ---- Consentement ----

test('consentement : refusé, PostHog ne se charge pas', async () => {
  const browser = await visit({ consent: false });
  assert.equal(browser.scripts.length, 0);
});

test('consentement : accordé après coup (bannière), PostHog se charge alors', async () => {
  const browser = await visit({ consent: false });
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.scripts.length, 1);
});

test('consentement : la bannière le redonne à chaque page, PostHog ne se charge qu’une fois', async () => {
  const browser = await visit();
  browser.doc.emit('visitorConsentCollected');
  browser.doc.emit('visitorConsentCollected');
  browser.libraryLoaded();
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.posthog.inits.length, 1);
});

test('consentement : l’API n’est pas encore là, elle est demandée à Shopify avant de décider', async () => {
  const browser = displayedPage();
  const privacy = browser.win.Shopify.customerPrivacy;
  const asked = [];
  browser.win.Shopify.customerPrivacy = undefined;
  browser.win.Shopify.loadFeatures = (features, callback) => {
    asked.push(...features);
    browser.win.Shopify.customerPrivacy = privacy;
    callback();
  };
  await gatesOpen(browser);
  assert.deepEqual(asked, [{ name: 'consent-tracking-api', version: '0.1' }]);
  assert.equal(browser.scripts.length, 1);
});

test('consentement : l’API ne se charge pas, PostHog ne démarre pas', async () => {
  const browser = displayedPage();
  browser.win.Shopify.customerPrivacy = undefined;
  browser.win.Shopify.loadFeatures = (features, callback) => callback(new Error('indisponible'));
  await gatesOpen(browser);
  assert.equal(browser.scripts.length, 0);
});

test('consentement : retiré après le démarrage, PostHog cesse de capter', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.posthog.optedOut, true);
});

test('consentement : retiré puis redonné sur la même page, PostHog reprend sans recharger', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.posthog.optedOut, false);
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.posthog.inits.length, 1);
});

test('consentement : retiré sur une page précédente puis redonné, PostHog reprend au démarrage', async () => {
  const browser = await visit();
  browser.posthog.optedOut = true; // PostHog garde ce choix d'une page à l'autre
  browser.libraryLoaded();
  assert.equal(browser.posthog.optedOut, false);
});

test('consentement : retiré pendant le chargement de la bibliothèque, PostHog ne démarre pas', async () => {
  const browser = await visit();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  browser.libraryLoaded();
  assert.equal(browser.posthog.inits.length, 0);
});

test('consentement : retiré pendant le chargement puis redonné, le prochain événement démarre PostHog', async () => {
  const browser = await visit();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  browser.libraryLoaded();
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  browser.doc.emit('mma:soft-navigation', { detail: { url: '/products/x' } });
  assert.equal(browser.scripts.length, 1);
  assert.equal(browser.posthog.inits.length, 1);
  assert.equal(browser.captured('product_viewed').length, 1); // celle d'avant le retrait est oubliée
});

test('aperçu d’un thème non publié : aucun chargement', async () => {
  const browser = await visit({ role: 'unpublished' });
  assert.equal(browser.scripts.length, 0);
});

// ---- Les événements ----

const floatButtonClick = () => {
  const target = { closest: (selector) => (selector === '.float-buy-button' ? target : null) };
  return { target };
};
const otherClick = () => ({ target: { closest: () => null } });

test('vue de fiche : part une fois PostHog prêt, avec la fiche et sa variante', async () => {
  const browser = await visit();
  assert.equal(browser.captured('product_viewed').length, 0);
  browser.libraryLoaded();
  assert.deepEqual(browser.captured('product_viewed'), [
    { name: 'product_viewed', properties: { ...productProperties(TOILE, TOILE_SELECTION), currency: 'EUR' } },
  ]);
});

test('devise : tous les événements portent celle du marché du visiteur', async () => {
  const browser = fakeBrowser();
  browser.win.Shopify.currency.active = 'CHF';
  browser.contentLoaded();
  await gatesOpen(browser);
  browser.libraryLoaded();
  browser.doc.emit('mma:selection-change', { detail: { ...TOILE_SELECTION, changed: 'size' } });
  browser.doc.emit('click', floatButtonClick());
  browser.doc.emit('mma:cart-add', { detail: { source: 'float', items: [CART_ITEM] } });
  assert.deepEqual(
    browser.posthog.captured.map((event) => event.properties.currency),
    ['CHF', 'CHF', 'CHF', 'CHF', 'CHF'],
  );
});

for (const path of ['/', '/collections/tableau-salon', '/blogs/tableau-salon/decoration-berbere', '/cart', '/search?q=bonsai']) {
  test(`page vue : ${path} est comptée pour un humain, sans événement de fiche`, async () => {
    const browser = await visit({ product: null, url: `${SITE}${path}` });
    assert.equal(browser.scripts.length, 1);
    browser.libraryLoaded();
    assert.deepEqual(
      browser.posthog.captured.map((event) => event.name),
      ['$pageview'],
    );
    assert.equal(browser.captured('$pageview')[0].properties.$current_url, `${SITE}${path}`);
  });
}

test('page vue : sur une fiche, elle part avant la vue de fiche', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  assert.deepEqual(
    browser.posthog.captured.map((event) => event.name),
    ['$pageview', 'product_viewed'],
  );
});

test('page vue : elle porte la source de l’arrivée, et une date laissée à PostHog', async () => {
  const browser = await visit({
    product: null,
    url: `${SITE}/collections/tableau-zen?utm_source=pinterest`,
    referrer: 'https://www.pinterest.fr/',
  });
  browser.libraryLoaded();
  const [view] = browser.captured('$pageview');
  assert.equal(view.properties.utm_source, 'pinterest');
  assert.equal(view.properties.$referring_domain, 'www.pinterest.fr');
  assert.equal(view.properties.currency, 'EUR');
  assert.equal(view.options, undefined);
});

test('page vue : un clic interne laisse à PostHog le site d’origine de la visite', async () => {
  const browser = await visit({ product: null, referrer: `${SITE}/collections/tableau-zen` });
  browser.libraryLoaded();
  assert.equal('$referrer' in browser.captured('$pageview')[0].properties, false);
});

test('page vue : sans geste, rien ne part ; après un refus non plus', async () => {
  const silent = displayedPage();
  await silent.pageLoaded();
  await silent.idle();
  assert.equal(silent.posthog.captured.length, 0);
  const refused = await visit({ consent: false });
  assert.equal(refused.posthog.captured.length, 0);
});

test('vue de fiche : sans le sélecteur des œuvres, la fiche est quand même comptée', async () => {
  const browser = fakeBrowser();
  browser.win.MMASelection = undefined;
  browser.contentLoaded();
  await gatesOpen(browser);
  browser.libraryLoaded();
  assert.deepEqual(browser.captured('product_viewed')[0].properties, { ...productProperties(TOILE, null), currency: 'EUR' });
});

test('bascule toile/poster : une seule page vue de plus à chaque bascule, à la nouvelle adresse', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.softNavigate('/products/poster-le-petit-prince');
  browser.softNavigate('/products/toile-le-petit-prince');
  assert.deepEqual(
    browser.captured('$pageview').map((event) => event.properties.$pathname),
    ['/products/toile-le-petit-prince', '/products/poster-le-petit-prince', '/products/toile-le-petit-prince'],
  );
});

test('bascule avant que PostHog soit prêt : chaque page vue garde son adresse, sans doublon', async () => {
  const browser = await visit();
  browser.softNavigate('/products/poster-le-petit-prince');
  browser.libraryLoaded();
  assert.deepEqual(
    browser.captured('$pageview').map((event) => event.properties.$pathname),
    ['/products/toile-le-petit-prince', '/products/poster-le-petit-prince'],
  );
});

test('bascule avant que PostHog soit prêt : la campagne de l’arrivée n’est pas perdue avec l’adresse', async () => {
  const browser = await visit({ url: `${SITE}/products/toile-le-petit-prince?utm_source=newsletter` });
  browser.softNavigate('/products/poster-le-petit-prince');
  browser.libraryLoaded();
  assert.equal(browser.captured('$pageview')[0].properties.utm_source, 'newsletter');
});

test('bascule toile/poster : une vue de plus à chaque bascule, sur la fiche affichée', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.product = POSTER;
  browser.selection = POSTER_SELECTION;
  browser.doc.emit('mma:soft-navigation', { detail: { url: '/products/poster-le-petit-prince' } });
  browser.product = TOILE;
  browser.selection = TOILE_SELECTION;
  browser.doc.emit('mma:soft-navigation', { detail: { url: '/products/toile-le-petit-prince' } });
  assert.deepEqual(
    browser.captured('product_viewed').map((event) => event.properties.product_kind),
    ['toile', 'poster', 'toile'],
  );
});

test('bascule avant que PostHog soit prêt : chaque vue garde sa fiche, et l’ordre est respecté', async () => {
  const browser = await visit();
  browser.product = POSTER;
  browser.selection = POSTER_SELECTION;
  browser.doc.emit('mma:soft-navigation', { detail: { url: '/products/poster-le-petit-prince' } });
  browser.libraryLoaded();
  assert.deepEqual(
    browser.captured('product_viewed').map((event) => event.properties.product_handle),
    ['toile-le-petit-prince', 'poster-le-petit-prince'],
  );
});

test('bascule : les écouteurs ne se multiplient pas, un choix ne compte qu’une fois', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  for (let i = 0; i < 5; i += 1) browser.doc.emit('mma:soft-navigation', { detail: { url: '/products/x' } });
  assert.equal(browser.doc.listenerCount('mma:selection-change'), 1);
  assert.equal(browser.doc.listenerCount('mma:soft-navigation'), 1);
  assert.equal(browser.doc.listenerCount('mma:cart-add'), 1);
  assert.equal(browser.doc.listenerCount('click'), 1);
  browser.doc.emit('mma:selection-change', { detail: { ...TOILE_SELECTION, changed: 'size' } });
  assert.equal(browser.captured('product_option_selected').length, 1);
});

test('choix d’option : le geste du visiteur part avec l’option et sa valeur', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  const selection = { ...TOILE_SELECTION, changed: 'border' };
  browser.doc.emit('mma:selection-change', { detail: selection });
  const [event] = browser.captured('product_option_selected');
  assert.equal(event.properties.option, 'border');
  assert.equal(event.properties.option_value, 'bordure-blanche');
  assert.equal(event.properties.product_id, TOILE.id);
});

test('choix d’option : une bascule automatique de la fiche (changed: null) n’est pas un choix', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.doc.emit('mma:selection-change', { detail: { ...TOILE_SELECTION, changed: null } });
  assert.equal(browser.captured('product_option_selected').length, 0);
});

test('bouton flottant : le clic part, y compris sur ce qu’il contient ; un autre clic non', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.doc.emit('click', otherClick());
  browser.doc.emit('click', floatButtonClick());
  assert.deepEqual(browser.captured('floating_buy_button_clicked'), [
    { name: 'floating_buy_button_clicked', properties: { ...productProperties(TOILE, TOILE_SELECTION), currency: 'EUR' } },
  ]);
});

test('ajout au panier : part avec sa source, sa quantité et son montant', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.doc.emit('mma:cart-add', { detail: { source: 'main', items: [CART_ITEM] } });
  const [event] = browser.captured('product_added_to_cart');
  assert.equal(event.properties.source, 'main');
  assert.equal(event.properties.quantity, 1);
  assert.equal(event.properties.value, 62.5);
  assert.equal(event.properties.product_id, TOILE.id);
});

test('ajout au panier hors d’une fiche (page panier) : PostHog n’est chargé qu’une fois', async () => {
  const browser = await visit({ product: null });
  browser.doc.emit('mma:cart-add', { detail: { source: 'bundle', items: [CART_ITEM] } });
  browser.doc.emit('mma:cart-add', { detail: { source: 'bundle', items: [CART_ITEM] } });
  assert.equal(browser.scripts.length, 1);
  browser.libraryLoaded();
  assert.equal(browser.captured('product_added_to_cart').length, 2);
  assert.equal(browser.captured('product_added_to_cart')[0].properties.product_id, CART_ITEM.product_id);
});

test('ajout au panier avant l’ouverture des portes : il attend, puis charge PostHog', async () => {
  const browser = fakeBrowser({ product: null });
  browser.doc.emit('mma:cart-add', { detail: { source: 'bundle', items: [CART_ITEM] } });
  assert.equal(browser.scripts.length, 0);
  await gatesOpen(browser);
  assert.equal(browser.scripts.length, 1);
});

test('consentement refusé : un ajout au panier ne charge rien non plus', async () => {
  const browser = await visit({ product: null, consent: false });
  browser.doc.emit('mma:cart-add', { detail: { source: 'bundle', items: [CART_ITEM] } });
  assert.equal(browser.scripts.length, 0);
});

test('avant le démarrage : les événements attendent dans l’ordre, puis partent', async () => {
  const browser = await visit();
  browser.doc.emit('mma:selection-change', { detail: { ...TOILE_SELECTION, changed: 'size' } });
  browser.doc.emit('mma:cart-add', { detail: { source: 'main', items: [CART_ITEM] } });
  browser.libraryLoaded();
  assert.deepEqual(
    browser.posthog.captured.map((event) => event.name),
    ['$pageview', 'product_viewed', 'product_option_selected', 'product_added_to_cart'],
  );
});

test('consentement accordé après coup : la vue en attente part à ce moment-là', async () => {
  const browser = await visit({ consent: false });
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  browser.libraryLoaded();
  assert.equal(browser.captured('$pageview').length, 1);
  assert.equal(browser.captured('product_viewed').length, 1);
});

test('consentement retiré avant le démarrage : ce qui attendait est oublié', async () => {
  const browser = await visit();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  browser.libraryLoaded();
  assert.equal(browser.posthog.inits.length, 1);
  assert.equal(browser.posthog.captured.length, 0);
});

test('consentement retiré : plus rien ne part ensuite', async () => {
  const browser = await visit();
  browser.libraryLoaded();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  browser.doc.emit('click', floatButtonClick());
  browser.doc.emit('mma:cart-add', { detail: { source: 'main', items: [CART_ITEM] } });
  assert.equal(browser.posthog.captured.length, 2); // la page et la fiche d'avant le retrait, rien d'autre
});

// ---- Les vues reportées : le visiteur quitte la page avant le démarrage de PostHog ----

const GOOGLE = 'https://www.google.com/';
const ARRIVEE = `${SITE}/collections/tableau-zen`;

// La page d'arrivée, venue de Google : un vrai geste, puis un clic vers la suite avant le démarrage.
async function leftBeforeStart(tab, options) {
  const browser = fakeBrowser({ product: null, url: ARRIVEE, referrer: GOOGLE, tab, ...options });
  browser.contentLoaded();
  await browser.gesture();
  browser.leave();
  return browser;
}

// La page suivante du même onglet, arrivée par un clic interne, jusqu'au démarrage de PostHog.
async function nextPageStarted(tab, options) {
  const browser = await visit({ referrer: ARRIVEE, tab, ...options });
  browser.libraryLoaded();
  return browser;
}

test('vue reportée : la page d’arrivée part en tête à la page suivante, avec Google pour origine', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab);
  const next = await nextPageStarted(tab);
  assert.deepEqual(
    next.captured('$pageview').map((event) => event.properties.$pathname),
    ['/collections/tableau-zen', '/products/toile-le-petit-prince'],
  );
  const [arrival, following] = next.captured('$pageview');
  assert.equal(arrival.properties.$referring_domain, 'www.google.com');
  assert.equal(arrival.properties.$current_url, ARRIVEE);
  assert.equal('$referring_domain' in following.properties, false);
});

test('vue reportée : la campagne de la page d’arrivée la suit', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab, { url: `${ARRIVEE}?utm_source=newsletter&utm_campaign=noel`, referrer: '' });
  const next = await nextPageStarted(tab);
  const [arrival] = next.captured('$pageview');
  assert.equal(arrival.properties.utm_source, 'newsletter');
  assert.equal(arrival.properties.utm_campaign, 'noel');
  assert.equal(arrival.properties.$referring_domain, '$direct');
});

test('vue reportée : datée du départ, elle reste avant la page suivante', async () => {
  const tab = fakeTab();
  const before = Date.now();
  await leftBeforeStart(tab);
  const after = Date.now();
  const next = await nextPageStarted(tab);
  const { timestamp } = next.captured('$pageview')[0].options;
  assert.ok(timestamp instanceof Date);
  assert.ok(timestamp.getTime() >= before && timestamp.getTime() <= after);
  assert.equal(next.captured('$pageview')[1].options, undefined);
});

test('vue reportée : elle attend un vrai geste sur la page suivante', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab);
  const next = displayedPage({ referrer: ARRIVEE, tab });
  await next.pageLoaded();
  await next.idle();
  assert.equal(next.scripts.length, 0);
  assert.equal(next.posthog.captured.length, 0);
  assert.equal(tab.length, 1);
});

test('vue reportée : elle ne part qu’une fois', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab);
  await nextPageStarted(tab);
  assert.equal(tab.length, 0);
  const third = await nextPageStarted(tab);
  assert.equal(third.captured('$pageview').length, 1);
});

test('vue reportée : deux pages quittées trop vite partent dans l’ordre', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab);
  await leftBeforeStart(tab, { url: `${SITE}/collections/tableau-salon`, referrer: ARRIVEE });
  const next = await nextPageStarted(tab);
  assert.deepEqual(
    next.captured('$pageview').map((event) => event.properties.$pathname),
    ['/collections/tableau-zen', '/collections/tableau-salon', '/products/toile-le-petit-prince'],
  );
});

test('vue reportée : une bascule avant le départ est reportée aussi, à sa propre adresse', async () => {
  const tab = fakeTab();
  const browser = displayedPage({ url: `${SITE}/products/toile-le-petit-prince`, tab });
  await browser.gesture();
  browser.softNavigate('/products/poster-le-petit-prince');
  browser.leave();
  const next = await nextPageStarted(tab, { product: null, url: ARRIVEE });
  assert.deepEqual(
    next.captured('$pageview').map((event) => event.properties.$pathname),
    ['/products/toile-le-petit-prince', '/products/poster-le-petit-prince', '/collections/tableau-zen'],
  );
});

test('vue reportée : seules les pages vues le sont, pas les événements de la fiche', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab, { product: TOILE, selection: TOILE_SELECTION });
  const next = await nextPageStarted(tab, { product: null });
  assert.deepEqual(
    next.posthog.captured.map((event) => event.name),
    ['$pageview', '$pageview'],
  );
});

test('vue reportée : sans vrai geste, rien n’est écrit', async () => {
  const tab = fakeTab();
  const browser = displayedPage({ tab });
  browser.win.emit('pointerdown', { isTrusted: false });
  await settled();
  browser.leave();
  assert.equal(tab.length, 0);
});

test('vue reportée : sans consentement, rien n’est écrit', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab, { consent: false });
  assert.equal(tab.length, 0);
});

test('vue reportée : l’API de consentement pas encore là, rien n’est écrit', async () => {
  const tab = fakeTab();
  const browser = displayedPage({ tab });
  browser.win.Shopify.customerPrivacy = undefined;
  await browser.gesture();
  browser.leave();
  assert.equal(tab.length, 0);
});

test('vue reportée : PostHog démarré, il envoie lui-même et rien n’est écrit', async () => {
  const tab = fakeTab();
  const browser = await visit({ tab });
  browser.libraryLoaded();
  browser.leave();
  assert.equal(tab.length, 0);
});

test('vue reportée : thème non publié, rien n’est écrit', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab, { role: 'unpublished' });
  assert.equal(tab.length, 0);
});

test('vue reportée : consentement retiré sur la page suivante, elle est oubliée', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab);
  const next = await visit({ referrer: ARRIVEE, tab });
  next.consent = false;
  next.doc.emit('visitorConsentCollected');
  assert.equal(tab.length, 0);
});

test('vue reportée : consentement déjà refusé à la page suivante, elle est oubliée', async () => {
  const tab = fakeTab();
  await leftBeforeStart(tab);
  const next = await visit({ referrer: ARRIVEE, tab, consent: false });
  assert.equal(next.scripts.length, 0);
  assert.equal(tab.length, 0);
});

test('vue reportée : retour par le cache du navigateur, la page n’envoie pas sa vue une 2e fois', async () => {
  const tab = fakeTab();
  const browser = displayedPage({ tab });
  await browser.gesture();
  await browser.pageLoaded();
  await browser.idle();
  browser.leave();
  assert.equal(tab.length, 1);
  browser.libraryLoaded(); // la page revient, et la bibliothèque arrive enfin
  assert.equal(browser.captured('$pageview').length, 1);
  assert.equal(tab.length, 0);
});

test('vue reportée : stockage refusé (mode privé), la page n’en souffre pas', async () => {
  const tab = fakeTab();
  tab.setItem = () => {
    throw new Error('refusé');
  };
  await leftBeforeStart(tab);
  const next = await nextPageStarted(tab);
  assert.equal(next.captured('$pageview').length, 1);
});

test('vue reportée : stockage illisible, la page compte quand même sa vue', async () => {
  const tab = fakeTab();
  tab.setItem('mma_ph_views', '{pas du JSON');
  const next = await nextPageStarted(tab);
  assert.equal(next.captured('$pageview').length, 1);
  assert.equal(tab.length, 0);
});

// ---- Les enregistrements de visites ----

test('enregistrement : démarre sur une fiche toile, pour une session tirée au sort', async () => {
  const browser = await visit({ replayRate: 1 });
  browser.libraryLoaded();
  assert.equal(browser.posthog.recordingsStarted, 1);
});

test('enregistrement : démarre aussi sur une fiche poster', async () => {
  const browser = await visit({ product: POSTER, selection: POSTER_SELECTION, replayRate: 1 });
  browser.libraryLoaded();
  assert.equal(browser.posthog.recordingsStarted, 1);
});

test('enregistrement : une session hors du tirage ne charge pas l’enregistreur', async () => {
  const browser = await visit({ replayRate: 0 });
  browser.libraryLoaded();
  assert.equal(browser.posthog.recordingsStarted, 0);
});

test('enregistrement : jamais sur une fiche personnalisée (photos et prénoms des clients)', async () => {
  const personnalise = { id: 90, handle: 'poster-famille', kind: '', template: 'personalized-family' };
  const browser = await visit({ product: personnalise, selection: null, replayRate: 1 });
  browser.libraryLoaded();
  assert.equal(browser.posthog.recordingsStarted, 0);
});

test('enregistrement : jamais hors d’une fiche, où PostHog tourne pourtant', async () => {
  const browser = await visit({ product: null, replayRate: 1 });
  browser.doc.emit('mma:cart-add', { detail: { source: 'bundle', items: [CART_ITEM] } });
  browser.libraryLoaded();
  assert.equal(browser.posthog.recordingsStarted, 0);
});

test('enregistrement : le consentement retiré l’arrête ; redonné, il reprend', async () => {
  const browser = await visit({ replayRate: 1 });
  browser.libraryLoaded();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.posthog.recordingsStopped, 1);
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.posthog.recordingsStarted, 2);
});

test('enregistrement : le consentement redonné ne relance rien pour une session hors du tirage', async () => {
  const browser = await visit({ replayRate: 0 });
  browser.libraryLoaded();
  browser.consent = false;
  browser.doc.emit('visitorConsentCollected');
  browser.consent = true;
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.posthog.recordingsStarted, 0);
});

test('enregistrement : la bannière qui redonne le consentement à chaque page ne le relance pas', async () => {
  const browser = await visit({ replayRate: 1 });
  browser.libraryLoaded();
  browser.doc.emit('visitorConsentCollected');
  browser.doc.emit('visitorConsentCollected');
  assert.equal(browser.posthog.recordingsStarted, 1);
});
