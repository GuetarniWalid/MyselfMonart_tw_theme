// Le menu d'ordinateur, « la bascule » (ticket 13 de .scratch/collection-design, oui de Walid du 26/11/2026) : dans la vue
// de test de la nouvelle page collection, dès 768 px, le logo et le nom en petit à gauche, un bouton par rayon au centre
// (snippets/menu-ordinateur.liquid), la recherche et le cœur à droite. Le menu qu'ils ouvrent est celui du téléphone
// (snippets/menu-telephone.liquid), rendu une seule fois et habillé en panneau par la feuille : pour Google, rien ne
// change. Ailleurs, l'en-tête d'aujourd'hui.
// Les coutures : le rendu Liquid (liquidjs), la logique des gestes (MenuOrdinateur.suite, pure, sous Node) et la feuille
// (input.css, « Le menu d'ordinateur »). Les essais dans un navigateur (captures, film, gestes) sont dans les notes du
// ticket.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/menu-ordinateur.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const vm = require('vm')
const { read, code, rules, SKIP, engine, locales, LANGS, templateOf } = require('./galerie-banc.cjs')

/* Le filtre t de Shopify avec son pluriel, et la balise {% form %} (le choix du pays) : ce fichier tourne dans son propre
   processus, son moteur ne sert qu'à lui. */
if (!SKIP) {
  for (const lang of Object.keys(LANGS)) {
    const e = engine(lang)
    e.registerFilter('t', (key, ...args) => {
      const values = Object.fromEntries(args.filter(Array.isArray))
      let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
      if (text && typeof text === 'object' && 'count' in values) text = text[new Intl.PluralRules(lang).select(Number(values.count))] ?? text.other
      if (typeof text !== 'string') return key
      return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? String(values[name]) : hole))
    })
    e.registerFilter('image_tag', (url) => `<img src="${url}" loading="lazy">`)
    e.registerFilter('base64_encode', (s) => Buffer.from(String(s)).toString('base64'))
    e.registerTag('form', {
      parse(token, remain) {
        this.tpls = []
        const stream = this.liquid.parser.parseStream(remain)
        stream.on('tag:endform', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('form non fermé') })
        stream.start()
      },
      * render(ctx, emitter) {
        emitter.write('<form method="post" action="/localization">')
        yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
        emitter.write('</form>')
      },
    })
  }
}

/* ---------- Un menu d'essai ---------- */

const FILES = '//www.myselfmonart.com/cdn/shop/files/'
const fichier = (nom) => ({ id: 1, src: `${FILES}${nom}?v=1`, width: 640, height: 528 })
let dernierId = 700000000000
/* Une collection telle que la donnent les réglages : avec son emblème et la couleur de son rond, ou sans. */
const col = (handle, title, count = 10, couleur = null, type = 'painting') => ({
  id: ++dernierId, handle, title, url: `/collections/${handle}`, all_products_count: count,
  metafields: { custom: { type_of_collection: type }, cocon: couleur ? { embleme: { value: fichier(`embleme-${handle}.webp`) }, embleme_couleur: { value: couleur } } : {} },
})
const TOUS = col('tous-les-tableaux', 'Tous les Tableaux', 890)
const BEST = col('bestsellers-1', 'Tableau best-seller', 90, 'soleil')
const SALON = col('tableau-salon', 'Tableau Salon', 496, 'soleil')
const CUISINE = col('tableau-cuisine', 'Tableau Cuisine', 123, 'ciel')
const BLEU = col('tableau-bleue', 'Tableau Bleu', 61, 'bleu')
const LION = col('tableau-lion', 'Tableau Lion', 16, 'menthe')
const VIDE = col('tableau-vide', 'Tableau Vide', 0, 'rose')
const POSTERS = col('posters-affiches', 'Tous les Posters & Affiches', 680, null, 'poster')
const ZEN = col('posters-affiches-zen', 'Poster & Affiche Zen', 88, 'lilas', 'poster')
const LION_POSTER = col('posters-affiches-lion', 'Poster & Affiche Lion', 30, 'soleil', 'poster')
const TAPISSERIES = col('tapisseries', 'Toutes les Tapisseries', 40, null, 'tapestry')
const TAP_SALON = col('tapisserie-salon', 'Tapisserie Salon', 22, 'peche', 'tapestry')
const bloc = (id, type, settings) => ({ id, type, settings })
const BLOCS = [
  bloc('t1', 'title_only', { title: 'Tableaux' }),
  bloc('c1', 'collection_only', { collection: TOUS }),
  bloc('g1', 'set_of_collections', { title: 'Par Pièce', child_collection_list: [SALON, CUISINE] }),
  bloc('g2', 'set_of_collections', { title: 'Par Couleur', child_collection_list: [BLEU, VIDE] }),
  bloc('g3', 'set_of_collections', { title: 'Animaux', child_collection_list: [LION] }),
  bloc('c2', 'collection_only', { collection: BEST }),
  bloc('t2', 'title_only', { title: 'Posters' }),
  bloc('c3', 'collection_only', { collection: POSTERS }),
  bloc('g4', 'set_of_collections', { title: 'Par Thème', child_collection_list: [ZEN, LION_POSTER] }),
]
// Les tapisseries arrivent : un titre de plus, sa tuile et son groupe.
const BLOCS_3 = [
  ...BLOCS,
  bloc('t3', 'title_only', { title: 'Tapisseries' }),
  bloc('c4', 'collection_only', { collection: TAPISSERIES }),
  bloc('g5', 'set_of_collections', { title: 'Par Pièce', child_collection_list: [TAP_SALON] }),
]
const PAYS = { country: { currency: { iso_code: 'EUR' } }, language: { iso_code: 'fr' }, available_countries: ['FR', 'CH', 'CA', 'US', 'GB', 'DK'].map((iso_code) => ({ iso_code })) }

/* L'en-tête rendu sur une page : par défaut, la vue de test d'une collection. */
function entete({ name = 'collection', suffix = 'refonte', collection = SALON, product = null, blocks = BLOCS, lang = 'fr' } = {}) {
  return engine(lang).parseAndRenderSync(read('snippets/tw-sticky-header.liquid'), {}, {
    globals: {
      template: templateOf(name, suffix), collection, product,
      settings: { social_facebook_link: 'https://www.facebook.com/x', order_tracking_url: '', likes_page: 'mes-jaime' },
      section: { id: 'tw-header', settings: { logo_svg: '' }, blocks },
      request: { locale: { iso_code: lang }, page_type: name, origin: 'https://www.myselfmonart.com' },
      routes: { root_url: '/', cart_url: '/cart', account_url: '/account', search_url: '/search' },
      shop: { name: 'MyselfMonArt' }, cart: { item_count: 0 }, localization: PAYS,
    },
  })
}
const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texte = (html) => unescape(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
/* La bascule des rayons (snippets/menu-ordinateur.liquid) : ses boutons, { attributs, nom }. */
const bascule = (html) => {
  const nav = /<nav class="menu-ordi-rayons"[\s\S]*?<\/nav>/.exec(html)
  return nav ? nav[0] : ''
}
const boutons = (html) => [...bascule(html).matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attributs, dedans]) => ({ attributs, dedans, nom: texte(dedans) }))
const attribut = (attributs, nom) => {
  const m = new RegExp(`\\b${nom}="([^"]*)"`).exec(attributs)
  return m ? unescape(m[1]) : null
}

/* ---------- La bascule ---------- */

test('dans la vue de test, la bascule : un bouton par rayon, sans chevron ; le vieux menu d’ordinateur n’est plus rendu', { skip: SKIP }, () => {
  for (const suffix of ['refonte', 'refonte-tableau-salon']) {
    const html = entete({ suffix })
    assert.deepEqual(boutons(html).map((b) => b.nom), ['Tableaux', 'Posters'], suffix)
    for (const b of boutons(html)) {
      assert.match(b.attributs, /\btype="button"/)
      // Aucun chevron, ni aucun autre dessin : le mot seul.
      assert.doesNotMatch(b.dedans, /<svg|<img|chevron/)
    }
    // Le vieux menu d'ordinateur : ni ses boutons, ni ses volets, ni leurs photos, ni Limelight.
    assert.doesNotMatch(html, /desktop-nav-button|desktop-dropdown|font-limelight/, suffix)
  }
})

/* La bascule seule (snippets/menu-ordinateur.liquid), sur n'importe quelle page : elle ira sur tout le site à la bascule
   du 1er décembre. */
function basculeSeule({ name = 'collection', collection = SALON, product = null, blocks = BLOCS, lang = 'fr' } = {}) {
  return engine(lang).renderFileSync('menu-ordinateur', {}, {
    globals: { template: templateOf(name, null), collection, product, section: { id: 'tw-header', settings: {}, blocks } },
  })
}
const courant = (html) => boutons(html).filter((b) => attribut(b.attributs, 'aria-current') === 'true').map((b) => b.nom)
// L'onglet choisi d'abord au téléphone (snippets/menu-telephone.liquid) : le bouton radio coché.
const ongletTelephone = (html) => [...html.matchAll(/<label class="menu-tel-onglet">(<input[^>]*>)<span>([\s\S]*?)<\/span>/g)].filter(([, input]) => /\bchecked\b/.test(input)).map(([, , nom]) => unescape(nom))

test('le rayon de la page : celui de sa collection ou de sa fiche, toile ou poster, comme au téléphone ; aucun ailleurs', { skip: SKIP }, () => {
  const POSTER = { type: 'poster', metafields: { artwork: {} } }
  const POSTER_3D = { type: 'painting', metafields: { artwork: { type: 'poster' } } }
  const TOILE = { type: 'painting', metafields: { artwork: {} } }
  const cas = [
    [{ collection: SALON }, ['Tableaux']],
    [{ collection: TOUS }, ['Tableaux']],
    [{ collection: ZEN }, ['Posters']],
    [{ collection: POSTERS }, ['Posters']],
    [{ name: 'product', collection: null, product: POSTER }, ['Posters']],
    [{ name: 'product', collection: null, product: POSTER_3D }, ['Posters']],
    [{ name: 'product', collection: null, product: TOILE }, ['Tableaux']],
  ]
  for (const [page, attendu] of cas) {
    const html = basculeSeule(page)
    assert.deepEqual(courant(html), attendu, JSON.stringify(page.collection ? page.collection.handle : page.product))
  }
  // Dans la vue de test, le même rayon que l'onglet choisi d'abord au téléphone : une seule règle pour les deux menus
  // (snippets/menu-rayon-page.liquid), les tapisseries comprises.
  for (const [collection, blocks] of [[SALON, BLOCS], [TOUS, BLOCS], [BLEU, BLOCS], [ZEN, BLOCS], [POSTERS, BLOCS], [LION_POSTER, BLOCS], [TAP_SALON, BLOCS_3], [ZEN, BLOCS_3]]) {
    const html = entete({ collection, blocks })
    assert.deepEqual(courant(html), ongletTelephone(html), collection.handle)
  }
  assert.deepEqual(ongletTelephone(entete({ collection: TAP_SALON, blocks: BLOCS_3 })), ['Tapisseries'])
  for (const fichier of ['snippets/menu-ordinateur.liquid', 'snippets/menu-telephone.liquid']) assert.match(code(fichier), /render 'menu-rayon-page'/, fichier)
  // Une page sans rayon : aucun bouton marqué (la pastille n'y est pas).
  for (const name of ['index', 'cart', 'page', 'search', 'article', '404']) {
    assert.deepEqual(courant(basculeSeule({ name, collection: null })), [], name)
  }
})

test('trois rayons : un bloc title_only de plus suffit ; chaque bouton dit s’il est ouvert et quel rayon du menu il montre', { skip: SKIP }, () => {
  const html = entete({ blocks: BLOCS_3 })
  assert.deepEqual(boutons(html).map((b) => b.nom), ['Tableaux', 'Posters', 'Tapisseries'])
  assert.match(bascule(html), /<nav class="menu-ordi-rayons" aria-label="Navigation principale" data-n="3">/)
  boutons(html).forEach((b, i) => {
    assert.equal(attribut(b.attributs, 'aria-expanded'), 'false')
    const id = attribut(b.attributs, 'aria-controls')
    assert.equal(id, `menu-tel-rayon-${i + 1}`)
    // Le rayon qu'il montre : celui du menu du téléphone, au même rang.
    assert.match(html, new RegExp(`<section class="menu-tel-rayon" id="${id}" data-rayon="${i + 1}" aria-label="${b.nom}">`))
  })
  // Au téléphone, trois onglets.
  assert.match(html, /class="menu-tel-bascule" role="radiogroup" aria-label="Toiles ou posters" style="--n: 3"/)
  // Une collection de tapisseries : son rayon.
  assert.deepEqual(courant(entete({ blocks: BLOCS_3, collection: TAP_SALON })), ['Tapisseries'])
  // Ses liens, une fois chacun, après ceux des posters.
  const liens = liensCollections(enteteSeul(html)).map(([href]) => href)
  assert.deepEqual(liens.slice(-2), ['/collections/tapisseries', '/collections/tapisserie-salon'])
  assert.equal(new Set(liens).size, liens.length)
})

/* ---------- La barre ---------- */

test('la barre : le bouton du téléphone, le logo et son nom, la bascule, la recherche et le cœur ; le voile dessous', { skip: SKIP }, () => {
  const html = enteteSeul(entete())
  // L'en-tête (la barre et le voile) : le conteneur dont la feuille mesure la largeur.
  assert.match(html, /^<sticky-header[^>]*>\s*<div class="menu-ordi-entete">\s*<div class="[^"]*\bmenu-ordi-barre\b/)
  // Dans l'ordre de la page (celui du clavier) : le bouton du téléphone (caché sur ordinateur), le logo, les rayons,
  // la recherche, le cœur.
  const places = ['<details class="inline-block h-full menu-ordi-details">', 'class="menu-ordi-nom', '<nav class="menu-ordi-rayons"', 'id="open-search-loup"', 'class="entete-coeur']
  const rangs = places.map((p) => html.indexOf(p))
  for (const [i, rang] of rangs.entries()) assert.ok(rang > 0, places[i])
  assert.deepEqual([...rangs].sort((a, b) => a - b), rangs)
  // Le bouton du téléphone n'est plus caché avec son menu : c'est la feuille qui le cache, dès 768 px.
  assert.doesNotMatch(/<details class="[^"]*menu-ordi-details[^"]*"/.exec(html)[0], /md:hidden/)
  // Le nom, en petit, dans la police de la marque ; le logo le nomme déjà (aria-label du lien).
  assert.match(html, /<span class="menu-ordi-nom font-heading" aria-hidden="true">MyselfMonArt<\/span>/)
  // La recherche d'aujourd'hui, son bouton de toujours, avec son mot (dès 1024 px), dans les cinq langues ; le voile.
  const MOTS = { fr: 'Recherche', en: 'Search', de: 'Suche', es: 'Búsqueda', nl: 'Zoeken' }
  for (const [lang, mot] of Object.entries(MOTS)) {
    const loupe = /<button id="open-search-loup" class="([^"]*)">([\s\S]*?)<\/button>/.exec(entete({ lang }))
    assert.match(loupe[1], /\bmenu-ordi-loupe\b/, lang)
    assert.match(loupe[2], new RegExp(`<span class="menu-ordi-mot" aria-hidden="true">${mot}</span>`), lang)
  }
  // Vides, la pastille et le voile ne se cachent pas (input.css cache tout élément vide sans data-allow-empty).
  assert.match(html, /<\/div>\s*<div class="menu-ordi-voile" data-allow-empty><\/div>/)
  // La pastille, en quatre parts vides : son ombre, ses deux bouts, son milieu.
  const PARTS = ['ombre', 'bout', 'bout', 'milieu'].map((part) => `<span class="menu-ordi-pastille-${part}" data-allow-empty></span>`)
  assert.match(html, new RegExp(`<span class="menu-ordi-pastille" aria-hidden="true">\\s*${PARTS.join('\\s*')}\\s*</span>`))
  // Hors de la vue de test, rien de tout cela.
  for (const page of [{ name: 'index', suffix: null, collection: null }, { suffix: null }, { suffix: 'tableau-salon' }]) {
    assert.doesNotMatch(entete(page), /menu-ordi/, JSON.stringify(page))
  }
})

test('aucun texte en dur : les mots de la bascule et de la recherche viennent des réglages ou des fichiers de langue', () => {
  const source = code('snippets/menu-ordinateur.liquid')
  // Entre deux balises, rien d'écrit à la main : seulement du Liquid.
  for (const [, entre] of source.matchAll(/>([^<]+)</g)) assert.match(entre.replace(/{%-?[\s\S]*?-?%}/g, '').replace(/{{[\s\S]*?}}/g, ''), /^\s*$/, entre)
  for (const [, valeur] of source.matchAll(/aria-label="([^"]*)"/g)) assert.match(valeur, /^{{ '[\w.]+' \| t }}$/)
  // Les clés existent dans les cinq langues.
  for (const cle of ['snippet.tw_sticky_header.main_nav', 'snippet.tw_sticky_header.navigation', 'snippet.tw_predictive_search.input_placeholder']) {
    for (const lang of Object.keys(LANGS)) assert.equal(typeof cle.split('.').reduce((n, p) => n && n[p], locales[lang]), 'string', `${lang} : ${cle}`)
  }
})

/* ---------- La feuille ---------- */

const INPUT = read('input.css').replace(/\r\n/g, '\n')
const DEBUT = "/* ---- Le menu d'ordinateur (snippets/menu-ordinateur.liquid, .menu-ordi) ----"
const FIN = "/* ---- Fin du menu d'ordinateur ---- */"
const BLOC = INPUT.slice(INPUT.indexOf(DEBUT), INPUT.indexOf(FIN)).replace(/\/\*[\s\S]*?\*\//g, '')
/* Les règles de la feuille (rules, de galerie-banc.cjs), en entrant aussi dans les @container : leur contexte les dit. */
const toutes = (css, context = []) => rules(css, context).flatMap((r) => (/^@container\b/.test(r.head) ? toutes(r.body, [...r.context, r.head]) : [r]))
const REGLES = toutes(BLOC)
const NO_PREF = 'prefers-reduced-motion: no-preference'
const ORDI = '(min-width: 768px)'
const corps = (head, test = () => true) => REGLES.filter((r) => r.head === head && test(r.context.join(' '))).map((r) => r.body).join(' ')

test('la feuille : un bloc à part, dont chaque règle vise le nouvel en-tête (.menu-ordi)', () => {
  assert.ok(INPUT.indexOf(DEBUT) > 0 && INPUT.indexOf(FIN) > INPUT.indexOf(DEBUT))
  const liste = REGLES.filter((r) => !r.head.startsWith('@'))
  assert.ok(liste.length >= 40, String(liste.length))
  for (const { head } of liste) for (const s of head.split(/,(?![^(]*\))/)) assert.match(s, /\.menu-ordi/, head)
  // Chaque classe de la bascule a sa règle.
  const classes = new Set([...code('snippets/menu-ordinateur.liquid').matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => c.startsWith('menu-ordi')))
  assert.deepEqual([...classes].sort(), ['menu-ordi-bascule', 'menu-ordi-pastille', 'menu-ordi-pastille-bout', 'menu-ordi-pastille-milieu', 'menu-ordi-pastille-ombre', 'menu-ordi-rayon', 'menu-ordi-rayons'])
  for (const classe of [...classes, 'menu-ordi-entete', 'menu-ordi-barre', 'menu-ordi-details', 'menu-ordi-nom', 'menu-ordi-outils', 'menu-ordi-loupe', 'menu-ordi-mot', 'menu-ordi-voile']) {
    assert.match(BLOC, new RegExp(`\\.${classe}(?![\\w-])`), classe)
  }
})

test('la feuille : sous 768 px, rien de l’ordinateur ne se montre ; dès 768 px, la barre en trois colonnes, et le bouton du téléphone se cache', () => {
  // Au téléphone : ni bascule, ni nom, ni mot de la recherche, ni voile.
  const cache = REGLES.find((r) => !r.context.length && /display: none;/.test(r.body) && r.head.includes('.menu-ordi-rayons'))
  assert.ok(cache, 'une règle qui cache la bascule au téléphone')
  for (const c of ['.menu-ordi-rayons', '.menu-ordi-nom', '.menu-ordi-mot', '.menu-ordi-voile']) assert.ok(cache.head.includes(c), c)
  // Dès 768 px (le seuil du script et de md:), la barre : logo, rayons au centre, outils.
  assert.match(corps(':root .menu-ordi-barre', (c) => c.includes(ORDI)), /display: grid; grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\);/)
  assert.match(corps('.menu-ordi-details > .menu-opener', (c) => c.includes(ORDI)), /display: none;/)
  // La largeur de l'en-tête décide de la place (le nom, puis le champ de recherche cèdent leur place) : un conteneur.
  assert.match(corps(':root .menu-ordi-entete', (c) => c.includes(ORDI)), /container: menu-ordi \/ inline-size;/)
})

test('la feuille : le voile a la largeur du conteneur écrite en cqw (Firefox et Zen le mesuraient à 0 px)', () => {
  // Placé en absolu dans un conteneur « inline-size », un élément se mesure dans Gecko sur une boîte de largeur nulle :
  // left: 0 et right: 0 seuls, ou width: 100 %, y donnaient 0 px (Zen 1.24, Gecko 160, le 27/11/2026) ; 100cqw, la
  // largeur du conteneur, donne la même chose dans Chrome et dans Gecko.
  assert.match(corps(':root .menu-ordi-voile', (c) => c.includes(ORDI)), /position: absolute;[^}]*left: 0;[^}]*width: 100cqw;/)
})

test('la feuille : les couleurs sont celles des nouvelles pages, et la pastille a le dessin de celle du téléphone', () => {
  const variables = (css) => Object.fromEntries([...css.matchAll(/(--[a-z][\w-]*):\s*([^;]+);/g)].map(([, nom, valeur]) => [nom, valeur.trim()]))
  const page = variables(rules(read('assets/collection-refonte.css').replace(/\/\*[\s\S]*?\*\//g, '')).find((r) => r.head === ':root[data-refonte-page]').body)
  const ici = variables(corps(':root .menu-ordi-entete', (c) => !c))
  for (const nom of ['--encre', '--encre-55', '--encre-12', '--encre-06', '--blanc']) assert.equal(ici[nom], page[nom], nom)
  // Hors de ces variables, aucune couleur écrite ; aucune police hors de --sans.
  const ailleurs = REGLES.filter((r) => !(r.head === ':root .menu-ordi-entete' && !r.context.length)).map((r) => r.body).join('\n')
  assert.doesNotMatch(ailleurs, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i)
  for (const [, police] of ailleurs.matchAll(/\bfont:\s*([^;]+);/g)) assert.match(police, /var\(--sans\)$/, police)
  // Une seule pastille : blanche, cerclée d'encre, l'ombre de celle du téléphone (.menu-tel-bascule::before), que ses
  // parts se partagent : le cercle d'encre autour des bouts, ses deux traits sur le milieu, l'ombre douce dessous.
  const TEL = read('input.css').replace(/\r\n/g, '\n')
  const ombreTel = /\.menu-tel-bascule::before \{[^}]*box-shadow: ([^;]+);/.exec(TEL)[1]
  const [cercle, douce] = ombreTel.split(/,\s*(?![^(]*\))/)
  const [, trait, encre] = /^0 0 0 (\d+px) (.+)$/.exec(cercle)
  const part = (nom) => corps(`.menu-ordi-pastille-${nom}`, (c) => c.includes(ORDI))
  for (const nom of ['bout', 'milieu']) assert.match(part(nom), /background: var\(--blanc\);/, nom)
  assert.ok(part('bout').includes(`box-shadow: ${cercle};`), part('bout'))
  assert.ok(part('milieu').includes(`box-shadow: 0 -${trait} 0 ${encre}, 0 ${trait} 0 ${encre};`), part('milieu'))
  assert.ok(part('ombre').includes(`box-shadow: ${douce};`), part('ombre'))
  // Les bouts sont ronds, de la hauteur de la pastille ; le milieu part du centre du premier, et s'étire depuis là.
  assert.match(corps('.menu-ordi-pastille', (c) => c.includes(ORDI)), /--d: 42px;[^}]*height: var\(--d\);/)
  assert.match(corps('.menu-ordi-pastille-ombre, .menu-ordi-pastille-bout', (c) => c.includes(ORDI)), /width: var\(--d\);/)
  assert.match(part('bout'), /border-radius: 50%;/)
  assert.match(part('milieu'), /left: calc\(var\(--d\) \/ 2\);[^}]*transform-origin: 0 50%;/)
})

test('la feuille : le mouvement, seulement sans « mouvements réduits » ; le rideau, le voile et ses 6 px de flou, des vagues finies avant 0,6 s', () => {
  for (const r of REGLES) {
    if (r.head.startsWith('@keyframes')) continue
    // Retirer un mouvement (« transition: none ») n'en est pas un.
    const body = r.body.replace(/(^|[;\s])(animation|transition):\s*none;/g, '$1')
    if (/(^|[;\s])(animation|transition)[\w-]*\s*:/.test(body)) assert.ok(r.context.some((c) => c.includes(NO_PREF)), r.head)
    // Le flou aussi : il saute avec « mouvements réduits ».
    if (/backdrop-filter/.test(r.body)) assert.ok(r.context.some((c) => c.includes(NO_PREF)), r.head)
  }
  const mouvement = (c) => c.includes(NO_PREF)
  const COURBE = 'cubic-bezier(0.32, 0.72, 0, 1)'
  // Le rideau : il descend en 0,45 s, remonte en 0,24 s, sur la courbe de la pastille ; il ne découpe que (clip-path).
  assert.ok(corps(':root .menu-ordi-barre .menu-tel', mouvement).includes(`transition: clip-path 0.24s ${COURBE};`))
  assert.ok(corps(':root .menu-ordi-barre .menu-tel[data-ordi="ouvert"]', mouvement).includes(`transition: clip-path 0.45s ${COURBE};`))
  assert.match(corps(':root .menu-ordi-barre .menu-tel'), /clip-path: inset\(0 0 100% 0\);/)
  assert.match(corps(':root .menu-ordi-barre .menu-tel[data-ordi="ouvert"]'), /clip-path: inset\(0\);/)
  // Le voile : il arrive en 0,3 s, s'efface avec le rideau (0,24 s), puis se cache ; le flou de 6 px.
  const voile = corps('.menu-ordi-voile', mouvement)
  assert.match(voile, /transition: opacity 0.24s ease, visibility 0s linear 0.24s;/)
  assert.match(voile, /backdrop-filter: blur\(6px\);/)
  assert.match(corps('.menu-ordi-voile[data-vu]', mouvement), /transition: opacity 0.3s ease, visibility 0s;/)
  // Prêt et fermé, le panneau est caché (ni vu, ni lu, ni atteint au clavier), son contenu gardé tel quel.
  assert.match(corps(':root .menu-ordi-barre .menu-tel[data-ordi="repos"]', (c) => !c.includes('@supports')), /content-visibility: hidden;/)
  assert.match(corps(':root .menu-ordi-barre .menu-tel[data-ordi="repos"]', (c) => c.includes('@supports not')), /visibility: hidden;/)
  // Les vagues : le contenu monte de 8 px ; les rangées à 35 ms l'une de l'autre, les emblèmes à 12 ms ; tout fini avant
  // 0,6 s, le plus long retard compris.
  assert.match(REGLES.find((r) => r.head === '@keyframes menu-ordi-monte').body, /from \{ opacity: 0; translate: 0 8px; \}/)
  const vague = REGLES.find((r) => /animation: menu-ordi-monte/.test(r.body))
  assert.ok(vague && mouvement(vague.context.join(' ')))
  const duree = Number(/animation: menu-ordi-monte ([\d.]+)s/.exec(vague.body)[1])
  const [, formule, plafond] = /animation-delay: min\((.+), ([\d.]+)s\);/.exec(vague.body)
  assert.match(formule, /var\(--rang, 0\) \* 35ms/)
  assert.match(formule, /var\(--place, 0\) \* 12ms/)
  assert.ok(duree + Number(plafond) < 0.6, `${duree} + ${plafond}`)
})

test('la feuille : les emblèmes, à la plus grande taille entre 44 et 66 px où tout le rayon tient', () => {
  const panneau = corps(':root .menu-ordi-barre .menu-tel', (c) => c.includes(ORDI) && !c.includes('prefers'))
  // Une formule : la hauteur sous l'en-tête (40 px de la page restent en vue), la largeur de l'écran, le nombre de rangées
  // et d'emblèmes de la plus longue rangée (posés par le script).
  assert.match(panneau, /--emb: clamp\(44px, min\(var\(--emb-h\), var\(--emb-l\)\), 66px\);/)
  // --panneau-haut, et non --menu-haut, que le menu du téléphone pose sur le même panneau quand il s'ouvre : les deux
  // menus ne se mélangent pas.
  assert.match(panneau, /--emb-h: calc\(\(100dvh - var\(--panneau-haut, 123px\) - 40px - var\(--fixe, 302px\)\) \/ \(1\.3 \* var\(--rangees, 5\)\)\);/)
  assert.doesNotMatch(BLOC, /--menu-haut/)
  assert.match(panneau, /--rangee-l: calc\(100cqw /)
  assert.match(panneau, /--emb-l: calc\(\(var\(--rangee-l\) - var\(--colonnes, 7\)/)
  // Ce que le script mesure et pose sur le panneau.
  const script = read('assets/tw-header.js')
  for (const nom of ['--fixe', '--rangees', '--colonnes', '--panneau-haut']) assert.ok(script.includes(`'${nom}'`), nom)
})

test('le téléphone : quatre onglets, comme trois', () => {
  const TEL = INPUT.slice(INPUT.indexOf('/* ---- Le menu du téléphone ('), INPUT.indexOf('/* ---- Fin du menu du téléphone ---- */'))
  for (const n of [2, 3, 4]) assert.ok(TEL.includes(`.menu-tel-bascule:has(.menu-tel-onglet:nth-child(${n}) :checked) { --i: ${n - 1}; }`), String(n))
  for (const n of [1, 2, 3, 4]) assert.ok(TEL.includes(`.menu-tel:has(.menu-tel-onglet:nth-child(${n}) :checked) .menu-tel-rayon:not([data-rayon="${n}"])`), String(n))
})

test('la feuille construite porte le menu d’ordinateur', () => {
  const css = read('assets/output.css')
  for (const bout of ['.menu-ordi-pastille{', '@keyframes menu-ordi-monte', 'container:menu-ordi/inline-size', '.menu-tel-onglet:nth-child(4) :checked']) assert.ok(css.includes(bout), bout)
})

/* ---------- Les gestes (MenuOrdinateur.suite, pur) ---------- */

/* Le script de l'en-tête, tel que le navigateur le lit (ce n'est pas un module), dans un bac à sable : la logique des
   gestes s'y lit sans page. Rend la classe demandée (MenuOrdinateur, MenuTelephone). */
function duScript(nom) {
  const bac = { HTMLElement: class {}, customElements: { define() {}, get() {} }, document: { querySelector: () => null } }
  bac.window = bac
  vm.createContext(bac)
  vm.runInContext(read('assets/tw-header.js'), bac, { filename: 'assets/tw-header.js' })
  return vm.runInContext(nom, bac)
}

/* Un essai de gestes, avec une horloge : chaque geste passe par MenuOrdinateur.suite ; les minuteries qu'il pose
   sonnent quand on attend. On lit l'état, la pastille et ce qui a été fait (ouvrir, fermer, entrer dans le panneau). */
function essai({ courant = 1 } = {}) {
  const { suite } = duScript('MenuOrdinateur')
  let etat = { ouvert: 0, par: null, vise: 0, courant }
  let temps = 0
  let minuteries = []
  const faits = []
  let pastille = courant
  const geste = (g) => {
    const r = suite(etat, g)
    etat = r.etat
    for (const f of r.faire) {
      if ('pastille' in f) pastille = f.pastille
      else if (f.planifier) minuteries = [...minuteries.filter((m) => m.quoi !== f.planifier), { quoi: f.planifier, rayon: f.rayon, a: temps + f.delai }]
      else if (f.annuler) minuteries = minuteries.filter((m) => m.quoi !== f.annuler)
      else faits.push({ ...f, t: temps })
    }
    return api
  }
  const api = {
    geste,
    attendre(ms) {
      const fin = temps + ms
      for (;;) {
        const prochaine = minuteries.filter((m) => m.a <= fin).sort((a, b) => a.a - b.a)[0]
        if (!prochaine) break
        temps = prochaine.a
        minuteries = minuteries.filter((m) => m !== prochaine)
        geste({ type: 'minuterie', quoi: prochaine.quoi, rayon: prochaine.rayon })
      }
      temps = fin
      return api
    },
    get etat() { return etat },
    get pastille() { return pastille },
    faits,
    // Ce qui a été fait, en peu de mots : « ouvrir 1 (rideau) », « ouvrir 2 (depuis 1) », « fermer 2 ».
    get resume() {
      return faits.map((f) => (f.ouvrir ? `ouvrir ${f.ouvrir} (${f.avant ? `depuis ${f.avant}` : 'rideau'})` : f.fermer ? `fermer ${f.fermer}${f.focus ? ' et rendre le focus' : ''}${f.instant ? ' tout de suite' : ''}` : f.entrer ? 'entrer dans le panneau' : JSON.stringify(f)))
    },
  }
  return api
}

test('au survol, la pastille glisse aussitôt ; le menu s’ouvre après 0,3 s d’arrêt ; si la souris repart avant, la pastille revient', () => {
  const e = essai({ courant: 1 })
  e.geste({ type: 'entre', rayon: 2 })
  assert.equal(e.pastille, 2, 'la pastille, aussitôt')
  e.attendre(290)
  assert.deepEqual(e.resume, [], 'pas encore ouvert')
  e.attendre(10)
  assert.deepEqual(e.resume, ['ouvrir 2 (rideau)'])
  assert.equal(e.etat.par, 'survol')
  // Repartie avant : rien ne s'ouvre, la pastille revient au rayon de la page.
  const f = essai({ courant: 1 })
  f.geste({ type: 'entre', rayon: 2 }).attendre(200).geste({ type: 'sort', rayon: 2 }).attendre(1000)
  assert.deepEqual(f.resume, [])
  assert.equal(f.pastille, 1)
  // Sur une page sans rayon, elle disparaît.
  const g = essai({ courant: 0 })
  g.geste({ type: 'entre', rayon: 1 })
  assert.equal(g.pastille, 1)
  g.geste({ type: 'sort', rayon: 1 })
  assert.equal(g.pastille, 0)
})

test('menu ouvert, on passe d’un rayon à l’autre en 0,14 s, sans le refermer ; la pastille suit la souris aussitôt', () => {
  const e = essai()
  e.geste({ type: 'entre', rayon: 1 }).attendre(300)
  e.geste({ type: 'sort', rayon: 1 }).geste({ type: 'entre', rayon: 2 })
  assert.equal(e.pastille, 2)
  e.attendre(139)
  assert.deepEqual(e.resume, ['ouvrir 1 (rideau)'])
  e.attendre(1)
  assert.deepEqual(e.resume, ['ouvrir 1 (rideau)', 'ouvrir 2 (depuis 1)'])
  // Passée trop vite sur un rayon (moins de 0,14 s), la souris descend dans le panneau : il reste où il était.
  e.geste({ type: 'sort', rayon: 2 }).geste({ type: 'entre', rayon: 1 }).attendre(80).geste({ type: 'sort', rayon: 1 }).attendre(500)
  assert.equal(e.etat.ouvert, 2)
  assert.equal(e.pastille, 2)
})

test('ouvert au survol, il se ferme 0,5 s après que la souris a quitté l’en-tête et le panneau ; y revenir avant l’en empêche', () => {
  const e = essai()
  e.geste({ type: 'zone-entre' }).geste({ type: 'entre', rayon: 1 }).attendre(300)
  e.geste({ type: 'sort', rayon: 1 }).geste({ type: 'zone-sort' }).attendre(400)
  e.geste({ type: 'zone-entre' }).attendre(1000)
  assert.equal(e.etat.ouvert, 1, 'revenue à temps')
  e.geste({ type: 'zone-sort' }).attendre(499)
  assert.equal(e.etat.ouvert, 1)
  e.attendre(1)
  assert.deepEqual(e.resume, ['ouvrir 1 (rideau)', 'fermer 1'])
  assert.equal(e.pastille, 1, 'la pastille revient au rayon de la page')
})

test('au clic, il s’ouvre et se ferme ; un clic juste après l’ouverture au survol l’épingle au lieu de le refermer', () => {
  const e = essai()
  e.geste({ type: 'clic', rayon: 2, par: 'souris' })
  assert.deepEqual(e.resume, ['ouvrir 2 (rideau)'])
  e.geste({ type: 'clic', rayon: 2, par: 'souris' })
  assert.deepEqual(e.resume, ['ouvrir 2 (rideau)', 'fermer 2'])
  // Ouvert au survol, puis cliqué : il reste, épinglé ; la souris qui part ne le ferme plus, un second clic le ferme.
  const f = essai()
  f.geste({ type: 'zone-entre' }).geste({ type: 'entre', rayon: 1 }).attendre(300).geste({ type: 'clic', rayon: 1, par: 'souris' })
  assert.deepEqual(f.resume, ['ouvrir 1 (rideau)'])
  f.geste({ type: 'sort', rayon: 1 }).geste({ type: 'zone-sort' }).attendre(2000)
  assert.equal(f.etat.ouvert, 1)
  // Épinglé, il le reste quand la souris passe à l'autre rayon.
  f.geste({ type: 'zone-entre' }).geste({ type: 'entre', rayon: 2 }).attendre(140).geste({ type: 'sort', rayon: 2 }).geste({ type: 'zone-sort' }).attendre(2000)
  assert.equal(f.etat.ouvert, 2)
  f.geste({ type: 'clic', rayon: 2, par: 'souris' })
  assert.equal(f.etat.ouvert, 0)
  // Cliqué pendant l'arrêt de 0,3 s : ouvert tout de suite, sans attendre la minuterie.
  const g = essai()
  g.geste({ type: 'entre', rayon: 2 }).attendre(100).geste({ type: 'clic', rayon: 2, par: 'souris' }).attendre(1000)
  assert.deepEqual(g.resume, ['ouvrir 2 (rideau)'])
})

test('au toucher (iPad, sans survol) : ouvrir, changer de rayon, refermer', () => {
  const e = essai()
  e.geste({ type: 'clic', rayon: 1, par: 'toucher' }).geste({ type: 'clic', rayon: 2, par: 'toucher' }).geste({ type: 'clic', rayon: 2, par: 'toucher' })
  assert.deepEqual(e.resume, ['ouvrir 1 (rideau)', 'ouvrir 2 (depuis 1)', 'fermer 2'])
})

test('au clavier : Entrée ou Espace ouvrent, flèche bas ouvre et entre, les flèches changent de rayon, Échap ferme et rend le focus', () => {
  const e = essai()
  e.geste({ type: 'clic', rayon: 1, par: 'clavier' })
  assert.deepEqual(e.resume, ['ouvrir 1 (rideau)'])
  // Un second Entrée le referme (le focus est déjà sur le rayon).
  e.geste({ type: 'clic', rayon: 1, par: 'clavier' })
  assert.deepEqual(e.resume.slice(-1), ['fermer 1'])
  // Fermé, les flèches ne font que déplacer le focus ; ouvert, elles changent de rayon.
  e.geste({ type: 'va', rayon: 2 })
  assert.equal(e.etat.ouvert, 0)
  e.geste({ type: 'bas', rayon: 2 })
  assert.deepEqual(e.resume.slice(-2), ['ouvrir 2 (rideau)', 'entrer dans le panneau'])
  e.geste({ type: 'va', rayon: 1 })
  assert.deepEqual(e.resume.slice(-1), ['ouvrir 1 (depuis 2)'])
  // Flèche bas sur le rayon déjà ouvert : on entre, sans le rouvrir.
  e.geste({ type: 'bas', rayon: 1 })
  assert.deepEqual(e.resume.slice(-1), ['entrer dans le panneau'])
  e.geste({ type: 'echap', focusDedans: true })
  assert.deepEqual(e.resume.slice(-1), ['fermer 1 et rendre le focus'])
  // Échap, menu fermé : rien.
  e.geste({ type: 'echap', focusDedans: true })
  assert.equal(e.faits.length, 7)
})

test('un clic à côté, le focus qui sort, l’en-tête qui part le ferment ; le passage au téléphone le ferme tout de suite', () => {
  for (const type of ['dehors', 'focus-sort', 'entete-part']) {
    const e = essai()
    e.geste({ type: 'clic', rayon: 2, par: 'souris' }).geste({ type })
    assert.deepEqual(e.resume, ['ouvrir 2 (rideau)', 'fermer 2'], type)
    assert.equal(e.pastille, 1, type)
  }
  const e = essai()
  e.geste({ type: 'entre', rayon: 2 }).attendre(300).geste({ type: 'telephone' }).attendre(2000)
  assert.deepEqual(e.resume, ['ouvrir 2 (rideau)', 'fermer 2 tout de suite'])
  // Une minuterie en cours ne rouvre rien après.
  const f = essai()
  f.geste({ type: 'entre', rayon: 2 }).attendre(100).geste({ type: 'telephone' }).attendre(2000)
  assert.deepEqual(f.resume, [])
})

/* ---------- Le panneau, à l'ordinateur puis rendu au téléphone (MenuTelephone.passerSurOrdinateur) ---------- */

/* Un panneau d'essai, tel que le rend snippets/menu-telephone.liquid : un dialogue nommé, sa liste (nav), deux groupes
   (le premier ouvert d'abord : data-ouvert) et leurs titres. */
function panneauEssai() {
  const element = (attributs = {}) => {
    const e = { attributs: { ...attributs }, ecouteurs: {} }
    e.getAttribute = (nom) => (nom in e.attributs ? e.attributs[nom] : null)
    e.setAttribute = (nom, valeur) => { e.attributs[nom] = String(valeur) }
    e.removeAttribute = (nom) => { delete e.attributs[nom] }
    e.hasAttribute = (nom) => nom in e.attributs
    e.addEventListener = (type, f) => { e.ecouteurs[type] = f }
    return e
  }
  const groupe = (depart) => {
    const g = element(depart ? { 'data-ouvert': '' } : {})
    g.open = depart
    g.titre = element()
    g.querySelector = (s) => (s === 'summary' ? g.titre : null)
    return g
  }
  const p = element({ role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu de navigation', tabindex: '-1' })
  p.liste = element({ 'aria-label': 'Navigation principale' })
  p.groupes = [groupe(true), groupe(false)]
  p.querySelector = (s) => ({ nav: p.liste })[s] || null
  p.querySelectorAll = () => p.groupes
  return p
}

test('sur ordinateur, le panneau n’est plus un dialogue et sa liste prend son nom ; ses groupes restent ouverts, leurs titres ne les ferment pas ; au téléphone, tout revient', () => {
  const MenuTelephone = duScript('MenuTelephone')
  const p = panneauEssai()
  const tel = new MenuTelephone(p)
  const clic = (g) => {
    let empeche = false
    g.titre.ecouteurs.click({ preventDefault: () => (empeche = true) })
    return empeche
  }
  // Au téléphone, un titre ouvre et ferme son groupe.
  assert.equal(clic(p.groupes[0]), false)
  tel.passerSurOrdinateur(true)
  // Le reste de la page n'est pas bloqué ; la bascule s'appelle déjà « Navigation principale » : la liste prend le nom
  // du menu, pas deux fois le même.
  assert.deepEqual(p.attributs, { tabindex: '-1' })
  assert.equal(p.liste.getAttribute('aria-label'), 'Menu de navigation')
  assert.deepEqual(p.groupes.map((g) => g.open), [true, true])
  assert.deepEqual(p.groupes.map((g) => g.titre.getAttribute('tabindex')), ['-1', '-1'])
  assert.deepEqual(p.groupes.map(clic), [true, true])
  // Une seconde fois ne change rien.
  tel.passerSurOrdinateur(true)
  assert.equal(p.liste.getAttribute('aria-label'), 'Menu de navigation')
  // De retour au téléphone : le dialogue et ses noms, le groupe du départ seul ouvert, les titres qui marchent.
  tel.passerSurOrdinateur(false)
  assert.deepEqual(p.attributs, { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu de navigation', tabindex: '-1' })
  assert.equal(p.liste.getAttribute('aria-label'), 'Navigation principale')
  assert.deepEqual(p.groupes.map((g) => g.open), [true, false])
  assert.deepEqual(p.groupes.map((g) => g.titre.getAttribute('tabindex')), [null, null])
  assert.deepEqual(p.groupes.map(clic), [false, false])
})

/* ---------- Le cocon : pour Google, rien ne change ---------- */

const enteteSeul = (html) => /<sticky-header[\s\S]*<\/sticky-header>/.exec(html)[0]
const liensCollections = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, dedans]) => [href, texte(dedans)]).filter(([href]) => href.includes('/collections/'))

test('les liens du menu, une seule fois : ceux du menu du téléphone, dans son ordre, ni en double ni en data-url64', { skip: SKIP }, () => {
  const html = enteteSeul(entete())
  // Le menu du téléphone, rayon par rayon : les tuiles, puis les groupes (sans les collections vides). Le mot de type
  // reste dans le nom du lien.
  assert.deepEqual(liensCollections(html), [
    ['/collections/tous-les-tableaux', 'Tous les Tableaux'], ['/collections/bestsellers-1', 'Tableau best-seller'],
    ['/collections/tableau-salon', 'Tableau Salon'], ['/collections/tableau-cuisine', 'Tableau Cuisine'],
    ['/collections/tableau-bleue', 'Tableau Bleu'], ['/collections/tableau-lion', 'Tableau Lion'],
    ['/collections/posters-affiches', 'Tous les Posters & Affiches'], ['/collections/posters-affiches-zen', 'Poster & Affiche Zen'],
    ['/collections/posters-affiches-lion', 'Poster & Affiche Lion'],
  ])
  // Aucune deuxième copie : aucun lien chiffré (data-url64) vers une collection. Les seuls qui restent sont ceux du
  // téléphone d'aujourd'hui, une fois chacun : les réseaux, au bas de son menu, et le cœur des j'aime.
  const chiffres = [...html.matchAll(/data-url64="([^"]+)"/g)].map((m) => Buffer.from(m[1], 'base64').toString())
  assert.deepEqual(chiffres, ['https://www.facebook.com/x', '/pages/mes-jaime'])
  assert.equal((html.match(/\/collections\//g) || []).length, 9)
})
