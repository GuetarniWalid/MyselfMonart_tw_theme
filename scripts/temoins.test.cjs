// Les pages témoins (scripts/temoins.cjs, ticket 01 de .scratch/collection-design) : avant et après un push qui touche
// un fichier commun, le HTML que le serveur rend de quelques pages doit rester le même, au caractère près, hors
// empreinte de version du thème. Ici, le script contre un petit serveur local (jamais le site en ligne) : la copie
// espacée, la reprise quand Shopify freine, puis la comparaison, page par page.
// Lancer : node --test scripts/temoins.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { execFile } = require('child_process')
const { promisify } = require('util')

const SCRIPT = path.join(__dirname, 'temoins.cjs')
const run = (...args) => promisify(execFile)(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
  .then(({ stdout }) => ({ code: 0, out: stdout }))
  .catch((error) => ({ code: error.code, out: `${error.stdout}${error.stderr}` }))
const dossier = () => fs.mkdtempSync(path.join(os.tmpdir(), 'temoins-'))

/* Une page du thème, telle que le serveur la rend : la version d'un fichier d'assets change à chaque déploiement. */
const page = ({ version = 1, titre = 'Tableaux Nature', classe = 'grid' } = {}) => `<!DOCTYPE html>
<html lang="fr">
  <head>
    <link href="//www.myselfmonart.com/cdn/shop/t/25/assets/output.css?v=${version}" rel="stylesheet" type="text/css" media="all" />
    <script src="//www.myselfmonart.com/cdn/shop/t/25/assets/collection.js?v=${version + 7}" defer="defer"></script>
  </head>
  <body>
    <main id="MainContent" role="main" class="${classe}"><h1>${titre}</h1>
      <img src="//www.myselfmonart.com/cdn/shop/files/nature.jpg?v=1782807500&amp;width=600" alt="">
    </main>
  </body>
</html>`

/* Deux copies faites à la main : <dossier>/<fichier>.html et temoins.json, comme les écrit « copier ». */
function copie(pages) {
  const dir = dossier()
  fs.writeFileSync(path.join(dir, 'temoins.json'), JSON.stringify({ site: 'https://www.myselfmonart.com', pages: Object.keys(pages).map((fichier) => ({ page: `/${fichier}`, fichier: `${fichier}.html`, statut: 200 })) }))
  for (const [fichier, html] of Object.entries(pages)) fs.writeFileSync(path.join(dir, `${fichier}.html`), html)
  return dir
}

/* Ce que Shopify écrit dans <head> à chaque affichage (relevé sur le site le 23/11/2026, deux copies à 35 s
   d'écart) : l'identifiant de la requête, le jeton de visite de __st, l'identifiant d'événement des mesures
   d'audience, l'échéance des balises de session ; et l'empreinte du thème des mesures d'audience. */
const tete = ({ reqid, u, evt, expY, expS, empreinte = '12627270540038098976' }) => `<script id="__st">var __st={"a":62323884287,"offset":3600,"reqid":"${reqid}","pageurl":"www.myselfmonart.com\\/collections\\/tableau-lion","u":"${u}","p":"collection","rtyp":"collection","rid":640741704027};</script>
<script>var meta = {"page":{"pageType":"collection","resourceType":"collection","resourceId":640741704027,"requestId":"${reqid}"}};</script>
{"Trekkie":{"appName":"storefront","defaultAttributes":{"shopId":62323884287,"themeId":167301710171,"themeCityHash":"${empreinte}","contentLanguage":"fr","currency":"EUR","eventMetadataId":"${evt}"}}}
window.ShopifyAnalytics.lib.page(null,{"pageType":"collection","resourceType":"collection","resourceId":640741704027,"requestId":"${reqid}","shopifyEmitted":true});
<meta name="shopify-y" content="00000000-0000-0000-5000-000000000000" data-expiration="${expY}"><meta name="shopify-s" content="00000000-0000-0000-5000-000000000000" data-expiration="${expS}"><meta name="request-id" content="${reqid}"        >`

test('neutraliser : ce qui change à chaque affichage, ou avec un déploiement, sans que la page change', () => {
  const { neutraliser } = require('./temoins.cjs')
  const a = tete({ reqid: 'c17542ed-6150-468d-a078-dca3e4f2b7b1-1795456836', u: 'b48186a1c2d3', evt: '660388c9-659e-47f1-ac63-ca9926a65a01', expY: '1827014436000', expS: '1795458636000' })
  const b = tete({ reqid: '3b678e63-4de3-46d2-93bb-2d031a1d3888-1795456870', u: '479a25f0e1d2', evt: '1d120ce4-11a8-486b-ab47-d3e6f33343ee', expY: '1827014470000', expS: '1795458670000', empreinte: '98765432109876543210' })
  assert.notEqual(a, b)
  assert.equal(neutraliser(a), neutraliser(b))
  // Les clés restent : seule la valeur est neutralisée.
  for (const kept of ['"reqid":"…"', '"u":"…"', '"requestId":"…"', '"eventMetadataId":"…"', '"themeCityHash":"…"', 'data-expiration="…"', '<meta name="request-id" content="…"']) assert.ok(neutraliser(a).includes(kept), kept)
  // Le reste de la page compte : une autre collection, une autre langue, un autre thème, une autre image.
  for (const [from, to] of [['640741704027', '640741704028'], ['"contentLanguage":"fr"', '"contentLanguage":"en"'], ['"themeId":167301710171', '"themeId":167301710172']]) {
    assert.notEqual(neutraliser(a.replaceAll(from, to)), neutraliser(a), from)
  }
  assert.notEqual(neutraliser('<img src="//www.myselfmonart.com/cdn/shop/files/lion.jpg?v=1">'), neutraliser('<img src="//www.myselfmonart.com/cdn/shop/files/lion.jpg?v=2">'))
})

test('neutraliser : la version d’un fichier du thème, écrite telle quelle ou dans un JSON (barres échappées)', () => {
  const { neutraliser } = require('./temoins.cjs')
  // La fiche 3D écrit l'adresse de ses fichiers dans sa configuration (snippets/oeuvre-3d-stage.liquid, | json).
  const config = (v) => `{"three":"\\/\\/www.myselfmonart.com\\/cdn\\/shop\\/t\\/25\\/assets\\/three.module.min.js?v=${v}","engine":"\\/\\/www.myselfmonart.com\\/cdn\\/shop\\/t\\/25\\/compiled_assets\\/oeuvre-3d-engine.js?v=${v}7"}`
  assert.equal(neutraliser(config('11382840531171425291793883421')), neutraliser(config('99')))
  assert.ok(neutraliser(config('1')).includes('three.module.min.js?v=…"'))
  const lien = (v) => `<link href="//www.myselfmonart.com/cdn/shop/t/25/assets/output.css?v=${v}" rel="stylesheet" type="text/css" media="all" />`
  assert.equal(neutraliser(lien('138089972231529403161795433893')), neutraliser(lien('1')))
  // Un autre fichier, ou un autre thème, reste une différence.
  assert.notEqual(neutraliser(lien('1')), neutraliser(lien('1').replace('output.css', 'autre.css')))
  assert.notEqual(neutraliser(config('1')), neutraliser(config('1').replace('t\\/25', 't\\/26')))
})

test('comparer : deux copies qui ne diffèrent que par la version des fichiers du thème sont identiques', async () => {
  const avant = copie({ 'collections-tableaux-nature-sauvage': page({ version: 1 }), accueil: page({ titre: 'Accueil', version: 3 }) })
  const apres = copie({ 'collections-tableaux-nature-sauvage': page({ version: 2 }), accueil: page({ titre: 'Accueil', version: 9 }) })
  const { code, out } = await run('comparer', avant, apres)
  assert.equal(code, 0, out)
  assert.match(out, /collections-tableaux-nature-sauvage\.html : identique/)
  assert.match(out, /accueil\.html : identique/)
})

test('comparer : un vrai changement se montre, page et ligne, avant et après', async () => {
  const avant = copie({ 'collections-tableau-lion': page(), 'collections-tableau-salon': page() })
  const apres = copie({ 'collections-tableau-lion': page({ classe: 'grid gap-2', version: 5 }), 'collections-tableau-salon': page({ version: 5 }) })
  const { code, out } = await run('comparer', avant, apres)
  assert.equal(code, 1, out)
  assert.match(out, /collections-tableau-lion\.html : différente/)
  assert.match(out, /avant\s+8 : .*class="grid"><h1>/)
  assert.match(out, /après\s+8 : .*class="grid gap-2"><h1>/)
  assert.match(out, /collections-tableau-salon\.html : identique/)
  // Seules les lignes qui diffèrent se montrent : pas celles, identiques, qui les séparent.
  const deux = copie({ accueil: page() })
  const deuxChangements = copie({ accueil: page({ classe: 'flex' }).replace('</main>', '</main><footer></footer>') })
  const shown = (await run('comparer', deux, deuxChangements)).out
  assert.match(shown, /accueil\.html : différente \(lignes 8 à 10 avant, lignes 8 à 10 après\)/)
  assert.deepEqual(shown.match(/^ {2}(avant|après) +\d+/gm).map((l) => l.replace(/ +/g, ' ').trim()), ['avant 8', 'après 8', 'avant 10', 'après 10'])
  // L'image d'une collection n'est pas un fichier du thème : sa version changée est un vrai changement.
  const image = copie({ accueil: page() })
  const autreImage = copie({ accueil: page().replace('?v=1782807500', '?v=1782900000') })
  assert.equal((await run('comparer', image, autreImage)).code, 1)
})

/* Un serveur local qui joue la boutique : il note l'heure de chaque requête ; il peut freiner une page (429
   « local_rate_limited », puis une page anti-robot, sans zone principale) avant de la servir. */
async function boutique(pages, { freiner = null, couper = null } = {}) {
  const requetes = []
  let freinages = 0
  const server = http.createServer((req, res) => {
    requetes.push({ page: req.url, heure: Date.now(), agent: req.headers['user-agent'] })
    // Une connexion coupée sans réponse, une fois.
    if (req.url === couper && requetes.filter((r) => r.page === couper).length === 1) return req.socket.destroy()
    if (req.url === freiner && freinages < 2) {
      freinages++
      if (freinages === 1) {
        res.writeHead(429, { 'content-type': 'text/plain' })
        return res.end('local_rate_limited')
      }
      res.writeHead(200, { 'content-type': 'text/html' })
      return res.end('<!DOCTYPE html><html><body><h1>Un instant…</h1></body></html>')
    }
    const html = pages[req.url]
    res.writeHead(html ? 200 : 404, { 'content-type': 'text/html' })
    res.end(html || 'introuvable')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { site: `http://127.0.0.1:${server.address().port}`, requetes, fermer: () => new Promise((resolve) => server.close(resolve)) }
}

test('copier : une requête à la fois, espacées ; freiné, le script attend et reprend la même page', async () => {
  const shop = await boutique({ '/': page({ titre: 'Accueil' }), '/collections/tableau-lion': page({ titre: 'Tableau Lion' }) }, { freiner: '/collections/tableau-lion' })
  try {
    const dir = dossier()
    const { code, out } = await run('copier', dir, '--site', shop.site, '--pages', '/,/collections/tableau-lion', '--pause', '150', '--attente', '250')
    assert.equal(code, 0, out)
    assert.match(out, /\/collections\/tableau-lion : freiné \(statut 429\)/)
    assert.match(out, /\/collections\/tableau-lion : freiné \(statut 200\)/)
    // L'accueil, puis la collection trois fois : freinée, page anti-robot, enfin servie.
    assert.deepEqual(shop.requetes.map((r) => r.page), ['/', '/collections/tableau-lion', '/collections/tableau-lion', '/collections/tableau-lion'])
    const ecarts = shop.requetes.slice(1).map((r, i) => r.heure - shop.requetes[i].heure)
    assert.ok(ecarts[0] >= 145, `la pause entre deux pages : ${ecarts[0]} ms`)
    assert.ok(ecarts[1] >= 245 && ecarts[2] >= 245, `l’attente après un freinage : ${ecarts.slice(1)} ms`)
    assert.match(shop.requetes[0].agent, /^Mozilla\/5\.0 /)
    // Le HTML tel que servi, une page par fichier, et le relevé.
    assert.equal(fs.readFileSync(path.join(dir, 'accueil.html'), 'utf8'), page({ titre: 'Accueil' }))
    assert.equal(fs.readFileSync(path.join(dir, 'collections-tableau-lion.html'), 'utf8'), page({ titre: 'Tableau Lion' }))
    const releve = JSON.parse(fs.readFileSync(path.join(dir, 'temoins.json'), 'utf8'))
    assert.deepEqual(releve.pages.map(({ page: p, fichier, statut }) => [p, fichier, statut]), [['/', 'accueil.html', 200], ['/collections/tableau-lion', 'collections-tableau-lion.html', 200]])
  } finally {
    await shop.fermer()
  }
})

test('copier : une page restée sans réponse est redemandée', async () => {
  const shop = await boutique({ '/cart': page({ titre: 'Panier' }) }, { couper: '/cart' })
  try {
    const dir = dossier()
    const { code, out } = await run('copier', dir, '--site', shop.site, '--pages', '/cart', '--pause', '10', '--attente', '50')
    assert.equal(code, 0, out)
    assert.match(out, /\/cart : sans réponse \(.+\), nouvel essai/)
    assert.deepEqual(shop.requetes.map((r) => r.page), ['/cart', '/cart'])
    assert.equal(fs.readFileSync(path.join(dir, 'cart.html'), 'utf8'), page({ titre: 'Panier' }))
  } finally {
    await shop.fermer()
  }
})

test('copier puis comparer : deux copies successives, le thème redéployé entre elles, sont identiques', async () => {
  const ADRESSES = ['/', '/collections/tableaux-nature-sauvage', '/cart']
  const servir = (version) => Object.fromEntries(ADRESSES.map((p) => [p, page({ titre: p, version })]))
  const copies = []
  for (const version of [1, 2]) {
    const shop = await boutique(servir(version))
    try {
      const dir = dossier()
      assert.equal((await run('copier', dir, '--site', shop.site, '--pages', ADRESSES.join(','), '--pause', '10')).code, 0)
      copies.push(dir)
    } finally {
      await shop.fermer()
    }
  }
  const { code, out } = await run('comparer', ...copies)
  assert.equal(code, 0, out)
  assert.deepEqual(out.match(/^\S+ : identique$/gm), ['accueil.html : identique', 'collections-tableaux-nature-sauvage.html : identique', 'cart.html : identique'])
})

test('copier : sur le site en ligne, jamais plus d’une requête toutes les 3 s, 30 s d’attente quand Shopify freine', () => {
  const { reglages } = require('./temoins.cjs')
  assert.deepEqual(reglages({ pause: 100, attente: 10 }), { site: 'https://www.myselfmonart.com', pages: require('./temoins.cjs').PAGES, pause: 3000, attente: 30000 })
  assert.equal(reglages({ site: 'https://www.myselfmonart.com/', pause: 5000 }).pause, 5000)
  // Un serveur local (les tests) garde ses réglages.
  assert.equal(reglages({ site: 'http://127.0.0.1:9292', pause: 10 }).pause, 10)
})

test('copier : une pause qui n’est pas un nombre est refusée, avant toute requête', async () => {
  const { code, out } = await run('copier', dossier(), '--pause', 'trois')
  assert.equal(code, 2)
  assert.match(out, /--pause : un nombre de millisecondes est attendu, pas « trois »/)
})

test('comparer : une page absente de la seconde copie, ou servie autrement, n’est pas identique', async () => {
  const avant = copie({ panier: page(), accueil: page() })
  const apres = copie({ accueil: page() })
  const { code, out } = await run('comparer', avant, apres)
  assert.equal(code, 1)
  assert.match(out, /panier\.html : absente de la seconde copie/)
})
