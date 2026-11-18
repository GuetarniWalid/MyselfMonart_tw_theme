// Contrôles automatiques des cinq mails, dans les cinq langues.
//
//   node qa.mjs
//
// Pour chaque modèle et chaque langue, avec une commande chargée (plusieurs œuvres, kit, remise) :
//  - le Liquid se lit, aucune variable ne sort vide ou « undefined » ;
//  - rien ne déborde sur un petit téléphone (320 px), même en allemand ;
//  - toute image a un texte alternatif, tout lien mène quelque part ;
//  - le mail pèse moins de 102 Ko, la limite au-delà de laquelle Gmail le coupe ;
//  - les contrastes de la charte atteignent 4,5:1 en clair comme en sombre.

import { readFileSync } from 'node:fs'
import { Liquid } from 'liquidjs'
import puppeteer from 'puppeteer-core'
import { CASES, posterBlancContour, toileChene } from './samples.mjs'
import { LOCALES } from './strings.mjs'
import { FONT_URL } from './marque.mjs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const engine = new Liquid({ strictFilters: true })
const euros = (cents) =>
  `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
engine.registerFilter('money', euros)
engine.registerFilter('money_with_currency', (cents) => `${euros(cents).replace(' €', '')} EUR`)
engine.registerFilter('format_address', (address) => address.lines.join('<br>'))
engine.registerFilter('img_url', (line, size) => {
  const width = String(size).split('x')[0]
  const src = typeof line === 'string' ? line : line.image
  return `${src}?width=${width}`
})
engine.registerFilter('where', (list, key) => (list || []).filter((item) => item[key]))
engine.registerFilter('date', (value) => value)

// --- Contrastes ------------------------------------------------------------------------------
const luminance = (hex) => {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
const PAIRS = [
  ['clair : titre sur papier', '#21150c', '#f6f2ec'],
  ['clair : texte sur papier', '#4a3f37', '#f6f2ec'],
  ['clair : secondaire sur papier', '#6b5e55', '#f6f2ec'],
  ['clair : terracotta sur papier', '#a0502f', '#f6f2ec'],
  ['clair : bouton encre', '#ffffff', '#21150c'],
  ['clair : bouton rose sur encre', '#21150c', '#d79b86'],
  ['clair : libellé sur encre', '#e8cdbf', '#21150c'],
  ['clair : note sur encre', '#e6d6cd', '#21150c'],
  ['clair : libellé sur rose pâle', '#7a3d24', '#f1dfd6'],
  ['clair : texte sur rose pâle', '#4a3f37', '#f1dfd6'],
  ['sombre : titre', '#f6ece2', '#17110b'],
  ['sombre : texte', '#e3d5c9', '#17110b'],
  ['sombre : secondaire', '#c6b5a8', '#17110b'],
  ['sombre : pied', '#bdaba0', '#17110b'],
  ['sombre : terracotta', '#eba98c', '#17110b'],
  ['sombre : lien', '#eeb193', '#17110b'],
  ['sombre : bouton', '#1c1108', '#e8b79f'],
  ['sombre : libellé sur aplat', '#e8cdbf', '#2a1d13'],
  ['sombre : note sur aplat', '#e6d6cd', '#2a1d13'],
  ['sombre : libellé sur rose foncé', '#eba98c', '#33231a'],
  ['sombre : texte sur rose foncé', '#e3d5c9', '#33231a'],
]

const problems = []
for (const [name, fg, bg] of PAIRS) {
  const value = ratio(fg, bg)
  if (value < 4.5) problems.push(`contraste ${name} : ${value.toFixed(2)}`)
}

// --- Traductions : mêmes clés partout --------------------------------------------------------
const keys = (node, prefix = '') =>
  Object.entries(node).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  )
const reference = keys(LOCALES.fr).sort().join()
for (const [locale, strings] of Object.entries(LOCALES)) {
  if (keys(strings).sort().join() !== reference) problems.push(`textes incomplets en ${locale}`)
}

// Le préheader s'affiche dans la liste des mails : au-delà de 90 signes, il est coupé.
for (const [locale, strings] of Object.entries(LOCALES)) {
  for (const part of ['confirmation', 'making', 'ready', 'out', 'delivered']) {
    const length = strings[part].preheader.length
    if (length > 90) problems.push(`préheader ${part}.${locale} : ${length} signes`)
  }
}

// --- Le cadre d'un nouveau produit, lu dans chaque langue -----------------------------------
// Les valeurs de l'option « Cadres » telles que la boutique les traduit (Translate & Adapt, relevé
// du 18/11/2026 sur le Bonsaï) : chaque langue doit y retrouver le bon cadre (strings.mjs, frames),
// et le français aussi, si le format n'est pas traduit. La teinte attendue est celle du thème.
const CANVAS_FRAMES = {
  fr: ['Sans cadre', 'Cadre blanc', 'Cadre noir Mat', 'Cadre argent ancien', 'Cadre chêne clair', 'Cadre noyer'],
  en: ['No frame', 'White frame', 'Matte black frame', 'Antique silver frame', 'Light oak frame', 'Walnut frame'],
  de: ['Ohne Rahmen', 'Weißer Rahmen', 'Mattschwarzer Rahmen', 'Antiksilberner Rahmen', 'Rahmen aus heller Eiche', 'Nussbaumrahmen'],
  es: ['Sin marco', 'Marco blanco', 'Marco negro mate', 'Marco plata envejecida', 'Marco roble claro', 'Marco nogal'],
  nl: ['Zonder lijst', 'Witte lijst', 'Matzwarte lijst', 'Antiek zilveren lijst', 'Lichte eikenhouten lijst', 'Notenhouten lijst'],
}
const POSTER_MODES = {
  fr: ['Sans cadre', 'Avec cadre'],
  en: ['No frame', 'With frame'],
  de: ['Ohne Rahmen', 'Mit Rahmen'],
  es: ['Sin marco', 'Con marco'],
  nl: ['Zonder lijst', 'Met lijst'],
}
const theme = readFileSync('../../input.css', 'utf8')
const tint = (name) => new RegExp(`--frame-${name}:\\s*(#[0-9a-f]{6})`).exec(theme)[1]
const CANVAS_IDS = ['sans', 'blanc', 'noir', 'argent', 'chene', 'noyer']
const allTints = [...new Set([...CANVAS_IDS.slice(1).map(tint), tint('poster-chene'), tint('poster-noyer')])]
const framesIn = (html) => allTints.filter((hex) => html.includes(`bgcolor="${hex}"`))
const oneLine = (line) => ({ ...CASES.find((c) => c.id === 'nouvelle-toile').data, subtotal_line_items: [line], line_items: [line] })
let framesChecked = 0
for (const locale of Object.keys(LOCALES)) {
  const source = readFileSync(`dist/order_confirmation.${locale}.liquid`, 'utf8')
  const expect = async (label, line, wanted) => {
    const found = framesIn(await engine.parseAndRender(source, oneLine(line)))
    framesChecked++
    if (found.join() !== wanted.join()) problems.push(`cadre ${locale} « ${label} » : ${found.join(', ') || 'aucun'} au lieu de ${wanted.join(', ') || 'aucun'}`)
  }
  for (const names of [CANVAS_FRAMES[locale], CANVAS_FRAMES.fr]) {
    for (const [i, name] of names.entries()) {
      await expect(name, { ...toileChene, variant: { title: `60x80 cm / Bordure blanche / ${name}` } }, i ? [tint(CANVAS_IDS[i])] : [])
    }
    const [without, withFrame] = names === CANVAS_FRAMES.fr ? POSTER_MODES.fr : POSTER_MODES[locale]
    const poster = { ...posterBlancContour, properties: [] }
    await expect(without, { ...poster, variant: { title: `30x40 cm / ${without}` } }, [])
    await expect(`${withFrame}, sans couleur`, { ...poster, variant: { title: `30x40 cm / ${withFrame}` } }, [tint('noir')])
    await expect(`${withFrame}, chêne`, { ...poster, variant: { title: `30x40 cm / ${withFrame}` }, properties: [['_cadre', 'cadre-chene-clair']] }, [tint('poster-chene')])
    await expect(`${without}, couleur restée`, { ...poster, variant: { title: `30x40 cm / ${without}` }, properties: [['_cadre', 'cadre-noyer-2']] }, [])
  }
}

// --- Rendus ----------------------------------------------------------------------------------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setRequestInterception(true)
page.on('request', (request) =>
  request.resourceType() === 'image' ? request.abort() : request.continue()
)

const welcome = `data:font/woff2;base64,${readFileSync('../../assets/heading.woff2').toString('base64')}`

// Chaque modèle avec une commande chargée de produits de toujours, puis avec de nouveaux produits.
// objets : les œuvres dessinées attendues (une image dans une cellule en dégradé, objetLu de
// build.mjs) ; jamais pour un produit de toujours, jamais la photo studio d'une ligne.
const loaded = [
  ['order_confirmation', 'confirmation-plusieurs', 0],
  ['shipping_confirmation', 'fabrication-plusieurs', 0],
  ['shipping_update', 'terminee-inconnu', 0],
  ['shipment_out_for_delivery', 'arrive', 0],
  ['shipment_delivered', 'arrivee-plusieurs', 0],
  ['order_confirmation', 'nouvelles-deux', 2],
  ['order_confirmation', 'nouveau-poster-contour', 1],
  ['shipping_confirmation', 'nouvelles-terminee-allemand', 2],
  ['shipping_update', 'nouvelles-terminee-allemand', 2],
  ['shipment_delivered', 'nouvelle-arrivee', 1],
]

let checked = 0
let heaviest = 0
for (const [template, caseId, objects] of loaded) {
  const sample = CASES.find((c) => c.id === caseId)
  for (const locale of Object.keys(LOCALES)) {
    const where = `${template}.${locale} (${caseId})`
    const source = readFileSync(`dist/${template}.${locale}.liquid`, 'utf8')
    const html = await engine.parseAndRender(source, sample.data)
    if (html.includes('photo-studio-')) problems.push(`${where} : la photo studio de la ligne est montrée`)
    const size = Buffer.byteLength(html) / 1024
    heaviest = Math.max(heaviest, size)
    if (size > 102) problems.push(`${where} : ${size.toFixed(0)} Ko`)
    if (/undefined|\[object|NaN|\{\{|\{%/.test(html.replace(/<style[\s\S]*?<\/style>/g, ''))) {
      problems.push(`${where} : variable mal rendue`)
    }

    // Le plus large des deux rendus compte : avec la police du site, puis sans elle comme dans Gmail.
    await page.setViewport({ width: 320, height: 800 })
    await page.setContent(html.replace(/@font-face\{[^}]*\}/, ''), { waitUntil: 'domcontentloaded' })
    const fallback = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (fallback > 0) problems.push(`${where} : déborde de ${fallback} px à 320 px sans la police`)
    await page.setContent(html.replaceAll(FONT_URL, welcome), { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => document.fonts.ready)
    const facts = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      emptyLinks: [...document.links].filter((a) => !a.getAttribute('href')?.trim()).length,
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      lang: document.documentElement.lang,
      objects: [...document.images].filter((i) => i.closest('td[style*="linear-gradient"]')).length,
    }))
    if (facts.objects !== objects) problems.push(`${where} : ${facts.objects} œuvre(s) dessinée(s) au lieu de ${objects}`)
    if (facts.overflow > 0) problems.push(`${where} : déborde de ${facts.overflow} px à 320 px`)
    if (facts.noAlt) problems.push(`${where} : ${facts.noAlt} image(s) sans alt`)
    if (facts.emptyLinks) problems.push(`${where} : ${facts.emptyLinks} lien(s) vide(s)`)
    if (facts.h1 !== 1) problems.push(`${where} : ${facts.h1} titre(s) h1`)
    if (!facts.title.trim()) problems.push(`${where} : titre de document vide`)
    if (facts.lang !== locale) problems.push(`${where} : lang=${facts.lang}`)
    checked++
  }
}
await browser.close()

console.log(`${checked} mails contrôlés, le plus lourd : ${heaviest.toFixed(1)} Ko`)
console.log(`${framesChecked} cadres de nouveaux produits lus, dans les 5 langues`)
console.log(`${PAIRS.length} contrastes, le plus faible : ${Math.min(...PAIRS.map(([, a, b]) => ratio(a, b))).toFixed(2)}:1`)
console.log(problems.length ? `PROBLÈMES :\n- ${problems.join('\n- ')}` : 'Aucun problème.')
process.exitCode = problems.length ? 1 : 0
