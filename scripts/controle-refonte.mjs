#!/usr/bin/env node
/*
 * controle-refonte.mjs — les garde-fous de la nouvelle page collection, en ligne, page par page et largeur par largeur
 * ------------------------------------------------------------------------------------------------------
 * Mode d'emploi
 *
 *   NODE_PATH=<un node_modules qui a puppeteer-core> node scripts/controle-refonte.mjs [options]
 *     Ouvre chaque page de la liste dans Chrome (sans écran), à chaque largeur (320, 390, 768, 1280, 1920 px), et dit,
 *     une ligne par page et par largeur, « ok » ou les défauts trouvés :
 *       - un seul h1, visible, celui de l'entrée (sections/collection-refonte.liquid) ;
 *       - chaque lien de la famille une seule fois : le fil d'Ariane, les emblèmes du haut, l'interrupteur
 *         Posters | Toiles, les emblèmes du bas ; aucun lien de collection en double, ni hors de ces places, sauf dans
 *         le texte de l'intro, du guide et des questions (ceux-là sont listés à part : le ticket 10 les montre à
 *         Walid) ; aucun lien vers la page elle-même ;
 *       - les listes BreadcrumbList, ItemList et FAQPage présentes, une fois chacune, et identiques à celles de la même
 *         adresse sans vue (la page d'aujourd'hui) ;
 *       - les liens ?page=N, dès qu'il y a plus d'une page de tableaux ;
 *       - document.documentElement.scrollWidth égal à la largeur de l'écran (les barres de défilement cachées, comme
 *         sur un téléphone) ;
 *       - à 390 × 844, le bas du nom et du prix de la première rangée de tableaux au-dessus de 844 px ;
 *       - aucune erreur de script.
 *     Code de sortie : 0 si tout est « ok », 1 sinon.
 *
 *   La liste par défaut (PAGES, plus bas) : une collection de chaque modèle de collection à grille, avec la vue de test
 *   de son modèle nouveau (?view=refonte-<suffixe>, ticket 09 ; ?view=refonte pour collection.json), plus une collection
 *   de posters et une page anglaise. Un modèle qu'aucune collection n'a (chevaux, tableau-colore, tableau-par-piece,
 *   relevé du 24/11/2026) se voit sur une collection voisine, par sa vue.
 *
 *   Options :
 *     --page <adresse>      une page à la place de la liste (plusieurs fois possible), avec sa vue dans l'adresse :
 *                           --page "/collections/tableau-lion?view=refonte" ;
 *     --pages <fichier>     la liste dans un fichier JSON : [["/collections/tableau-lion", "refonte"], …] ;
 *     --sans-vue            les adresses sans leur vue (après la bascule, ticket 10) : les listes pour Google sont
 *                           alors vérifiées seules (présentes, une fois), sans page d'aujourd'hui à qui les comparer ;
 *     --largeurs 390,1280   d'autres largeurs ;
 *     --site <origine>      https://www.myselfmonart.com par défaut ;
 *     --sortie <fichier>    écrit aussi les résultats en JSON (mesures comprises) ;
 *     --chrome <chemin>     C:\Program Files\Google\Chrome\Application\chrome.exe par défaut.
 *   Une demande toutes les 3,2 s au moins ; freiné (429, 503, « local_rate_limited », page anti-robot : la règle des
 *   pages témoins, scripts/temoins.cjs), le script attend 30 s et reprend la même page.
 *
 * Ce script lit le site en ligne : ce n'est pas un test (npm test ne lance que scripts/*.test.cjs). Ses fonctions pures
 * (les défauts à partir des mesures, les listes pour Google, le tableau) sont vérifiées par
 * scripts/controle-refonte.test.cjs.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SITE = 'https://www.myselfmonart.com'
export const LARGEURS = [320, 390, 768, 1280, 1920]
// La hauteur de l'écran à chaque largeur ; 390 × 844 est celui de la règle « première rangée dans le premier écran ».
export const HAUTEURS = { 320: 640, 360: 780, 390: 844, 412: 915, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 }
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
// Les réglages et la reconnaissance d'une réponse freinée sont ceux des pages témoins (scripts/temoins.cjs) : une
// demande toutes les 3 s au moins (ici 3,2 s), 30 s d'attente quand Shopify freine (429, 503, « local_rate_limited », ou
// une page sans id="MainContent" : une page anti-robot).
const temoins = createRequire(import.meta.url)('./temoins.cjs')

/* Une collection de chaque modèle à grille (relevé en ligne du 24/11/2026), avec la vue de test de son modèle nouveau :
   [adresse, vue, modèle d'aujourd'hui]. */
export const PAGES = [
  ['/collections/tableau-lion', 'refonte', 'collection.json'],
  ['/collections/posters-affiches-nature', 'refonte', 'collection.json (posters)'],
  ['/en/collections/nature-themed-wall-art', 'refonte-tableau-paysage', 'tableau-paysage (anglais)'],
  ['/collections/bestsellers-1', 'refonte-bestsellers', 'bestsellers'],
  ['/collections/tableau-chambre', 'refonte-chambre', 'chambre'],
  ['/collections/tableau-chambre-enfant', 'refonte-chambre-enfant', 'chambre-enfant'],
  ['/collections/tableau-chambre-ado', 'refonte-chambre-enfant-2', 'chambre-enfant-2'],
  ['/collections/tableau-chambre-fille', 'refonte-chambre-petit-enfant', 'chambre-petit-enfant'],
  ['/collections/tableau-cheval', 'refonte-chevaux', 'chevaux (aucune collection : vue seule)'],
  ['/collections/tableau-japonais', 'refonte-collection-japonais', 'collection-japonais'],
  ['/collections/tableau-bleue', 'refonte-couleurs-enfant', 'couleurs-enfant'],
  ['/collections/tableau-ethnique', 'refonte-ethnique', 'ethnique'],
  ['/collections/tableau-africain', 'refonte-ethnique-enfant', 'ethnique-enfant'],
  ['/collections/tableau-couleur', 'refonte-tableau-colore', 'tableau-colore (aucune collection : vue seule)'],
  ['/collections/tableau-abstrait', 'refonte-tableau-decoration', 'tableau-decoration'],
  ['/collections/tableau-couleur', 'refonte-tableau-par-couleurs', 'tableau-par-couleurs'],
  ['/collections/tableau-cuisine', 'refonte-tableau-par-piece', 'tableau-par-piece (aucune collection : vue seule)'],
  ['/collections/tableaux-nature-sauvage', 'refonte-tableau-paysage', 'tableau-paysage'],
  ['/collections/tableau-personnalise-famille', 'refonte-tableau-personali-famille', 'tableau-personali-famille'],
  ['/collections/tableau-salon', 'refonte-tableau-salon', 'tableau-salon'],
  ['/collections/tableau-animaux', 'refonte-tableaux-animaux', 'tableaux-animaux'],
]

/* ---------- Ce que mesure la page (dans le navigateur) ---------- */

/* Les mesures d'une page ouverte. Cette fonction tourne dans la page (puppeteer la recopie) : elle ne dépend de rien. */
export function mesurer() {
  const visible = (el) => {
    const s = getComputedStyle(el)
    return el.getClientRects().length > 0 && s.visibility !== 'hidden' && s.display !== 'none'
  }
  const h1 = [...document.querySelectorAll('h1')].map((el) => ({ visible: visible(el), entree: el.classList.contains('c-titre'), texte: el.textContent.replace(/\s+/g, ' ').trim() }))
  // Une adresse de collection de la boutique, sans paramètre (/collections/<handle>, avec la langue s'il y en a une).
  const chemin = (a) => {
    try {
      const u = new URL(a.getAttribute('href'), location.href)
      if (u.origin !== location.origin) return null
      return /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/collections\/[^/]+\/?$/i.test(u.pathname) ? decodeURI(u.pathname.replace(/\/$/, '')) : null
    } catch {
      return null
    }
  }
  // Les textes écrits dans Shopify (intro, guide, questions), dont les liens sont listés à part ; les outils de la grille
  // (filtres, suite, pages), dont les liens restent sur la page ; les places des liens de la famille.
  const TEXTES = '.c-intro, .c-guide-corps, .c-questions-reponse, .collection-editorial, .collapsible-content'
  const OUTILS = '#barre, #resume, #suite, #pages, .refonte-grille-vide'
  const PLACES = [['nav.c-fil', 'fil'], ['.c-sous', 'emblèmes du haut'], ['.c-bascule', 'interrupteur'], ['#autres-sujets', 'emblèmes du bas']]
  const main = document.getElementById('MainContent') || document.body
  const liens = []
  for (const a of main.querySelectorAll('a[href]')) {
    const c = chemin(a)
    if (!c || a.closest(OUTILS)) continue
    const place = a.closest(TEXTES) ? 'texte' : (PLACES.find(([s]) => a.closest(s)) || [null, 'ailleurs'])[1]
    liens.push({ chemin: c, place })
  }
  const suite = document.querySelector('collection-suite')
  // La première rangée (deux cartes sur téléphone) : le bas de leur nom et de leur prix ; une carte de repli (la carte
  // d'aujourd'hui, d'un produit qui n'est pas une œuvre) a les siens dedans : son bas.
  const cartes = [...document.querySelectorAll('.refonte-cartes > .refonte-carte')].slice(0, 2)
  const bas = cartes.flatMap((c) => {
    const textes = [...c.querySelectorAll('.refonte-carte-nom, .refonte-carte-prix')]
    return (textes.length ? textes : [c]).map((e) => e.getBoundingClientRect().bottom + scrollY)
  })
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent)
  const barre = document.getElementById('barre')
  return {
    page: decodeURI(location.pathname.replace(/\/$/, '')),
    marque: document.documentElement.hasAttribute('data-refonte-page'),
    h1,
    liens,
    total: suite ? Number(suite.dataset.total) : null,
    pages: [...document.querySelectorAll('#pages a[href]')].map((a) => a.getAttribute('href')),
    cartes: document.querySelectorAll('.refonte-cartes > .refonte-carte').length,
    basPremiereRangee: bas.length ? Math.max(...bas) : null,
    largeurPage: document.documentElement.scrollWidth,
    largeurEcran: innerWidth,
    // Le tri par défaut de la collection : « Le plus pertinent » partout (Walid, 24/11/2026).
    triDefaut: barre ? barre.dataset.triDefaut || null : null,
    ld,
  }
}

/* ---------- Les défauts (fonctions pures) ---------- */

const TYPES_LD = ['BreadcrumbList', 'ItemList', 'FAQPage']

/* Les listes pour Google d'une page, par type : chacune en texte JSON (relu, pour que les blancs n'y fassent rien). */
export function listesLd(textes) {
  const par = Object.fromEntries(TYPES_LD.map((t) => [t, []]))
  for (const texte of textes) {
    let json
    try {
      json = JSON.parse(texte)
    } catch {
      continue
    }
    for (const objet of [].concat(json)) if (objet && par[objet['@type']]) par[objet['@type']].push(JSON.stringify(objet))
  }
  return par
}
/* Les blocs <script type="application/ld+json"> d'un HTML rendu par le serveur. */
export const ldDuHtml = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])

/* Les défauts des listes pour Google : présentes une fois (ItemList seulement s'il y a des tableaux), et, avec la page
   d'aujourd'hui pour témoin (sansVue : ses listes), identiques à elles. */
export function defautsLd(avec, { sansVue = null, tableaux = true } = {}) {
  const d = []
  for (const type of TYPES_LD) {
    const a = avec[type] || []
    if (a.length > 1) d.push(`${type} ${a.length} fois`)
    if (sansVue) {
      const s = sansVue[type] || []
      if (!a.length && s.length) d.push(`${type} absente (la page sans vue en a une)`)
      else if (a.length && !s.length) d.push(`${type} en trop (la page sans vue n’en a pas)`)
      else if (a.join('\n') !== s.join('\n')) d.push(`${type} différente de la page sans vue`)
    } else if (!a.length && (type === 'BreadcrumbList' || (type === 'ItemList' && tableaux))) {
      d.push(`${type} absente`)
    }
  }
  return d
}

/* Les défauts d'une page à une largeur, à partir de ses mesures. premiereRangee : la hauteur de l'écran sous laquelle
   la première rangée doit finir (à 390 × 844), sinon null. */
export function defautsPage(m, { largeur, premiereRangee = null, erreurs = [] } = {}) {
  const d = []
  if (!m.marque) d.push('pas la nouvelle page (data-refonte-page absent)')
  const visibles = m.h1.filter((h) => h.visible)
  if (m.h1.length !== 1 || visibles.length !== 1) d.push(`${m.h1.length} h1, ${visibles.length} visible(s)`)
  else if (!visibles[0].entree) d.push('le h1 n’est pas celui de l’entrée')
  // Les liens de collection, hors des textes : chacun une fois, à une place de la famille, jamais la page elle-même.
  const parChemin = new Map()
  for (const l of m.liens.filter((x) => x.place !== 'texte')) parChemin.set(l.chemin, [...(parChemin.get(l.chemin) || []), l.place])
  for (const [chemin, places] of parChemin) {
    if (places.length > 1) d.push(`${chemin} ${places.length} fois (${places.join(', ')})`)
    if (places.includes('ailleurs')) d.push(`${chemin} hors des places de la famille`)
    if (chemin === m.page) d.push(`lien vers la page elle-même (${places.join(', ')})`)
  }
  if (m.total > 24 && !m.pages.some((h) => /[?&]page=2(&|$)/.test(h))) d.push('pas de lien ?page=2')
  if (m.largeurPage !== largeur) d.push(`page de ${m.largeurPage} px pour un écran de ${largeur} px`)
  if (premiereRangee) {
    // Toutes les collections sont en « Le plus pertinent » (Walid, 24/11/2026) : un autre tri par défaut se signale.
    const tri = m.triDefaut && m.triDefaut !== 'most-relevant' ? ` ; tri par défaut de la collection : ${m.triDefaut}` : ''
    if (m.basPremiereRangee == null) d.push('aucune carte dans la grille')
    else if (m.basPremiereRangee > premiereRangee) d.push(`première rangée jusqu’à ${Math.round(m.basPremiereRangee)} px (écran de ${premiereRangee} px${tri})`)
  }
  for (const e of erreurs) d.push(`erreur de script : ${e}`)
  return d
}

/* Les liens de collection écrits dans les textes (intro, guide, questions) : chacun une fois, avec ce qu'il double. */
export function liensDesTextes(m) {
  const ailleurs = new Set(m.liens.filter((l) => l.place !== 'texte').map((l) => l.chemin))
  const vus = new Set()
  const sortie = []
  for (const l of m.liens.filter((x) => x.place === 'texte')) {
    if (vus.has(l.chemin)) continue
    vus.add(l.chemin)
    sortie.push(`${l.chemin}${ailleurs.has(l.chemin) ? ' (déjà dans la page)' : ''}`)
  }
  return sortie
}

/* Le tableau des résultats : une ligne par page et par largeur, « ok » ou les défauts. */
export function tableau(resultats) {
  const lignes = resultats.map((r) => [r.adresse, String(r.largeur), r.defauts.length ? r.defauts.join(' ; ') : 'ok'])
  const larg = [Math.max(4, ...lignes.map((l) => l[0].length)), 7]
  const ligne = ([a, b, c]) => `${a.padEnd(larg[0])}  ${b.padEnd(larg[1])}  ${c}`
  return [ligne(['page', 'largeur', 'résultat']), ...lignes.map(ligne)].join('\n')
}

/* L'adresse d'une page, avec sa vue ; et la même, sans sa vue (la page d'aujourd'hui). */
export const adresseDe = (adresse, vue) => (vue ? `${adresse}${adresse.includes('?') ? '&' : '?'}view=${vue}` : adresse)
export const sansVue = (adresse) => adresse.replace(/([?&])view=[^&]*&?/, '$1').replace(/[?&]$/, '')

/* ---------- En ligne ---------- */

function options(argv) {
  const o = { site: SITE, pages: null, sansVue: false, largeurs: LARGEURS, sortie: null, chrome: CHROME }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--page') (o.pages = o.pages || []).push(argv[++i])
    else if (a === '--pages') o.pages = JSON.parse(fs.readFileSync(argv[++i], 'utf8')).map(([adresse, vue]) => adresseDe(adresse, vue))
    else if (a === '--sans-vue') o.sansVue = true
    else if (a === '--largeurs') o.largeurs = argv[++i].split(',').map(Number)
    else if (a === '--site') o.site = argv[++i].replace(/\/$/, '')
    else if (a === '--sortie') o.sortie = argv[++i]
    else if (a === '--chrome') o.chrome = argv[++i]
    else throw new Error(`option inconnue : ${a}`)
  }
  if (!o.pages) o.pages = PAGES.map(([adresse, vue]) => adresseDe(adresse, vue))
  if (o.sansVue) o.pages = o.pages.map(sansVue)
  return o
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

async function principal() {
  const o = options(process.argv.slice(2))
  const puppeteer = createRequire(import.meta.url)('puppeteer-core')
  const { pause: entre, attente } = temoins.reglages({ site: o.site, pause: 3200 })
  let derniere = 0
  const tour = async () => {
    const reste = derniere + entre - Date.now()
    if (reste > 0) await pause(reste)
    derniere = Date.now()
  }
  // Le HTML d'une adresse, rendu par le serveur (la page d'aujourd'hui, témoin des listes pour Google).
  const html = async (url) => {
    for (let essai = 0; essai < 6; essai++) {
      await tour()
      try {
        const r = await fetch(url, { headers: temoins.ENTETES, signal: AbortSignal.timeout(60000) })
        const t = await r.text()
        if (!temoins.estFreine(r.status, t)) return t
      } catch (e) {
        console.error(`  réseau : ${e.message}`)
      }
      await pause(attente)
    }
    throw new Error(`pas de réponse : ${url}`)
  }
  const navigateur = await puppeteer.launch({ executablePath: o.chrome, headless: true, args: ['--hide-scrollbars'] })
  const resultats = []
  try {
    for (const adresse of o.pages) {
      const url = o.site + adresse
      const avecVue = /[?&]view=/.test(adresse)
      const temoin = avecVue ? listesLd(ldDuHtml(await html(o.site + sansVue(adresse)))) : null
      let textes = null
      for (const largeur of o.largeurs) {
        const hauteur = HAUTEURS[largeur] || 900
        const onglet = await navigateur.newPage()
        const erreurs = []
        onglet.on('pageerror', (e) => erreurs.push(String(e.message || e).split('\n')[0]))
        await onglet.setViewport({ width: largeur, height: hauteur, isMobile: largeur < 1024, hasTouch: largeur < 1024 })
        let m = null
        for (let essai = 0; essai < 6 && !m; essai++) {
          await tour()
          try {
            const reponse = await onglet.goto(url, { waitUntil: 'load', timeout: 90000 })
            const corps = await onglet.content()
            if (temoins.estFreine(reponse ? reponse.status() : 0, corps)) {
              await pause(attente)
              continue
            }
            await pause(1500)
            m = await onglet.evaluate(mesurer)
          } catch (e) {
            console.error(`  ${adresse} à ${largeur} px : ${e.message}`)
            await pause(attente)
          }
        }
        await onglet.close()
        if (!m) {
          resultats.push({ adresse, largeur, defauts: ['la page ne s’ouvre pas'] })
          continue
        }
        const defauts = defautsPage(m, { largeur, premiereRangee: largeur === 390 && hauteur === 844 ? 844 : null, erreurs })
        // Les listes pour Google et les liens des textes : une fois par page (le HTML ne change pas avec la largeur).
        if (textes === null) {
          defauts.push(...defautsLd(listesLd(m.ld), { sansVue: temoin, tableaux: m.cartes > 0 }))
          textes = liensDesTextes(m)
        }
        delete m.ld
        resultats.push({ adresse, largeur, defauts, mesures: m })
        console.log(`${adresse}  ${largeur}  ${defauts.length ? defauts.join(' ; ') : 'ok'}`)
      }
      if (textes && textes.length) resultats.push({ adresse, textes })
    }
  } finally {
    await navigateur.close()
  }
  const lignes = resultats.filter((r) => r.largeur)
  console.log(`\n${tableau(lignes)}`)
  const avecTextes = resultats.filter((r) => r.textes)
  if (avecTextes.length) {
    console.log('\nLiens de collection écrits dans l’intro, le guide et les questions (à montrer à Walid, ticket 10) :')
    for (const r of avecTextes) console.log(`  ${r.adresse} : ${r.textes.join(', ')}`)
  }
  const mauvaises = lignes.filter((r) => r.defauts.length)
  console.log(`\n${lignes.length - mauvaises.length} ok sur ${lignes.length}`)
  if (o.sortie) fs.writeFileSync(o.sortie, JSON.stringify(resultats, null, 1))
  process.exitCode = mauvaises.length ? 1 : 0
}

// Lancé comme script (et non importé par son test) : le contrôle en ligne.
if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  principal().catch((e) => {
    console.error(e)
    process.exitCode = 2
  })
}
