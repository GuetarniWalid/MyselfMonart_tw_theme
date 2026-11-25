// Le nouveau menu du téléphone, le logo sorti de son rond, le bouton du menu et le cœur des j'aime aux angelots de Raphaël
// (demandes de Walid du 25/11/2026) : l'en-tête (snippets/tw-sticky-header.liquid) les rend dans la vue de test de la nouvelle page collection seulement ; partout
// ailleurs, l'en-tête d'aujourd'hui. Le menu (snippets/menu-telephone.liquid) : les mêmes liens que celui d'avant, en
// onglets, en tuiles et en groupes dont les collections sont des emblèmes (snippets/collection-embleme.liquid) ; ses
// styles (input.css, « Le menu du téléphone ») ; son script (MenuTelephone, assets/tw-header.js).
// Les essais dans un navigateur (hauteur, gestes, clavier, petits écrans) sont dans les notes du chantier.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/menu-telephone.test.cjs
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
let dernierId = 600000000000
/* Une collection telle que la donnent les réglages : avec son emblème et la couleur de son rond, ou sans. */
const col = (handle, title, count = 10, couleur = null, type = 'painting') => ({
  id: ++dernierId, handle, title, url: `/collections/${handle}`, all_products_count: count,
  metafields: { custom: { type_of_collection: type }, cocon: couleur ? { embleme: { value: fichier(`embleme-${handle}.webp`) }, embleme_couleur: { value: couleur } } : {} },
})
const TOUS = col('tous-les-tableaux', 'Tous les Tableaux', 890)
const BEST = col('bestsellers-1', 'Tableau best-seller', 90, 'soleil')
const SALON = col('tableau-salon', 'Tableau Salon', 496, 'soleil')
const CUISINE = col('tableau-cuisine', 'Tableau Cuisine', 123, 'ciel')
const CHAMBRE = col('tableau-chambre', 'Tableau Chambre', 339, 'lilas')
const BUREAU = col('tableau-bureau', 'Tableau Bureau', 424, 'soleil')
const BLEU = col('tableau-bleue', 'Tableau Bleu', 61, 'bleu')
const VIDE = col('tableau-vide', 'Tableau Vide', 0, 'rose')
const SANS = col('tableau-ville', 'Tableau Ville', 12)
const POSTERS = col('posters-affiches', 'Tous les Posters & Affiches', 680, null, 'poster')
const ZEN = col('posters-affiches-zen', 'Poster & Affiche Zen', 88, 'lilas', 'poster')
const bloc = (id, type, settings) => ({ id, type, settings })
const BLOCS = [
  bloc('t1', 'title_only', { title: 'Nos Tableaux' }),
  bloc('c1', 'collection_only', { collection: TOUS }),
  bloc('g1', 'set_of_collections', { title: 'Par Pièce', child_collection_list: [SALON, CUISINE, CHAMBRE, BUREAU] }),
  bloc('g2', 'set_of_collections', { title: 'Par Couleur', child_collection_list: [BLEU, VIDE, SANS] }),
  bloc('g3', 'set_of_collections', { title: 'Vide', child_collection_list: [VIDE] }),
  bloc('c2', 'collection_only', { collection: BEST }),
  bloc('t2', 'title_only', { title: 'Posters & Affiches' }),
  bloc('c3', 'collection_only', { collection: POSTERS }),
  bloc('g4', 'set_of_collections', { title: 'Par Thème', child_collection_list: [ZEN] }),
]
const PAYS = { country: { currency: { iso_code: 'EUR' } }, language: { iso_code: 'fr' }, available_countries: ['FR', 'CH', 'CA', 'US', 'GB', 'DK'].map((iso_code) => ({ iso_code })) }

/* L'en-tête rendu sur une page. */
function entete({ name = 'collection', suffix = 'refonte', collection = null, product = null, blocks = BLOCS, lang = 'fr' } = {}) {
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
/* Le menu du téléphone d'un en-tête rendu : de son bouton à la fin de son <details> (avant le menu d'ordinateur). */
const menuTel = (html) => html.slice(html.indexOf('menu-opener'), html.indexOf('<nav class="hidden md:flex'))
const rayons = (html) => [...html.matchAll(/<section class="menu-tel-rayon"[\s\S]*?<\/section>/g)].map((m) => m[0])
const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const texte = (html) => unescape(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim()
const liens = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, href, dedans]) => [href, texte(dedans)]).filter(([href]) => href.startsWith('/collections/'))
const groupes = (html) => [...html.matchAll(/<details class="menu-tel-groupe[^"]*"([^>]*)>([\s\S]*?)<\/details>/g)].map(([, attributs, dedans]) => ({
  nom: texte(/<span class="menu-tel-nom">([\s\S]*?)<\/span>/.exec(dedans)[1]),
  ouvert: /\bopen\b/.test(attributs) && /\bdata-ouvert\b/.test(attributs),
  liens: liens(dedans).map(([, nom]) => nom),
  petits: (dedans.match(/class="menu-tel-petit"/g) || []).length,
  html: dedans,
}))
const choisi = (html) => [...html.matchAll(/<label class="menu-tel-onglet">(<input[^>]*>)<span>([\s\S]*?)<\/span>/g)].filter(([, input]) => /\bchecked\b/.test(input)).map(([, , nom]) => unescape(nom))

/* ---------- Où se rend le nouvel en-tête ---------- */

test('le nouvel en-tête : dans la vue de test de la nouvelle page collection, et nulle part ailleurs', { skip: SKIP }, () => {
  for (const suffix of ['refonte', 'refonte-tableau-salon']) {
    const html = entete({ suffix, collection: SALON })
    assert.match(html, /class="menu-tel /, suffix)
    assert.doesNotMatch(menuTel(html), /font-limelight|100vh/, suffix)
    assert.doesNotMatch(html, /<circle cx="34" cy="34" r="34"/, `${suffix} : le logo sans rond`)
  }
  const ailleurs = [
    { name: 'index', suffix: null }, { name: 'page', suffix: 'refonte' }, { name: 'product', suffix: 'oeuvre-3d', product: { type: 'painting', metafields: { artwork: {} } } },
    { name: 'collection', suffix: null, collection: SALON }, { name: 'collection', suffix: 'tableau-salon', collection: SALON },
  ]
  for (const page of ailleurs) {
    const html = entete(page)
    assert.doesNotMatch(html, /menu-tel|entete-burger|entete-coeur/, JSON.stringify(page.name + page.suffix))
    assert.match(menuTel(html), /<h3 class="font-limelight mb-4">/)
    assert.equal((html.match(/<circle cx="34" cy="34" r="34"/g) || []).length, 1, 'le logo dans son rond')
  }
})

test('le menu d’avant tient dans l’écran, barre du navigateur comprise : 100dvh, et 100vh pour un navigateur qui ne le sait pas', { skip: SKIP }, () => {
  const html = entete({ name: 'index', suffix: null })
  const panneau = /<div\s+class="([^"]*\bclose-nav\b[^"]*)"/.exec(html)[1].split(/\s+/)
  assert.ok(panneau.includes('h-[calc(100vh-122px)]'))
  assert.ok(panneau.includes('supports-[height:100dvh]:h-[calc(100dvh-122px)]'))
  // Dans la feuille construite, la seconde vient après la première : elle l'emporte.
  const css = read('assets/output.css')
  const vh = css.indexOf('.h-\\[calc\\(100vh-122px\\)\\]')
  const dvh = css.indexOf('.supports-\\[height\\:100dvh\\]\\:h-\\[calc\\(100dvh-122px\\)\\]')
  assert.ok(vh > 0 && dvh > vh, `${vh} puis ${dvh}`)
})

/* 36 px : deux cinquièmes de l'en-tête de 90 px, une fois et demie les icônes de 24 px (Walid, 25/11/2026 : à 48 px, la
   taille du rond, « un peu trop gros »). */
test('le logo sorti de son rond : 36 px, 42 px dès 640 px ; son dessin ne change pas', { skip: SKIP }, () => {
  const logo = (html) => /<svg[^>]*aria-labelledby="logo-round-title logo-round-desc"[\s\S]*?<\/svg>/.exec(html)[0]
  const avec = logo(entete({ name: 'index', suffix: null }))
  const sans = logo(entete({ collection: SALON }))
  assert.match(avec, /class="w-12 h-12 sm:w-auto sm:h-auto"/)
  assert.match(sans, /class="w-auto h-9 sm:h-\[42px\]"/)
  const css = read('assets/output.css')
  assert.ok(css.includes('.h-9{height:2.25rem}') && css.includes('.sm\\:h-\\[42px\\]{height:42px}'))
  const traits = (svg) => [...svg.matchAll(/<(?:path|ellipse)\b[^>]*>/g)].map((m) => m[0])
  assert.ok(traits(sans).length >= 8)
  assert.deepEqual(traits(sans), traits(avec))
  // Le cadre tient tout le dessin (13,00 à 51,23 ; 13,00 à 52,05), de près.
  const [x, y, w, h] = /viewBox="([^"]+)"/.exec(sans)[1].split(' ').map(Number)
  assert.ok(x <= 13 && y <= 13 && x + w >= 51.23 && y + h >= 52.06, 'rien de coupé')
  assert.ok(w <= 39 && h <= 40, 'de près')
})

/* ---------- Les angelots ---------- */

test('le bouton du menu : trois barres, l’angelot au-dessus, un décor ; la croix le remplace comme avant', { skip: SKIP }, () => {
  const html = entete({ collection: SALON })
  const bouton = /<summary class="group menu-opener[\s\S]*?<\/summary>/.exec(html)[0]
  assert.match(bouton, /aria-label="Ouvrir le menu de navigation"/)
  // assets/tw-header.js cache .hamburger et montre .close.hidden : les deux sont là, et le décor se tait.
  assert.equal((bouton.match(/class="hamburger entete-burger" aria-hidden="true"/g) || []).length, 1)
  assert.match(bouton, /<span class="close hidden" aria-hidden="true">/)
  assert.equal((bouton.match(/<rect /g) || []).length, 3)
  assert.match(bouton, /<img src="\/\/www\.myselfmonart\.com\/cdn\/shop\/t\/25\/assets\/entete-angelot-menu\.webp\?v=1" alt="" width="32" height="26" decoding="async">/)
})

test('le cœur des j’aime : un lien nommé dans les cinq langues, l’angelot derrière, le cœur de papiers des cartes, son nombre dedans', { skip: SKIP }, () => {
  const NOMS = { fr: 'Mes j\'aime', en: 'My likes', de: 'Meine Favoriten', es: 'Mis favoritos', nl: 'Mijn favorieten' }
  for (const [lang, nom] of Object.entries(NOMS)) {
    const html = entete({ collection: SALON, lang })
    const lien = /<span tabindex="0" role="link" aria-label="([^"]*)" class="entete-coeur obfuscate" data-url64="([^"]+)">([\s\S]*?)<\/span>/.exec(html)
    assert.ok(lien, lang)
    assert.equal(unescape(lien[1]), nom, lang)
    assert.match(lien[3], /<img class="entete-coeur-ange" src="[^"]*entete-angelot-coeur\.webp\?v=1" alt="" width="38" height="28" decoding="async">/)
    const [, dessin] = /<svg class="entete-coeur-dessin" viewBox="0 0 24 24" aria-hidden="true" focusable="false">([\s\S]*?)<\/svg>/.exec(lien[3])
    assert.deepEqual([...dessin.matchAll(/<path class="([^"]+)"/g)].map((m) => m[1]), ['coeur-rose', 'coeur-corail', 'coeur-soleil', 'coeur-trait'])
    // Le compteur (<likes-count>, son script dans le même fichier) : caché à zéro, frère du lien dans le même <li>.
    assert.match(html, /<\/span>\s*<likes-count class="entete-coeur-compte"><span class="hidden">0<\/span><\/likes-count>/)
  }
})

test('les images des angelots : en WebP, légères, aux proportions qu’écrivent les balises', () => {
  const fs = require('fs')
  const path = require('path')
  for (const [nom, w, h] of [['entete-angelot-menu', 32, 26], ['entete-angelot-coeur', 38, 28]]) {
    const b = fs.readFileSync(path.join(__dirname, '..', 'assets', `${nom}.webp`))
    assert.equal(b.toString('ascii', 8, 12), 'WEBP')
    assert.ok(b.length < 9 * 1024, `${nom} : ${b.length}`)
    const [W, H] = [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]
    assert.ok(Math.abs(W / H - w / h) < 0.05, `${nom} : ${W} × ${H}`)
    assert.ok(W >= w * 3, `${nom} : net à la densité 3`)
  }
})

/* ---------- Le menu : les mêmes liens ---------- */

test('les mêmes liens que le menu d’avant, aux mêmes adresses et aux mêmes noms, chacun une fois ; sans les collections vides', { skip: SKIP }, () => {
  const avant = liens(menuTel(entete({ name: 'index', suffix: null })))
  const maintenant = liens(menuTel(entete({ collection: SALON })))
  const attendus = avant.filter(([href]) => href !== VIDE.url)
  assert.ok(attendus.length >= 9)
  const trie = (liste) => [...liste].map((l) => l.join(' ')).sort()
  assert.deepEqual(trie(maintenant), trie(attendus))
  // Dans un groupe, le même ordre.
  assert.deepEqual(groupes(entete({ collection: SALON }))[0].liens, ['Tableau Salon', 'Tableau Cuisine', 'Tableau Chambre', 'Tableau Bureau'])
})

test('un onglet par titre du menu ; chaque rayon a ses tuiles puis ses groupes ; aucun titre h1 à h6', { skip: SKIP }, () => {
  const html = menuTel(entete({ collection: SALON }))
  assert.deepEqual([...html.matchAll(/<label class="menu-tel-onglet">[\s\S]*?<span>([\s\S]*?)<\/span>/g)].map((m) => unescape(m[1])), ['Nos Tableaux', 'Posters & Affiches'])
  assert.match(html, /class="menu-tel-bascule" role="radiogroup" aria-label="Toiles ou posters" style="--n: 2"/)
  const [tableaux, posters] = rayons(html)
  assert.match(tableaux, /data-rayon="1" aria-label="Nos Tableaux"/)
  assert.match(posters, /data-rayon="2" aria-label="Posters &amp; Affiches"/)
  const tuiles = (rayon) => liens(/<ul class="menu-tel-tuiles">([\s\S]*?)<\/ul>/.exec(rayon)[1]).map(([, nom]) => nom)
  assert.deepEqual(tuiles(tableaux), ['Tous les Tableaux', 'Tableau best-seller'])
  assert.deepEqual(tuiles(posters), ['Tous les Posters & Affiches'])
  assert.deepEqual(groupes(tableaux).map((g) => g.nom), ['Par Pièce', 'Par Couleur'])
  assert.deepEqual(groupes(posters).map((g) => g.nom), ['Par Thème'])
  assert.doesNotMatch(html, /<h[1-6]\b/)
})

test('un seul titre, ou aucun : pas d’onglets, et tout le menu dans un rayon', { skip: SKIP }, () => {
  for (const blocks of [BLOCS.filter((b) => b.type !== 'title_only'), BLOCS.filter((b) => b.id !== 't2')]) {
    const html = menuTel(entete({ collection: SALON, blocks }))
    assert.doesNotMatch(html, /menu-tel-bascule/)
    assert.equal(rayons(html).length, 1)
    assert.equal(groupes(html).length, 3)
  }
  // Des blocs avant le premier titre : dans son rayon.
  const html = menuTel(entete({ collection: SALON, blocks: [BLOCS[1], BLOCS[0], BLOCS[2], BLOCS[6], BLOCS[7]] }))
  assert.equal(rayons(html).length, 2)
  assert.deepEqual(liens(rayons(html)[0]).map(([, nom]) => nom)[0], 'Tous les Tableaux')
})

test('l’onglet choisi d’abord : celui des posters sur un poster ou une collection de posters, le premier ailleurs', { skip: SKIP }, () => {
  assert.deepEqual(choisi(entete({ collection: SALON })), ['Nos Tableaux'])
  assert.deepEqual(choisi(entete({ collection: ZEN })), ['Posters & Affiches'])
  assert.deepEqual(choisi(entete({ collection: POSTERS })), ['Posters & Affiches'])
})

/* ---------- Les tuiles et les groupes ---------- */

test('une tuile : l’emblème de sa collection, ou quatre carrés sans emblème ; le nom entier dans le lien ; la page en cours', { skip: SKIP }, () => {
  const html = /<ul class="menu-tel-tuiles">([\s\S]*?)<\/ul>/.exec(entete({ collection: TOUS }))[1]
  const [tous, best] = html.split('<li ').slice(1)
  assert.match(tous, /data-taille="tuile"/)
  assert.equal((tous.match(/<rect /g) || []).length, 4)
  assert.doesNotMatch(tous, /c-emb-initiale|<img/)
  assert.match(tous, /<a class="c-emb-lien" href="\/collections\/tous-les-tableaux" aria-current="page"><span class="c-emb-mot">Tous les<\/span> <span class="c-emb-nom">Tableaux<\/span><\/a>/)
  assert.equal(texte(/<span class="c-emb-nb">([\s\S]*?)<\/span>/.exec(tous)[1]), '890 tableaux')
  assert.match(best, new RegExp(`<img src="${FILES.replace(/[.]/g, '\\.')}embleme-bestsellers-1\\.webp\\?v=1&width=320" alt="" width="640" height="528" loading="lazy" decoding="async">`))
  assert.doesNotMatch(best, /srcset|aria-current|<rect /)
  // Une page, un produit : leur nom seul.
  const autres = menuTel(entete({ collection: SALON, blocks: [BLOCS[0], bloc('p', 'product_only', { product: { title: 'Le Baiser', url: '/products/le-baiser' } }), bloc('q', 'page_only', { page: { title: 'Notre histoire', url: '/pages/notre-histoire' } }), bloc('r', 'collection_only', { collection: null })] }))
  assert.equal((autres.match(/data-nue/g) || []).length, 2)
  assert.match(autres, /<a class="c-emb-lien" href="\/products\/le-baiser"><span class="c-emb-nom">Le Baiser<\/span><\/a>/)
  assert.match(autres, /<a class="c-emb-lien" href="\/pages\/notre-histoire">/)
})

test('un groupe ouvert par rayon : celui de la collection en cours, marquée, sinon le premier', { skip: SKIP }, () => {
  const ouverts = (collection) => rayons(entete({ collection })).map((r) => groupes(r).filter((g) => g.ouvert).map((g) => g.nom))
  assert.deepEqual(ouverts(TOUS), [['Par Pièce'], ['Par Thème']])
  assert.deepEqual(ouverts(BLEU), [['Par Couleur'], ['Par Thème']])
  const html = entete({ collection: BLEU })
  assert.equal((menuTel(html).match(/aria-current="page"/g) || []).length, 1)
  assert.match(html, /href="\/collections\/tableau-bleue" aria-current="page"/)
  // <sticky-header> ferme les autres à l'ouverture d'un groupe : il les reconnaît à cette classe, dans la même liste.
  assert.equal((menuTel(html).match(/class="menu-tel-groupe js-nav-submenu"/g) || []).length, 3)
})

test('un groupe : sa rangée d’emblèmes, sans les collections vides ; fermé, trois de ses emblèmes au plus, en petit', { skip: SKIP }, () => {
  const [piece, couleur] = groupes(entete({ collection: SALON }))
  assert.equal(piece.petits, 3)
  assert.equal((piece.html.match(/data-taille="menu"/g) || []).length, 4)
  assert.match(piece.html, /<span class="menu-tel-pile" aria-hidden="true">/)
  assert.match(piece.html, /embleme-tableau-salon\.webp\?v=1&width=120" alt="" width="60" height="50" loading="lazy"/)
  assert.doesNotMatch(piece.html, /srcset/)
  // Une collection vide n'y est pas ; une collection sans emblème garde son rond et son initiale, sans petit emblème.
  assert.deepEqual(couleur.liens, ['Tableau Bleu', 'Tableau Ville'])
  assert.equal(couleur.petits, 1)
  assert.match(couleur.html, /<span class="c-emb-initiale">V<\/span>/)
})

test('dans les cinq langues : les textes de l’en-tête, de l’interrupteur et du nombre', { skip: SKIP }, () => {
  const ATTENDUS = { fr: ['Menu de navigation', 'Toiles ou posters', '496 tableaux'], en: ['Navigation', 'Canvas or posters', '496 artworks'], de: ['Navigationsmenü', 'Leinwand oder Poster', '496 Bilder'], es: ['Menú de navegación', 'Lienzos o pósteres', '496 cuadros'], nl: ['Navigatiemenu', 'Canvas of posters', '496 schilderijen'] }
  for (const [lang, [menu, bascule, nombre]] of Object.entries(ATTENDUS)) {
    const html = unescape(menuTel(entete({ collection: TOUS, lang })))
    assert.ok(html.includes(`role="dialog"\n  aria-modal="true"\n  aria-label="${menu}"`), `${lang} : ${menu}`)
    assert.ok(html.includes(`aria-label="${bascule}"`), `${lang} : ${bascule}`)
    assert.ok(html.includes(`<span class="c-emb-nb">${nombre}</span>`), `${lang} : ${nombre}`)
  }
})

/* ---------- Le bas du menu ---------- */

test('en bas : « Suivre ma commande » et le choix du pays, les mêmes que dans le menu d’avant ; les réseaux dans la liste', { skip: SKIP }, () => {
  const html = menuTel(entete({ collection: SALON }))
  const pied = html.slice(html.indexOf('menu-tel-pied'))
  assert.match(pied, /href="\/account"\s+class="[^"]*\bmenu-tel-suivi\b[^"]*"/)
  assert.ok(html.indexOf('menu-tel-reseaux') < html.indexOf('menu-tel-pied'))
  const pays = (h) => [...h.matchAll(/<input type="hidden" name="country_code" value="(\w+)">\s*<input type="hidden" name="language_code" value="(\w+)">/g)].map(([, p, l]) => `${p} ${l}`)
  const avant = menuTel(entete({ name: 'index', suffix: null }))
  assert.deepEqual(pays(pied), ['CA en', 'CH fr', 'DK en', 'GB en', 'US en'])
  assert.deepEqual(pays(pied), pays(avant))
  for (const h of [pied, avant]) assert.equal((h.match(/last-focusable/g) || []).length, 1)
  // Le nouveau menu écarte le drapeau et le nom dans sa feuille ; celui d'avant garde ses espaces.
  assert.doesNotMatch(pied, /&nbsp;/)
  assert.match(avant, /&nbsp;&nbsp;Suisse/)
  assert.match(pied, /<span>Suisse<\/span>/)
})

/* ---------- La feuille ---------- */

const INPUT = read('input.css').replace(/\r\n/g, '\n')
const DEBUT = '/* ---- Le menu du téléphone (snippets/menu-telephone.liquid, .menu-tel) ----'
const FIN = '/* ---- Fin du menu du téléphone ---- */'
const BLOC = INPUT.slice(INPUT.indexOf(DEBUT), INPUT.indexOf(FIN)).replace(/\/\*[\s\S]*?\*\//g, '')
const NO_PREF = '@media (prefers-reduced-motion: no-preference)'

test('la feuille : un bloc à part, dont chaque règle vise .menu-tel', () => {
  assert.ok(INPUT.indexOf(DEBUT) > 0 && INPUT.indexOf(FIN) > INPUT.indexOf(DEBUT))
  const liste = rules(BLOC).filter((r) => !r.head.startsWith('@keyframes'))
  assert.ok(liste.length >= 80, String(liste.length))
  for (const { head } of liste) for (const s of head.split(/,(?![^(]*\))/)) assert.match(s, /\.menu-tel/, head)
  // Chaque classe du menu a sa règle.
  const classes = new Set([...code('snippets/menu-telephone.liquid').matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].replace(/{%[\s\S]*?%}/g, ' ').split(/\s+/)).filter((c) => c.startsWith('menu-tel')))
  assert.ok(classes.size >= 18, [...classes].join(' '))
  for (const classe of classes) assert.match(BLOC, new RegExp(`\\.${classe}(?![\\w-])`), classe)
})

test('la feuille : les couleurs du menu sont celles des nouvelles pages, et aucune autre', () => {
  const variables = (css) => Object.fromEntries([...css.matchAll(/(--[a-z][\w-]*):\s*([^;]+);/g)].map(([, nom, valeur]) => [nom, valeur.trim()]))
  const page = variables(rules(read('assets/collection-refonte.css').replace(/\/\*[\s\S]*?\*\//g, '')).find((r) => r.head === ':root[data-refonte-page]').body)
  const menu = variables(rules(BLOC).find((r) => r.head === ':root .menu-tel' && !r.context.length).body)
  const noms = ['--encre', '--encre-70', '--encre-55', '--encre-16', '--encre-12', '--encre-06', '--blanc', '--creme', '--ciel', '--rose', '--soleil', '--menthe', '--lilas', '--peche', '--bleu', '--gris', '--orange', '--rouge', '--violet', '--beige', '--vert']
  for (const nom of noms) assert.equal(menu[nom], page[nom], nom)
  // Hors de ces variables, aucune couleur écrite ; aucune police hors de --sans.
  const ailleurs = rules(BLOC).filter((r) => !(r.head === ':root .menu-tel' && !r.context.length)).map((r) => r.body).join('\n')
  assert.doesNotMatch(ailleurs, /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i)
  for (const [, police] of ailleurs.matchAll(/\bfont:\s*([^;]+);/g)) assert.match(police, /var\(--sans\)$/, police)
  // Les treize ronds.
  for (const couleur of ['ciel', 'soleil', 'menthe', 'rose', 'lilas', 'peche', 'bleu', 'gris', 'orange', 'rouge', 'violet', 'beige', 'vert']) assert.match(BLOC, new RegExp(`\\.menu-tel \\[data-fond="${couleur}"\\] \\{ --fond: var\\(--${couleur}\\); \\}`))
})

test('la feuille : la hauteur de l’écran moins ce qui est au-dessus, barre du navigateur comprise', () => {
  const regle = (context) => rules(BLOC).find((r) => r.head === ':root .menu-tel' && r.context.join() === context)
  assert.match(regle('').body, /height: calc\(100vh - var\(--menu-haut, 122px\)\);/)
  assert.equal(regle('@supports (height: 100dvh)').body.trim(), 'height: calc(100dvh - var(--menu-haut, 122px));')
})

test('la feuille : un rayon à la fois, celui de l’onglet choisi ; rien ne bouge avec « mouvements réduits »', () => {
  for (const n of [1, 2, 3]) assert.ok(BLOC.includes(`.menu-tel:has(.menu-tel-onglet:nth-child(${n}) :checked) .menu-tel-rayon:not([data-rayon="${n}"])`), String(n))
  for (const r of rules(BLOC)) {
    if (r.head.startsWith('@keyframes')) continue
    if (/(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body) && !/^\s*transition:\s*none;?\s*$/.test(r.body.trim())) assert.equal(r.context[0], NO_PREF, r.head)
  }
})

test('la feuille : les angelots, un bloc à part ; les barres et le cœur ne bougent pas de place ; aucun mouvement hors « mouvements réduits »', () => {
  const debut = INPUT.indexOf("/* ---- Les angelots de l'en-tête (")
  const fin = INPUT.indexOf("/* ---- Fin des angelots de l'en-tête ---- */")
  assert.ok(debut > 0 && fin > debut)
  const regles = rules(INPUT.slice(debut, fin).replace(/\/\*[\s\S]*?\*\//g, ''))
  for (const r of regles) {
    if (r.head.startsWith('@keyframes')) { assert.match(r.head, /^@keyframes entete-/); continue }
    assert.match(r.head, /entete-/, r.head)
    if (/(^|[;\s])(animation|transition)[\w-]*\s*:/.test(r.body)) assert.equal(r.context[0], NO_PREF, r.head)
  }
  // Cachés par la classe hidden de assets/tw-header.js et du compteur : leurs règles ne l'emportent pas sur elle.
  for (const head of ['.entete-burger:not(.hidden)', '.entete-coeur-compte span:not(.hidden)']) assert.ok(regles.some((r) => r.head === head), head)
  // Vide, le cœur est blanc ; un j'aime ou plus : ses trois papiers.
  const AIME = 'li:has(> likes-count span:not(.hidden)) > .entete-coeur'
  const corps = (head) => regles.filter((r) => r.head === head && !r.context.length).map((r) => r.body).join(' ')
  assert.match(corps('.entete-coeur .coeur-rose'), /fill: var\(--blanc\);/)
  assert.match(corps(`${AIME} .coeur-rose`), /fill: var\(--rose\);/)
  assert.match(corps('.entete-coeur .coeur-corail, .entete-coeur .coeur-soleil'), /opacity: 0;/)
  assert.match(corps(`${AIME} .coeur-corail, ${AIME} .coeur-soleil`), /opacity: 1;/)
  // L'angelot et le cœur sur le même axe, celui du bouton de 56 px, en pixels entiers.
  const [ange, dessin] = ['.entete-coeur .entete-coeur-ange', '.entete-coeur .entete-coeur-dessin'].map((h) => corps(h))
  const axe = (b) => Number(/left: (\d+)px/.exec(b)[1]) + Number(/width: (\d+)px/.exec(b)[1]) / 2
  assert.equal(axe(ange), 28)
  assert.equal(axe(dessin), 28)
  // L'angelot du menu finit dans l'épaisseur de la barre du haut (8 à 11 px depuis le haut de 32 px), peinte par-dessus, et
  // son mouvement ne la dépasse jamais : aucun blanc entre elle et lui.
  const bas = 32 - Number(/bottom: ([\d.]+)px/.exec(corps('.entete-burger-ange'))[1])
  const hautBarre = Number(/top: (\d+)px/.exec(corps('.entete-burger-barres'))[1])
  assert.ok(bas > hautBarre && bas <= hautBarre + 3, `${bas} dans la barre, qui commence à ${hautBarre}`)
  // À côté de la barre, il est coupé au ras de son bord haut.
  const ras = 26 - (bas - hautBarre)
  assert.ok(corps('.entete-burger-ange').includes(`clip-path: polygon(0 0, 100% 0, 100% ${ras}px, 31px ${ras}px, 31px 100%, 5px 100%, 5px ${ras}px, 0 ${ras}px);`), String(ras))
  assert.match(regles.find((r) => r.head.startsWith('@keyframes entete-ange-monte')).body, /^\s*from \{ translate: 0 104%; \}\s*$/)
  const monte = regles.find((r) => /animation: entete-ange-monte/.test(r.body)).body
  const [, , y1, , y2] = /cubic-bezier\(([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\)/.exec(monte).map(Number)
  assert.ok(y1 <= 1 && y2 <= 1, 'il ne monte pas plus haut que sa place')
  // Sous le doigt : 48 px au moins.
  assert.match(regles.find((r) => r.head === '.menu-opener:has(.entete-burger)').body, /margin: -8px; padding: 8px;/)
  assert.match(regles.find((r) => r.head === '.entete-coeur').body, /width: 56px; height: 56px;/)
})

test('la hauteur seule de la fenêtre (la barre du navigateur) ne ferme pas le menu : seul un changement de largeur compte', () => {
  assert.match(read('assets/tw-header.js'), /let largeur = window\.innerWidth;\s*window\.addEventListener\('resize', \(\) => \{\s*if \(window\.innerWidth === largeur\) return;\s*largeur = window\.innerWidth;/)
})

test('la feuille construite porte le menu', () => {
  const css = read('assets/output.css')
  for (const bout of ['.menu-tel-rangee{', '.menu-tel-groupe::details-content', '.menu-tel:has(.menu-tel-onglet:first-child :checked)']) {
    assert.ok(css.includes(bout) || css.includes(bout.replace(':first-child', ':nth-child(1)')), bout)
  }
})

/* ---------- Le script ---------- */

function script() {
  const bac = { HTMLElement: class {}, customElements: { define() {}, get() {} }, document: { querySelector: () => null } }
  bac.window = bac
  vm.createContext(bac)
  vm.runInContext(read('assets/tw-header.js'), bac, { filename: 'assets/tw-header.js' })
  return bac
}
/* Un panneau d'essai : ses groupes, son choix du pays, ce qu'on lui écrit. */
function panneau({ haut = 122, paysOuvert = false } = {}) {
  const groupe = (ouvert, depart) => ({ open: ouvert, hasAttribute: (nom) => nom === 'data-ouvert' && depart, addEventListener() {}, querySelector: () => null })
  const defile = { scrollTop: 40 }
  const pays = { open: paysOuvert, querySelector: (s) => (s === 'summary' ? 'le bouton' : s === '.last-focusable' ? 'le dernier pays' : null) }
  const p = {
    groupes: [groupe(false, true), groupe(true, false), groupe(false, false)], defile, pays, ecrit: {}, ecouteurs: {},
    classList: { contains: (c) => c === 'menu-tel' },
    style: { setProperty: (nom, valeur) => { p.ecrit[nom] = valeur } },
    getBoundingClientRect: () => ({ top: haut }),
    addEventListener: (type, f) => { p.ecouteurs[type] = f },
    querySelector: (s) => ({ '.menu-tel-defile': defile, '.menu-tel-pays': pays })[s] || null,
    querySelectorAll: () => p.groupes,
  }
  return p
}

test('le script : la hauteur se mesure à l’ouverture, l’en-tête revenu en entier s’il était parti en partie', () => {
  const MenuTelephone = vm.runInContext('MenuTelephone', script())
  const ouvrir = (haut, enteteHaut) => { const p = panneau({ haut }); new MenuTelephone(p).ouvrir({ getBoundingClientRect: () => ({ top: enteteHaut }) }); return [p.ecrit['--menu-haut'], p.defile.scrollTop] }
  // En haut de page : le bandeau (33 px) et l'en-tête (90 px). Défilée : l'en-tête seul. Parti de 40 px : il revient.
  assert.deepEqual(ouvrir(122.4, 33), ['122px', 0])
  assert.deepEqual(ouvrir(89, 0), ['89px', 0])
  assert.deepEqual(ouvrir(49, -40), ['89px', 0])
})

test('le script : à la fermeture, le groupe du départ se rouvre, les autres et la liste des pays se ferment', () => {
  const MenuTelephone = vm.runInContext('MenuTelephone', script())
  const p = panneau({ paysOuvert: true })
  new MenuTelephone(p).fermer()
  assert.deepEqual(p.groupes.map((g) => g.open), [true, false, false])
  assert.equal(p.pays.open, false)
})

test('le script : le dernier élément du menu au clavier, la liste des pays ouverte ou non ; un onglet remonte la liste', () => {
  const MenuTelephone = vm.runInContext('MenuTelephone', script())
  assert.equal(new MenuTelephone(panneau({ paysOuvert: true })).dernier(), 'le dernier pays')
  const p = panneau()
  assert.equal(new MenuTelephone(p).dernier(), 'le bouton')
  p.ecouteurs.change({ target: { name: 'menu-tel-onglet' } })
  assert.equal(p.defile.scrollTop, 0)
})

test('le script : avec le menu d’avant, rien ne change ; avec le nouveau, la fermeture n’attend pas une transition qui ne vient pas', () => {
  const source = read('assets/tw-header.js')
  assert.match(source, /this\.menuTelephone = this\.menu\.classList\.contains\('menu-tel'\) \? new MenuTelephone\(this\.menu\) : null;/)
  // Le focus : lu à la fin, juste avant de cacher le menu ; la recherche ouverte depuis le menu garde le sien.
  assert.match(source, /const focusDedans = this\.menu\.contains\(document\.activeElement\);\s*this\.detailsParent\.open = false;\s*this\.resetMenuDisplay\(\);\s*if \(this\.menuTelephone && focusDedans\) this\.menuOpener\.focus/)
  assert.match(source, /if \(this\.menuTelephone\) await Promise\.race\(\[waitAnimEnd\(this\.menu\), new Promise\(\(fini\) => setTimeout\(fini, 260\)\)\]\);\s*else await waitAnimEnd\(this\.menu\);/)
})
