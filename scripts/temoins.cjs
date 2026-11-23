#!/usr/bin/env node
/*
 * temoins.cjs — les pages témoins : prouver qu'un push n'a pas changé les autres pages du site
 * ------------------------------------------------------------------------------------------------------
 * Mode d'emploi
 *
 *   node scripts/temoins.cjs copier <dossier>
 *     Enregistre dans <dossier> le HTML que le serveur rend (sans exécuter aucun script) de chaque page témoin : un
 *     fichier par page (accueil.html, collections-tableau-lion.html…), plus temoins.json (adresse, statut, heure).
 *     Une requête toutes les 3 s au moins : Shopify freine les rafales (réponse 429, « local_rate_limited », ou une
 *     page anti-robot). Freiné, le script attend 30 s, puis reprend la même page (5 essais au plus).
 *
 *   node scripts/temoins.cjs comparer <dossier-avant> <dossier-après>
 *     Dit, page par page, « identique », ou montre les premières différences (numéro de ligne, avant, après), une
 *     fois neutralisée l'empreinte de version du thème : les paramètres ?v=… des fichiers d'assets, les identifiants
 *     de déploiement et les jetons qui changent à chaque affichage (liste NEUTRES, plus bas). Code de sortie : 0 si
 *     toutes les pages sont identiques, 1 sinon.
 *
 *   Options de « copier » : --site <origine> (https://www.myselfmonart.com par défaut), --pages /a,/b (à la place de
 *   la liste par défaut, PAGES), --pause <ms> et --attente <ms> (3 s et 30 s au moins, sauf sur un serveur local).
 *
 * Avant un push qui touche un fichier commun (gabarit, en-tête, carte, scripts partagés), copier les pages ; après le
 * déploiement (l'action GitHub « Deploy Shopify Theme » terminée), copier de nouveau, puis comparer. Les copies vont
 * hors du dépôt (il est public, et elles pèsent une dizaine de mégaoctets). Par exemple :
 *   node scripts/temoins.cjs copier ../temoins/avant
 *   node scripts/temoins.cjs copier ../temoins/apres
 *   node scripts/temoins.cjs comparer ../temoins/avant ../temoins/apres
 * Deux copies faites coup sur coup, sans push entre elles, doivent dire « identique » partout : c'est la preuve que
 * la neutralisation suffit.
 *
 * Ce script lit le site en ligne : ce n'est pas un test (npm test ne lance que scripts/*.test.cjs). Node seul, sans
 * dépendance. Ses commandes sont vérifiées contre un serveur local par scripts/temoins.test.cjs.
 */
const fs = require('fs')
const path = require('path')

const SITE = 'https://www.myselfmonart.com'

/* Les pages témoins : des collections de chaque sorte (sujet, racine, petite collection, posters, pièce, page sans
   grille, en anglais), une fiche toile 3D, une ancienne fiche toile, l'accueil et le panier.
   Aucune des 111 collections publiées n'a le modèle decoration-murale (relevé du 23/11/2026, page par page) : la page
   sans grille se voit donc par sa vue, sur une collection. L'adresse anglaise de Tableaux Nature est celle de son
   champ méta translation.handle. */
const PAGES = [
  '/collections/tableaux-nature-sauvage',
  '/collections/tous-les-tableaux',
  '/collections/tableau-lion',
  '/collections/posters-affiches-nature',
  '/collections/tableau-salon',
  '/collections/tous-les-tableaux?view=decoration-murale',
  '/en/collections/nature-themed-wall-art',
  '/products/tableau-street-art-superman-energie-pop-et-graffiti-sauvage',
  '/products/toile-contemporaine-le-petit-prince-poesie-etoilee',
  '/',
  '/cart',
]

/* L'empreinte de version, neutralisée avant de comparer : ce qui change d'un affichage ou d'un déploiement à l'autre
   sans que la page change. Relevé sur le site le 23/11/2026 (deux copies coup sur coup) : tout est écrit par Shopify
   dans <head> (content_for_header), jamais par le thème. Chaque règle est étroite, la clé reste, seule la valeur
   devient « … » : un vrai changement reste visible (la version d'une image de produit ou de collection, par exemple,
   n'est pas neutralisée). */
// Une barre d'adresse, telle quelle ou échappée (une adresse écrite dans un JSON : \/cdn\/shop\/…).
const BARRE = String.raw`(?:\\/|/)`
const NEUTRES = [
  // La version d'un fichier du thème (assets, compiled_assets) : elle change quand le fichier est redéployé.
  [new RegExp(String.raw`(${BARRE}cdn${BARRE}shop${BARRE}t${BARRE}\d+${BARRE}(?:compiled_)?assets${BARRE}[^"'?\s)]+\?v=)\d+`, 'g'), '$1…'],
  // L'identifiant de la requête, un par affichage : dans __st, les mesures d'audience et la balise request-id.
  [/("(?:reqid|requestId)":")[^"]+"/g, '$1…"'],
  [/(<meta name="request-id" content=")[^"]+"/g, '$1…"'],
  // Le jeton de visite de __st et l'identifiant d'événement des mesures d'audience, un par affichage.
  [/(var __st=\{[^}]*"u":")[0-9a-f]+"/g, '$1…"'],
  [/("eventMetadataId":")[^"]+"/g, '$1…"'],
  // L'échéance des balises de session (shopify-y, shopify-s) : l'heure de l'affichage, plus une durée.
  [/(data-expiration=")\d+"/g, '$1…"'],
  // L'empreinte du thème dans les mesures d'audience : un identifiant de déploiement, qui peut suivre un push.
  [/("themeCityHash":")\d+"/g, '$1…"'],
]

const neutraliser = (html) => NEUTRES.reduce((text, [pattern, by]) => text.replace(pattern, by), html)

/* Le nom du fichier d'une page : son adresse, sans la barre du début, les barres et le reste en tirets. */
const nomDeFichier = (page) => `${page.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'accueil'}.html`

/* Une réponse freinée par Shopify : 429 ou 503, « local_rate_limited », ou une page qui n'est pas une page du thème
   (sans la zone principale, id="MainContent", qu'ont tous ses gabarits) : une page anti-robot, par exemple. */
const estFreine = (statut, html) => statut === 429 || statut === 503 || /local_rate_limited/.test(html.slice(0, 500)) || (statut === 200 && !html.includes('id="MainContent"'))

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const estLocal = (site) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(site)
const ENTETES = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'accept-language': 'fr-FR,fr;q=0.9',
}
// Les essais d'une même page, freinée ou sans réponse, avant d'abandonner la copie.
const ESSAIS = 5

/* Les réglages de la copie : sur le site en ligne, jamais plus d'une requête toutes les 3 s, et 30 s d'attente au
   moins quand Shopify freine. */
function reglages({ site = SITE, pages = PAGES, pause = 3000, attente = 30000 } = {}) {
  site = site.replace(/\/+$/, '')
  if (!estLocal(site)) {
    pause = Math.max(pause, 3000)
    attente = Math.max(attente, 30000)
  }
  return { site, pages, pause, attente }
}

async function copier(dossier, options = {}, log = console.log) {
  const { site, pages, pause, attente } = reglages(options)
  fs.mkdirSync(dossier, { recursive: true })
  const releve = []
  for (const [rang, page] of pages.entries()) {
    if (rang) await sleep(pause)
    let reponse
    let html
    for (let essai = 1; ; essai++) {
      let raison = null
      try {
        reponse = await fetch(site + page, { headers: ENTETES, redirect: 'follow', signal: AbortSignal.timeout(60000) })
        html = await reponse.text()
        if (estFreine(reponse.status, html)) raison = `freiné (statut ${reponse.status})`
      } catch (error) {
        raison = `sans réponse (${error.message})`
      }
      if (!raison) break
      if (essai >= ESSAIS) throw new Error(`${page} : ${raison}, ${ESSAIS} essais ; reprendre plus tard`)
      log(`${page} : ${raison}, nouvel essai dans ${Math.round(attente / 1000)} s`)
      await sleep(attente)
    }
    const fichier = nomDeFichier(page)
    fs.writeFileSync(path.join(dossier, fichier), html)
    releve.push({ page, fichier, statut: reponse.status, adresse: reponse.url })
    log(`${page} : ${reponse.status}, ${html.length} caractères → ${fichier}`)
  }
  fs.writeFileSync(path.join(dossier, 'temoins.json'), `${JSON.stringify({ site, date: new Date().toISOString(), pages: releve }, null, 2)}\n`)
  return releve
}

/* Un extrait d'une longue ligne, autour d'une colonne. */
const extrait = (ligne, colonne, avant = 60, longueur = 160) => {
  const debut = Math.max(0, colonne - avant)
  return `${debut ? '…' : ''}${ligne.slice(debut, debut + longueur)}${debut + longueur < ligne.length ? '…' : ''}`
}

/* Les premières différences de deux textes : les lignes communes du début et de la fin écartées, les premières lignes
   qui diffèrent dans ce qui reste, de part et d'autre, chacune autour de sa première colonne différente. */
function differences(avant, apres, combien = 3) {
  const a = avant.split('\n')
  const b = apres.split('\n')
  let debut = 0
  while (debut < a.length && debut < b.length && a[debut] === b[debut]) debut++
  let finA = a.length - 1
  let finB = b.length - 1
  while (finA >= debut && finB >= debut && a[finA] === b[finB]) {
    finA--
    finB--
  }
  const lignes = []
  let montrees = 0
  for (let i = debut; montrees < combien && (i <= finA || i <= finB); i++) {
    const la = i <= finA ? a[i] : ''
    const lb = i <= finB ? b[i] : ''
    if (i <= finA && i <= finB && la === lb) continue
    montrees++
    let colonne = 0
    while (colonne < la.length && la[colonne] === lb[colonne]) colonne++
    const numero = String(i + 1).padStart(6)
    if (i <= finA) lignes.push(`  avant ${numero} : ${extrait(la, colonne)}`)
    if (i <= finB) lignes.push(`  après ${numero} : ${extrait(lb, colonne)}`)
  }
  const etendue = (fin) => (fin < debut ? 'aucune ligne' : fin === debut ? `ligne ${debut + 1}` : `lignes ${debut + 1} à ${fin + 1}`)
  return { resume: `${etendue(finA)} avant, ${etendue(finB)} après`, lignes }
}

const lireReleve = (dossier) => JSON.parse(fs.readFileSync(path.join(dossier, 'temoins.json'), 'utf8'))

function comparer(dossierAvant, dossierApres, log = console.log) {
  const avant = lireReleve(dossierAvant)
  const apres = new Map(lireReleve(dossierApres).pages.map((p) => [p.fichier, p]))
  let identiques = 0
  for (const page of avant.pages) {
    const autre = apres.get(page.fichier)
    if (!autre) {
      log(`${page.fichier} : absente de la seconde copie`)
      continue
    }
    if (autre.statut !== page.statut) {
      log(`${page.fichier} : statut ${page.statut} avant, ${autre.statut} après`)
      continue
    }
    const a = neutraliser(fs.readFileSync(path.join(dossierAvant, page.fichier), 'utf8'))
    const b = neutraliser(fs.readFileSync(path.join(dossierApres, autre.fichier), 'utf8'))
    if (a === b) {
      identiques++
      log(`${page.fichier} : identique`)
      continue
    }
    const { resume, lignes } = differences(a, b)
    log(`${page.fichier} : différente (${resume})`)
    for (const ligne of lignes) log(ligne)
  }
  log(`${identiques} page(s) identique(s) sur ${avant.pages.length}`)
  return identiques === avant.pages.length ? 0 : 1
}

const USAGE = `Usage :
  node scripts/temoins.cjs copier <dossier> [--site <origine>] [--pages /a,/b] [--pause <ms>] [--attente <ms>]
  node scripts/temoins.cjs comparer <dossier-avant> <dossier-après>`

async function main(argv) {
  const [commande, ...reste] = argv
  const positionnels = []
  const options = {}
  for (let i = 0; i < reste.length; i++) {
    const option = /^--(site|pages|pause|attente)$/.exec(reste[i])
    if (!option) {
      positionnels.push(reste[i])
      continue
    }
    const valeur = reste[++i]
    if (valeur === undefined) throw new Error(`${reste[i - 1]} : une valeur est attendue\n${USAGE}`)
    if (option[1] === 'site') options.site = valeur
    else if (option[1] === 'pages') options.pages = valeur.split(',').map((p) => p.trim()).filter(Boolean)
    else {
      options[option[1]] = Number(valeur)
      if (!(options[option[1]] >= 0)) throw new Error(`--${option[1]} : un nombre de millisecondes est attendu, pas « ${valeur} »`)
    }
  }
  if (commande === 'copier' && positionnels.length === 1) {
    await copier(positionnels[0], options)
    return 0
  }
  if (commande === 'comparer' && positionnels.length === 2) return comparer(positionnels[0], positionnels[1])
  console.error(USAGE)
  return 2
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code
    },
    (error) => {
      console.error(error.message)
      process.exitCode = 2
    },
  )
}

// Pour scripts/temoins.test.cjs : la liste par défaut, la neutralisation et les réglages de la copie.
module.exports = { PAGES, neutraliser, reglages }
