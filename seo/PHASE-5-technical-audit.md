# Phase 5 — Audit technique + plan de déploiement

> Status : 🟡 En cours — Partie 5A (audit statique du code) faite le 2026-05-26. Partie 5B (audit dynamique sur preview) en attente du push staging.
> Branche auditée : `seo-homepage-refonte`

---

## Méthode

| Sous-phase | Périmètre | Prérequis |
|---|---|---|
| **5A — statique** | Code : schemas, copy, structure Hn, maillage, alt text, conformité spec | Accès fichiers (✅ fait) |
| **5B — dynamique** | Rendu : Rich Results Test, Lighthouse/CWV, H1 au rendu, images chargées, responsive | URL preview publique (push staging) |

---

## 5A — Résultats audit statique (2026-05-26)

### 🟢 Conforme / excellent

- **Structure** : 16 sections dans l'ordre exact du plan Phase 4
- **Copy** : fidèle voix Hayate, vouvoiement, ton cocon
- **FAQ schema dynamique** : `sections/collapsible-content.liquid` génère le FAQPage depuis les blocks (`emit_faq_jsonld: true`), échappement `| json`, 7 questions — supérieur à la spec statique
- **4 schemas statiques** (`snippets/json-ld-home.liquid`) : Organization, Store, BreadcrumbList, ItemList — valeurs conformes (Trustpilot 4.1/80, areaServed 13 pays, paymentAccepted 5 méthodes, priceRange €€)
- **Inclusion conditionnelle** : `head-base.liquid` rend json-ld-home uniquement si `request.page_type == 'index'`
- **Maillage interne** : tous liens collections + blogs + contact présents
- **Stratégie Trustpilot respectée** : score pas mis en avant, "80 retours vérifiés", `trust_signals_home` désactivé pour éviter doublon avec `customers`
- **Review[] individuels** : 23 témoignages clients avec photos (rich snippets bonus)
- **Alt text** : descriptifs et présents partout
- **Canonical** : présent dans head-base.liquid

### 🔴 Problèmes critiques trouvés

| # | Problème | Statut |
|---|---|---|
| 1 | **H1 sans keyword** : le `<h1>` contenait "Art & décoration murale", keyword relégué dans l'eyebrow `<p>` | ✅ **CORRIGÉ** par Hayate — h1_title = "Tableau décoration murale, l'art d'habiter vos murs" + eyebrow = "Studio créatif français · Paris" |
| 2 | **Double Organization + double AggregateRating** : `Store` (json-ld-home) ET `Organization` (testimonials-carousel emit_review_jsonld) portent chacun un rating. Risque conflit/warning Search Console | 🔧 **À CORRIGER par Walid** — retirer aggregateRating du Store dans json-ld-home (lignes 70-76) + rattacher l'Organization de testimonials-carousel au même `@id` `{{ request.origin }}/#organization` (ligne 120) |

### 🟡 Corrections mineures

| # | Élément | Statut |
|---|---|---|
| 3 | Signature sans "Hayate" | ✅ **CORRIGÉ** — "— Hayate / Team MyselfMonArt" |

### 🟡 Actions Walid (hors code)

| # | Action | Où |
|---|---|---|
| 4 | **Title + Meta description home** : pas dans le theme (normal pour la home). À configurer dans **Shopify Admin → Boutique en ligne → Préférences** :<br>• Titre : `Tableau décoration murale — Studio Paris \| MyselfMonArt`<br>• Méta : `Tableaux décoration murale curés à la main par notre studio français à Paris. Toile 285g, encres archival 75 ans, cadre bois massif. ⭐ Trustpilot.` | Admin Shopify |

---

## 5B — Audit dynamique (à faire après push staging)

Checklist à exécuter sur l'URL preview :

- [ ] **Rich Results Test** (https://search.google.com/test/rich-results) : valider Organization, Store, BreadcrumbList, ItemList, FAQPage — 0 erreur
- [ ] **Schema.org validator** : copier-coller le HTML rendu, vérifier pas de double entité Organization après correction #2
- [ ] **H1 unique au rendu** : view source, confirmer 1 seul `<h1>` contenant "tableau décoration murale"
- [ ] **Title/Meta au rendu** : confirmer le title configuré en admin s'affiche
- [ ] **Lighthouse** (mode mobile + desktop) : Performance ≥ 90, SEO = 100, Accessibilité ≥ 95
- [ ] **Core Web Vitals** : LCP < 2.5s, CLS < 0.1, INP < 200ms
- [ ] **Images** : vérifier que les 16 visuels (hero, vignettes, équipe) sont chargés et non cassés (placeholder ou réels)
- [ ] **Responsive** : tester mobile (375px), tablette (768px), desktop (1440px)
- [ ] **Liens internes** : cliquer chaque lien collection/blog, vérifier pas de 404
- [ ] **Accessibilité** : navigation clavier, contraste, alt text au rendu

---

## Plan de déploiement (après validation 5B)

1. Corriger #2 (double schema) sur la branche
2. Commit des corrections (H1, signature, double schema)
3. Walid configure Title/Meta dans l'admin Shopify
4. Validation visuelle finale Walid sur preview (workflow : staging → validation → merge)
5. Merge `seo-homepage-refonte` → `main` (= mise en live, selon workflow Walid)
6. **Post-déploiement** :
   - Soumettre l'URL home à Google Search Console → "Demander une indexation"
   - Vérifier la désindexation de l'ancienne `/pages/tableau-decoration` (Phase 1 : page supprimée, à confirmer absente du sitemap)
   - Vérifier que sitemap.xml reflète la home

## Suivi post-lancement

| Échéance | Action | Outil |
|---|---|---|
| **J+14** | Relever impressions/clics/position sur "tableau décoration murale" + cluster. Comparer au baseline Phase 1 (home = 8 clics/90j) | skill `gsc-query` |
| **J+30** | Idem + vérifier apparition rich snippets FAQ dans la SERP + indexation correcte | gsc-query + Rich Results |
| **J+30** | Vérifier qu'aucune cannibalisation n'est apparue entre home et `/collections/tableau-salon` | gsc-query (dimensions query,page) |

> Baseline Phase 1 (rappel) : home FR = 8 clics / ~410 impressions / position 17.36 sur 90j, presque tout en brand. Objectif J+30 : apparition d'impressions sur le cluster générique "tableau décoration murale".
