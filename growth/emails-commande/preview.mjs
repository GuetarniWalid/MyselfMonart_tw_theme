// Rend les modèles avec des données d'exemple, puis les photographie dans un vrai Chrome.
//
//   node preview.mjs [id du cas…]
//
// Pour chaque cas : téléphone et ordinateur, en clair et en sombre, plus deux pires cas.
//  - gmail : Gmail ignore la media query du mode sombre et inverse lui-même les couleurs ;
//  - sans-style : une messagerie qui retire tout le <style>, sans aucun mode sombre.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { Liquid } from 'liquidjs'
import puppeteer from 'puppeteer-core'
import { CASES } from './samples.mjs'
import { FONT_URL, LOGO_DARK, LOGO_LIGHT } from './marque.mjs'

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

mkdirSync('preview/png', { recursive: true })

// Les images du CDN sont copiées une fois en local : les photos d'écran ne dépendent plus du réseau.
mkdirSync('preview/img', { recursive: true })
const font = `data:font/woff2;base64,${readFileSync('../../assets/heading.woff2').toString('base64')}`
const localImages = async (html) => {
  let out = html
    .replaceAll(LOGO_LIGHT, '../logo/mail-logo-clair.png')
    .replaceAll(LOGO_DARK, '../logo/mail-logo-sombre.png')
    .replaceAll(FONT_URL, font)
  for (const [src] of html.matchAll(/https:\/\/cdn\.shopify\.com[^"' )]+/g)) {
    const file = `img/${createHash('sha1').update(src).digest('hex').slice(0, 12)}.jpg`
    if (!existsSync(`preview/${file}`)) {
      const response = await fetch(src)
      writeFileSync(`preview/${file}`, Buffer.from(await response.arrayBuffer()))
    }
    out = out.replaceAll(src, file)
  }
  return out
}

const wanted = process.argv.slice(2)
const cases = CASES.filter((c) => !wanted.length || wanted.includes(c.id))

const pages = []
for (const c of cases) {
  const source = readFileSync(`dist/${c.template}.${c.locale ?? 'fr'}.liquid`, 'utf8')
  const html = await engine.parseAndRender(source, c.data)
  writeFileSync(`preview/${c.id}.html`, html)
  pages.push({ id: c.id, html })
}

if (process.env.HTML_ONLY) process.exit(0)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()

const shoot = async (id, html, name, { width, dark = false, invert = false, stripDark = false, stripAll = false, stripFont = false }) => {
  let content = html
  if (stripFont) content = content.replace(/@font-face\{[^}]*\}/, '').replace(/\.ff\{[^}]*\}/, '')
  if (stripAll) content = content.replace(/<style[\s\S]*?<\/style>/g, '')
  if (stripDark) content = content.replace(/@media \(prefers-color-scheme:dark\)\{[\s\S]*?\n\}/, '')
  if (invert) {
    content = content.replace(
      '</head>',
      '<style>html{background:#fff;filter:invert(1) hue-rotate(180deg)}img{filter:invert(1) hue-rotate(180deg)}</style></head>'
    )
  }
  await page.setViewport({ width, height: 900, deviceScaleFactor: 2 })
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }])
  writeFileSync('preview/_shot.html', await localImages(content))
  await page.goto(pathToFileURL('preview/_shot.html').href, { waitUntil: 'load', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `preview/png/${id}-${name}.jpg`, type: 'jpeg', quality: 80, fullPage: true })
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
  }))
}

const report = []
for (const { id, html } of pages) {
  const results = {
    'mobile-clair': await shoot(id, html, 'mobile-clair', { width: 390 }),
    'petit-clair': await shoot(id, html, 'petit-clair', { width: 320 }),
    'sans-style': await shoot(id, html, 'sans-style', { width: 390, stripAll: true }),
    'petit-gmail': await shoot(id, html, 'petit-gmail', { width: 320, stripDark: true, stripFont: true }),
  }
  if (!id.includes('-')) {
    results['mobile-sombre'] = await shoot(id, html, 'mobile-sombre', { width: 390, dark: true })
    results['ordi-clair'] = await shoot(id, html, 'ordi-clair', { width: 760 })
    results['ordi-sombre'] = await shoot(id, html, 'ordi-sombre', { width: 760, dark: true })
    results['gmail-clair'] = await shoot(id, html, 'gmail-clair', { width: 390, stripDark: true, stripFont: true })
    results.gmail = await shoot(id, html, 'gmail', { width: 390, invert: true, stripDark: true, stripFont: true })
  }
  report.push({
    id,
    ko: Math.round(Buffer.byteLength(html) / 1024),
    debordement: Object.entries(results)
      .filter(([, r]) => r.overflow > 0)
      .map(([name, r]) => `${name}:${r.overflow}px`),
  })
}
await browser.close()
console.table(report)
