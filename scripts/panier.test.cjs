// Le panier « B · Les tuiles » (ticket 14 de .scratch/collection-design, choix de Walid du 27/11/2026), dans la vue de
// test seulement : le tiroir des pages collection.refonte… (snippets/panier-tiroir.liquid, rendu par
// sections/tw-cart-drawer.liquid, et seul par sections/panier-tiroir.liquid quand le panier change) et la page
// /cart?view=refonte (templates/cart.refonte.json, sections/panier-page.liquid). Ailleurs, le tiroir, la page panier et
// l'en-tête d'aujourd'hui, à l'octet près (copies d'avant : scripts/fixtures/*.avant-panier.liquid).
// Les coutures : le rendu Liquid (liquidjs), les appels du panier dans les scripts, les textes des cinq langues.
// Lancer : NODE_PATH=<un node_modules qui a liquidjs> node --test scripts/panier.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const { SKIP, read, locales, KIT, toile, poster, posterPerso, ligne, panier, ESSAI, VIDE, AVEC_KIT, TIROIR, TIROIR_AVANT, rendre, PAGES_DU_JOUR, entete, gabarit } = require('./panier-banc.cjs')

test('hors de la vue de test, le tiroir d’aujourd’hui à l’octet près ; dans la vue de test, le tiroir des tuiles', { skip: SKIP }, async () => {
  for (const page of PAGES_DU_JOUR) {
    for (const lang of ['fr', 'de']) {
      for (const [nom, cart] of [['vide', VIDE()], ['essai', ESSAI(lang)], ['avec le kit', AVEC_KIT(lang)]]) {
        const html = await rendre(TIROIR, { ...page, lang, cart })
        assert.equal(html, await rendre(TIROIR_AVANT, { ...page, lang, cart }), `${page.name}.${page.suffix}, ${lang}, ${nom}`)
        assert.doesNotMatch(html, /data-vue="tuiles"|panier-/, `${page.name}.${page.suffix}, ${lang}, ${nom}`)
      }
    }
  }
  for (const suffix of ['refonte', 'refonte-tableau-salon']) {
    for (const cart of [VIDE(), ESSAI()]) {
      const html = await rendre(TIROIR, { suffix, cart })
      assert.match(html, /^<cart-drawer\b[^>]*\bdata-vue="tuiles"/, suffix)
      assert.equal((html.match(/<cart-drawer\b/g) || []).length, 1, suffix)
    }
  }
})

/* ---------- Le cocon : pour Google, rien ne change ---------- */

/* Google visite le site panier vide : sur chaque page, il lit le tiroir vide. Ses liens : les <a href> et les faux liens
   du thème (data-url64, assets/tw-global.js). */
const liens = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1])
const fauxLiens = (html) => [...html.matchAll(/data-url64="([^"]*)"/g)].map((m) => Buffer.from(m[1], 'base64').toString())
const texte = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

test('le tiroir vide n’a pas un lien de plus : « Suivre ma commande », et les tuiles sans adresse (elles prennent celle du menu)', { skip: SKIP }, async () => {
  for (const lang of ['fr', 'de']) {
    const avant = await rendre(TIROIR_AVANT, { lang, cart: VIDE() })
    const apres = await rendre(TIROIR, { lang, cart: VIDE() })
    // Aujourd'hui : « Suivre ma commande » et le faux lien « Voir tous nos tableaux ».
    assert.deepEqual(liens(avant), ['/account'], lang)
    assert.deepEqual(fauxLiens(avant), ['/collections'], lang)
    // Après : « Suivre ma commande » seul, aucun faux lien, aucune collection.
    assert.deepEqual(liens(apres), ['/account'], lang)
    assert.deepEqual(fauxLiens(apres), [], lang)
    assert.doesNotMatch(apres, /\/collections\//, lang)
    // Le titre dit le panier vide ; la place des tuiles est là, vide : le script y met celles du menu, en boutons.
    assert.ok(texte(apres).includes(locales[lang].sections.tw_cart_drawer.empty_message), lang)
    assert.match(apres, /<ul class="panier-tuiles" data-panier-tuiles><\/ul>/, lang)
  }
})

/* ---------- Le kit d'accrochage : pour les toiles et les posters encadrés ---------- */

/* La tuile menthe du kit, rendue : combien de kits son bouton ajoute, et ce qu'il dit. Rien si elle n'est pas là. */
const tuileKit = (html) => {
  const m = /<section class="panier-kit"[\s\S]*?<\/section>/.exec(html)
  if (!m) return null
  const bouton = /<button[^>]*data-panier="kits"[^>]*data-articles="([^"]*)"[^>]*data-quantite="(\d+)"[^>]*>([\s\S]*?)<\/button>/.exec(m[0])
  return { articles: bouton[1], nombre: Number(bouton[2]), bouton: texte(bouton[3]), tout: texte(m[0]) }
}

test('le kit : un par toile et par poster encadré, jamais pour un poster sans cadre, dans toutes les langues ; son prix exact, sans étiquette', { skip: SKIP }, async () => {
  for (const lang of ['fr', 'de', 'en']) {
    const cas = [
      ['la toile seule', [ligne(toile(lang))], 1],
      ['la toile et le poster sans cadre (le panier de l’étude)', [ligne(poster(lang)), ligne(toile(lang))], 1],
      ['la toile et le poster encadré', [ligne(poster(lang, true)), ligne(toile(lang))], 2],
      ['le poster sans cadre seul', [ligne(poster(lang))], 0],
      ['le poster encadré seul', [ligne(poster(lang, true))], 1],
      ['deux fois la toile', [ligne(toile(lang), { quantity: 2 })], 2],
      ['un kit déjà là, pour la seule toile', [ligne(KIT, { remise: false }), ligne(poster(lang)), ligne(toile(lang))], 0],
      ['un kit déjà là, deux œuvres à accrocher', [ligne(KIT, { remise: false }), ligne(poster(lang, true)), ligne(toile(lang))], 1],
      // Un poster personnalisé n'a pas de fiche d'œuvre : il est un poster par son métachamp artwork.type.
      ['le poster personnalisé sans cadre seul', [ligne(posterPerso(lang))], 0],
      ['le poster personnalisé encadré seul', [ligne(posterPerso(lang, true), { properties: { _cadre: 'cadre-noir-mat-1' } })], 1],
      ['le poster personnalisé sans cadre et la toile', [ligne(posterPerso(lang)), ligne(toile(lang))], 1],
    ]
    for (const [nom, lignes, attendu] of cas) {
      const kit = tuileKit(await rendre(TIROIR, { lang, cart: panier(lignes) }))
      if (!attendu) {
        assert.equal(kit, null, `${lang}, ${nom}`)
        continue
      }
      assert.ok(kit, `${lang}, ${nom}`)
      assert.equal(kit.nombre, attendu, `${lang}, ${nom}`)
      assert.equal(kit.articles, String(KIT.first_available_variant.id), `${lang}, ${nom}`)
      // Le bouton dit ce qu'il ajoute et ce que cela coûte : 6,00 € par kit.
      assert.ok(kit.bouton.endsWith(`· ${attendu * 6},00 €`), `${lang}, ${nom} : ${kit.bouton}`)
      assert.ok(kit.tout.includes('6,00 €'), `${lang}, ${nom}`)
      // Aucune étiquette de remise sur le kit.
      assert.doesNotMatch(kit.tout, /Black Friday/, `${lang}, ${nom}`)
    }
  }
  // Le prix par œuvre, la raison et le bouton, dans la langue de la page.
  assert.equal(tuileKit(await rendre(TIROIR, { cart: panier([ligne(poster('fr', true)), ligne(toile('fr'))]) })).tout,
    'Pour les accrocher dès réception Kit d’accrochage, 6,00 € par œuvre Ajouter les 2 kits manquants · 12,00 €')
  assert.equal(tuileKit(await rendre(TIROIR, { lang: 'de', cart: ESSAI('de') })).tout,
    'Gleich nach Erhalt aufhängen Aufhängeset, 6,00 € pro Werk Fehlendes Set hinzufügen · 6,00 €')
})

test('une fois ajouté, le kit est une ligne du panier, rangée après les œuvres', { skip: SKIP }, async () => {
  const html = await rendre(TIROIR, { cart: AVEC_KIT() })
  const variantes = [...html.matchAll(/<li class="panier-ligne"[^>]*data-variante="(\d+)"/g)].map((m) => Number(m[1]))
  // Shopify met le kit en tête (le dernier ajouté) ; le tiroir le range après le poster et la toile.
  assert.deepEqual(variantes, [poster().variant.id, toile().first_available_variant.id, KIT.first_available_variant.id])
  // Sa ligne : son prix, sans ancien prix barré.
  const kit = /<li class="panier-ligne"[^>]*data-variante="50505925984603"[\s\S]*?<\/li>/.exec(html)[0]
  assert.doesNotMatch(kit, /<s>/)
  assert.match(kit, /<b>6,00 €<\/b>/)
})

/* ---------- La page panier de test (/cart?view=refonte) ---------- */

const PAGE = 'sections/panier-page.liquid'
const LAYOUT = 'layout/cart.liquid'
const LAYOUT_AVANT = 'scripts/fixtures/layout-cart.avant-panier.liquid'
const json = (file) => JSON.parse(read(file).replace(/^﻿/, '').replace(/^\s*\/\*[\s\S]*?\*\//, ''))
const pagePanier = (options = {}) => rendre(PAGE, { name: 'cart', suffix: 'refonte', id: 'template--1__panier', settings: {}, ...options })
/* Une section telle que Shopify la pose dans la page : dans son enveloppe. */
const enveloppe = (key, html) => `<div id="shopify-section-template--1__${key}" class="shopify-section">${html}</div>`

test('le modèle de test : la section de la page seule, sur le gabarit du panier', () => {
  const modele = json('templates/cart.refonte.json')
  assert.equal(modele.layout, 'cart')
  assert.deepEqual(modele.order.map((key) => modele.sections[key].type), ['panier-page'])
  // Le modèle d'aujourd'hui ne change pas.
  assert.deepEqual(json('templates/cart.json').order.map((key) => json('templates/cart.json').sections[key].type), ['custom-liquid'])
})

test('la page : le bouton de paiement s’atteint au clavier ; la barre du téléphone le double, à la souris et au doigt seulement', { skip: SKIP }, async () => {
  for (const lang of ['fr', 'de']) {
    const html = await pagePanier({ lang, cart: ESSAI(lang) })
    const recap = /<aside class="panier-recap"[\s\S]*?<\/aside>/.exec(html)[0]
    const bouton = /<button\b([^>]*)\bname="checkout"([^>]*)>/.exec(recap)
    assert.ok(bouton, lang)
    assert.match(bouton[0], /\btype="submit"/, lang)
    assert.doesNotMatch(bouton[0], /tabindex/, lang)
    // Le bouton envoie le formulaire du panier, comme aujourd'hui (Shopify mène au paiement).
    assert.match(html, /<form action="\/cart" method="post" id="panier-page-form"/, lang)
    // La barre collée du téléphone : le même paiement, hors du clavier et des lecteurs d'écran.
    const barre = /<div class="panier-barre"[^>]*>[\s\S]*?<\/div>/.exec(html)[0]
    assert.match(barre, /^<div class="panier-barre" aria-hidden="true"/, lang)
    assert.match(barre, /<button type="submit" form="panier-page-form" name="checkout" class="panier-payer" tabindex="-1">/, lang)
    // Le titre de la page, seul h1 : « Votre », maigre, puis « panier », en gras ; dessous, le nombre d'articles.
    const titre = locales[lang].sections.tw_cart_drawer.title.split(' ')
    assert.match(html, new RegExp(`<h1 class="panier-page-titre">${titre.slice(0, -1).join(' ')} <b>${titre[titre.length - 1]}</b></h1>`), lang)
    assert.equal((html.match(/<h1\b/g) || []).length, 1, lang)
  }
  // Le bouton de la page d'aujourd'hui, lui, ne s'atteint pas au clavier : c'est ce que la page de test corrige.
  assert.match(read('sections/page-cart-subtotal.liquid'), /name="checkout"[\s\S]*?tabindex="-1"/)
})

test('la page : le récapitulatif (sous-total, promotion, total), puis trois assurances confirmées', { skip: SKIP }, async () => {
  const html = await pagePanier({ cart: ESSAI() })
  const recap = texte(/<aside class="panier-recap"[\s\S]*?<\/aside>/.exec(html)[0])
  assert.ok(recap.startsWith('Récapitulatif Sous-total 87,40 € Promotion −17,48 € Total 69,92 € Paiement sécurisé'), recap)
  assert.ok(recap.endsWith('Livraison offerte, sous 7 jours ouvrés 14 jours pour changer d’avis Une vraie personne vous répond 7 jours sur 7.'), recap)
  assert.doesNotMatch(recap, /confirmer/)
  // Sans remise, comme le prototype : le sous-total, puis le total, sans ligne de promotion.
  const sansRemise = texte(/<aside class="panier-recap"[\s\S]*?<\/aside>/.exec(await pagePanier({ cart: panier([ligne(toile(), { remise: false })]) }))[0])
  assert.ok(sansRemise.startsWith('Récapitulatif Sous-total 62,50 € Total 62,50 € Paiement sécurisé'), sansRemise)
  // Panier vide : le titre le dit, les tuiles du menu et « Suivre ma commande ».
  const vide = await pagePanier({ cart: VIDE() })
  assert.match(vide, /<h1 class="panier-page-titre">Votre panier est vide<\/h1>/)
  assert.match(vide, /<ul class="panier-tuiles" data-panier-tuiles><\/ul>/)
  assert.doesNotMatch(vide, /panier-recap|panier-barre/)
})

test('le gabarit du panier : sans la page de test, exactement le HTML d’avant ; avec elle, la nouvelle feuille, la police et ni l’une ni l’autre des sections d’aujourd’hui', { skip: SKIP }, async () => {
  const AUJOURDHUI = enveloppe('custom_liquid', '<p>Un texte libre.</p>')
  for (const lang of ['fr', 'en']) {
    for (const cookie of [true, false]) {
      const html = await gabarit(LAYOUT, AUJOURDHUI, { lang, cookie })
      assert.equal(html, await gabarit(LAYOUT_AVANT, AUJOURDHUI, { lang, cookie }), `${lang}, cookies ${cookie}`)
    }
  }
  const page = enveloppe('panier', await pagePanier())
  const html = await gabarit(LAYOUT, page, { suffix: 'refonte' })
  assert.match(html, /^<!DOCTYPE html>\n<html lang="fr" data-refonte-page>\n/)
  const head = html.slice(0, html.indexOf('</head>'))
  assert.equal((head.match(/collection-refonte\.css/g) || []).length, 1)
  assert.ok(head.indexOf('collection-refonte.css') < head.indexOf('[content_for_header]'))
  assert.ok(head.indexOf('[content_for_header]') < head.indexOf('Albert Sans'))
  // La vue de test garde la vue d'une collection à l'autre (snippets/collection-refonte-essai.liquid), comme la page
  // collection de test.
  assert.match(head, /garderLaVue/)
  // Les sections de la page d'aujourd'hui ne sont plus rendues : la page de test les remplace.
  assert.doesNotMatch(html, /\[section page-cart-items\]|\[section page-cart-subtotal\]/)
  // Le reste du gabarit : celui d'aujourd'hui.
  for (const bout of ['[section tw-announcement-bar]', '[section tw-header]', '[section tw-footer]', 'id="overlay-content"', 'window.routes']) assert.ok(html.includes(bout), bout)
})

test('l’en-tête : le nouvel en-tête sur la page panier de test ; ailleurs, celui d’aujourd’hui à l’octet près', { skip: SKIP }, async () => {
  assert.match(await entete({ name: 'cart', suffix: 'refonte' }), /<div class="menu-ordi-entete">/)
  assert.match(await entete({ name: 'collection', suffix: 'refonte' }), /<div class="menu-ordi-entete">/)
  for (const [name, suffix] of [['cart', null], ['index', null], ['product', 'oeuvre-3d'], ['collection', null], ['search', null]]) {
    for (const lang of ['fr', 'de']) {
      const html = await entete({ name, suffix, lang })
      assert.equal(html, await entete({ file: 'scripts/fixtures/tw-sticky-header.avant-panier.liquid', name, suffix, lang }), `${name}.${suffix}, ${lang}`)
      assert.doesNotMatch(html, /menu-ordi/, `${name}.${suffix}`)
    }
  }
})

/* ---------- Le tiroir garde sa version de test quand il se met à jour ---------- */

/* Les appels de l'API du panier (/cart/add, /cart/change, /cart/update) qui demandent des sections à Shopify, dans les
   scripts que le thème charge : le texte de chaque fetch(…), parenthèses comprises. product-form.js et
   additionnal-product.js sont des restes de Dawn qu'aucun fichier ne charge. */
const SCRIPTS_DU_PANIER = ['assets/cart-drawer.js', 'assets/main-product.js', 'assets/component-custom-art-studio.js', 'assets/cart.js', 'assets/panier.js']
function appels(source) {
  const out = []
  for (let i = source.indexOf('fetch('); i >= 0; i = source.indexOf('fetch(', i + 1)) {
    let profondeur = 0
    let j = i + 5
    for (; j < source.length; j++) {
      if (source[j] === '(') profondeur++
      else if (source[j] === ')' && --profondeur === 0) break
    }
    out.push(source.slice(i, j + 1))
  }
  return out
}
const demandeDesSections = (appel) => /cart/.test(appel) && /\bsections\b/.test(appel.replace(/sections_url/g, ''))

/* sections_url (l'adresse de la page, recherche comprise) part seulement des appels du panier des tuiles. Les appels
   d'aujourd'hui (l'ancien tiroir, la fiche, le studio, l'ancienne page panier) restent tels quels jusqu'à la bascule :
   pendant le Black Friday, rien ne change hors de la vue de test (décision du 27/11, à la relecture du ticket 14). Shopify
   ignore ?view= dans cette API : le paramètre ne sert pas à garder le tiroir des tuiles, qui demande sa section par son
   nom. */
test('les appels du panier des tuiles envoient l’adresse de la page (sections_url) ; ceux d’aujourd’hui ne changent pas', () => {
  const tuiles = appels(read('assets/panier.js')).filter(demandeDesSections)
  assert.ok(tuiles.length, 'assets/panier.js : un appel du panier avec des sections')
  for (const appel of tuiles) assert.match(appel, /sections_url:\s*adresseDeLaPage\(\)/, appel.slice(0, 120))
  let anciens = 0
  for (const file of SCRIPTS_DU_PANIER.filter((f) => f !== 'assets/panier.js')) {
    const lus = appels(read(file)).filter(demandeDesSections)
    assert.ok(lus.length, `${file} : un appel du panier avec des sections`)
    for (const appel of lus) {
      anciens++
      assert.doesNotMatch(appel, /sections_url/, `${file} : ${appel.slice(0, 120)}`)
    }
  }
  // L'ancien tiroir (3 : quantité, quantité avec lot, ajout rapide), la fiche, le studio (2), l'ancienne page panier.
  assert.ok(anciens >= 7, String(anciens))
})

test('dans la vue de test, le tiroir se met à jour par sa propre section : Shopify ignore ?view=refonte dans l’API du panier', { skip: SKIP }, async () => {
  // La section que demande le script du tiroir des tuiles (data-section), rendue comme l'API du panier la rend : dans le
  // modèle par défaut de la page, sans la vue de test. Elle rend le même tiroir que la vue de test.
  for (const cart of [ESSAI(), VIDE(), AVEC_KIT()]) {
    const vueDeTest = (await rendre(TIROIR, { suffix: 'refonte', cart })).trim()
    assert.match(vueDeTest, /<panier-contenu class="panier" data-vue="tiroir" data-section="panier-tiroir"/)
    for (const [name, suffix] of [['collection', null], ['index', null], ['product', 'oeuvre-3d']]) {
      assert.equal((await rendre('sections/panier-tiroir.liquid', { name, suffix, cart, id: 'panier-tiroir', settings: {} })).trim(), vueDeTest, `${name}.${suffix}`)
    }
  }
  // De même pour la page : sa section, sans réglage, demandée par son nom (panier-page).
  assert.match(await pagePanier(), /<panier-contenu class="panier panier-page" data-vue="page" data-section="panier-page"/)
  assert.equal(await rendre(PAGE, { name: 'cart', suffix: null, cart: ESSAI(), id: 'panier-page', settings: {} }), await pagePanier())
  // Le script du panier des tuiles demande la section que porte la page, jamais tw-cart-drawer.
  const script = read('assets/panier.js')
  assert.doesNotMatch(script, /tw-cart-drawer'/)
  assert.match(script, /sections: \[this\.dataset\.section\]/)
})

test('les lots et le kit, comme aujourd’hui : au retrait, les variantes du lot perdent autant que la ligne ; l’ajout groupé porte les autres en _variantId_', () => {
  const { quantitesDuLot, articlesDuGroupe, phrase } = require('../assets/panier.js')
  // Retrait d'une ligne de 2 : ses deux variantes liées perdent 2 (le tiroir d'aujourd'hui, changeItemAndLinkedIdsQuantity),
  // jamais sous zéro.
  assert.deepEqual(quantitesDuLot('111:abc', 2, 0, [{ variante: '222', quantite: 3 }, { variante: '333', quantite: 1 }]), { '111:abc': 0, 222: 1, 333: 0 })
  // + et − : elles suivent du même écart.
  assert.deepEqual(quantitesDuLot('111:abc', 1, 2, [{ variante: '222', quantite: 1 }]), { '111:abc': 2, 222: 2 })
  // L'ajout groupé : le contrat de <quick-add-to-cart> (assets/cart-drawer.js, getFetchBody).
  assert.deepEqual(articlesDuGroupe(['50505925984603'], 2), [{ id: 50505925984603, quantity: 2, properties: {} }])
  assert.deepEqual(articlesDuGroupe(['1', '2', '3'], 1), [
    { id: 1, quantity: 1, properties: { _variantId_1: '2', _variantId_2: '3' } },
    { id: 2, quantity: 1, properties: {} },
    { id: 3, quantity: 1, properties: {} },
  ])
  assert.equal(phrase('« [article] » : [quantite]. Total [total].', { article: 'Frida', quantite: 2, total: '69,92 €' }), '« Frida » : 2. Total 69,92 €.')
})

test('« Annuler » remet une ligne sans propriétés sans en envoyer : Shopify écrit [] et l’API du panier refuse un tableau', () => {
  const { proprietesDeLaLigne } = require('../assets/panier.js')
  // Relevé en ligne le 27/11/2026 : la toile Frida Kahlo, sans propriétés, porte data-proprietes="[]", et
  // /cart/add.js répond 400 « expected Array to be a Hash: properties » quand ce tableau lui revient.
  assert.equal(proprietesDeLaLigne('[]'), null)
  assert.equal(proprietesDeLaLigne('{}'), null)
  assert.equal(proprietesDeLaLigne(''), null)
  assert.equal(proprietesDeLaLigne(undefined), null)
  assert.equal(proprietesDeLaLigne('pas du JSON'), null)
  assert.deepEqual(proprietesDeLaLigne('{"Cadre":"Chêne clair","_aperçu":"https://cdn.example/a.jpg"}'), { Cadre: 'Chêne clair', _aperçu: 'https://cdn.example/a.jpg' })
  // Le script s'en sert pour la ligne à remettre : pas de clé properties quand il n'y en a pas.
  const script = read('assets/panier.js')
  assert.match(script, /const proprietes = proprietesDeLaLigne\(ligne\.dataset\.proprietes\)/)
  assert.match(script, /\.\.\.\(proprietes \? \{ properties: proprietes \} : \{\}\)/)
})

/* ---------- Les textes, dans les cinq langues ---------- */

const FICHIERS_DU_PANIER = ['snippets/panier-tiroir.liquid', 'snippets/panier-corps.liquid', 'snippets/panier-ligne.liquid', 'snippets/panier-complements.liquid', 'snippets/panier-vide.liquid', 'snippets/panier-logos.liquid', 'snippets/panier-textes.liquid', 'sections/panier-page.liquid', 'sections/panier-tiroir.liquid']
const sansCommentaires = (source) => source.replace(/{%-?\s*comment\s*-?%}[\s\S]*?{%-?\s*endcomment\s*-?%}/g, '').replace(/{% schema %}[\s\S]*?{% endschema %}/, '')

test('aucun texte en dur : chaque mot vient d’un fichier de langue, et chaque clé existe dans les cinq langues', () => {
  const cles = new Set()
  for (const file of FICHIERS_DU_PANIER) {
    const source = sansCommentaires(read(file))
    // Entre deux balises, rien d'écrit à la main : seulement du Liquid, des blancs, le point qui sépare (·) et le signe
    // moins.
    const balises = source.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/{%-?[\s\S]*?-?%}/g, '').replace(/{{[\s\S]*?}}/g, '')
    for (const [, entre] of balises.matchAll(/>([^<]+)</g)) assert.match(entre, /^[\s·−]*$/, `${file} : « ${entre.trim()} »`)
    for (const [, valeur] of source.matchAll(/aria-label="([^"]*)"/g)) assert.match(valeur, /^{{ '[\w.]+' \| t\b[^}]*}}$/, `${file} : ${valeur}`)
    for (const [, cle] of source.matchAll(/'([a-z_]+(?:\.[a-z_0-9]+)+)' \| t\b/g)) cles.add(cle)
    for (const [, cle] of source.matchAll(/assign \w+ = '([a-z_]+(?:\.[a-z_0-9]+)+)'/g)) cles.add(cle)
  }
  assert.ok(cles.size >= 25, String(cles.size))
  for (const cle of cles) {
    for (const [lang, textes] of Object.entries(locales)) {
      const valeur = cle.split('.').reduce((n, p) => (n == null ? n : n[p]), textes)
      assert.ok(typeof valeur === 'string' || (valeur && typeof valeur.one === 'string' && typeof valeur.other === 'string'), `${lang} : ${cle}`)
    }
  }
})

test('le tiroir et la page dans les cinq langues : aucun texte manquant, la livraison et les retours dits partout pareil', { skip: SKIP }, async () => {
  const LIVRAISON = { fr: 'sous 7 jours ouvrés', en: 'within 7 working days', de: 'innerhalb von 7 Werktagen', es: 'en 7 días laborables', nl: 'binnen 7 werkdagen' }
  for (const lang of Object.keys(locales)) {
    for (const [nom, html] of [
      ['tiroir', await rendre(TIROIR, { lang, cart: ESSAI(lang) })],
      ['tiroir vide', await rendre(TIROIR, { lang, cart: VIDE() })],
      ['page', await pagePanier({ lang, cart: ESSAI(lang) })],
      ['page vide', await pagePanier({ lang, cart: VIDE() })],
    ]) {
      // Une clé absente sortirait telle quelle ; le JSON des phrases du script compris.
      assert.doesNotMatch(html, /\b(?:sections|cart_drawer|products|general|customer)\.[a-z_]+\.[a-z_]/, `${lang}, ${nom}`)
      assert.doesNotMatch(texte(html), /Made in France|Fabriqué en France/i)
    }
    const page = texte(await pagePanier({ lang, cart: ESSAI(lang) }))
    assert.ok(page.includes(LIVRAISON[lang]), `${lang} : ${LIVRAISON[lang]}`)
    assert.ok(page.includes(locales[lang].sections.mma.panier.retours), lang)
    assert.match(locales[lang].sections.mma.panier.retours, /14/, lang)
    // Les phrases du script se lisent : un JSON, avec ses repères.
    const phrases = JSON.parse(/<script type="application\/json" data-panier-textes>([\s\S]*?)<\/script>/.exec(await pagePanier({ lang }))[1])
    assert.deepEqual(Object.keys(phrases).sort(), ['ajoute', 'annuler', 'erreur', 'kitsPlus', 'kitsUn', 'quantite', 'retire', 'retrait', 'revenu', 'vide'])
    assert.ok(phrases.quantite.includes('[article]') && phrases.quantite.includes('[quantite]') && phrases.quantite.includes('[total]'), lang)
    assert.ok(phrases.kitsPlus.includes('[count]') && phrases.kitsPlus.includes('[total]'), lang)
    assert.ok(phrases.retire.includes('[article]'), lang)
  }
})
