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
import { CASES } from './samples.mjs'
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

// --- Rendus ----------------------------------------------------------------------------------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setRequestInterception(true)
page.on('request', (request) =>
  request.resourceType() === 'image' ? request.abort() : request.continue()
)

const welcome = `data:font/woff2;base64,${readFileSync('../../assets/heading.woff2').toString('base64')}`

const loaded = {
  order_confirmation: 'confirmation-plusieurs',
  shipping_confirmation: 'fabrication-plusieurs',
  shipping_update: 'terminee-inconnu',
  shipment_out_for_delivery: 'arrive',
  shipment_delivered: 'arrivee-plusieurs',
}

let checked = 0
let heaviest = 0
for (const [template, caseId] of Object.entries(loaded)) {
  const sample = CASES.find((c) => c.id === caseId)
  for (const locale of Object.keys(LOCALES)) {
    const where = `${template}.${locale}`
    const source = readFileSync(`dist/${template}.${locale}.liquid`, 'utf8')
    const html = await engine.parseAndRender(source, sample.data)
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
    }))
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
console.log(`${PAIRS.length} contrastes, le plus faible : ${Math.min(...PAIRS.map(([, a, b]) => ratio(a, b))).toFixed(2)}:1`)
console.log(problems.length ? `PROBLÈMES :\n- ${problems.join('\n- ')}` : 'Aucun problème.')
process.exitCode = problems.length ? 1 : 0
