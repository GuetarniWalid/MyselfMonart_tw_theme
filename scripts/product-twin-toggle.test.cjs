// La bascule Toile / Poster sans rechargement (assets/product-twin-toggle.js) et les boutons « retour » et
// « suivant » du navigateur. Défaut relevé le 20/11/2026 sur la fiche 3D en ligne : après la bascule vers le
// poster, « retour » remettait l'adresse de la toile mais laissait la page du poster (h1, bascule, achat).
// L'entrée de départ, chargée normalement, n'avait pas la marque mmaSoftNav : le retour vers elle était ignoré.
// Ici, une page réduite à ce que le script touche, avec un historique de navigateur simulé.
// Lancer : node --test scripts/product-twin-toggle.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const ROOT = path.join(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')

const TOILE = 'https://www.myselfmonart.com/products/tableau-superman'
const POSTER = 'https://www.myselfmonart.com/products/poster-superman?view=oeuvre-3d&variant=2'

/* Une page : #MainContent montre un produit ; fetch rend la fiche d'une adresse ; l'historique est une pile
   d'entrées { state, url } avec une position, comme celui d'un navigateur. */
function page({ initialState = null, fetchDelay = 0 } = {}) {
  const shown = { url: TOILE, swaps: 0 }
  const fetched = []
  const listeners = {}
  const entries = [{ state: initialState, url: TOILE }]
  let index = 0
  const location = { get href() { return entries[index].url } }
  const history = {
    get state() { return entries[index].state },
    get length() { return entries.length },
    pushState(state, _title, url) {
      entries.splice(index + 1)
      entries.push({ state: structuredClone(state), url: String(url) })
      index = entries.length - 1
    },
    replaceState(state, _title, url) {
      entries[index] = { state: structuredClone(state), url: url === undefined ? entries[index].url : String(url) }
    },
  }
  // Retour ou suivant : la position change, puis l'événement popstate part avec l'état de l'entrée.
  const go = (step) => {
    index += step
    for (const listener of listeners.popstate || []) listener({ state: entries[index].state })
  }
  const main = {
    querySelector: () => null,
    replaceChildren(...nodes) { shown.url = nodes[0] && nodes[0].url; shown.swaps++ },
  }
  const document = {
    getElementById: (id) => (id === 'MainContent' ? main : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { classList: { remove() {} } },
    dispatchEvent() {},
    title: '',
  }
  class DOMParser {
    parseFromString(html) {
      const url = html
      return {
        getElementById: (id) => (id === 'MainContent' ? { childNodes: [{ url }], querySelector: () => null, querySelectorAll: () => [] } : null),
        querySelector: () => null,
        createComment: () => ({}),
      }
    }
  }
  const registry = new Map()
  const context = {
    document, history, location, DOMParser, URL, console, setTimeout, clearTimeout, structuredClone,
    HTMLElement: class {},
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail } },
    customElements: { get: (name) => registry.get(name), define: (name, element) => registry.set(name, element) },
    addEventListener: (type, listener) => { (listeners[type] = listeners[type] || []).push(listener) },
    fetch: async (url) => {
      fetched.push(String(url))
      if (fetchDelay) await new Promise((resolve) => setTimeout(resolve, fetchDelay))
      return { ok: true, status: 200, text: async () => String(url) }
    },
  }
  context.window = context
  vm.createContext(context)
  vm.runInContext(read('assets/product-twin-toggle.js'), context, { filename: 'assets/product-twin-toggle.js' })
  return {
    SoftNav: context.MMASoftNav, shown, fetched, entries, history,
    back: () => go(-1),
    forward: () => go(1),
    // Les navigations lancées par popstate sont asynchrones : on attend qu'elles aient fini.
    settle: () => new Promise((resolve) => setTimeout(resolve, fetchDelay * 3 + 20)),
  }
}

test('bascule : la fiche jumelle remplace la page, et son adresse s’empile', async () => {
  const p = page()
  await p.SoftNav.navigate(POSTER)
  assert.equal(p.shown.url, POSTER)
  assert.deepEqual(p.entries.map((e) => e.url), [TOILE, POSTER])
  assert.equal(p.history.state.mmaSoftNav, true)
})

test('« retour » après la bascule : la page redevient celle de l’adresse (la toile)', async () => {
  const p = page()
  await p.SoftNav.navigate(POSTER)
  p.back()
  await p.settle()
  assert.equal(p.shown.url, TOILE, 'la page suit l’adresse')
  assert.deepEqual(p.fetched, [POSTER, TOILE])
  assert.equal(p.entries.length, 2, '« retour » n’empile rien')
})

test('« suivant » ensuite : la page redevient celle du poster', async () => {
  const p = page()
  await p.SoftNav.navigate(POSTER)
  p.back()
  await p.settle()
  p.forward()
  await p.settle()
  assert.equal(p.shown.url, POSTER)
  assert.equal(p.entries.length, 2)
})

test('l’entrée de départ garde ce que d’autres scripts y ont mis (product-selection.js, ?variant=)', async () => {
  const p = page({ initialState: { autre: 1 } })
  await p.SoftNav.navigate(POSTER)
  assert.deepEqual(p.entries[0].state, { autre: 1, mmaSoftNav: true })
})

test('plusieurs bascules puis plusieurs « retour » : chaque fois la fiche de l’adresse', async () => {
  const p = page()
  await p.SoftNav.navigate(POSTER)
  await p.SoftNav.navigate(TOILE)
  await p.SoftNav.navigate(POSTER)
  assert.deepEqual(p.entries.map((e) => e.url), [TOILE, POSTER, TOILE, POSTER])
  for (const expected of [TOILE, POSTER, TOILE]) {
    p.back()
    await p.settle()
    assert.equal(p.shown.url, expected)
  }
})

test('« retour » pendant qu’une fiche arrive encore : la page finit sur celle de l’adresse', async () => {
  const p = page({ fetchDelay: 30 })
  await p.SoftNav.navigate(POSTER)
  p.back() // la toile est demandée…
  p.forward() // …et l'on revient au poster avant qu'elle n'arrive
  await p.settle()
  await p.settle()
  assert.equal(p.shown.url, POSTER, 'la dernière adresse fait foi')
})

test('un popstate qui ne vient pas de la bascule (un filtre de collection) n’est pas touché', async () => {
  const p = page({ initialState: { filtered: true } })
  // Pas de bascule : l'entrée garde son état, et un retour vers elle ne relance rien.
  p.history.pushState({ filtered: true }, '', TOILE + '?filtre=bleu')
  p.back()
  await p.settle()
  assert.deepEqual(p.fetched, [])
  assert.equal(p.shown.swaps, 0)
})
