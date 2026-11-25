// Le cœur de papiers (snippets/coeur-papiers.liquid), le cœur des j'aime du nouveau design : trois papiers déchirés du thème
// cernés d'encre (choix de Walid du 25/11/2026). Son dessin, sur les cartes et dans l'en-tête ; ses styles et ses mouvements
// (input.css, « Le cœur de papiers ») ; le paramètre qui l'amène, et les pages qui ne le passent pas.
//
// Lancer : node --test scripts/coeur-papiers.test.cjs   (liquidjs par NODE_PATH, voir scripts/galerie-banc.cjs)
const test = require('node:test')
const assert = require('node:assert/strict')
const { read, code, rules, engine, SKIP } = require('./galerie-banc.cjs')

const INPUT = read('input.css').replace(/\r\n/g, '\n')
const NO_PREF = '@media (prefers-reduced-motion: no-preference)'
const CONTOUR = 'M12 20.8C6.9 16.8 2.35 13.25 2.35 8.25A5.05 5.05 0 0 1 12 6.17A5.05 5.05 0 0 1 21.65 8.25C21.65 13.25 17.1 16.8 12 20.8Z'
const rendu = async (donnees = {}) => (await engine('fr').renderFile('coeur-papiers', donnees)).trim()
// Les papiers d'un rendu : { rose, soleil: [fibre, couleur], corail: [fibre, couleur], trait }.
function papiers(svg) {
  const m = /^<svg class="([^"]+)" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="coeur-rose" d="([^"]+)"\/><g class="coeur-soleil"><path class="coeur-fibre" d="([^"]+)"\/><path d="([^"]+)"\/><\/g><g class="coeur-corail"><path class="coeur-fibre" d="([^"]+)"\/><path d="([^"]+)"\/><\/g><path class="coeur-trait" d="([^"]+)"\/><\/svg>$/.exec(svg)
  assert.ok(m, svg)
  return { classe: m[1], rose: m[2], soleil: [m[3], m[4]], corail: [m[5], m[6]], trait: m[7] }
}
function bloc() {
  const debut = INPUT.indexOf('/* ---- Le cœur de papiers (')
  const fin = INPUT.indexOf('/* ---- Fin du cœur de papiers ---- */')
  assert.ok(debut > 0 && fin > debut)
  return rules(INPUT.slice(debut, fin).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const regle = (regles, head, context = '') => regles.find((r) => r.head === head && r.context.join(' / ') === context)

test('le dessin : le rose, le soleil puis le corail, chacun sur sa fibre blanche, et le contour ; sans masque ni identifiant', { skip: SKIP }, async () => {
  const carte = papiers(await rendu())
  assert.equal(carte.classe, 'coeur')
  assert.equal(carte.rose, CONTOUR)
  assert.equal(carte.trait, CONTOUR)
  // Vingt-quatre cartes par page portent ce dessin : pas d'identifiant à répéter, donc pas de masque.
  assert.doesNotMatch(code('snippets/coeur-papiers.liquid'), /\bid=|clip-path|clipPath|mask/)
  // La fibre dépasse la couleur (elle a son propre bord) : jamais la même déchirure deux fois.
  for (const [fibre, couleur] of [carte.soleil, carte.corail]) assert.notEqual(fibre, couleur)
})

test('le dessin : chaque papier tient dans le cœur, coupé à son contour', { skip: SKIP }, async () => {
  for (const donnees of [{}, { classe: 'entete-coeur-dessin' }]) {
    const p = papiers(await rendu(donnees))
    for (const d of [...p.soleil, ...p.corail]) {
      // Les points d'ancrage du tracé (le dernier couple de chaque commande), dans la boîte du contour.
      for (const [, commande, suite] of d.matchAll(/([MLCA])([^MLCAZ]+)/g)) {
        const n = suite.replace(/(\d)-/g, '$1 -').trim().split(/[\s,]+/).map(Number)
        assert.ok(n.every((x) => Number.isFinite(x)), `${commande}${suite}`)
        const [x, y] = n.slice(-2)
        assert.ok(x >= 2.34 && x <= 21.66 && y >= 3.19 && y <= 20.81, `${x} ${y}`)
      }
      assert.match(d, /Z$/)
    }
    // Le soleil dans le lobe droit, le corail à la pointe.
    for (const d of p.soleil) assert.match(d, /21\.65 8\.25A5\.05 5\.05 0 0 0 /)
    for (const d of p.corail) assert.match(d, / 12 20\.8C/)
  }
})

test('le dessin de l’en-tête : le même, la déchirure plus loin du nombre ; celui des cartes partout ailleurs', { skip: SKIP }, async () => {
  const carte = papiers(await rendu())
  const haut = papiers(await rendu({ classe: 'entete-coeur-dessin' }))
  assert.equal(haut.classe, 'coeur entete-coeur-dessin')
  const points = (d) => [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
  // Le soleil commence plus à droite, la pointe corail plus bas.
  assert.ok(points(haut.soleil[0])[2][0] > points(carte.soleil[0])[2][0])
  assert.ok(Math.min(...points(haut.corail[0]).map((p) => p[1])) > Math.min(...points(carte.corail[0]).map((p) => p[1])) + 0.5)
  assert.match(code('snippets/tw-loup-like-button.liquid'), /{% render 'coeur-papiers', classe: 'entete-coeur-dessin' %}/)
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

test('la feuille : un bloc à part, ses couleurs en variables ; vide, le contour seul ; aucun mouvement hors « mouvements réduits »', () => {
  const regles = bloc()
  for (const r of regles) {
    if (r.head.startsWith('@keyframes')) { assert.match(r.head, /^@keyframes coeur-/); continue }
    assert.match(r.head, /\.coeur\b/, r.head)
    if (/(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body)) assert.equal(r.context[0], NO_PREF, r.head)
    if (r.head !== '.coeur') assert.doesNotMatch(r.body, /#[0-9a-f]{3,8}\b|rgb/i, r.head)
  }
  for (const papier of ['rose', 'soleil', 'corail']) assert.match(regle(regles, `.coeur .coeur-${papier}`).body, new RegExp(`fill: var\\(--${papier}\\);`))
  assert.match(regle(regles, '.coeur .coeur-fibre').body, /fill: var\(--blanc\);/)
  assert.match(regle(regles, '.coeur .coeur-trait').body, /fill: none; stroke: currentColor;/)
  assert.match(regle(regles, '.like:not(.is-liked) .coeur > :not(.coeur-trait)').body, /opacity: 0;/)
})

test('la feuille : les papiers se collent quand on aime, l’un après l’autre, jamais au chargement', () => {
  const regles = bloc()
  const delais = []
  for (const papier of ['rose', 'soleil', 'corail']) {
    const r = regles.filter((x) => /animation:/.test(x.body) && x.head.endsWith(`.coeur-${papier}`))
    assert.equal(r.length, 1, papier)
    assert.equal(r[0].head, `.like.is-liked.vient-d-aimer .coeur-${papier}`)
    assert.match(r[0].body, /backwards;/)
    delais.push(Number((/([\d.]+)s backwards/.exec(r[0].body) || [0, 0])[1]))
    // Le fondu du retour ne s'applique pas à l'aller : il l'emporterait sur l'animation.
    assert.ok(!regles.some((x) => /transition:[^;]*opacity/.test(x.body) && !x.head.startsWith('.like:not(.is-liked)') && !x.head.includes('coeur-trait')), 'transition de l’opacité')
  }
  // Le rose d'abord (« 0.2s cubic-bezier(…) backwards » : sans délai), le soleil, puis le corail par-dessus.
  assert.equal(delais[0], 0)
  assert.ok(delais[1] > 0 && delais[2] > delais[1], delais.join(' '))
})

test('la feuille construite porte le cœur', () => {
  const sortie = read('assets/output.css')
  for (const s of ['.coeur .coeur-soleil', '.coeur .coeur-fibre', '@keyframes coeur-corail-se-colle']) assert.ok(sortie.includes(s), s)
})
