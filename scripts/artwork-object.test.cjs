// L'œuvre en objet (snippets/artwork-object.liquid ; CSS dans input.css, « Vignette d'œuvre ») : une seule image,
// l'œuvre à plat, que le navigateur met en objet. La carte de collection des nouveaux produits et la vignette
// d'une ligne du panier (toutes les toiles et tous les posters, nouveaux ou de toujours) passent par lui : un
// seul rendu, un seul endroit où le changer. Le rendu Liquid se vérifie au banc (liquidjs, avant et après) ;
// ici, les contrats du balisage avec le CSS, le moteur 3D et les scripts du thème.
// Lancer : node --test scripts/artwork-object.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const { FRAMES, frameOf } = require('../assets/oeuvre-3d-engine.js')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')

/* Les règles de la vignette dans input.css : le bloc « Vignette d'œuvre », de son titre à sa fin, sans les
   commentaires. */
function vignetteCss() {
  const css = read('input.css')
  const start = css.indexOf('/* ==== Vignette d\'œuvre')
  const end = css.indexOf('/* ==== Vignette d\'œuvre (fin)')
  assert.ok(start > 0 && end > start, 'bloc « Vignette d’œuvre » (début, fin) dans input.css')
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '')
}
// Le corps d'une règle (jusqu'à sa première accolade fermante).
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`)
  assert.ok(at >= 0, `règle ${selector}`)
  return css.slice(at, css.indexOf('}', at))
}

test('cadres : une variable CSS par cadre, à la teinte du moteur 3D, le chêne et le noyer du poster compris', () => {
  const css = vignetteCss()
  const root = rule(css, '.oeuvre-card')
  const colored = FRAMES.filter((f) => f.color)
  assert.deepEqual(colored.map((f) => f.id), ['blanc', 'noir', 'argent', 'chene', 'noyer'])
  for (const { id } of colored) {
    assert.match(root, new RegExp(`--frame-${id}: ${frameOf(id, 'toile').color};`), `toile ${id}`)
    if (frameOf(id, 'poster').color !== frameOf(id, 'toile').color) {
      assert.match(root, new RegExp(`--frame-poster-${id}: ${frameOf(id, 'poster').color};`), `poster ${id}`)
    }
  }
  // Le chêne du poster est le chêne vieilli, pas le bois clair de la toile (choix de Walid du 12/11/2026).
  assert.match(root, /--frame-poster-chene: #6f6765;/)
})

test('cadres : chaque cadre de la commande prend sa teinte (data-frame), et le poster son propre chêne et son noyer', () => {
  const css = vignetteCss()
  for (const { id } of FRAMES.filter((f) => f.color)) {
    assert.match(rule(css, `.oeuvre-card[data-frame="${id}"]`), new RegExp(`--frame: var\\(--frame-${id}\\)`), id)
  }
  for (const id of ['chene', 'noyer']) {
    assert.match(rule(css, `.oeuvre-card[data-kind="poster"][data-frame="${id}"]`), new RegExp(`--frame: var\\(--frame-poster-${id}\\)`), `poster ${id}`)
  }
  assert.doesNotMatch(css, /data-frame="sans"/, 'sans cadre : aucune teinte')
})

/* Le snippet de l'œuvre en objet, sans ses commentaires. */
const object = () => read('snippets/artwork-object.liquid').replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '').replace(/^\s*#.*$/gm, '')

test('panier : rien ne bouge. La vitre et sa porte-fenêtre sont celles de la carte, figées à leur place de repos', () => {
  const css = vignetteCss()
  // Le reflet ne suit le défilement que dans les cartes : timeline et animation visent les vignettes sans data-context.
  assert.match(css, /\.oeuvre-card:not\(\[data-context\]\) \.oeuvre-card-glass {\s*view-timeline: --oc-glass block;\s*}/)
  assert.match(css, /@supports \(animation-timeline: view\(\)\) {\s*\.oeuvre-card:not\(\[data-context\]\) \.oeuvre-card-glare { animation: oeuvre-card-glare linear both;/)
  assert.doesNotMatch(rule(css, '.oeuvre-card-glass'), /view-timeline/)
  assert.equal((css.match(/animation: (?!none)/g) || []).length, 1, 'une seule animation, celle des cartes')
  assert.match(rule(css, '.oeuvre-card-glare'), /translate: 0 -62%/, 'au repos : le bas de la fenêtre en haut de la vitre')
  // Le même balisage de vitre partout ; le script du reflet n'est chargé que par la carte.
  const glasses = object().match(/<span class="oeuvre-card-glass"[\s\S]*?<\/span><\/span>/g) || []
  assert.deepEqual(glasses, ['<span class="oeuvre-card-glass" aria-hidden="true"><span class="oeuvre-card-glare" data-allow-empty></span></span>'])
  assert.doesNotMatch(object(), /<script/)
  assert.match(read('assets/oeuvre-card-reflet.js'), /const GLASS = '\.oeuvre-card:not\(\[data-context\]\) \.oeuvre-card-glass'/)
})

test('panier : l’œuvre tient entière dans sa case, à son format, et la case garde sa taille (la scène la remplit)', () => {
  const css = vignetteCss()
  const stage = rule(css, '.oeuvre-card[data-context] .oeuvre-card-stage')
  assert.match(stage, /container-type: size/)
  assert.match(stage, /height: 100%/)
  assert.match(rule(css, '.oeuvre-card[data-context]'), /position: absolute; inset: 0;/)
  // Page panier : une case au format d'une œuvre en portrait (120 × 150), centrée, jamais plus haute que la ligne.
  assert.match(rule(css, '.oeuvre-card[data-context="panier"]'), /display: flex; align-items: center;/)
  assert.match(rule(css, '.oeuvre-card[data-context="panier"] .oeuvre-card-stage'), /width: 100%; height: auto; aspect-ratio: 4 \/ 5; max-height: 100%;/)
  // L'échelle : la plus grande qui fait tenir l'objet (--ew × --eh, en unités de --s) dans 86 % de la case, son
  // ombre comprise.
  assert.match(rule(css, '.oeuvre-card[data-context] .oeuvre-card-piece'), /--s: min\(calc\(\.86 \* 100cqw \/ var\(--ew\)\), calc\(\.86 \* 100cqh \/ var\(--eh\)\)\)/)
  assert.match(rule(css, '.oeuvre-card-piece'), /width: calc\(var\(--ew\) \* var\(--s\)\);\s*height: calc\(var\(--eh\) \* var\(--s\)\);/)
  // La carte garde sa scène : une largeur de scène par unité.
  assert.match(rule(css, '.oeuvre-card'), /--s: 100cqw;/)
  // Hors du calcul de --s, plus aucune unité de conteneur en dur : la carte et le panier partagent tout le reste.
  assert.equal((css.match(/\d*\.?\d+cq[wh]/g) || []).length, 3)
})

test('panier : la même œuvre en petit, à la largeur de sa case, en 1x et 2x ; ni .skeleton ni image floue (le tiroir est réécrit sans script)', () => {
  const source = object()
  const cart = /{%-?\s*else\s*-?%}\s*(<img\s+srcset="{{ image \| image_url: width: art_width }}[\s\S]*?>)/.exec(source)
  assert.ok(cart, 'l’image du panier')
  assert.match(cart[1], /srcset="{{ image \| image_url: width: art_width }} 1x, {{ image \| image_url: width: art_width_2x }} 2x"/)
  assert.match(cart[1], /src="{{ image \| image_url: width: art_width }}"/)
  assert.match(cart[1], /loading="{% if lazy == false %}eager{% else %}lazy{% endif %}"/)
  assert.doesNotMatch(cart[1], /lqip|data-srcset|fetchpriority/)
  assert.match(source, /when 'tiroir'\s+assign art_width = 80\s+else\s+assign art_width = 120\s+endcase\s+assign art_width_2x = art_width \| times: 2/)
  assert.match(source, /<div class="oeuvre-card-face{% if context == 'carte' %} skeleton{% endif %}">/)
})
