// Tests du calcul pur de assets/product-selection.js (événement « mma:selection-change »).
// Lancer : node --test scripts/product-selection.test.cjs  (lanceur intégré de Node, sans dépendance)
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSelection, withVariantParam } = require('../assets/product-selection.js');

// Extrait de `product.variants | json` (snippets/painting-variant-picker.liquid), prix en centimes.
const TOILE_VARIANTS = [
  { id: 101, title: '40x50 cm / Bordure blanche / Sans cadre', option1: '40x50 cm', option2: 'Bordure blanche', option3: 'Sans cadre', price: 5990, compare_at_price: null, available: true },
  { id: 102, title: '40x50 cm / Bordure noire / Cadre noyer', option1: '40x50 cm', option2: 'Bordure noire', option3: 'Cadre noyer', price: 11990, compare_at_price: 14990, available: true },
];

test('toile : la taille, la bordure et le cadre cochés donnent la variante et les options, dans l’ordre Shopify', () => {
  const selection = buildSelection({
    variants: TOILE_VARIANTS,
    choices: [
      { position: 1, kind: 'size', value: '40x50 cm', key: null },
      { position: 2, kind: 'border', value: 'Bordure noire', key: 'bordure-noire' },
      { position: 3, kind: 'frame', value: 'Cadre noyer', key: 'cadre-noyer' },
    ],
    whiteBorder: null,
    changed: 'frame',
  });

  assert.deepEqual(selection, {
    changed: 'frame',
    variant: { id: 102, title: '40x50 cm / Bordure noire / Cadre noyer', price: 11990, compareAtPrice: 14990, available: true },
    options: [
      { position: 1, kind: 'size', value: '40x50 cm', key: null },
      { position: 2, kind: 'border', value: 'Bordure noire', key: 'bordure-noire' },
      { position: 3, kind: 'frame', value: 'Cadre noyer', key: 'cadre-noyer' },
    ],
    frameColor: null,
    whiteBorder: null,
  });
});

// Poster : « Cadres » = Sans cadre / Avec cadre (variantes, prix) ; la couleur du cadre est une
// propriété de ligne portée par la pastille cochée (data-frame-mode / data-color-*).
const POSTER_VARIANTS = [
  { id: 201, title: '30x40 cm / Sans cadre', option1: '30x40 cm', option2: 'Sans cadre', option3: null, price: 2490, compare_at_price: null, available: true },
  { id: 202, title: '30x40 cm / Avec cadre', option1: '30x40 cm', option2: 'Avec cadre', option3: null, price: 4790, compare_at_price: null, available: true },
];

test('poster : une pastille de couleur donne la variante « Avec cadre » et la couleur du cadre', () => {
  const selection = buildSelection({
    variants: POSTER_VARIANTS,
    choices: [
      { position: 1, kind: 'size', value: '30x40 cm', key: null },
      { position: 2, kind: 'frame', value: 'Avec cadre', key: null, frameMode: 'framed', colorName: 'Chêne clair', colorHandle: 'cadre-chene-clair' },
    ],
    whiteBorder: null,
    changed: 'frame',
  });

  assert.equal(selection.variant.id, 202);
  assert.deepEqual(selection.frameColor, { name: 'Chêne clair', key: 'cadre-chene-clair' });
  assert.deepEqual(selection.options[1], { position: 2, kind: 'frame', value: 'Avec cadre', key: null });
});

test('poster : « Sans contour blanc » est transmis à false, sans couleur de cadre pour « Sans cadre »', () => {
  const selection = buildSelection({
    variants: POSTER_VARIANTS,
    choices: [
      { position: 1, kind: 'size', value: '30x40 cm', key: null },
      { position: 2, kind: 'frame', value: 'Sans cadre', key: null, frameMode: 'none' },
    ],
    whiteBorder: 'off',
    changed: 'whiteBorder',
  });

  assert.equal(selection.variant.id, 201);
  assert.equal(selection.frameColor, null);
  assert.equal(selection.whiteBorder, false);
  assert.equal(selection.changed, 'whiteBorder');
});

test('contour blanc : « Avec » est transmis à true, et null quand le produit n’a pas cette option', () => {
  const base = {
    variants: POSTER_VARIANTS,
    choices: [
      { position: 1, kind: 'size', value: '30x40 cm', key: null },
      { position: 2, kind: 'frame', value: 'Sans cadre', key: null, frameMode: 'none' },
    ],
    changed: 'whiteBorder',
  };
  assert.equal(buildSelection({ ...base, whiteBorder: 'on' }).whiteBorder, true);
  assert.equal(buildSelection({ ...base, whiteBorder: null }).whiteBorder, null);
});

test('combinaison absente du catalogue : variante null, options transmises quand même', () => {
  const selection = buildSelection({
    variants: TOILE_VARIANTS,
    choices: [
      { position: 1, kind: 'size', value: '40x50 cm', key: null },
      { position: 2, kind: 'border', value: 'Bordure blanche', key: 'bordure-blanche' },
      { position: 3, kind: 'frame', value: 'Cadre noyer', key: 'cadre-noyer' },
    ],
    whiteBorder: null,
    changed: 'border',
  });

  assert.equal(selection.variant, null);
  assert.deepEqual(selection.options.map((o) => o.value), ['40x50 cm', 'Bordure blanche', 'Cadre noyer']);
});

// ---- Adresse partageable : ?variant= suit la variante ----

test('adresse : ajoute ?variant= en gardant les autres paramètres et l’ancre', () => {
  assert.equal(
    withVariantParam('https://www.myselfmonart.com/products/lion?utm_source=pinterest#avis', 202),
    'https://www.myselfmonart.com/products/lion?utm_source=pinterest&variant=202#avis',
  );
});

test('adresse : déjà sur cette variante, l’adresse revient telle quelle (aucun réencodage)', () => {
  const href = 'https://www.myselfmonart.com/en/products/lion?q=lion%20dore&variant=202';
  assert.equal(withVariantParam(href, 202), href);
});

test('adresse : remplace la variante précédente au lieu d’en ajouter une seconde', () => {
  assert.equal(
    withVariantParam('https://www.myselfmonart.com/products/lion?variant=201', 202),
    'https://www.myselfmonart.com/products/lion?variant=202',
  );
});
