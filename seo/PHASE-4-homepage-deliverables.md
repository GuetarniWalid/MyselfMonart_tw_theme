# Phase 4 — Livrables homepage MyselfMonArt

> Status : ✅ Validée + **implémentée** sur la branche `seo-homepage-refonte`.
> Ce doc = référence des specs. **La source de vérité de la copy est désormais [templates/index.json](../templates/index.json)** (ne pas dupliquer ici pour éviter la dérive).
> Recréé le 2026-05-26 après perte des docs non commités.

---

## A. Structure SEO

| Élément | Valeur | Où c'est implémenté |
|---|---|---|
| **Title** | `Tableau décoration murale — Studio Paris \| MyselfMonArt` (53 char) | ⚠️ **Shopify Admin → Préférences** (pas dans le theme) — à configurer par Walid |
| **Meta description** | `Tableaux décoration murale curés à la main par notre studio français à Paris. Toile 285g, encres archival 75 ans, cadre bois massif. ⭐ Trustpilot.` (152 char) | ⚠️ **Shopify Admin → Préférences** — à configurer par Walid |
| **H1** | `Tableau décoration murale, l'art d'habiter vos murs` | `index.json` section `hero` → `h1_title` |
| **Eyebrow** | `Studio créatif français · Paris` | `index.json` section `hero` → `eyebrow` |
| **Canonical** | `{{ canonical_url }}` | `snippets/head-base.liquid` (auto) |

---

## B. Structure Hn implémentée (16 sections)

Ordre dans [templates/index.json](../templates/index.json) `order[]` :

| # | Section (id) | Type Liquid | Rôle |
|---|---|---|---|
| 1 | `hero` | hero-with-text | H1 + eyebrow + subtitle + image |
| 2 | `welcome` | prose | H2.1 Bienvenue cocon |
| 3 | `usps` | usps-bento | H2.2 USPs (4 blocks chiffrés) |
| 4 | `rooms` | cards-carousel | H2.3 Par pièce (6 blocks) |
| 5 | `styles` | cards-carousel | H2.4 Par style (8 blocks) |
| 6 | `size_guide` | prose | H2.5 Taille & format |
| 7 | `journey` | prose | H2.6 Voyage d'une œuvre |
| 8 | `studio` | image-with-list | H2.7 Studio Paris/Toulouse/Europe (3 blocks) |
| 9 | `customers` | testimonials-carousel | H2.8 UGC (23 témoignages + JSON-LD review) |
| 10 | `faq_intro` | prose | H2.9 Comment bien choisir |
| 11 | `faq` | collapsible-content | H2.10 FAQ (7 Q + FAQPage schema) |
| 12 | `devis_cta` | prose | H2.11 Devis artiste |
| 13 | `collections` | cards-grid | H2.12 Collections (12 cards) |
| 14 | `all_collections_cta` | prose | CTA "Voir nos 50 collections" |
| 15 | `trust_signals_home` | trust-signals | **désactivé** (doublon de `customers`) |
| 16 | `signature` | signature | "Avec soin, — Hayate / Team MyselfMonArt" |

---

## C. Copy

> **Source de vérité = [templates/index.json](../templates/index.json)** (settings de chaque section). ~2 750 mots, voix Hayate (vouvoiement, premium-émotionnel-cocon). Validée par Walid 2026-05-25. Ne pas dupliquer ici.

---

## D. Schemas JSON-LD (implémentés)

| Schema | Fichier | Détail |
|---|---|---|
| Organization (#organization) | `snippets/json-ld-home.liquid` | Sans rating (rating porté par testimonials via même @id) |
| Store (#store) | `snippets/json-ld-home.liquid` | priceRange €€, 13 pays areaServed, 5 paymentAccepted. **Sans aggregateRating** (consolidé, commit 67af54e) |
| BreadcrumbList | `snippets/json-ld-home.liquid` | Minimal (Accueil) |
| ItemList (#collections-phares) | `snippets/json-ld-home.liquid` | 16 collections |
| Organization + AggregateRating + Review[] | `sections/testimonials-carousel.liquid` | `@id` = `{{ request.origin }}/#organization` (fusionne avec json-ld-home). Rating 4.1/80 + 23 reviews. Gaté par `emit_review_jsonld` |
| FAQPage | `sections/collapsible-content.liquid` | Dynamique depuis les blocks, gaté par `emit_faq_jsonld: true`. 7 questions |

**Inclusion** : `snippets/head-base.liquid` rend `json-ld-home` si `request.page_type == 'index'`.

---

## E. Maillage interne (~35 liens, implémenté)

24 liens collections (salon, chambre-adulte, chambre-garcon, bureau, cuisine, abstrait, zen, pop-art, africain, noir-et-blanc, fleurs, japonais, frida-kahlo, paysage, couleur, ethnique) + 2 blogs (quelle-taille, accrocher) + contact + Trustpilot. Tous présents dans index.json.

---

## F. Images & alt text

> Conventions : Shopify délivre WebP auto via `image_url`. Nommage lowercase-tirets. `loading="lazy"` partout sauf hero (`eager` + `fetchpriority="high"`). ≤200 KB mobile / ≤500 KB desktop.

### F.4 — Récap des 16 visuels à créer/fournir par Walid

| # | Visuel | Quantité | Format | Traitement |
|---|---|---:|---|---|
| 1 | Hero desktop | 1 | 1920×800 | Tableau dans salon contemporain |
| 2 | Hero mobile | 1 | 750×900 | Recadré portrait |
| 3 | Photo équipe groupe | 1 | 1200×800 | 5 personnes, lifestyle warm, PAS fond blanc corporate |
| 4-9 | Vignettes par pièce | 6 | 800×600 | **Mise en scène lifestyle** |
| 10-17 | Vignettes par style | 8 | 800×600 | **Pack shot** — peut réutiliser photos produit existantes |

### F.2 — Vignettes par pièce (mise en scène lifestyle, 800×600)

| Vignette | Mise en scène | Alt text |
|---|---|---|
| Salon | Mur derrière canapé moderne, lumière latérale | `Tableaux pour le salon — collection MyselfMonArt` |
| Chambre adulte | Tête de lit, tableau apaisant, ambiance cocon | `Tableaux pour la chambre adulte — collection MyselfMonArt` |
| Chambre enfant | Chambre ludique, tableau coloré | `Tableaux pour la chambre enfant — collection MyselfMonArt` |
| Bureau | Home-office épuré, tableau en face | `Tableaux pour le bureau — collection MyselfMonArt` |
| Cuisine | Coin repas, tableau vif | `Tableaux pour la cuisine — collection MyselfMonArt` |
| Entrée/couloir | Premier mur visible depuis la porte | `Tableaux pour l'entrée et le couloir — collection MyselfMonArt` |

### F.3 — Vignettes par style (pack shot, 800×600)

| Vignette | Visuel | Alt text |
|---|---|---|
| Abstrait & moderne | Composition géométrique colorée | `Tableaux abstraits et modernes — collection MyselfMonArt` |
| Zen & nature | Branche, lotus, paysage brumeux | `Tableaux zen et inspiration nature — collection MyselfMonArt` |
| Pop art & street art | Contrastes francs, couleurs vives | `Tableaux pop art et street art — collection MyselfMonArt` |
| Africain & ethnique | Portrait femme africaine / berbère | `Tableaux africains et ethniques — collection MyselfMonArt` |
| Noir & blanc | Monochrome contrasté | `Tableaux noir et blanc — collection MyselfMonArt` |
| Floral | Fleur agrandie contemporaine | `Tableaux floraux — collection MyselfMonArt` |
| Japonais | Estampe revisitée, cerisier | `Tableaux japonais — collection MyselfMonArt` |
| Frida Kahlo | Portrait/hommage Frida | `Tableaux Frida Kahlo — collection MyselfMonArt` |

### F.1 — Photo équipe (1200×800)

5 personnes, regards naturels, environnement marqueurique (mur avec tableaux / atelier / espace créatif), lifestyle warm, PAS fond blanc corporate. Alt : `L'équipe MyselfMonArt — direction artistique à Paris et service client à Toulouse`. Bonus (page À propos, pas home) : 5 portraits individuels 600×600 avec prénom + rôle.

---

## G. Intégration Shopify (faite)

Implémentée sur branche `seo-homepage-refonte`. Sections Liquid créées : hero-with-text, usps-bento, cards-carousel, cards-grid, prose, signature, testimonials-carousel, image-with-list. Snippet json-ld-home.liquid créé. FAQPage dynamique dans collapsible-content.liquid. Conventions : Tailwind, vars globales, admin-configurable (cf. skill `.claude/skills/shopify-section-dev/`).

**Reste pour Walid** :
1. Title + Meta dans Shopify Admin → Préférences
2. Créer/remplacer les 16 visuels (placeholders actuellement à vérifier en 5B)

---

## 🔗 Références

- Décisions : [STRATEGY.md](STRATEGY.md)
- Audit technique : [PHASE-5-technical-audit.md](PHASE-5-technical-audit.md)
- Faits structurels : memory `project_myselfmonart_facts.md`
