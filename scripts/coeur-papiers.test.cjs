// Le cœur des j'aime du nouveau design (snippets/coeur-papiers.liquid, son nom vient de ses premières versions, en
// papiers) : cerné d'encre, rempli de rouge corail quand on aime (Walid, 26/11/2026 : « on va passer au rouge, au moins
// c'est visible »). Son dessin, sur les cartes et dans l'en-tête ; ses styles et ses mouvements (input.css, « Le cœur des
// j'aime ») ; le paramètre qui l'amène, et les pages qui ne le passent pas.
//
// Lancer : node --test scripts/coeur-papiers.test.cjs   (liquidjs par NODE_PATH, voir scripts/galerie-banc.cjs)
const test = require('node:test')
const assert = require('node:assert/strict')
const { read, code, rules, engine, SKIP } = require('./galerie-banc.cjs')

const INPUT = read('input.css').replace(/\r\n/g, '\n')
const NO_PREF = '@media (prefers-reduced-motion: no-preference)'
const CONTOUR = 'M12 20.8C6.9 16.8 2.35 13.25 2.35 8.25A5.05 5.05 0 0 1 12 6.17A5.05 5.05 0 0 1 21.65 8.25C21.65 13.25 17.1 16.8 12 20.8Z'
const rendu = async (donnees = {}) => (await engine('fr').renderFile('coeur-papiers', donnees)).trim()
function bloc() {
  const debut = INPUT.indexOf("/* ---- Le cœur des j'aime (")
  const fin = INPUT.indexOf("/* ---- Fin du cœur des j'aime ---- */")
  assert.ok(debut > 0 && fin > debut)
  return rules(INPUT.slice(debut, fin).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const regle = (regles, head, context = '') => regles.find((r) => r.head === head && r.context.join(' / ') === context)

test('le dessin : le fond, puis le contour par-dessus, sur le même tracé ; sans masque ni identifiant', { skip: SKIP }, async () => {
  const svg = (classe) => `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="coeur-fond" d="${CONTOUR}"/><path class="coeur-trait" d="${CONTOUR}"/></svg>`
  assert.equal(await rendu(), svg('coeur'))
  // Dans l'en-tête : le même, avec sa classe.
  assert.equal(await rendu({ classe: 'entete-coeur-dessin' }), svg('coeur entete-coeur-dessin'))
  assert.match(code('snippets/tw-loup-like-button.liquid'), /{% render 'coeur-papiers', classe: 'entete-coeur-dessin' %}/)
  // Vingt-quatre cartes par page portent ce dessin : pas d'identifiant à répéter.
  assert.doesNotMatch(code('snippets/coeur-papiers.liquid'), /\bid=|clip-path|clipPath|mask/)
})

test('le cœur n’arrive que par son paramètre : la grille de la nouvelle page le passe, les autres pages gardent le cœur de toujours', () => {
  assert.match(code('snippets/my-like-button.liquid'), /{% if dessin == 'papiers' %}{% render 'coeur-papiers' %}{% else %}{% render 'tw-icon-heart-design' %}{% endif %}/)
  const carte = code('snippets/collection-carte.liquid')
  assert.equal((carte.match(/dessin: 'papiers'/g) || []).length, 2, 'la carte et son repli')
  assert.match(code('snippets/card-product.liquid'), /{% render 'card-product-info', product: product, variant: variant, dessin: dessin %}/)
  assert.match(code('snippets/card-product-info.liquid'), /{% render 'my-like-button', product: product, dessin: dessin %}/)
  // « Mes j'aime » le passera à la bascule (dossier .scratch/collection-design, ticket 12) ; la fiche et les
  // recommandations, non.
  for (const f of ['sections/my-likes-card.liquid', 'sections/main-product.liquid', 'sections/product-recommendations.liquid', 'sections/product-list.liquid']) assert.doesNotMatch(code(f), /dessin:/, f)
})

test('la feuille : un bloc à part, ses couleurs en variables ; vide, le contour seul ; aimé, le corail ; aucun mouvement hors « mouvements réduits »', () => {
  const regles = bloc()
  for (const r of regles) {
    if (r.head.startsWith('@keyframes')) { assert.match(r.head, /^@keyframes coeur-/); continue }
    assert.match(r.head, /\.coeur\b/, r.head)
    if (/(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body)) assert.equal(r.context[0], NO_PREF, r.head)
    if (r.head !== '.coeur') assert.doesNotMatch(r.body, /#[0-9a-f]{3,8}\b|rgb/i, r.head)
  }
  // Le corail du thème, celui du cœur de papiers qu'il remplace.
  assert.match(regle(regles, '.coeur').body, /--corail: #ff5436;/)
  assert.match(regle(regles, '.coeur .coeur-fond').body, /fill: var\(--corail\);/)
  assert.match(regle(regles, '.coeur .coeur-trait').body, /fill: none; stroke: currentColor;/)
  assert.match(regle(regles, '.like:not(.is-liked) .coeur-fond').body, /opacity: 0;/)
})

test('la feuille : le corail remplit le cœur quand on aime, jamais au chargement', () => {
  const regles = bloc()
  const r = regles.filter((x) => /animation:/.test(x.body) && x.head.endsWith('.coeur-fond'))
  assert.equal(r.length, 1)
  assert.equal(r[0].head, '.like.is-liked.vient-d-aimer .coeur-fond')
  assert.equal(r[0].context[0], NO_PREF)
  // Tout de suite (sans délai), du milieu vers le bord.
  assert.match(r[0].body, /animation: coeur-se-remplit 0\.24s cubic-bezier\([^)]*\) backwards;/)
  assert.match(regles.find((x) => x.head === '@keyframes coeur-se-remplit').body, /0% \{ opacity: 0; transform: scale\(0\.35\); \}/)
  // Le fondu du retour ne s'applique pas à l'aller : il l'emporterait sur l'animation.
  assert.ok(!regles.some((x) => /transition:[^;]*opacity/.test(x.body) && !x.head.startsWith('.like:not(.is-liked)') && !x.head.includes('coeur-trait')), 'transition de l’opacité')
})

test('la feuille construite porte le cœur', () => {
  const sortie = read('assets/output.css')
  for (const s of ['.coeur .coeur-fond', '@keyframes coeur-se-remplit']) assert.ok(sortie.includes(s), s)
  for (const s of ['coeur-soleil', 'coeur-fibre', 'entete-papier']) assert.ok(!sortie.includes(s), s)
})
