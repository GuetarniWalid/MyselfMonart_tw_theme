// La ligne des filtres de la nouvelle page collection, ticket 06 (dossier .scratch/collection-design) : la ligne
// (snippets/collection-filtres.liquid), rendue par la grille (sections/collection-grille.liquid) juste au-dessus des
// tableaux, dans la vue cachée ?view=refonte. Les mêmes trois familles partout, Couleur, Format et Thème, et le tri.
// Ordinateur : un menu sous chaque famille ; téléphone : chaque famille ouvre son panneau posé en bas (un <dialog>),
// le script (assets/collection-filtres.js) y déplace le même panneau. Les filtres actifs dessous, chacun un lien qui
// le retire. Les filtres sont ceux de la boutique (Search & Discovery), dans l'adresse.
// Ici, le rendu Liquid (liquidjs) avec les filtres de Tableaux Nature relevés en ligne
// (scripts/fixtures/collection-filtres-nature.json), et les fonctions pures du script sous Node.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/collection-filtres.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { SKIP, engine, LANGS, locales } = require('./galerie-banc.cjs')
const NATURE = require('./fixtures/collection-filtres-nature.json')

const SNIPPET = 'collection-filtres'
const COL_URL = '/collections/tableaux-nature-sauvage'
const SECTION_ID = 'template--1__collection_grille'
const GID = (id) => `gid://shopify/Metaobject/${id}`
const FAMILLES = ['couleur', 'format', 'theme']
// L'ordre de collection.filters, celui de Search & Discovery : thèmes, couleurs, formats (relevé en ligne).
const ORDRE_SD = ['theme', 'couleur', 'format']
// Les tris de Shopify, dans l'ordre de collection.sort_options.
const SORT_OPTIONS = ['manual', 'best-selling', 'title-ascending', 'title-descending', 'price-ascending', 'price-descending', 'created-ascending', 'created-descending']
  .map((value) => ({ value, name: value }))

/* ---------- collection.filters, comme Shopify les donne ---------- */

/* Les trois filtres de Tableaux Nature. actifs : les libellés cochés par famille ({ couleur: ['Bleu'] }) ; comptes :
   des nombres à la place de ceux du relevé ({ Zen: 0 }) ; libelles : les libellés d'une autre langue
   ({ Portrait: 'Hochformat' }). Chaque valeur a son adresse pour s'ajouter ou se retirer (les autres filtres
   cochés gardés), comme Shopify les écrit. */
function filtres({ actifs = {}, comptes = {}, libelles = {} } = {}) {
  const coches = Object.fromEntries(FAMILLES.map((f) => [f, new Set(actifs[f] || [])]))
  const adresse = (garde) => {
    const p = new URLSearchParams()
    for (const f of FAMILLES) for (const v of NATURE[f].values) if (garde(f, v)) p.append(NATURE[f].param_name, GID(v.id))
    const q = p.toString()
    return COL_URL + (q ? `?${q}` : '')
  }
  const coche = (f, v) => coches[f].has(v.label)
  return ORDRE_SD.map((f) => {
    const source = NATURE[f]
    const values = source.values.map((v) => ({
      label: libelles[v.label] ?? v.label,
      value: GID(v.id),
      param_name: source.param_name,
      count: comptes[v.label] ?? v.count,
      active: coche(f, v),
      url_to_add: adresse((g, w) => coche(g, w) || w === v),
      url_to_remove: adresse((g, w) => coche(g, w) && w !== v),
      swatch: v.couleur || v.image ? { color: v.couleur ?? null, image: v.image ? { src: `//www.myselfmonart.com/cdn/shop/files/${v.image}?v=1` } : null } : null,
    }))
    return {
      type: 'list', label: source.label, param_name: source.param_name, values,
      active_values: values.filter((v) => v.active),
      url_to_remove: adresse((g, w) => g !== f && coche(g, w)),
    }
  })
}

/* La collection d'une page : ses filtres, son nombre de tableaux (filtres compris) et son tri. */
function collection({ actifs, comptes, libelles, total = 327, tri = null, defaut = 'best-selling' } = {}) {
  return {
    id: 607047844187, handle: 'tableaux-nature-sauvage', title: 'Tableaux Nature', url: COL_URL,
    products: [], products_count: total, all_products_count: 327,
    filters: filtres({ actifs, comptes, libelles }),
    sort_by: tri, default_sort_by: defaut, sort_options: SORT_OPTIONS,
  }
}

/* ---------- Le rendu ---------- */

/* Les pluriels de Shopify (clé à « one » et « other », choisie par count : « one » pour 1, et pour 0 en français), que
   le filtre t du banc commun laisse de côté ; la clarté d'une couleur (color_brightness de Shopify : (299 R + 587 V +
   114 B) / 1000). */
function filtresShopify(e, lang) {
  e.registerFilter('t', (key, ...args) => {
    const values = Object.fromEntries(args.filter(Array.isArray))
    let text = String(key).split('.').reduce((node, part) => (node == null ? node : node[part]), locales[lang])
    if (text && typeof text === 'object' && 'count' in values) {
      const n = Number(values.count)
      text = n === 1 || (lang === 'fr' && n === 0) ? text.one : text.other
    }
    if (typeof text !== 'string') return key
    return text.replace(/{{\s*(\w+)\s*}}/g, (hole, name) => (name in values ? String(values[name]) : hole))
  })
  e.registerFilter('color_brightness', (color) => {
    const hex = String(color).replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return (r * 299 + g * 587 + b * 114) / 1000
  })
}
if (!SKIP) for (const lang of Object.keys(LANGS)) filtresShopify(engine(lang), lang)

const globals = (col, lang) => ({ collection: col, request: { locale: { iso_code: lang } }, settings: {} })
const ligne = (col = collection(), { lang = 'fr' } = {}) => engine(lang).renderFile(SNIPPET, { section_id: SECTION_ID }, { globals: globals(col, lang) })

/* ---------- Lire le HTML rendu ---------- */

const unescape = (text) => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
// Le texte d'un morceau de HTML, tel qu'il se lit.
const texte = (html) => unescape(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<\/?(a|b|span)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const attr = (tag, name) => { const m = new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>/])`).exec(tag); return m ? unescape(m[1] ?? '') : undefined }
/* Un élément et tout son contenu, de sa balise ouvrante (la première qui répond à `ouvrante`) à sa balise fermante,
   les éléments de même nom qu'il contient compris (des <details> dans un <details>). */
function element(html, ouvrante) {
  const m = ouvrante.exec(html)
  if (!m) return null
  const nom = /^<([\w-]+)/.exec(m[0])[1]
  const balises = new RegExp(`<(/?)${nom}\\b[^>]*>`, 'g')
  balises.lastIndex = m.index
  let profondeur = 0
  for (let b; (b = balises.exec(html));) {
    profondeur += b[1] ? -1 : 1
    if (!profondeur) return html.slice(m.index, b.index + b[0].length)
  }
  throw new Error(`${nom} non fermé`)
}
const famille = (html, f) => element(html, new RegExp(`<details class="filtres-famille"[^>]*data-famille="${f}"[^>]*>`))
const panneau = (html, f) => element(famille(html, f), /<div class="filtres-panneau"[^>]*>/)
// Les valeurs d'un morceau de HTML : leur case (nom, valeur, cochée), leur nom affiché et leur nombre.
const valeurs = (html) => [...html.matchAll(/<label class="filtres-puce"[^>]*>([\s\S]*?)<\/label>/g)].map(([tout, dedans]) => {
  const caseTag = /<input class="filtres-case"[^>]*>/.exec(dedans)[0]
  return {
    nom: texte(/<span class="filtres-puce-nom">([\s\S]*?)<\/span>/.exec(dedans)[1]),
    nb: Number(/<span class="filtres-nb">(\d+)<\/span>/.exec(dedans)[1]),
    name: attr(caseTag, 'name'),
    value: attr(caseTag, 'value'),
    coche: attr(caseTag, 'checked') !== undefined,
    tout,
  }
})

/* ---------- La ligne ---------- */

test('la ligne : un formulaire GET nommé, les trois familles dans l’ordre Couleur, Format, Thème, puis le nombre et le tri', { skip: SKIP }, async () => {
  const html = await ligne()
  // La ligne, celle que la grille garde à sa place (#barre), et le script qui la fait vivre.
  const racine = /^\s*<collection-filtres id="barre" class="filtres-ligne"([^>]*)>/.exec(html)
  assert.ok(racine, 'la ligne en tête')
  assert.equal(attr(racine[0], 'data-section'), SECTION_ID)
  assert.equal(attr(racine[0], 'data-total'), '327')
  assert.equal(attr(racine[0], 'data-tri-defaut'), 'best-selling')
  // Sans script, cocher puis valider marche encore : un formulaire GET vers la collection, sans mémoire du navigateur
  // (les cases suivent l'adresse, pas un retour arrière).
  const form = /<form class="filtres-form"[^>]*>/.exec(html)[0]
  assert.equal(attr(form, 'method'), 'get')
  assert.equal(attr(form, 'action'), COL_URL)
  assert.equal(attr(form, 'aria-label'), 'Filtres et tri des tableaux')
  assert.equal(attr(form, 'autocomplete'), 'off')
  // Les trois familles, sous les noms de la maquette, quel que soit l'ordre de Search & Discovery.
  const familles = [...html.matchAll(/<details class="filtres-famille"[^>]*data-famille="(\w+)"[^>]*>\s*<summary class="filtres-fac"[^>]*>([\s\S]*?)<\/summary>/g)]
  assert.deepEqual(familles.map((m) => m[1]), ['couleur', 'format', 'theme'])
  assert.deepEqual(familles.map((m) => texte(m[2])), ['Couleur', 'Format', 'Thème'])
  // Pas de bouton qui ouvre tous les filtres d'un coup (décision de Walid).
  assert.doesNotMatch(texte(html), /Filtrer et trier/i)
  // Le nombre, puis le tri.
  assert.ok(html.indexOf('class="filtres-compte"') > html.lastIndexOf('<details class="filtres-famille"'))
  assert.ok(html.indexOf('<select') > html.indexOf('class="filtres-compte"'))
})

test('le tri : un vrai <select>, quatre choix seulement, celui de l’adresse choisi, sinon celui de la collection', { skip: SKIP }, async () => {
  const choix = async (col) => {
    const html = await ligne(col)
    const select = element(html, /<select[^>]*>/)
    assert.equal(attr(/<select[^>]*>/.exec(select)[0], 'name'), 'sort_by')
    assert.equal(attr(/<select[^>]*>/.exec(select)[0], 'aria-label'), 'Trier les tableaux')
    return [...select.matchAll(/<option value="([^"]+)"( selected)?>([^<]*)<\/option>/g)].map((m) => [m[1], texte(m[3]), !!m[2]])
  }
  assert.deepEqual(await choix(collection()), [
    ['best-selling', 'Meilleures ventes', true],
    ['created-descending', 'Nouveautés', false],
    ['price-ascending', 'Prix croissant', false],
    ['price-descending', 'Prix décroissant', false],
  ])
  assert.deepEqual((await choix(collection({ tri: 'price-descending' }))).filter((c) => c[2]).map((c) => c[0]), ['price-descending'])
  // Un tri que la ligne ne propose pas (ordre manuel) : aucun choix forcé, le premier se montre.
  assert.deepEqual((await choix(collection({ defaut: 'manual' }))).filter((c) => c[2]), [])
})

/* ---------- Les valeurs ---------- */

test('couleur : les 14 couleurs par nombre décroissant, leur libellé court, une case au paramètre et à la valeur de la boutique', { skip: SKIP }, async () => {
  const liste = valeurs(panneau(await ligne(), 'couleur'))
  // L'ordre et les noms de la fiche du spécialiste (section 2), d'après les nombres relevés en ligne.
  assert.deepEqual(liste.map((v) => v.nom), ['Bleu', 'Beige', 'Jaune', 'Noir', 'Gris', 'Vert', 'Multicolore', 'Noir & Blanc', 'Rose', 'Blanc', 'Rouge', 'Marron', 'Doré', 'Orange'])
  assert.deepEqual(liste.slice(0, 3).map((v) => v.nb), [103, 77, 46])
  for (const v of liste) {
    assert.equal(v.name, 'filter.v.t.painting.color', v.nom)
    assert.match(v.value, /^gid:\/\/shopify\/Metaobject\/\d+$/, v.nom)
    assert.equal(v.coche, false, v.nom)
  }
  assert.equal(liste.find((v) => v.nom === 'Bleu').value, GID(263065862491))
})

test('couleur : le rond de Search & Discovery, coche à l’encre sur les ronds clairs ; l’image pour Multicolore et Noir & Blanc', { skip: SKIP }, async () => {
  const liste = valeurs(panneau(await ligne(), 'couleur'))
  const rond = (nom) => /<span class="filtres-rond"[^>]*>/.exec(liste.find((v) => v.nom === nom).tout)[0]
  assert.equal(attr(rond('Bleu'), 'style'), '--c: #005BD3')
  assert.equal(attr(rond('Bleu'), 'aria-hidden'), 'true')
  // Clairs : Beige, Jaune, Rose, Blanc (la fiche) ; les autres, coche blanche.
  const clairs = liste.filter((v) => attr(rond(v.nom), 'data-clair') !== undefined).map((v) => v.nom)
  assert.deepEqual(clairs, ['Beige', 'Jaune', 'Rose', 'Blanc'])
  for (const nom of ['Multicolore', 'Noir & Blanc']) {
    const tout = liste.find((v) => v.nom === nom).tout
    assert.doesNotMatch(rond(nom), /style=/, nom)
    const img = /<img[^>]*>/.exec(tout)[0]
    assert.equal(attr(img, 'alt'), '', nom)
    assert.equal(attr(img, 'loading'), 'lazy', nom)
    assert.match(attr(img, 'src'), /\/files\/(multicolor|black-and-white)\.jpg\?v=1&width=64$/, nom)
  }
})

test('le libellé court d’une couleur (filter-color-label, court: true) ; sans lui, le libellé d’aujourd’hui, partout ailleurs', { skip: SKIP }, async () => {
  const libelle = (label, lang, court) => engine(lang).renderFile('filter-color-label', court ? { label, court } : { label }, { globals: { request: { locale: { iso_code: lang } } } })
  // Les libellés de la boutique en français (les noms de base sont remappés vers les libellés composés) et en anglais.
  const CAS = [['fr', 'Or', 'Doré / Or', 'Doré'], ['fr', 'Beige', 'Beige / Crème', 'Beige'], ['fr', 'Beige / Crème', 'Beige / Crème', 'Beige'], ['fr', 'Noir & Blanc', 'Noir & Blanc', 'Noir & Blanc'], ['en', 'Yellow / Ochre', 'Yellow / Ochre', 'Yellow'], ['en', 'Gold', 'Gold', 'Gold']]
  for (const [lang, label, aujourdhui, court] of CAS) {
    assert.equal(await libelle(label, lang, false), aujourdhui, `${lang} ${label}`)
    assert.equal(await libelle(label, lang, true), court, `${lang} ${label}, court`)
  }
})

test('une valeur à 0 disparaît, sauf si elle est cochée ; cochée, sa case l’est', { skip: SKIP }, async () => {
  const noms = async (options) => valeurs(panneau(await ligne(collection(options)), 'couleur')).map((v) => v.nom)
  assert.ok(!(await noms({ comptes: { Orange: 0 } })).includes('Orange'))
  const html = await ligne(collection({ comptes: { Orange: 0 }, actifs: { couleur: ['Orange'] } }))
  const orange = valeurs(panneau(html, 'couleur')).find((v) => v.nom === 'Orange')
  assert.ok(orange, 'cochée, elle reste')
  assert.equal(orange.coche, true)
  assert.equal(orange.nb, 0)
})

const FORMES = {
  fr: { Portrait: 'Portrait', Paysage: 'Paysage', 'Carré': 'Carré' },
  en: { Portrait: 'Portrait', Paysage: 'Landscape', 'Carré': 'Square' },
  de: { Portrait: 'Hochformat', Paysage: 'Querformat', 'Carré': 'Quadratisch' },
  es: { Portrait: 'Retrato', Paysage: 'Paisaje', 'Carré': 'Cuadrado' },
  nl: { Portrait: 'Staand', Paysage: 'Liggend', 'Carré': 'Vierkant' },
}

test('format : Portrait, Paysage, Carré, chacun sa forme dessinée, dans les cinq langues (les noms traduits par la boutique)', { skip: SKIP }, async () => {
  for (const [lang, libelles] of Object.entries(FORMES)) {
    const liste = valeurs(panneau(await ligne(collection({ libelles }), { lang }), 'format'))
    assert.deepEqual(liste.map((v) => v.nom), [libelles.Portrait, libelles.Paysage, libelles['Carré']], lang)
    assert.deepEqual(liste.map((v) => v.nb), [257, 16, 54], lang)
    assert.deepEqual(liste.map((v) => attr(/<span class="filtres-forme"[^>]*>/.exec(v.tout)[0], 'data-forme')), ['portrait', 'paysage', 'carre'], lang)
    for (const v of liste) assert.equal(v.name, 'filter.p.m.painting.layout', lang)
  }
  // Un format que la boutique nommerait autrement : il reste, après les autres, sans dessin.
  const liste = valeurs(panneau(await ligne(collection({ libelles: { 'Carré': 'Panoramique' } })), 'format'))
  assert.deepEqual(liste.map((v) => v.nom), ['Portrait', 'Paysage', 'Panoramique'])
  assert.doesNotMatch(liste[2].tout, /filtres-forme/)
})

test('thème : les doublons de Search & Discovery réunis, une case qui emporte les deux valeurs ensemble', { skip: SKIP }, async () => {
  const tous = (html) => valeurs(panneau(html, 'theme'))
  const humour = (html) => tous(html).filter((v) => v.nom === 'Humour')
  const html = await ligne()
  // « Humour » ×2 et « Nature » ×2 : un seul nom chacun, leurs nombres additionnés (4 + 1, 3 + 1).
  assert.equal(humour(html).length, 1)
  assert.equal(humour(html)[0].nb, 5)
  assert.equal(tous(html).find((v) => v.nom === 'Nature').nb, 4)
  // La case porte la première valeur ; l'autre suit dans un champ caché, éteint tant que la case n'est pas cochée.
  const [h] = humour(html)
  assert.equal(h.value, GID(264832876891))
  const jumeau = /<input type="hidden"[^>]*data-jumeau[^>]*>/.exec(h.tout)[0]
  assert.equal(attr(jumeau, 'name'), 'filter.v.t.shopify.theme')
  assert.equal(attr(jumeau, 'value'), GID(264840642907))
  assert.notEqual(attr(jumeau, 'disabled'), undefined)
  // Cochée (l'une des deux valeurs dans l'adresse) : la case et le champ caché, allumé.
  const coche = humour(await ligne(collection({ actifs: { theme: ['Humour'] } })))[0]
  assert.equal(coche.coche, true)
  assert.equal(attr(/<input type="hidden"[^>]*data-jumeau[^>]*>/.exec(coche.tout)[0], 'disabled'), undefined)
})

test('thème : les 12 plus fournis, puis « Voir les 98 thèmes », une recherche et les autres de A à Z', { skip: SKIP }, async () => {
  const html = panneau(await ligne(), 'theme')
  const haut = valeurs(element(html, /<div class="filtres-valeurs">/))
  assert.deepEqual(haut.map((v) => v.nom), ['Zen', 'Minimaliste', 'Animaux', 'Contemporain', 'Nature morte', 'Paysage', 'Portrait', 'Jardin', 'Réalisme', 'Fleur', 'Oiseaux', 'Chat'])
  const tous = element(html, /<details class="filtres-tous">/)
  assert.ok(tous, 'la suite des thèmes, repliée')
  // 100 valeurs, dont deux doublons : 98 thèmes.
  assert.equal(texte(/<span class="filtres-tous-plus">([\s\S]*?)<\/span>/.exec(tous)[1]), 'Voir les 98 thèmes')
  assert.equal(texte(/<span class="filtres-tous-moins">([\s\S]*?)<\/span>/.exec(tous)[1]), 'Moins de thèmes')
  const champ = /<input class="filtres-cherche"[^>]*>/.exec(tous)[0]
  assert.equal(attr(champ, 'type'), 'search')
  assert.equal(attr(champ, 'name'), undefined, 'la recherche ne part pas avec le formulaire')
  assert.equal(attr(champ, 'placeholder'), 'Chercher un thème (cheval, zen…)')
  assert.equal(attr(champ, 'aria-label'), 'Chercher un thème')
  const autres = valeurs(tous).map((v) => v.nom)
  assert.equal(autres.length, 86)
  assert.deepEqual(autres.slice(0, 4), ['Abstrait', 'Afrique', 'Amour', 'Arbre'])
  assert.ok(autres.every((nom) => !haut.some((v) => v.nom === nom)), 'chaque thème une seule fois')
  // Rien ne correspond à la recherche : la phrase est prête, cachée.
  assert.match(tous, /<p class="filtres-aucun" hidden>Aucun thème de ce nom parmi ces 327 tableaux\. Retirez un filtre pour en voir plus\.<\/p>/)
  // Les thèmes cochés passent devant, même peu fournis.
  const coches = valeurs(element(panneau(await ligne(collection({ actifs: { theme: ['Cheval', 'Afrique'] } })), 'theme'), /<div class="filtres-valeurs">/))
  assert.deepEqual(coches.slice(0, 3).map((v) => v.nom), ['Cheval', 'Afrique', 'Zen'])
  assert.equal(coches.length, 12)
  // Au plus 12 thèmes : pas de suite à ouvrir.
  const peu = Object.fromEntries(NATURE.theme.values.map((v, i) => [v.label, i < 10 ? 3 : 0]))
  assert.doesNotMatch(panneau(await ligne(collection({ comptes: peu })), 'theme'), /filtres-tous/)
})

/* ---------- Ce qui est choisi ---------- */

const bouton = (html, f) => /<summary class="filtres-fac"([^>]*)>([\s\S]*?)<\/summary>/.exec(famille(html, f))
const pied = (html, f) => element(panneau(html, f), /<div class="filtres-panneau-pied">/)

test('un menu actif le dit : « Couleur · Bleu », « Couleur · 2 », sur fond encre (data-actif)', { skip: SKIP }, async () => {
  const html = await ligne(collection({ actifs: { couleur: ['Beige / Crème'], theme: ['Humour', 'Zen'] } }))
  assert.equal(texte(bouton(html, 'couleur')[2]), 'Couleur · Beige', 'le libellé court')
  assert.notEqual(attr(`<summary${bouton(html, 'couleur')[1]}>`, 'data-actif'), undefined)
  assert.equal(texte(bouton(html, 'theme')[2]), 'Thème · 2')
  assert.equal(texte(bouton(html, 'format')[2]), 'Format')
  assert.equal(attr(`<summary${bouton(html, 'format')[1]}>`, 'data-actif'), undefined)
  // « Humour » en double, coché par ses deux valeurs : un seul thème.
  assert.equal(texte(bouton(await ligne(collection({ actifs: { theme: ['Humour'] } })), 'theme')[2]), 'Thème · Humour')
})

test('le panneau : son nom, l’aide du téléphone et celle de l’ordinateur, « Fermer sans rien changer », un groupe nommé', { skip: SKIP }, async () => {
  const html = panneau(await ligne(), 'couleur')
  assert.match(html, /<p class="filtres-panneau-titre" id="filtres-titre-couleur" tabindex="-1">Couleur<\/p>/)
  assert.equal(texte(/<span class="filtres-aide-tel">([\s\S]*?)<\/span>/.exec(html)[1]), 'Un toucher ajoute, un autre retire')
  assert.equal(texte(/<span class="filtres-aide-ordi">([\s\S]*?)<\/span>/.exec(html)[1]), 'un clic ajoute, un autre retire')
  const fermer = /<button type="button" class="filtres-fermer"[^>]*>/.exec(html)[0]
  assert.equal(attr(fermer, 'aria-label'), 'Fermer sans rien changer')
  assert.match(html, /<fieldset class="filtres-groupe">\s*<legend class="sr-only">Couleur<\/legend>/)
})

test('le pied : « Effacer la couleur » s’il y a un choix dans la famille, et « Voir les 103 tableaux », qui envoie le formulaire', { skip: SKIP }, async () => {
  const sans = pied(await ligne(), 'couleur')
  assert.match(sans, /<a class="filtres-effacer" href="[^"]*" data-effacer hidden>Effacer la couleur<\/a>/)
  assert.match(sans, /<button type="submit" class="filtres-voir">Voir les 327 tableaux<\/button>/)
  const col = collection({ actifs: { couleur: ['Bleu'], theme: ['Zen'] }, total: 103 })
  const avec = pied(await ligne(col), 'couleur')
  const effacer = /<a class="filtres-effacer"[^>]*>/.exec(avec)[0]
  assert.equal(attr(effacer, 'hidden'), undefined)
  // Sans script, le lien retire la couleur et garde le reste (filter.url_to_remove).
  assert.equal(attr(effacer, 'href'), col.filters.find((f) => f.param_name.endsWith('color')).url_to_remove)
  assert.match(attr(effacer, 'href'), /filter\.v\.t\.shopify\.theme=/)
  assert.doesNotMatch(attr(effacer, 'href'), /painting\.color/)
  assert.match(avec, /class="filtres-voir">Voir les 103 tableaux</)
  assert.equal(texte(/<a class="filtres-effacer"[^>]*>([\s\S]*?)<\/a>/.exec(pied(await ligne(col), 'theme'))[1]), 'Effacer le thème')
  assert.equal(texte(/<a class="filtres-effacer"[^>]*>([\s\S]*?)<\/a>/.exec(pied(await ligne(col), 'format'))[1]), 'Effacer le format')
  // « Voir le tableau » s'il n'en reste qu'un ; aucun : « Aucun tableau ».
  assert.match(pied(await ligne(collection({ total: 1 })), 'couleur'), /class="filtres-voir">Voir le tableau</)
  assert.match(pied(await ligne(collection({ total: 0 })), 'couleur'), /class="filtres-voir">Aucun tableau</)
})

test('le tri choisi : « Tri · Nouveautés » sur téléphone (pastille encre), « Trier : Nouveautés » sur ordinateur', { skip: SKIP }, async () => {
  const etiquette = async (col) => {
    const html = await ligne(col)
    const label = element(html, /<label class="filtres-tri"[^>]*>/)
    return {
      actif: attr(/<label[^>]*>/.exec(label)[0], 'data-actif') !== undefined,
      tel: texte(/<span class="filtres-tri-tel">([\s\S]*?)<\/span>/.exec(label)[1]),
      ordi: texte(element(label, /<span class="filtres-tri-ordi">/)),
    }
  }
  assert.deepEqual(await etiquette(collection()), { actif: false, tel: 'Trier', ordi: 'Trier : Meilleures ventes' })
  assert.deepEqual(await etiquette(collection({ tri: 'created-descending' })), { actif: true, tel: 'Tri · Nouveautés', ordi: 'Trier : Nouveautés' })
  // Le tri de l'adresse, celui de la collection : rien de particulier.
  assert.deepEqual(await etiquette(collection({ tri: 'best-selling' })), { actif: false, tel: 'Trier', ordi: 'Trier : Meilleures ventes' })
})

/* ---------- Les filtres actifs, sous la ligne ---------- */

const resume = (html) => element(html, /<div id="resume"[^>]*>/)
const pastilles = (html) => [...resume(html).matchAll(/<a class="filtres-pastille([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
  tri: m[1].includes('filtres-pastille-tri'), href: attr(`<a${m[2]}>`, 'href'), label: attr(`<a${m[2]}>`, 'aria-label'),
  retirer: attr(`<a${m[2]}>`, 'data-retirer'), valeur: attr(`<a${m[2]}>`, 'data-valeur'), nom: texte(m[3]), dedans: m[3],
}))

test('les filtres actifs : seulement s’il y en a ; « 103 tableaux », une pastille par filtre, puis « Tout effacer »', { skip: SKIP }, async () => {
  assert.match(await ligne(), /<div id="resume" class="filtres-resume" hidden><\/div>/)
  const col = collection({ actifs: { couleur: ['Bleu', 'Noir & Blanc'], format: ['Carré'], theme: ['Humour'] }, total: 103 })
  const html = await ligne(col)
  const r = resume(html)
  assert.match(r, /^<div id="resume" class="filtres-resume">/)
  // Après la ligne, hors d'elle : elle ne se colle pas avec la ligne.
  assert.ok(html.indexOf('<div id="resume"') > html.indexOf('</collection-filtres>'))
  assert.equal(texte(/<p class="filtres-resume-compte">([\s\S]*?)<\/p>/.exec(r)[1]), '103 tableaux')
  assert.match(r, /<p class="filtres-resume-compte"><b>103<\/b> tableaux<\/p>/)
  const liste = pastilles(html)
  assert.deepEqual(liste.map((p) => p.nom), ['Bleu', 'Noir & Blanc', 'Carré', 'Humour'])
  assert.deepEqual(liste.map((p) => p.label), ['Retirer le filtre Bleu', 'Retirer le filtre Noir & Blanc', 'Retirer le filtre Carré', 'Retirer le filtre Humour'])
  // Chacune est un lien qui retire son filtre, les autres gardés (url_to_remove de la boutique).
  const valeur = (f, label) => col.filters.find((x) => x.param_name === NATURE[f].param_name).values.find((v) => v.label === label)
  assert.equal(liste[0].href, valeur('couleur', 'Bleu').url_to_remove)
  assert.equal(liste[2].href, valeur('format', 'Carré').url_to_remove)
  assert.deepEqual([liste[0].retirer, liste[0].valeur], ['filter.v.t.painting.color', GID(263065862491)])
  // Le rond ou la forme ; rien pour un thème.
  assert.match(liste[0].dedans, /<span class="filtres-rond" style="--c: #005BD3"/)
  assert.match(liste[2].dedans, /<span class="filtres-forme" data-forme="carre"/)
  assert.doesNotMatch(liste[3].dedans, /filtres-rond|filtres-forme/)
  assert.match(r, /<a class="filtres-tout" href="\/collections\/tableaux-nature-sauvage" data-tout>Tout effacer<\/a><\/div>$/)
})

test('les filtres actifs : un tri autre que Meilleures ventes s’y montre sur téléphone, « Tri : Nouveautés », qui se retire', { skip: SKIP }, async () => {
  // Le tri seul : la ligne des filtres actifs, sur téléphone seulement (data-tri-seul).
  const seul = await ligne(collection({ tri: 'created-descending' }))
  assert.match(resume(seul), /^<div id="resume" class="filtres-resume" data-tri-seul>/)
  const [tri] = pastilles(seul)
  assert.equal(tri.tri, true)
  assert.equal(tri.nom, 'Tri : Nouveautés')
  assert.equal(tri.label, 'Revenir au tri par meilleures ventes')
  assert.equal(tri.href, COL_URL)
  // Avec des filtres : la pastille du tri garde les filtres dans son adresse.
  const avec = pastilles(await ligne(collection({ tri: 'price-ascending', actifs: { couleur: ['Bleu'] } })))
  assert.deepEqual(avec.map((p) => p.nom), ['Bleu', 'Tri : Prix croissant'])
  assert.equal(avec[1].href, `${COL_URL}?filter.v.t.painting.color=gid%3A%2F%2Fshopify%2FMetaobject%2F263065862491`)
  assert.doesNotMatch(resume(await ligne(collection({ tri: 'price-ascending', actifs: { couleur: ['Bleu'] } }))), /data-tri-seul/)
})

test('la zone parlée : « 103 tableaux. Filtres : Bleu. », sinon « Aucun filtre. », et le tri choisi', { skip: SKIP }, async () => {
  const annonce = async (col) => attr(/<collection-filtres[^>]*>/.exec(await ligne(col))[0], 'data-annonce')
  assert.equal(await annonce(collection({ actifs: { couleur: ['Bleu'] }, total: 103 })), '103 tableaux. Filtres : Bleu.')
  assert.equal(await annonce(collection()), '327 tableaux. Aucun filtre.')
  assert.equal(await annonce(collection({ actifs: { couleur: ['Doré / Or'], theme: ['Humour', 'Zen'] }, total: 1 })), '1 tableau. Filtres : Doré, Humour, Zen.')
  assert.equal(await annonce(collection({ tri: 'price-descending', total: 327 })), '327 tableaux. Aucun filtre. Tri : Prix décroissant.')
})

/* ---------- Dans la grille (sections/collection-grille.liquid) ---------- */

/* {% paginate %} de Shopify, pour liquidjs, comme scripts/collection-grille.test.cjs : la page vient de current_page,
   les produits de la page remplacent la liste. */
function paginate(e) {
  e.registerTag('paginate', {
    parse(token, remain) {
      const m = /^\s*([\w.]+)\s+by\s+(\d+)\s*$/.exec(token.args)
      this.path = m[1].split('.')
      this.by = Number(m[2])
      this.tpls = []
      const stream = this.liquid.parser.parseStream(remain)
      stream.on('tag:endpaginate', () => stream.stop()).on('template', (tpl) => this.tpls.push(tpl)).on('end', () => { throw new Error('paginate non fermé') })
      stream.start()
    },
    * render(ctx, emitter) {
      const owner = yield ctx._get(this.path.slice(0, -1))
      const key = this.path[this.path.length - 1]
      const all = owner[key]
      const pages = Math.max(1, Math.ceil(all.length / this.by))
      const current = Math.min(Math.max(1, Number(ctx.globals.current_page) || 1), pages)
      const part = (n) => ({ title: String(n), url: `${owner.url}?page=${n}`, is_link: n !== current })
      const pagination = {
        current_page: current, current_offset: (current - 1) * this.by, items: all.length, page_size: this.by, pages,
        parts: pages > 1 ? Array.from({ length: pages }, (_, i) => part(i + 1)) : [],
        previous: current > 1 ? part(current - 1) : undefined, next: current < pages ? part(current + 1) : undefined,
      }
      owner[key] = all.slice(pagination.current_offset, pagination.current_offset + this.by)
      ctx.push({ paginate: pagination })
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter)
      ctx.pop()
    },
  })
}
if (!SKIP) for (const lang of Object.keys(LANGS)) paginate(engine(lang))

// Un produit de toujours, tel que la grille le montre (l'œuvre à plat en 2e image).
let dernierId = 800000000000
function produit(i) {
  const image = (file, width, height) => ({ id: ++dernierId, src: `//www.myselfmonart.com/cdn/shop/files/${file}?v=1`, width, height, aspect_ratio: width / height, alt: file })
  const images = [image(`ambiance-${i}.jpg`, 1588, 1865), image(`oeuvre-${i}.jpg`, 1440, 1920)]
  const media = images.map((img) => ({ id: img.id, media_type: 'image', alt: img.alt, preview_image: img, aspect_ratio: img.aspect_ratio, width: img.width, height: img.height }))
  return {
    id: ++dernierId, handle: `tableau-${i}`, title: `Tableau ${i}`, url: `/products/tableau-${i}`, template_suffix: 'painting',
    images, media, featured_media: media[0], price_min: 6250, description: '',
    metafields: { title: { short: `Tableau ${i}` }, painting_options: {}, meta_object: {} },
  }
}
const GRILLE = 'sections/collection-grille.liquid'
let sourceGrille = null
async function grille(col, { lang = 'fr', page = 1 } = {}) {
  const e = engine(lang)
  if (!sourceGrille) sourceGrille = new Map()
  if (!sourceGrille.has(lang)) {
    const source = require('fs').readFileSync(require('path').join(__dirname, '..', GRILLE), 'utf8')
    sourceGrille.set(lang, e.parse(source.slice(0, source.indexOf('{% schema %}'))))
  }
  return e.render(sourceGrille.get(lang), {}, {
    globals: { ...globals(col, lang), shop: { name: 'MyselfMonArt', url: 'https://www.myselfmonart.com' }, cart: { currency: { iso_code: 'EUR' } }, current_page: page, section: { id: SECTION_ID, settings: {} } },
  })
}
const avecProduits = (n, options = {}) => ({ ...collection({ ...options, total: n }), products: Array.from({ length: n }, (_, i) => produit(i + 1)) })

test('la grille : la ligne à sa place (#barre), puis les filtres actifs, la liste, la suite, les pages ; le script une fois', { skip: SKIP }, async () => {
  const html = await grille(avecProduits(30, { actifs: { couleur: ['Bleu'] } }))
  const ids = [...html.matchAll(/\sid="(grille-titre|ancre-barre|barre|resume|liste|suite|pages|statut)"/g)].map((m) => m[1])
  assert.deepEqual(ids, ['grille-titre', 'ancre-barre', 'barre', 'resume', 'liste', 'suite', 'pages', 'statut'])
  assert.match(html, /<collection-filtres id="barre" class="filtres-ligne" data-section="template--1__collection_grille"/)
  assert.equal((html.match(/<script src="[^"]*collection-filtres\.js[^"]*" defer><\/script>/g) || []).length, 1)
  // Ni h1, ni liste ou lien de navigation dans la ligne (les filtres ne créent aucun lien de cocon).
  const ligneSeule = element(html, /<collection-filtres[^>]*>/)
  assert.doesNotMatch(ligneSeule, /<h1|<nav|<ul/)
})

test('la suite d’un choix : « Vous avez vu les 10 tableaux de ce choix. » et « Voir les 327 tableaux, sans filtre »', { skip: SKIP }, async () => {
  const fin = (html) => /<p class="refonte-suite-fin"[^>]*>([\s\S]*?)<\/p>/.exec(html)
  const choix = fin(await grille(avecProduits(10, { actifs: { theme: ['Zen'] } })))
  assert.equal(texte(choix[1]), 'Vous avez vu les 10 tableaux de ce choix. Voir les 327 tableaux, sans filtre')
  const lien = /<a class="filtres-sans"[^>]*>/.exec(choix[1])[0]
  assert.equal(attr(lien, 'href'), COL_URL)
  assert.notEqual(attr(lien, 'data-tout'), undefined)
  // Sans filtre : la fin d'aujourd'hui (ticket 05).
  assert.equal(texte(fin(await grille(avecProduits(10)))[1]), 'Vous avez vu les 10 tableaux.')
})

test('aucun tableau pour ces filtres : « Aucun tableau ne réunit ces filtres. », et de quoi tout revoir', { skip: SKIP }, async () => {
  const html = await grille(avecProduits(0, { actifs: { couleur: ['Orange'], theme: ['Afrique'] } }))
  const vide = element(html, /<div class="refonte-grille-dedans">/)
  assert.equal(texte(vide), 'Aucun tableau ne réunit ces filtres. Voir les 327 tableaux, sans filtre')
  // La ligne reste, pour retirer un filtre.
  assert.match(html, /<collection-filtres id="barre"/)
  // Une collection vide, sans filtre : le message d'aujourd'hui.
  assert.equal(texte(element(await grille(avecProduits(0)), /<div class="refonte-grille-dedans">/)), 'Aucun produit trouvé')
})

/* ---------- Plus de barre des filtres dans l'en-tête, plus de tiroir, sur cette page seulement ---------- */

/* L'en-tête (sections/tw-header.liquid → snippets/tw-sticky-header.liquid) écrit sur les pages de collection la barre
   « FILTRER ET TRIER 327 produits » (#mobile-filter-button-wrapper) qui ouvre le tiroir des filtres, et réserve sa
   place en haut du menu du téléphone (pt-[54px] sur son nav). Sur la nouvelle page, la ligne la remplace. L'en-tête
   est une section : il ne voit pas la page rendue (content_for_layout n'y est pas lisible, relevé en ligne le
   23/11/2026 : la barre restait écrite) et ne change pas. La feuille de la page cache la barre et rend au menu la
   marge des pages sans filtres (pt-8). */
const ENTETE = 'snippets/tw-sticky-header.liquid'
const { read, templateOf } = require('./galerie-banc.cjs')
// La balise {% form %} de Shopify (le sélecteur de langue de l'en-tête), pour liquidjs.
function formulaire(e) {
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
if (!SKIP) for (const lang of Object.keys(LANGS)) formulaire(engine(lang))
const entete = ({ type = 'painting', reglages = { enable_painting_filtering: true, enable_poster_filtering: true } } = {}) => engine('fr').parseAndRender(read(ENTETE), {}, {
  globals: {
    template: templateOf('collection', 'refonte'), settings: reglages,
    collection: { metafields: { custom: { type_of_collection: type } }, products_count: 327 },
    section: { id: 'tw-header', settings: {}, blocks: [] },
    request: { locale: { iso_code: 'fr' }, page_type: 'collection', origin: 'https://www.myselfmonart.com' },
    routes: { root_url: '/', cart_url: '/cart', account_url: '/account', search_url: '/search' },
    shop: { name: 'MyselfMonArt' }, cart: { item_count: 0 },
  },
})
const MARQUE = '<div id="shopify-section-template--1__collection_refonte" class="shopify-section"><div hidden data-refonte></div></div>'

test('l’en-tête écrit encore la barre « Filtrer et trier » et sa place dans le menu ; la feuille de la page les retire', { skip: SKIP }, async () => {
  const html = await entete()
  assert.match(html, /id="mobile-filter-button-wrapper"/)
  // Le menu du téléphone : le premier nav de l'en-tête, avec la marge de la barre. La feuille le vise par cette classe.
  const menu = /<sticky-header\b[\s\S]*?<nav class="([^"]*)"/.exec(html)
  assert.ok(menu, 'le menu du téléphone')
  assert.ok(menu[1].split(/\s+/).includes('pt-[54px]'), menu[1])
  // Sans filtres, la marge des autres pages : celle que la feuille rend au menu.
  const sansFiltres = await entete({ reglages: {} })
  const sans = /<sticky-header\b[\s\S]*?<nav class="([^"]*)"/.exec(sansFiltres)
  assert.ok(sans[1].split(/\s+/).includes('pt-8'), sans[1])
  assert.doesNotMatch(sansFiltres, /mobile-filter-button-wrapper/)
  const bloc = blocCss()
  assert.equal(regle(bloc, `${H} #mobile-filter-button-wrapper`).body.trim(), 'display: none;')
  assert.equal(regle(bloc, `${H} sticky-header nav.pt-\\[54px\\]`).body.trim(), 'padding-top: 2rem;')
})

/* La demande de sections : avec l'en-tête « Accept: application/json », Shopify répond la collection elle-même en JSON
   ({ "collection": … }) et ignore ?sections= (relevé en ligne le 23/11/2026). Le script n'y trouvait pas la grille et
   rechargeait la page entière à chaque choix ; le nombre de « Voir les N tableaux » ne suivait pas. */
test('la demande de sections part sans en-tête Accept, sinon Shopify répond la collection et non les sections', () => {
  const source = read('assets/collection-filtres.js')
  const appels = [...source.matchAll(/fetch\(adresseSections\([^)]*\),\s*(\{[^}]*\})\)/g)]
  assert.equal(appels.length, 1, 'une seule demande de sections')
  assert.doesNotMatch(appels[0][1], /Accept|headers/)
  // Le code seul, sans ses commentaires (qui racontent le piège).
  assert.doesNotMatch(source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /application\/json/)
})

/* Le tiroir des filtres (snippets/tw-filter-drawer.liquid), rendu par le gabarit des pages collection : pas sur la
   nouvelle page, que le gabarit reconnaît déjà à sa marque (layout/collection.liquid). Le gabarit rendu avec des
   repères à la place des sections et des snippets qu'il rend, comme scripts/collection-refonte.test.cjs. */
const gabarit = (contenu) => engine('fr').parseAndRender(read('layout/collection.liquid')
  .replace(/{%\s*section\s+'([\w-]+)'\s*%}/g, '[section $1]')
  .replace(/{%\s*render\s+'(head-base|tw-filter-drawer|open-cart-drawer-button|cookie-banner|collection-refonte-police)'\s*%}/g, '[render $1]'), {
  content_for_layout: contenu,
  content_for_header: '',
}, { globals: { request: { locale: { iso_code: 'fr' }, origin: 'https://www.myselfmonart.com' }, routes: {}, settings: {} } })

test('le gabarit : pas de tiroir des filtres sur la nouvelle page ; ailleurs, toujours', { skip: SKIP }, async () => {
  assert.doesNotMatch(await gabarit(MARQUE), /tw-filter-drawer/)
  assert.equal((await gabarit('<h1>Tableaux Nature</h1>')).match(/\[render tw-filter-drawer\]/g).length, 1)
})

/* ---------- La feuille de la page : le bloc du ticket ---------- */

const { code, rules, blocs } = require('./galerie-banc.cjs')
const CSS = 'assets/collection-refonte.css'
const H = ':root[data-refonte-page]'
// Le bloc « Ligne des filtres (ticket 06) » de la feuille, sans ses commentaires, en règles.
function blocCss() {
  const reperes = blocs(CSS).filter((m) => m.ticket === '06')
  assert.deepEqual(reperes.map((m) => `${m.name} : ${m.side}`), ['Ligne des filtres : début', 'Ligne des filtres : fin'])
  return rules(read(CSS).slice(reperes[0].end, reperes[1].start).replace(/\/\*[\s\S]*?\*\//g, ''))
}
const regle = (bloc, head, context = '') => bloc.find((r) => r.head === head && r.context.join(' / ') === context)
const FICHIERS = ['collection-filtres', 'collection-filtres-famille', 'collection-filtres-valeur', 'collection-filtres-marque', 'collection-filtres-pastille', 'collection-filtres-icone']
  .map((nom) => `snippets/${nom}.liquid`).concat('sections/collection-grille.liquid')

test('la feuille : chaque classe de la ligne, des panneaux et des filtres actifs a sa règle, dans le bloc du ticket', () => {
  const bloc = blocCss()
  const heads = bloc.map((r) => r.head).join('\n')
  const classes = new Set(FICHIERS.flatMap((file) => [...code(file).matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].replace(/{%[\s\S]*?%}/g, ' ').split(/\s+/))).filter((c) => c.startsWith('filtres-')))
  assert.ok(classes.size >= 30, [...classes].join(' '))
  for (const name of classes) assert.match(heads, new RegExp(`\\.${name}(?![\\w-])`), name)
})

test('la feuille : la ligne collée sous l’en-tête (--barre-top), 56 px sur téléphone et 68 px sur ordinateur ; le panneau en bas', () => {
  const bloc = blocCss()
  const ligne = regle(bloc, `${H} .filtres-ligne`).body
  assert.match(ligne, /position: sticky;/)
  assert.match(ligne, /top: var\(--barre-top, 0px\);/)
  assert.match(ligne, /background: var\(--blanc\);/)
  assert.match(regle(bloc, `${H} .filtres-dedans`).body, /min-height: 56px;/)
  assert.match(regle(bloc, `${H} .filtres-dedans`, '@media (min-width: 900px)').body, /min-height: 68px;/)
  // Boutons de 44 px, contour encre ; actif : fond encre.
  const fac = regle(bloc, `${H} .filtres-fac`).body
  assert.match(fac, /height: 44px;/)
  assert.match(fac, /border: 1\.5px solid var\(--encre\);/)
  assert.match(regle(bloc, `${H} .filtres-fac[data-actif]`).body, /background: var\(--encre\);/)
  // Le panneau du téléphone : posé en bas, 88 % de l'écran au plus, coins de 26 px, voile encre à 38 %.
  const feuille = regle(bloc, `${H} .filtres-feuille`).body
  assert.match(feuille, /max-height: 88svh;/)
  assert.match(feuille, /border-radius: 26px 26px 0 0;/)
  assert.match(feuille, /inset-block: auto 0;/)
  assert.match(regle(bloc, `${H} .filtres-feuille::backdrop`).body, /color-mix\(in srgb, var\(--encre\) 38%, transparent\)/)
  // Le menu de l'ordinateur : 600 px (420 pour Format), coins de 22 px, décalé par le script s'il dépassait.
  const menu = regle(bloc, `${H} .filtres-famille > .filtres-panneau`, '@media (min-width: 900px)').body
  assert.match(menu, /width: 600px;/)
  assert.match(menu, /border-radius: 22px;/)
  assert.match(menu, /left: var\(--decale, 0px\);/)
  assert.match(regle(bloc, `${H} .filtres-famille[data-famille="format"] > .filtres-panneau`, '@media (min-width: 900px)').body, /width: 420px;/)
  // Pendant la réponse, la grille à 35 % ; le fondu, seulement sans « mouvements réduits ».
  assert.match(regle(bloc, `${H} .refonte-grille-dedans[aria-busy="true"]`).body, /opacity: 0\.35;/)
  assert.match(regle(bloc, `${H} .refonte-grille-dedans`, '@media (prefers-reduced-motion: no-preference)').body, /transition: opacity/)
  // Une pastille des filtres actifs : 36 px, et 44 px de zone de toucher.
  assert.match(regle(bloc, `${H} .filtres-pastille`).body, /height: 36px;/)
  assert.match(regle(bloc, `${H} .filtres-pastille::before`).body, /inset: -4px 0;/)
})

/* ---------- Le script : ses fonctions pures (assets/collection-filtres.js, sous Node) ---------- */

const script = require('../assets/collection-filtres.js')
const BLEU = GID(263065862491)
const VERT = GID(160756367707)
const enc = encodeURIComponent

test('l’adresse d’un choix : les filtres et le tri du formulaire ; la vue gardée ; ni page, ni demande de section', () => {
  const { adresseFiltree } = script
  const paires = [['filter.v.t.painting.color', BLEU], ['filter.v.t.painting.color', VERT], ['sort_by', 'best-selling']]
  // Le tri de la collection ne s'écrit pas ; un choix repart du premier lot ; les anciens filtres cèdent la place.
  assert.equal(
    adresseFiltree(COL_URL, `?view=refonte&page=3&filter.v.t.shopify.theme=${enc(GID(1))}&sort_by=price-ascending&section_id=x`, paires, 'best-selling'),
    `${COL_URL}?view=refonte&filter.v.t.painting.color=${enc(BLEU)}&filter.v.t.painting.color=${enc(VERT)}`,
  )
  // Un autre tri s'écrit, après les filtres.
  assert.equal(adresseFiltree(COL_URL, '', [['filter.p.m.painting.layout', GID(2)], ['sort_by', 'created-descending']], 'best-selling'), `${COL_URL}?filter.p.m.painting.layout=${enc(GID(2))}&sort_by=created-descending`)
  // Une même valeur deux fois (un thème en double coché par ses deux pastilles), ou vide : une fois, ou pas du tout.
  assert.equal(adresseFiltree(COL_URL, '', [['filter.v.t.shopify.theme', GID(3)], ['filter.v.t.shopify.theme', GID(3)], ['filter.v.t.shopify.theme', '']], 'best-selling'), `${COL_URL}?filter.v.t.shopify.theme=${enc(GID(3))}`)
  // Rien de choisi : l'adresse de la collection, seule (ou avec sa vue).
  assert.equal(adresseFiltree(COL_URL, `?filter.v.t.painting.color=${enc(BLEU)}`, [['sort_by', 'best-selling']], 'best-selling'), COL_URL)
  assert.equal(adresseFiltree('/en/collections/nature-themed-wall-art', '?view=refonte', [], 'best-selling'), '/en/collections/nature-themed-wall-art?view=refonte')
  // Les paramètres d'une campagne restent avec la page.
  assert.equal(adresseFiltree(COL_URL, '?utm_source=pinterest', [['filter.v.t.painting.color', BLEU]], 'best-selling'), `${COL_URL}?utm_source=pinterest&filter.v.t.painting.color=${enc(BLEU)}`)
})

test('la demande au serveur : la grille et l’entrée de la page, dans une seule requête (rendu des sections de Shopify)', () => {
  const { adresseSections } = script
  assert.equal(adresseSections(`${COL_URL}?view=refonte`, ['template--1__collection_grille', 'template--1__collection_refonte']), `${COL_URL}?view=refonte&sections=template--1__collection_grille,template--1__collection_refonte`)
  assert.equal(adresseSections(COL_URL, ['template--1__collection_grille']), `${COL_URL}?sections=template--1__collection_grille`)
})

test('la même page, filtres et tri compris : l’ordre des paramètres, la page et les demandes de section n’y font rien', () => {
  const { signature } = script
  assert.equal(signature(`?sort_by=created-descending&view=refonte&filter.a=1&page=2`), signature(`?view=refonte&filter.a=1&sort_by=created-descending&section_id=x`))
  assert.notEqual(signature('?view=refonte&filter.a=1'), signature('?view=refonte&filter.a=2'))
  assert.equal(signature(''), signature('?page=4'))
})

test('le changement appliqué, pour la mesure : la famille, la valeur, l’action', () => {
  const { decrireChangement } = script
  const bleu = { famille: 'couleur', cle: `filter.v.t.painting.color=${BLEU}`, nom: 'Bleu' }
  const vert = { famille: 'couleur', cle: `filter.v.t.painting.color=${VERT}`, nom: 'Vert' }
  const zen = { famille: 'theme', cle: `filter.v.t.shopify.theme=${GID(4)}`, nom: 'Zen' }
  const etat = (valeurs, tri = 'best-selling') => ({ tri, valeurs })
  assert.deepEqual(decrireChangement(etat([]), etat([bleu])), { famille: 'couleur', valeur: 'Bleu', action: 'ajout' })
  // Le panneau du téléphone applique d'un coup : les valeurs ajoutées ensemble.
  assert.deepEqual(decrireChangement(etat([zen]), etat([zen, bleu, vert])), { famille: 'couleur', valeur: 'Bleu, Vert', action: 'ajout' })
  assert.deepEqual(decrireChangement(etat([bleu, zen]), etat([zen])), { famille: 'couleur', valeur: 'Bleu', action: 'retrait' })
  // « Tout effacer » : plusieurs familles d'un coup.
  assert.deepEqual(decrireChangement(etat([bleu, zen], 'created-descending'), etat([])), { famille: 'tout', valeur: 'Bleu, Zen', action: 'effacer' })
  assert.deepEqual(decrireChangement(etat([bleu]), etat([bleu], 'price-ascending')), { famille: 'tri', valeur: 'price-ascending', action: 'tri' })
  assert.equal(decrireChangement(etat([bleu]), etat([bleu])), null)
})

test('la recherche d’un thème : sans accent ni capitale, dans le nom', () => {
  const { correspond } = script
  assert.equal(correspond('Éléphant', 'elep'), true)
  assert.equal(correspond('Nature morte', 'MORTE'), true)
  assert.equal(correspond('Cheval', 'chevaux'), false)
  assert.equal(correspond('Zen', ''), true)
  assert.equal(correspond('Feu de camp', ' feu '), true)
})

/* ---------- Les cinq langues ---------- */

test('les cinq langues : chaque texte de la ligne, des panneaux et des filtres actifs vient des fichiers de langue', { skip: SKIP }, async () => {
  const MOTS = { fr: 'Couleur', en: 'Colour', de: 'Farbe', es: 'Color', nl: 'Kleur' }
  for (const lang of Object.keys(LANGS)) {
    const col = collection({ actifs: { couleur: ['Bleu'], format: ['Portrait'], theme: ['Humour'] }, tri: 'created-descending', total: 103, libelles: FORMES[lang] })
    const html = await ligne(col, { lang })
    // Aucune clé restée telle quelle (le banc rend une clé inconnue telle quelle).
    assert.doesNotMatch(html, /sections\.mma\./, lang)
    assert.match(texte(bouton(html, 'couleur')[2]), new RegExp(`^${MOTS[lang]} · `), lang)
    // Mêmes clés dans les cinq fichiers.
    const cles = (objet, prefixe = '') => Object.entries(objet).flatMap(([k, v]) => (typeof v === 'object' ? cles(v, `${prefixe}${k}.`) : [`${prefixe}${k}`]))
    assert.deepEqual(cles(locales[lang].sections.mma.collection_filtres).sort(), cles(locales.fr.sections.mma.collection_filtres).sort(), lang)
  }
})

/* ---------- Une collection de posters dit « posters » (ticket 09) ---------- */

/* La même collection, en posters (custom.type_of_collection), avec ses 256 posters sans filtre. */
const enPosters = (col) => ({ ...col, handle: 'posters-affiches-nature', title: 'Poster & Affiche Nature', all_products_count: 256, metafields: { custom: { type_of_collection: 'poster' } } })
// Ce que lit la page : le texte, et les noms et phrases portés par les attributs (aria-label, data-annonce, placeholder).
const lu = (html) => `${texte(html)} ${[...html.matchAll(/\s(?:aria-label|data-annonce|placeholder)="([^"]*)"/g)].map((m) => unescape(m[1])).join(' ')}`
// Le mot des tableaux dans chaque langue, qu'une page de posters ne dit jamais.
const MOT_TABLEAUX = { fr: /tableau/i, en: /artwork/i, de: /\bbild/i, es: /cuadro/i, nl: /schilderij/i }
const voirDe = (html, f) => texte(/<button type="submit" class="filtres-voir">([\s\S]*?)<\/button>/.exec(panneau(html, f))[1])

test('sur une collection de posters, la ligne dit « posters » : le nombre, « Voir les N posters », la zone parlée, les noms des groupes', { skip: SKIP }, async () => {
  const html = await ligne(enPosters(collection({ total: 256 })))
  assert.equal(attr(/<collection-filtres id="barre"[^>]*>/.exec(html)[0], 'data-annonce'), '256 posters. Aucun filtre.')
  assert.equal(attr(/<form class="filtres-form"[^>]*>/.exec(html)[0], 'aria-label'), 'Filtres et tri des posters')
  assert.equal(attr(/<select name="sort_by"[^>]*>/.exec(html)[0], 'aria-label'), 'Trier les posters')
  assert.equal(texte(/<p class="filtres-compte">([\s\S]*?)<\/p>/.exec(html)[1]), '256 posters')
  for (const f of FAMILLES) assert.equal(voirDe(html, f), 'Voir les 256 posters', f)
  assert.equal(texte(/<p class="filtres-aucun" hidden>([\s\S]*?)<\/p>/.exec(html)[1]), 'Aucun thème de ce nom parmi ces 256 posters. Retirez un filtre pour en voir plus.')
  // Les filtres actifs, au singulier ; aucun poster pour ce choix.
  const un = await ligne(enPosters(collection({ actifs: { couleur: ['Bleu'] }, total: 1 })))
  assert.equal(texte(/<p class="filtres-resume-compte">([\s\S]*?)<\/p>/.exec(un)[1]), '1 poster')
  assert.equal(voirDe(un, 'couleur'), 'Voir le poster')
  assert.equal(attr(/<collection-filtres id="barre"[^>]*>/.exec(un)[0], 'data-annonce'), '1 poster. Filtres : Bleu.')
  assert.equal(voirDe(await ligne(enPosters(collection({ actifs: { couleur: ['Orange'] }, total: 0 }))), 'couleur'), 'Aucun poster')
  // Dans les cinq langues, plus un mot des tableaux ; sur une collection de tableaux, toujours les tableaux.
  for (const lang of Object.keys(LANGS)) {
    const posters = await ligne(enPosters(collection({ actifs: { couleur: ['Bleu'], theme: ['Zen'] }, total: 103, libelles: FORMES[lang] })), { lang })
    assert.doesNotMatch(lu(posters), MOT_TABLEAUX[lang], lang)
    assert.doesNotMatch(posters, /sections\.mma\./, lang)
    assert.match(lu(await ligne(collection({ total: 103, libelles: FORMES[lang] }), { lang })), MOT_TABLEAUX[lang], `${lang} : les tableaux`)
  }
})

test('sur une collection de posters, la fin d’un choix et l’absence de résultat disent « posters »', { skip: SKIP }, async () => {
  const fin = (html) => texte(/<p class="refonte-suite-fin"[^>]*>([\s\S]*?)<\/p>/.exec(html)[1])
  assert.equal(fin(await grille(enPosters(avecProduits(10, { actifs: { theme: ['Zen'] } })))), 'Vous avez vu les 10 posters de ce choix. Voir les 256 posters, sans filtre')
  const vide = await grille(enPosters(avecProduits(0, { actifs: { couleur: ['Orange'], theme: ['Afrique'] } })))
  assert.equal(texte(element(vide, /<div class="refonte-grille-dedans">/)), 'Aucun poster ne réunit ces filtres. Voir les 256 posters, sans filtre')
  for (const lang of Object.keys(LANGS)) {
    const html = await grille(enPosters(avecProduits(10, { actifs: { theme: ['Zen'] } })), { lang })
    assert.doesNotMatch(lu(element(html, /<collection-suite[^>]*>/)), MOT_TABLEAUX[lang], lang)
  }
})

test('les textes des posters de la ligne : les mêmes clés que ceux des tableaux, dans les cinq langues', () => {
  for (const lang of Object.keys(LANGS)) {
    const t = locales[lang].sections.mma.collection_filtres
    for (const [cle, texte] of Object.entries(t.poster)) {
      assert.ok(cle in t, `${lang}.poster.${cle} : la clé des tableaux existe`)
      // Le même pluriel que celui des tableaux.
      assert.deepEqual(typeof texte === 'object' ? Object.keys(texte).sort() : 'texte', typeof t[cle] === 'object' ? Object.keys(t[cle]).sort() : 'texte', `${lang}.poster.${cle}`)
    }
    // Traduits : les phrases (« poster » s'écrit pareil en anglais et en néerlandais, pas les phrases).
    if (lang !== 'fr') for (const cle of ['ligne', 'trier_nom', 'aucun_resultat']) assert.notEqual(t.poster[cle], locales.fr.sections.mma.collection_filtres.poster[cle], `${lang}.poster.${cle} : traduit`)
  }
})
