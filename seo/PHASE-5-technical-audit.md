# Phase 5 — Audit technique + plan de déploiement

> Status : ✅ Audit complet (5A statique + 5B dynamique) — 2026-05-28. Thème staging validé, prêt pour passage live après validation Walid.
> Branche auditée : `seo-homepage-refonte` → mergée dans `staging` (déployée sur thème "MyselfMonArt - GitHub Staging")
> URL preview testée : `https://www.myselfmonart.com/?preview_theme_id=196928045403`

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

## 5B — Audit dynamique (résultats, 2026-05-28)

Réalisé sur le thème staging via chrome-devtools (Lighthouse + performance trace + DOM) et curl (HTML brut).

### ✅ Conforme

| Vérification | Résultat |
|---|---|
| Title `<head>` | `Tableau décoration murale — Studio Paris \| MyselfMonArt` ✅ |
| Meta description | Correcte (152 char) ✅ |
| Canonical | `https://www.myselfmonart.com/` ✅ |
| H1 | `Tableau décoration murale, l'art d'habiter vos murs` — 1 seul, keyword en tête ✅ |
| H2 | 12, dans l'ordre du plan ✅ |
| og:title / og:site_name | Corrects ✅ |
| Schemas JSON-LD | 5/5 : Organization, Store, BreadcrumbList, ItemList, FAQPage ✅ |
| FAQPage | 7 Questions/Answers (différenciateur) ✅ |
| Reviews | 23 Review + AggregateRating 4.1 ✅ |
| Syntaxe JSON-LD | 7 blocs, 7 valides, 0 erreur ✅ |
| Double Organization | Fusionnée via @id commun ✅ |
| **Lighthouse SEO** | **100 / 100** ✅ |
| **Lighthouse Accessibilité** | **93** ✅ |
| **LCP** | **561 ms** (objectif < 2500) ✅ |
| **CLS** | **0.00** (objectif < 0.1) ✅ |
| Images home | Toutes OK (hero lifestyle + vignettes dédiées + UGC + équipe), réelles | ✅ |
| Sections | 19 sections, 0 duplication ✅ |
| Responsive mobile (390px) | Hero, H1, eyebrow, image — rendu nickel ✅ |
| Liens collections | Valides (200 confirmés ; rate-limit Shopify sur tests rapides = faux négatifs) ✅ |

### ⚠️ Améliorations mineures (non bloquantes pour le live)

| # | Point | Détail | Priorité |
|---|---|---|---|
| 1 | Erreur console `Shopify is not defined` | Le script `Shopify.designMode` dans `snippets/head-base.liquid` s'exécute avant que l'objet global Shopify soit défini. Fix : `if (window.Shopify && Shopify.designMode)`. 1 ligne. | Moyenne (compte dans Best Practices) |
| 2 | Accessibilité 93 (3 points) | (a) contraste insuffisant sur 1 élément ; (b) liens icônes sans nom accessible (réseaux sociaux / sélecteur pays) ; (c) SVG drapeaux sans alt. | Basse (a11y, pas SEO) |
| 3 | Best Practices 73 | Surtout cookies tiers (Klarna/Trustpilot — inévitable en e-com) + l'erreur console #1. | Basse |
| 4 | INP | Non mesurable sans interaction réelle. À surveiller en post-launch via CrUX/Search Console. | Surveillance |

### Faux positifs écartés

- **Title "France"** : c'était le `<title>` d'une icône SVG drapeau (sélecteur pays), pas le title de la page. Vrai title OK.
- **13 images "broken"** : toutes dans le mega-menu du header (invisibles tant que le menu n'est pas ouvert). Comportement normal, aucun impact.
- **"Duplication de sections"** dans le screenshot fullPage : illusion de stitching. 0 doublon réel (IDs uniques).
- **Cartes grises** dans le screenshot : lazy-loading non déclenché au moment de la capture. Les images chargent au scroll.

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
