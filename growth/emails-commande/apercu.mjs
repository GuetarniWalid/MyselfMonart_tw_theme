// Planche avant / après de la série, à relire avant toute mise en ligne.
//
//   node preview.mjs && node apercu.mjs   →   apercu.html
//
// Un seul fichier, images comprises : il s'ouvre partout, sans le dossier preview.

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'
import { LOCALES } from './strings.mjs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const fr = LOCALES.fr
const subjects = JSON.parse(readFileSync('dist/sujets.json', 'utf8')).fr
const orderNumber = (subject) => subject.replace('{{ name }}', '#1880').replace('{n}', '#1880')

const MAILS = [
  {
    id: 'confirmation',
    slug: 'order_confirmation',
    part: 'confirmation',
    name: 'Merci',
    subject: subjects.order_confirmation,
    when: 'Dès le paiement, automatiquement.',
    idea: "L'œuvre choisie, seule sur sa tuile blanche, comme au mur d'une galerie. C'est le seul mail qui détaille les prix.",
  },
  {
    id: 'fabrication',
    slug: 'shipping_confirmation',
    part: 'making',
    name: 'En fabrication',
    subject: fr.making.subject,
    when: "Quand tu marques la commande comme traitée, case « prévenir le client » cochée. C'est le passage à l'atelier.",
    idea: "Une lettre, sans photo en grand ni bouton. Elle dit ce qui se passe à l'atelier, pour faire patienter sans rien promettre. Si un numéro de suivi existe déjà, ce mail prend le texte du mail 3.",
  },
  {
    id: 'terminee',
    slug: 'shipping_update',
    part: 'ready',
    name: 'Terminée, voici le suivi',
    subject: subjects.shipping_update,
    when: 'Quand la routine ajoute le numéro de suivi dans Shopify.',
    idea: "Le numéro de suivi est l'événement : il a son aplat d'encre et le seul bouton du mail. Le vrai transporteur est nommé, et « Other » n'apparaît jamais.",
  },
  {
    id: 'arrive',
    slug: 'shipment_out_for_delivery',
    part: 'out',
    name: 'Arrive bientôt',
    subject: subjects.shipment_out_for_delivery,
    when: 'Quand le transporteur signale la tournée de livraison. UPS seulement pour le moment.',
    idea: "Le plus court : il tient sur un écran de téléphone, parce qu'il se lit debout, le jour J.",
  },
  {
    id: 'arrivee',
    slug: 'shipment_delivered',
    part: 'delivered',
    name: 'Arrivée',
    subject: subjects.shipment_delivered,
    when: 'Quand le transporteur signale la livraison. UPS seulement pour le moment.',
    idea: "L'œuvre d'abord, en grand. Pas de bouton : il n'y a plus rien à faire, sinon profiter. Un conseil d'accrochage, et de l'aide si le colis pose problème.",
  },
]

const HARD_CASES = [
  ['confirmation-plusieurs-mobile-clair', 'Plusieurs œuvres, kit, remise et TVA'],
  ['arrivee-plusieurs-mobile-clair', 'Arrivée de plusieurs œuvres : la liste remplace la grande image'],
  ['terminee-maersk-mobile-clair', 'Envoi partiel chez Maersk, nommé dans le mail'],
  ['terminee-inconnu-mobile-clair', 'Transporteur inconnu et deux numéros : aucun nom, pas de « Other »'],
  ['terminee-allemand-petit-clair', 'Allemand sur un très petit téléphone, numéro DHL de 20 chiffres'],
  ['confirmation-allemand-petit-gmail', 'Allemand dans Gmail, prénom en capitales corrigé, titres longs'],
  ['confirmation-gmail', 'Simulation : Gmail inverse lui-même les couleurs en sombre'],
  ['terminee-gmail', "Simulation de la même inversion sur l'aplat du suivi"],
  ['terminee-sans-style', 'Messagerie qui retire tout le style : le mail reste propre'],
]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()

// Réduit une photo d'écran et la renvoie prête à poser dans la page.
const shrink = async (file, width) => {
  writeFileSync('preview/_reduit.html', `<body style="margin:0"><img src="${file}" style="display:block;width:${width}px">`)
  await page.setViewport({ width, height: 600, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL('preview/_reduit.html').href, { waitUntil: 'load' })
  const shot = await page.screenshot({ type: 'jpeg', quality: 74, fullPage: true })
  return `data:image/jpeg;base64,${Buffer.from(shot).toString('base64')}`
}

// Le texte du mail tel que le client le lit, sans l'en-tête ni le pied de page.
const letter = async (id) => {
  await page.goto(pathToFileURL(`preview/${id}.html`).href, { waitUntil: 'domcontentloaded' })
  const lines = (await page.evaluate(() => document.body.innerText))
    .split('\n')
    .map((line) => line.replace(/\s*\t\s*/g, '  ').trim())
    .filter(Boolean)
  const start = lines.findIndex((line) => / sur 4$/.test(line)) + 1
  return lines.slice(start, lines.findIndex((line) => line.startsWith(fr.tagline))).join('\n')
}

const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const figure = (src, caption) => `<figure><img src="${src}" alt="${escape(caption)}"><figcaption>${escape(caption)}</figcaption></figure>`

let sections = ''
for (const [index, mail] of MAILS.entries()) {
  const before = await shrink(`avant/${mail.slug}.png`, 560)
  const light = await shrink(`png/${mail.id}-mobile-clair.jpg`, 560)
  const dark = await shrink(`png/${mail.id}-mobile-sombre.jpg`, 560)
  const gmail = await shrink(`png/${mail.id}-gmail-clair.jpg`, 560)
  const desktopLight = await shrink(`png/${mail.id}-ordi-clair.jpg`, 760)
  const desktopDark = await shrink(`png/${mail.id}-ordi-sombre.jpg`, 760)
  sections += `<section id="mail-${index + 1}">
<h2><span>${index + 1}</span> ${escape(mail.name)}</h2>
<dl>
<dt>Objet</dt><dd>${escape(orderNumber(mail.subject))}</dd>
<dt>Extrait</dt><dd>${escape(fr[mail.part].preheader)}</dd>
<dt>Envoi</dt><dd>${escape(mail.when)}</dd>
<dt>Idée</dt><dd>${escape(mail.idea)}</dd>
</dl>
<div class="trio">
${figure(before, "Aujourd'hui, sur la commande d'exemple de Shopify")}
${figure(light, 'Nouveau, iPhone en clair')}
${figure(dark, 'Nouveau, iPhone en sombre')}
${figure(gmail, 'Nouveau, Gmail en clair : les titres changent de police')}
</div>
<details><summary>Voir sur ordinateur</summary><div class="duo">
${figure(desktopLight, 'Ordinateur en clair')}
${figure(desktopDark, 'Ordinateur en sombre')}
</div></details>
<details><summary>Lire le texte complet</summary><p class="letter">${escape(await letter(mail.id))}</p></details>
</section>
`
}

let hard = ''
for (const [id, caption] of HARD_CASES) hard += figure(await shrink(`png/${id}.jpg`, 560), caption)

await browser.close()

const template = readFileSync('apercu.gabarit.html', 'utf8')
writeFileSync('apercu.html', template.replace('<!-- mails -->', sections).replace('<!-- cas -->', hard))
console.log('apercu.html :', Math.round(readFileSync('apercu.html').length / 1024), 'Ko')
