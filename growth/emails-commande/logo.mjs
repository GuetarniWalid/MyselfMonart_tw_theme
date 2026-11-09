// Fabrique l'en-tête des mails : le visage du logo, sans son rond, et le nom dans la typo du site.
//
//   node logo.mjs   →   logo/mail-logo-clair.png   et   logo/mail-logo-sombre.png
//
// Le nom est une image : c'est le seul moyen de garder la typo dans Gmail, qui refuse les polices
// de marque. Fond transparent, et un fin liseré papier sur la version claire : invisible sur le
// papier, il garde le nom lisible quand Gmail assombrit le mail sans changer les images.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PAPER = '#f6f2ec'

const logo = readFileSync('../../snippets/tw-default-logo.liquid', 'utf8')
  .replace(/<title[\s\S]*?<\/title>/, '')
  .replace(/<desc[\s\S]*?<\/desc>/, '')
  .replace(/<circle[\s\S]*?<\/circle>/, '')
  .replace(/ (width|height)="\d+"/g, '')
  .replace(/ (class|aria-labelledby|role|focusable)="[^"]*"/g, '')
  .replace('viewbox="0 0 68 68"', 'viewBox="12.6 12.6 39 39.8"')
const font = readFileSync('../../assets/heading.woff2').toString('base64')

// Les traits du visage restent à l'encre dans les deux versions : ils sont posés sur le rouge et
// le jaune, qui ressortent aussi bien sur le papier que sur le fond sombre.
const INK = '#21150c'
const VARIANTS = {
  clair: { name: INK, halo: PAPER },
  sombre: { name: '#f6ece2', halo: 'transparent' },
}

const page = async (browser) => {
  const tab = await browser.newPage()
  await tab.setViewport({ width: 600, height: 200, deviceScaleFactor: 3 })
  return tab
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const tab = await page(browser)
mkdirSync('logo', { recursive: true })
const sizes = {}
for (const [id, { name, halo }] of Object.entries(VARIANTS)) {
  await tab.setContent(`<style>
@font-face{font-family:Welcome;src:url(data:font/woff2;base64,${font}) format('woff2')}
html,body{margin:0;background:transparent}
#lockup{display:inline-flex;align-items:center;gap:10px;padding:2px;color:${INK}}
#lockup svg{display:block;width:37px;height:38px}
#lockup span{font:30px/38px Welcome;color:${name};-webkit-text-stroke:${id === 'clair' ? 1.2 : 0}px ${halo};paint-order:stroke fill}
</style><div id="lockup">${logo}<span>MyselfMonArt</span></div>`)
  await tab.evaluate(() => document.fonts.ready)
  const element = await tab.$('#lockup')
  const box = await element.boundingBox()
  sizes[id] = { width: Math.ceil(box.width), height: Math.ceil(box.height) }
  await element.screenshot({ path: `logo/mail-logo-${id}.png`, omitBackground: true })
}
await browser.close()
writeFileSync('logo/tailles.json', JSON.stringify(sizes, null, 2))
console.log(sizes)
