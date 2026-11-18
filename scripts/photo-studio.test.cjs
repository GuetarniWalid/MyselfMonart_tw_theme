// La photo studio des nouveaux produits (modèle de page oeuvre-3d) : l'œuvre seule, en grand, sur un mur clair,
// dessinée par le CSS des vignettes de collection (input.css, « Vignette d'œuvre » ; snippet artwork-object). Le
// serveur ouvre /products/<handle>?view=photo-studio (templates/product.photo-studio.liquid) juste après la
// publication, la prend en 2000 × 2000 et l'ajoute au produit après l'œuvre à plat, sous un nom de fichier qui
// commence par « photo-studio- » (snippet artwork-studio-index). Elle devient la 1re image des données Google de la
// fiche et son og:image ; partout ailleurs, rien ne change, et les produits de toujours restent à l'octet près.
// Ici, les contrats du code ; puis le rendu Liquid (liquidjs), quand le module est là : sans lui, ces tests-là sont
// sautés et le reste passe. Le banc les lance avec NODE_PATH vers un node_modules qui a liquidjs.
// Lancer : node --test scripts/photo-studio.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const bonsai = require('./fixtures/oeuvre-3d-bonsai.json')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
// Le code Liquid d'un fichier, sans ses commentaires : {% comment %}, et les lignes « # » des blocs {% liquid %}
// (hors de ces blocs, une ligne qui commence par « # » est du CSS : une couleur).
const code = (file) => read(file)
  .replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '')
  .replace(/{%-?\s*liquid\b[\s\S]*?-?%}/g, (block) => block.replace(/^\s*#.*$/gm, ''))
// Les paramètres d'un render, nom → expression.
const params = (call) => Object.fromEntries([...call.matchAll(/(\w+): ([^,]+?)\s*(?:,|$)/g)].map((m) => [m[1], m[2].trim()]))
// Le corps d'une règle CSS (jusqu'à sa première accolade fermante).
const rule = (css, selector) => {
  const at = css.indexOf(`${selector} {`)
  assert.ok(at >= 0, `règle ${selector}`)
  return css.slice(at, css.indexOf('}', at))
}

const TEMPLATE = 'templates/product.photo-studio.liquid'
const OBJECT = 'snippets/artwork-object.liquid'
const STUDIO_INDEX = 'snippets/artwork-studio-index.liquid'
// La feuille du modèle, sans ses commentaires ; ses sorties Liquid ({{ x }}, dont les accolades couperaient une
// règle) y sont écrites «x».
const photoCss = () => {
  const style = /<style>([\s\S]*?)<\/style>/.exec(code(TEMPLATE))
  assert.ok(style, 'la feuille de la photo, dans le modèle')
  return style[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/{{\s*(\w+)\s*}}/g, '«$1»')
}
// Le bloc « Vignette d'œuvre » d'input.css : le CSS commun, celui des visiteurs.
const vignetteCss = () => {
  const css = read('input.css')
  const start = css.indexOf('/* ==== Vignette d\'œuvre')
  const end = css.indexOf('/* ==== Vignette d\'œuvre (fin)')
  assert.ok(start > 0 && end > start, 'bloc « Vignette d’œuvre » (début, fin) dans input.css')
  return css.slice(start, end)
}
// Le calcul de l'index de la photo studio (snippet artwork-studio-index), rendu numérique : -1 sans photo.
const STUDIO_LINES = {
  tags: /{%-\s*capture studio_index\s*-%}{%\s*render 'artwork-studio-index', product: product\s*%}{%-\s*endcapture\s*-%}\s*{%-\s*assign studio_index = studio_index \| default: -1 \| plus: 0\s*-%}/,
  block: /capture studio_index\s+render 'artwork-studio-index', product: product\s+endcapture\s+assign studio_index = studio_index \| default: -1 \| plus: 0\b/,
}

/* ---------- Le modèle : le contrat avec le serveur ---------- */

test('modèle : un document autonome (layout none), noindex, avec output.css, sans aucun script de Shopify ni suivi', () => {
  const source = code(TEMPLATE)
  assert.match(source, /^\s*{%-?\s*layout none\s*-?%}/, 'layout none, en tête')
  assert.match(source, /<!doctype html>\s*<html lang="{{ request\.locale\.iso_code }}"/)
  assert.match(source, /<meta name="robots" content="noindex">/)
  assert.match(source, /{{ 'output\.css' \| asset_url \| stylesheet_tag }}/)
  assert.doesNotMatch(source, /content_for_header|render 'head-base'|render 'meta-tags'|render 'posthog'|posthog|klarna|gtag|googletagmanager/i)
  // Un seul script, le sien, écrit dans la page ; une icône vide, pour que le navigateur ne demande pas /favicon.ico.
  assert.deepEqual(source.match(/<script\b[^>]*>/g), ['<script>'])
  assert.match(source, /<link rel="icon" href="data:,">/)
  // Aucune adresse en dur : la feuille, le mur et l'œuvre viennent de asset_url et image_url (la boutique, /cdn/shop/…).
  // Le grain est une image écrite dans la feuille (data:), dont l'espace de noms SVG n'est pas une adresse chargée.
  assert.doesNotMatch(source.replace(/url\("data:image\/svg\+xml[^"]*"\)/g, ''), /https?:|\/\/[a-z]/i)
})

test('modèle : une seule photo, [data-photo="principale"], de 1000 × 1000 px de CSS, collée en haut à gauche, sans marge', () => {
  const source = code(TEMPLATE)
  assert.equal((source.match(/<\w+[^>]*\sdata-photo="/g) || []).length, 1, 'un seul élément [data-photo]')
  assert.match(source, /<body>\s*{%-\s*if artwork != blank\s*-%}\s*<div class="photo-studio" data-photo="principale">\s*{{- artwork -}}\s*<\/div>/)
  const css = photoCss()
  assert.match(rule(css, 'html, body'), /margin: 0;/)
  assert.match(rule(css, '.photo-studio'), /position: relative; width: 1000px; height: 1000px; overflow: hidden;/)
})

test('modèle : l’œuvre à plat du produit (artwork-flat-index), toile ou poster (artwork-kind), en objet par artwork-object, context studio', () => {
  const source = code(TEMPLATE)
  // Toile ou poster, sans image_unique : un produit de toujours se vérifie aussi en ligne (le Bonsaï).
  assert.match(source, /capture kind\s+render 'artwork-kind', product: product, suffix: product\.template_suffix\s+endcapture/)
  assert.match(source, /capture flat_index\s+render 'artwork-flat-index', product: product\s+endcapture\s+assign flat_index = flat_index \| plus: 0\s+assign art = product\.images\[flat_index\]/)
  const call = /render 'artwork-object',([^\n]*)/.exec(source)
  assert.ok(call, 'render artwork-object')
  assert.deepEqual(params(call[1]), { product: 'product', image: 'art', kind: 'kind', frame: 'frame', context: "'studio'" })
  assert.match(source, /if kind != blank and art != blank\s+if product\.selected_variant/)
})

test('modèle : la toile sans cadre, le poster sous verre au cadre noir, sans contour blanc ; avec ?variant=, le cadre de la variante, tel qu’une ligne le dit (artwork-line)', () => {
  const source = code(TEMPLATE)
  const line = /render 'artwork-line',([^\n]*)/.exec(source)
  assert.ok(line, 'render artwork-line')
  assert.deepEqual(params(line[1]), { product: 'product', variant: 'product.selected_variant', context: "'studio'" })
  assert.match(source, /assign frame = 'sans'\s+if kind == 'poster'\s+assign frame = 'noir'\s+endif/)
  // Jamais de contour blanc : aucun des deux rendus ne le passe (paramètres ci-dessus et ci-contre, au complet).
  const object = /render 'artwork-object',([^\n]*)/.exec(source)
  assert.equal(params(object[1]).contour, undefined)
  // La lecture du cadre reste la seule de la commande (snippet artwork-frame, appelé par artwork-line seul).
  assert.doesNotMatch(source, /artwork-frame/)
})

test('modèle : prête (data-photo-pret) quand l’œuvre est décodée, le mur chargé et la trame posée ; data-photo-erreur sinon', () => {
  const source = code(TEMPLATE)
  // Rien à photographier (ni toile ni poster, ou pas d'œuvre à plat) : l'erreur est dans la page, sans script.
  assert.match(source, /<html lang="{{ request\.locale\.iso_code }}"{% if artwork == blank %} data-photo-erreur="oeuvre"{% endif %}>/)
  const script = /<script>([\s\S]*?)<\/script>/.exec(source)[1]
  assert.match(script, /root\.dataset\.photoPret = '1'/)
  assert.match(script, /root\.dataset\.photoErreur = /)
  assert.match(script, /\.decode\(\)/)
  assert.match(script, /setProperty\('--weave', /)
  // Le mur : la même adresse que la feuille, attendue avant la photo.
  assert.match(script, /wall\.src = {{ wall_texture \| json }}/)
  assert.match(source, /assign wall_texture = 'fond-mur-beige-clair-texture\.webp' \| asset_url/)
  assert.match(photoCss(), /url\("«wall_texture»"\) 0 0 \/ 256px 256px/)
  // Le style des vignettes (output.css) est vérifié : sans lui, la photo serait fausse.
  assert.match(script, /containerType !== 'inline-size'/)
  // La trame : tirée d'une suite fixe, la même photo à chaque passage.
  assert.doesNotMatch(script, /Math\.random/)
})

test('modèle : les règles de la photo sont dans le modèle (mur clair, grain, 84 %, trame, reflet fixe, brillance du papier), aucune dans input.css', () => {
  const css = photoCss()
  // Le mur clair (mur B) : deux dégradés, la texture du mur beige clair en multiply, le fond.
  const wall = rule(css, '.photo-studio')
  assert.match(wall, /radial-gradient\(120% 95% at 18% 8%, rgba\(255, 255, 255, \.55\), rgba\(255, 255, 255, 0\) 60%\)/)
  assert.match(wall, /radial-gradient\(90% 80% at 92% 100%, rgba\(120, 100, 80, \.10\), rgba\(120, 100, 80, 0\) 70%\)/)
  assert.match(wall, /#f1ede6;/)
  assert.match(wall, /background-blend-mode: normal, normal, multiply, normal;/)
  assert.match(rule(css, '.photo-studio::after'), /opacity: \.035; mix-blend-mode: multiply;[\s\S]*feTurbulence type='fractalNoise' baseFrequency='\.9' numOctaves='2'/)
  // Le mur de la scène s'efface derrière celui de la photo.
  assert.match(rule(css, '.photo-studio .oeuvre-card'), /position: absolute; inset: 0; --wall-toile: transparent; --wall-poster: transparent;/)
  assert.match(rule(css, '.photo-studio .oeuvre-card-stage'), /aspect-ratio: 1 !important; width: 100%; background: transparent !important;/)
  // L'œuvre prend 84 % de la photo (le poster, cadre compris : 86 %).
  assert.match(rule(css, '.photo-studio .oeuvre-card[data-kind="toile"] .oeuvre-card-piece'), /--W: min\(\.84, calc\(\.84 \* var\(--r\)\)\);/)
  assert.match(rule(css, '.photo-studio .oeuvre-card[data-kind="poster"] .oeuvre-card-piece'), /--k: calc\(\(\.86 - 2 \* var\(--f\) \* var\(--framed\)\) \/ \(1 \+ \.1904 \* var\(--contour\)\)\);/)
  // La trame de la toile.
  assert.match(rule(css, '.photo-studio .oeuvre-card[data-kind="toile"] .oeuvre-card-face::after'), /background: var\(--weave\) 0 0 \/ 3px 3px; mix-blend-mode: soft-light; opacity: \.55;/)
  // Le reflet de la vitre, fixe.
  assert.match(rule(css, '.photo-studio .oeuvre-card-glare'), /animation: none !important; translate: 0 -38% !important; --gx: 2%;/)
  // Sans cadre, pas de vitre : la brillance floue du papier, coupée aux bords de la feuille, et son ombre.
  assert.match(rule(css, '.photo-studio .oeuvre-card-sheen'), /position: absolute; inset: 0; overflow: clip; pointer-events: none;/)
  assert.match(rule(css, '.photo-studio .oeuvre-card-sheen .oeuvre-card-glare'), /filter: blur\(calc\(\.04 \* var\(--s\)\)\); opacity: \.85;/)
  assert.match(rule(css, '.photo-studio .oeuvre-card[data-look="papier"] .oeuvre-card-piece'), /calc\(\.002 \* var\(--s\)\) calc\(\.003 \* var\(--s\)\) calc\(\.004 \* var\(--s\)\) rgba\(38, 27, 18, \.22\),\s*calc\(\.010 \* var\(--s\)\) calc\(\.014 \* var\(--s\)\) calc\(\.034 \* var\(--s\)\) rgba\(38, 27, 18, \.13\);/)
  // Chaque règle porte sur la photo : rien ne déborde sur une autre page (le modèle n'est chargé que là, de toute façon).
  for (const selector of css.match(/^[^{}@]+(?={)/gm).map((s) => s.trim()).filter(Boolean)) {
    assert.match(selector, /^(html, body|\.photo-studio\b)/, selector)
  }
  // Rien de la photo dans le CSS commun : output.css ne change pas pour les visiteurs.
  const shared = vignetteCss()
  assert.doesNotMatch(shared, /oeuvre-card-sheen|photo-studio|--weave|\.84/)
})

test('visiteurs : la feuille compilée (assets/output.css) ne connaît ni la photo, ni sa brillance, ni sa trame', () => {
  assert.doesNotMatch(read('assets/output.css'), /photo-studio|oeuvre-card-sheen|--weave/)
})

/* ---------- L'œuvre en objet, context studio (snippet artwork-object) ---------- */

test('œuvre en objet, context studio : les règles de la carte (aucun data-context), l’image en grand et tout de suite', () => {
  const object = code(OBJECT)
  assert.match(object, /{%- if context != 'carte' and context != 'studio' %} data-context="{{ context }}"{% endif %}/)
  const studio = /{%-\s*elsif context == 'studio'\s*-%}\s*(<img[\s\S]*?>)\s*{%-\s*else\s*-%}/.exec(object)
  assert.ok(studio, 'l’image de la photo, entre celle de la carte et celle du panier')
  assert.match(studio[1], /src="{{ image \| image_url: width: 2000 }}"/)
  assert.match(studio[1], /alt="{{ art_alt }}"/)
  assert.match(studio[1], /loading="eager"/)
  assert.match(studio[1], /width="{{ image\.width }}"\s+height="{{ image\.height }}"/)
  assert.doesNotMatch(studio[1], /srcset|lqip|lazy/)
  // Ni .skeleton (aucun script ne l'ôterait), ni image floue.
  assert.match(object, /<div class="oeuvre-card-face{% if context == 'carte' %} skeleton{% endif %}">/)
})

test('œuvre en objet, context studio : la vitre garde sa porte-fenêtre ; le poster sans cadre, sans vitre, a la brillance de son papier (photo seulement)', () => {
  const object = code(OBJECT)
  const poster = /{%-\s*if frame != 'sans'\s*-%}([\s\S]*?){%-\s*elsif context == 'studio'\s*-%}([\s\S]*?){%-\s*endif\s*-%}\s*{%-\s*endif\s*-%}/.exec(object)
  assert.ok(poster, 'le poster : encadré, puis sans cadre dans la photo')
  assert.match(poster[1], /{%-\s*if context == 'carte' or context == 'studio'\s*-%}\s*<span class="oeuvre-card-glass" aria-hidden="true"><span class="oeuvre-card-glare" data-allow-empty><\/span><\/span>\s*{%-\s*else\s*-%}\s*<span class="oeuvre-card-glass" aria-hidden="true" data-allow-empty><\/span>/)
  assert.equal(poster[2].trim(), '<span class="oeuvre-card-sheen" aria-hidden="true"><span class="oeuvre-card-glare" data-allow-empty></span></span>')
  // Aucun script dans l'œuvre en objet : celui de la photo est dans le modèle.
  assert.doesNotMatch(object, /<script/)
})

/* ---------- La photo studio parmi les médias (snippet artwork-studio-index) ---------- */

test('artwork-studio-index : la photo studio des seuls nouveaux produits (artwork-kind, image_unique), jamais leur œuvre à plat', () => {
  const source = code(STUDIO_INDEX)
  assert.match(source, /capture kind\s+render 'artwork-kind', product: product, suffix: product\.template_suffix, image_unique: true\s+endcapture\s+if kind != blank\s+for media in product\.media/)
  assert.match(source, /unless forloop\.first\s+if media\.media_type == 'image' and media\.preview_image\.src contains 'photo-studio'\s+echo forloop\.index0\s+break/)
  // Le résultat sort sans aucun espace : rien, ou l'index.
  assert.match(read(STUDIO_INDEX), /-%}\s*$/)
  assert.doesNotMatch(source.replace(/{%-[\s\S]*?-%}/g, ''), /\S/)
})

test('la photo studio ne sert qu’à Google et au partage : trois lecteurs, chacun avec -1 sans photo (jamais product.media[-1])', () => {
  const readers = []
  for (const folder of ['layout', 'sections', 'snippets', 'templates']) {
    for (const name of fs.readdirSync(path.join(ROOT, folder)).filter((n) => n.endsWith('.liquid'))) {
      if (/render 'artwork-studio-index'/.test(code(`${folder}/${name}`))) readers.push(`${folder}/${name}`)
    }
  }
  assert.deepEqual(readers.sort(), ['sections/main-product.liquid', 'snippets/meta-tags.liquid', 'snippets/oeuvre-3d-stage.liquid'])
  for (const file of readers) {
    const source = code(file)
    assert.ok(STUDIO_LINES.tags.test(source) || STUDIO_LINES.block.test(source), `${file} : l’index, -1 sans photo`)
  }
  // Un seul endroit qui reconnaît le nom de fichier.
  for (const folder of ['layout', 'sections', 'snippets', 'templates']) {
    for (const name of fs.readdirSync(path.join(ROOT, folder)).filter((n) => n.endsWith('.liquid'))) {
      if (`${folder}/${name}` === STUDIO_INDEX) continue
      assert.doesNotMatch(code(`${folder}/${name}`), /contains 'photo-studio'/, `${folder}/${name}`)
    }
  }
})

/* ---------- Les données Google et le partage ---------- */

test('données Google de la fiche : la photo studio en 1re image, puis l’œuvre à plat ; sinon, la ligne de toujours', () => {
  const section = code('sections/main-product.liquid')
  const studio = STUDIO_LINES.tags.exec(section)
  assert.ok(studio, 'l’index de la photo studio')
  const image = /^\s*"image": \[(.*)\],$/m.exec(section)
  assert.ok(image, 'la ligne "image" du JSON-LD')
  assert.ok(studio.index < image.index, 'l’index est connu avant')
  assert.equal(image[1], '{% if studio_index >= 0 %}{{ product.media[studio_index] | image_url: width: product.media[studio_index].preview_image.width | prepend: "https:" | json }},{{ product.media[flat_index] | image_url: width: product.media[flat_index].preview_image.width | prepend: "https:" | json }}{% else %}{{ product.featured_media | image_url: width: product.featured_media.preview_image.width | prepend: "https:" | json }}{% endif %}')
})

test('og:image : la photo studio d’un nouveau produit, avec sa taille ; sinon page_image, comme toujours', () => {
  const tags = code('snippets/meta-tags.liquid')
  assert.match(tags, /assign og_image = page_image\s+if request\.page_type == 'product'\s+capture studio_index\s+render 'artwork-studio-index', product: product\s+endcapture\s+assign studio_index = studio_index \| default: -1 \| plus: 0\s+if studio_index >= 0\s+assign og_image = product\.media\[studio_index\]\.preview_image\s+endif\s+endif/)
  assert.match(tags, /{%- if og_image -%}\s*<meta property="og:image" content="http:{{ og_image \| image_url }}">\s*<meta property="og:image:secure_url" content="https:{{ og_image \| image_url }}">\s*<meta property="og:image:width" content="{{ og_image\.width }}">\s*<meta property="og:image:height" content="{{ og_image\.height }}">/)
  assert.doesNotMatch(tags.replace(/assign og_image = page_image/, ''), /page_image/)
})

/* ---------- Partout ailleurs, rien de plus ---------- */

test('fiche 3D, sans 3D : la photo studio n’est jamais parmi les photos, où qu’elle soit', () => {
  const stage = code('snippets/oeuvre-3d-stage.liquid')
  const studio = STUDIO_LINES.block.exec(stage)
  assert.ok(studio, 'l’index de la photo studio')
  const photos = /<template data-photos>([\s\S]*?)<\/template>/.exec(stage)
  assert.ok(studio.index < photos.index)
  assert.match(photos[1], /{%-\s*for media in product\.media\s*-%}/)
  assert.match(photos[1], /{%-\s*unless media\.preview_image\.src contains 'passe-partout' or forloop\.index0 == studio_index\s*-%}/)
})

/* ---------- Le rendu Liquid (liquidjs) ---------- */

let liquid = null
try {
  liquid = require('liquidjs')
} catch {
  liquid = null
}
const SKIP = liquid ? false : 'liquidjs absent : NODE_PATH vers un node_modules qui l’a (le banc)'

/* Un moteur sur les fichiers du thème, avec les filtres de Shopify dont ces rendus ont besoin. Les adresses sont
   celles de la boutique : protocole absent, /cdn/shop/… */
function engine() {
  const { Liquid } = liquid
  const e = new Liquid({
    root: [path.join(ROOT, 'snippets'), path.join(ROOT, 'templates')],
    extname: '.liquid',
    relativeReference: false,
    jsTruthy: false,
    ownPropertyOnly: false,
  })
  e.registerFilter('image_url', (input, ...args) => {
    const image = input && input.preview_image ? input.preview_image : input
    const src = image && image.src
    if (!src) return ''
    const query = args.filter(Array.isArray).map(([key, value]) => `${key}=${value}`).join('&')
    return query ? `${src}&${query}` : src
  })
  e.registerFilter('asset_url', (name) => `//www.myselfmonart.com/cdn/shop/t/25/assets/${name}?v=1`)
  e.registerFilter('stylesheet_tag', (url) => `<link href="${url}" rel="stylesheet" type="text/css" media="all" />`)
  e.registerFilter('preload_tag', (url) => `<link href="${url}" rel="preload">`)
  e.registerFilter('money', (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`)
  e.registerFilter('money_without_currency', (cents) => (cents / 100).toFixed(2).replace('.', ','))
  e.registerFilter('t', (key) => key)
  // {% style %} de Shopify : son contenu, dans une balise <style>.
  e.registerTag('style', {
    parse(token, remain) {
      this.tpls = []
      const stream = this.liquid.parser.parseStream(remain)
      stream.on('tag:endstyle', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('style non fermé') })
      stream.start()
    },
    * render(ctx, emitter) {
      emitter.write('<style data-shopify>')
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
      emitter.write('</style>')
    },
  })
  return e
}

/* Une valeur d'option, rendue par son nom, comme dans Shopify. */
const optionValue = (name) => {
  const { Drop } = liquid
  return new (class extends Drop {
    constructor() { super(); this.name = name }
    valueOf() { return name }
    toString() { return name }
  })()
}

const FILES = '//www.myselfmonart.com/cdn/shop/files/'
let nextId = 1
const image = (file, width, height) => ({ id: nextId++, src: `${FILES}${file}?v=1`, width, height, aspect_ratio: width / height, alt: `Texte de ${file}` })
const asMedia = (img) => ({ id: img.id, media_type: 'image', alt: img.alt, preview_image: img, aspect_ratio: img.aspect_ratio, width: img.width, height: img.height, position: 0 })

/* Un produit à partir du Bonsaï relevé en ligne (scripts/fixtures/oeuvre-3d-bonsai.json) : ses tailles, ses cadres et
   ses variantes, avec les images données ([fichier, largeur, hauteur], dans l'ordre des médias). */
function product({ suffix, poster = false, files }) {
  const source = poster ? bonsai.poster : bonsai.toile
  const images = files.map(([file, width, height]) => image(file, width, height))
  const media = images.map(asMedia)
  const frames = (source.frames || []).map(([name, handle]) => ({ name, system: { handle } }))
  const variants = source.variants.map(([id, option1, option2, option3, price, available]) => ({
    id, option1, option2, option3, price, available, url: `${source.url}?variant=${id}`, title: [option1, option2, option3].filter(Boolean).join(' / '),
  }))
  const options = poster ? [['Tailles', source.sizes], ['Cadres', source.frameModes]] : [['Tailles', source.sizes], ['Bordures', source.borders.map(([n]) => n)], ['Cadres', frames.map((f) => f.name)]]
  return {
    id: poster ? 2 : 1,
    title: poster ? 'Poster Bonsaï zen' : 'Tableau Bonsaï zen',
    handle: source.url.split('/').pop(),
    url: source.url,
    vendor: 'MyselfMonArt',
    template_suffix: suffix,
    images,
    media,
    featured_image: images[0],
    featured_media: media[0],
    options_with_values: options.map(([name, values], i) => ({ name, position: i + 1, values: values.map(optionValue) })),
    variants,
    selected_variant: null,
    selected_or_first_available_variant: variants[0],
    price: variants[0].price,
    metafields: {
      painting_options: {
        frames_canvas: { value: frames },
        borders: { value: (source.borders || []).map(([name, handle]) => ({ name, system: { handle } })) },
        frames_poster: poster ? { value: source.frameColors.map(([name, handle]) => ({ name, system: { handle } })) } : null,
      },
      link: {},
      meta_object: {},
      title: {},
    },
  }
}
// Les fichiers d'un nouveau produit (l'œuvre à plat seule, 1904 × 2544 comme le Bonsaï), d'un produit de toujours
// (la photo d'ambiance d'abord, l'œuvre à plat ensuite), et la photo studio du serveur.
const FLAT = ['bonsai-zen-oeuvre.jpg', 1904, 2544]
const PASSE = ['bonsai-zen-oeuvre-passe-partout.jpg', 1904, 2544]
const PHOTO = ['photo-studio-bonsai-zen_1a2b3c.jpg', 2000, 2000]
const OLD = [['bonsai-zen-salon.jpg', 1588, 1865], FLAT, ['bonsai-zen-chambre.jpg', 2982, 2982]]

const globals = (p, extra = {}) => ({
  product: p,
  request: { page_type: 'product', origin: 'https://www.myselfmonart.com', locale: { iso_code: 'fr' } },
  template: { name: 'product', suffix: p.template_suffix },
  shop: { name: 'MyselfMonArt', description: '' },
  settings: {},
  cart: { currency: { iso_code: 'EUR' } },
  ...extra,
})
const renderFile = (file, p, extra) => engine().renderFile(file, {}, { globals: globals(p, extra) })
const renderSource = (source, p, extra) => engine().parseAndRender(source, {}, { globals: globals(p, extra) })
const photoDiv = (html) => /<div class="photo-studio" data-photo="principale">([\s\S]*?)<\/div>\s*<script>/.exec(html)
const attrs = (html) => /<div\s+class="(oeuvre-card[^"]*)"\s+data-kind="(\w+)"([^>]*)>/.exec(html)

test('rendu du modèle : une nouvelle toile, sans cadre, son œuvre à plat (1re image) en 2000 px, les règles de la carte', { skip: SKIP }, async () => {
  const html = await renderFile('product.photo-studio.liquid', product({ suffix: 'oeuvre-3d', files: [FLAT, PHOTO] }))
  assert.match(html, /^<!doctype html>\s*<html lang="fr">/)
  assert.match(html, /<meta name="robots" content="noindex">/)
  assert.match(html, /<link href="\/\/www\.myselfmonart\.com\/cdn\/shop\/t\/25\/assets\/output\.css\?v=1" rel="stylesheet"/)
  const photo = photoDiv(html)
  assert.ok(photo, 'la photo')
  const [, classes, kind, rest] = attrs(photo[1])
  assert.deepEqual([classes, kind], ['oeuvre-card', 'toile'])
  assert.doesNotMatch(rest, /data-context|data-frame|data-look/)
  assert.match(rest, /style="--r: 0\.7484"/)
  assert.match(photo[1], /<img\s+src="\/\/www\.myselfmonart\.com\/cdn\/shop\/files\/bonsai-zen-oeuvre\.jpg\?v=1&width=2000"/)
  assert.match(photo[1], /loading="eager"/)
  assert.doesNotMatch(photo[1], /skeleton|lqip|oeuvre-card-glass|oeuvre-card-sheen|photo-studio-bonsai/)
  assert.match(html, /wall\.src = "\/\/www\.myselfmonart\.com\/cdn\/shop\/t\/25\/assets\/fond-mur-beige-clair-texture\.webp\?v=1"/)
  assert.doesNotMatch(html, /<html[^>]*data-photo-erreur/)
})

test('rendu du modèle : un nouveau poster, sous verre au cadre noir, sans contour blanc, avec sa porte-fenêtre', { skip: SKIP }, async () => {
  const html = await renderFile('product.photo-studio.liquid', product({ suffix: 'oeuvre-3d', poster: true, files: [FLAT, PASSE] }))
  const photo = photoDiv(html)[1]
  const [, classes, kind, rest] = attrs(photo)
  assert.deepEqual([classes, kind], ['oeuvre-card no-contour', 'poster'])
  assert.match(rest, /data-look="verre" data-frame="noir"/)
  assert.doesNotMatch(rest, /data-context/)
  assert.match(photo, /<span class="oeuvre-card-glass" aria-hidden="true"><span class="oeuvre-card-glare" data-allow-empty><\/span><\/span>/)
  assert.doesNotMatch(photo, /oeuvre-card-sheen|passe-partout/)
})

test('rendu du modèle : ?variant= d’un poster sans cadre, le papier et sa brillance floue ; encadré, le noir ; une toile en chêne, sa caisse', { skip: SKIP }, async () => {
  const poster = product({ suffix: 'oeuvre-3d', poster: true, files: [FLAT] })
  poster.selected_variant = poster.variants.find((v) => v.option2 === 'Sans cadre')
  let photo = photoDiv(await renderFile('product.photo-studio.liquid', poster))[1]
  assert.match(attrs(photo)[3], /data-look="papier"/)
  assert.doesNotMatch(attrs(photo)[3], /data-frame|data-context/)
  assert.match(photo, /<span class="oeuvre-card-sheen" aria-hidden="true"><span class="oeuvre-card-glare" data-allow-empty><\/span><\/span>/)
  assert.doesNotMatch(photo, /oeuvre-card-glass/)

  poster.selected_variant = poster.variants.find((v) => v.option2 === 'Avec cadre')
  photo = photoDiv(await renderFile('product.photo-studio.liquid', poster))[1]
  assert.match(attrs(photo)[3], /data-look="verre" data-frame="noir"/)
  assert.match(photo, /oeuvre-card-glare/)

  const toile = product({ suffix: 'oeuvre-3d', files: [FLAT] })
  toile.selected_variant = toile.variants.find((v) => v.option3 === 'Cadre chêne clair')
  photo = photoDiv(await renderFile('product.photo-studio.liquid', toile))[1]
  assert.match(attrs(photo)[3], /^\s*data-frame="chene"\s+style=/)
})

test('rendu du modèle : un produit de toujours (le Bonsaï) montre sa vraie œuvre, à l’index 1', { skip: SKIP }, async () => {
  const html = await renderFile('product.photo-studio.liquid', product({ suffix: 'painting', files: OLD }))
  const photo = photoDiv(html)[1]
  assert.deepEqual(attrs(photo).slice(1, 3), ['oeuvre-card', 'toile'])
  assert.match(photo, /src="\/\/www\.myselfmonart\.com\/cdn\/shop\/files\/bonsai-zen-oeuvre\.jpg\?v=1&width=2000"/)
})

test('rendu du modèle : ni toile ni poster, ou pas d’œuvre à plat : data-photo-erreur="oeuvre", aucune photo', { skip: SKIP }, async () => {
  for (const p of [product({ suffix: 'personalized', files: [FLAT] }), product({ suffix: 'painting', files: [OLD[0]] })]) {
    const html = await renderFile('product.photo-studio.liquid', p)
    assert.match(html, /<html lang="fr" data-photo-erreur="oeuvre">/)
    assert.doesNotMatch(html, /data-photo="|<script>/)
  }
})

/* Le JSON-LD de la fiche, réduit à sa ligne "image" : l'index de l'œuvre à plat et celui de la photo studio, tels
   que la section les calcule, puis la ligne. */
async function ldImage(p) {
  const section = read('sections/main-product.liquid')
  const flat = /{%- capture flat_index -%}{% render 'artwork-flat-index', product: product %}{%- endcapture -%}\s*{%- assign flat_index = flat_index \| plus: 0 -%}/.exec(section)[0]
  const studio = STUDIO_LINES.tags.exec(section)[0]
  const line = /^\s*"image": \[.*\],$/m.exec(section)[0]
  const out = await renderSource(`${flat}${studio}{${line.trim().replace(/,$/, '')}}`, p)
  return JSON.parse(out).image
}
const url = ([file, width]) => `https:${FILES}${file}?v=1&width=${width}`

test('rendu des données Google : la photo puis l’œuvre à plat pour un nouveau produit qui a sa photo, où qu’elle soit ; la 1re image sinon', { skip: SKIP }, async () => {
  assert.deepEqual(await ldImage(product({ suffix: 'oeuvre-3d', files: [FLAT, PHOTO] })), [url(PHOTO), url(FLAT)])
  // Ajoutée au bout, après l'image « passe-partout » d'un poster.
  assert.deepEqual(await ldImage(product({ suffix: 'oeuvre-3d', poster: true, files: [FLAT, PASSE, PHOTO] })), [url(PHOTO), url(FLAT)])
  // Sans photo : la ligne de toujours.
  assert.deepEqual(await ldImage(product({ suffix: 'oeuvre-3d', files: [FLAT] })), [url(FLAT)])
  // L'œuvre à plat n'est jamais prise pour la photo, quel que soit son nom.
  assert.deepEqual(await ldImage(product({ suffix: 'oeuvre-3d', files: [['photo-studio-oeuvre.jpg', 1904, 2544]] })), [`https:${FILES}photo-studio-oeuvre.jpg?v=1&width=1904`])
  // Un produit de toujours garde sa 1re image, même avec un fichier « photo-studio » : la photo est aux nouveaux.
  assert.deepEqual(await ldImage(product({ suffix: 'painting', files: [...OLD, PHOTO] })), [url(OLD[0])])
  assert.deepEqual(await ldImage(product({ suffix: 'poster', poster: true, files: [...OLD, PHOTO] })), [url(OLD[0])])
})

const og = (html) => [...html.matchAll(/<meta property="(og:image[^"]*)" content="([^"]*)">/g)].map((m) => `${m[1]}=${m[2]}`)

test('rendu de og:image : la photo studio et sa taille ; sinon page_image, à l’octet près', { skip: SKIP }, async () => {
  const fresh = product({ suffix: 'oeuvre-3d', files: [FLAT, PHOTO] })
  assert.deepEqual(og(await renderFile('meta-tags', fresh, { page_image: fresh.images[0], page_title: 'Bonsaï' })), [
    `og:image=http:${FILES}${PHOTO[0]}?v=1`,
    `og:image:secure_url=https:${FILES}${PHOTO[0]}?v=1`,
    'og:image:width=2000',
    'og:image:height=2000',
    'og:image:alt=Bonsaï',
  ])
  for (const p of [product({ suffix: 'oeuvre-3d', files: [FLAT] }), product({ suffix: 'painting', files: [...OLD, PHOTO] })]) {
    const html = await renderFile('meta-tags', p, { page_image: p.images[0], page_title: 'Bonsaï' })
    assert.deepEqual(og(html), [
      `og:image=http:${p.images[0].src}`,
      `og:image:secure_url=https:${p.images[0].src}`,
      `og:image:width=${p.images[0].width}`,
      `og:image:height=${p.images[0].height}`,
      'og:image:alt=Bonsaï',
    ])
  }
  // Hors d'une fiche : page_image, sans chercher de photo.
  const page = await renderFile('meta-tags', product({ suffix: 'oeuvre-3d', files: [FLAT, PHOTO] }), {
    page_image: null, request: { page_type: 'page', origin: 'https://www.myselfmonart.com', locale: { iso_code: 'fr' } },
  })
  assert.deepEqual(og(page), [])
})

test('rendu de la fiche 3D sans 3D : ses photos ne comptent jamais la photo studio, ni l’œuvre à plat, ni le contour blanc', { skip: SKIP }, async () => {
  const photos = async (p, start) => {
    const html = await engine().renderFile('oeuvre-3d-stage', { product: p, start_from: start }, { globals: globals(p) })
    return [.../<template data-photos>([\s\S]*?)<\/template>/.exec(html)[1].matchAll(/src="([^"?]*)/g)].map((m) => m[1].split('/').pop())
  }
  assert.deepEqual(await photos(product({ suffix: 'oeuvre-3d', poster: true, files: [FLAT, PASSE, PHOTO] }), 1), [])
  assert.deepEqual(await photos(product({ suffix: 'oeuvre-3d', files: [FLAT, PHOTO, ['bonsai-zen-detail.jpg', 2000, 2000]] }), 1), ['bonsai-zen-detail.jpg'])
  // Un produit de toujours sous ?view=oeuvre-3d : ses photos, telles quelles.
  assert.deepEqual(await photos(product({ suffix: 'painting', files: [...OLD, PHOTO] }), 3), ['bonsai-zen-chambre.jpg', PHOTO[0]])
})

test('rendu de la carte, du panier et de « Mes j’aime » : aucune trace de la photo studio, dans aucun contexte', { skip: SKIP }, async () => {
  for (const poster of [false, true]) {
    const p = product({ suffix: 'oeuvre-3d', poster, files: [FLAT, PHOTO] })
    for (const context of ['carte', 'tiroir', 'panier']) {
      for (const frame of ['sans', 'noir']) {
        const html = await engine().renderFile('artwork-object', { product: p, image: p.media[0], kind: poster ? 'poster' : 'toile', frame, context }, { globals: globals(p) })
        assert.doesNotMatch(html, /photo-studio|oeuvre-card-sheen|width=2000/, `${context} ${frame}`)
        assert.equal(/data-context="/.test(html), context !== 'carte', `${context} : data-context`)
      }
    }
  }
})
