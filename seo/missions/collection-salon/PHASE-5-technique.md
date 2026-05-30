# PHASE 5 — Technique : implémentation, audit statique, déploiement

## Fichiers créés / modifiés (local)

| Fichier | Nature | Détail |
|---|---|---|
| `templates/collection.tableau-salon.json` | **NOUVEAU** | Template dédié salon : composition de sections existantes (REUSE FIRST) + copy + maillage + FAQ + schema. Scopé à la seule collection salon. |
| `snippets/json-ld-collection.liquid` | **NOUVEAU** | Schema **CollectionPage** générique (réutilisable sur toute collection). Seul fichier de code neuf, justifié. |
| `assets/output.css` | rebuild | `npx tailwindcss` re-compilé (aucune classe nouvelle — sections réutilisées). |

**Aucune section existante réécrite.** Aucun impact sur les autres collections.

## Architecture de la page (ordre vertical, UX-first)

```
1. breadcrumb                    → BreadcrumbList (existant) — situe la page
2. main-collection-product-grid  → grille produits + ItemList (existant)  ← above the fold (produits d'abord)
3. main-collection-banner        → H1 (collection.title) + intro courte   [ACTIVÉ, APRÈS la grille]
4. badges                        → réassurance Choisissez/Personnalisez/Commandez/Admirez
5. rich-text (styles)            → H2 + paragraphes + liens styles/blog
6. rich-text (conseils+matières) → H2 + H3 taille + H3 matières + liens blog
7. collection-list               → H2 maillage + carrousel 7 collections
8. collapsible-content (FAQ)     → H2 + 6 Q/R + FAQPage schema            [emit_faq_jsonld]
9. custom-liquid                 → CollectionPage schema (render snippet)
10. signature                    → clôture Hayate
```

> **Décision UX (Walid, 2026-05-28)** : les **produits passent AVANT le H1** dans le DOM (et donc visuellement — DOM = visuel, aucun trick CSS `order`). Le fil d'ariane situe déjà la page « tableau salon ». La position du H1 est **SEO-neutre** (Google lit tout le DOM). Seul effet secondaire mineur : les titres de cartes produits (`<h3>`) précèdent le H1 → léger défaut de séquence pour lecteurs d'écran (assumé, non bloquant, sans impact SEO).

## Audit statique (Phase 5A) — fait en local

- [x] **1 seul H1** (bannière = `collection.title`, placé après la grille). Grille = pas de H1, breadcrumb = `<span>`.
- [x] **Hiérarchie Hn** : cartes produits (H3) → **H1** → H2 (styles) → H2 (conseils) → H3 taille → H3 matières → H2 (maillage) → H3 cartes collections → H2 (FAQ) → H3 questions. Pas de saut de niveau descendant ; seul le H1 arrive après les H3 produits (choix UX assumé, cf. note ci-dessous).
- [x] **Schemas** : Breadcrumb + ItemList + CollectionPage + FAQPage — **4 schemas**, syntaxe JSON-LD validée (parse node OK).
- [x] **FAQ** : 6 réponses 42-59 mots (citation-worthy), questions = vraies requêtes GSC/PAA.
- [x] **Maillage interne** : ~13 liens éditoriaux/maillage (4 styles + 4 blog + 7 collections) + breadcrumb + 24 produits.
- [x] **richtext** : uniquement balises whitelistées (`<p>`, `<strong>`, `<a>`).
- [x] **Tailwind only** : aucune classe custom, CSS rebuild OK.
- [x] **Template JSON** : parse valide, encodage UTF-8 (accents/œ/² corrects).
- [x] **Garde-fous** : pas de « Made in France », pas de chiffre gonflé, pas de délai inventé.

## Audit dynamique (Phase 5B) — RÉALISÉ le 2026-05-29 (Lighthouse mobile via MCP chrome-devtools)

> Mesuré sur le rendu réel du code déployé (audit local clean = représentatif ; le live converge après purge du cache CDN Shopify).

| Métrique | Résultat | Cible | Statut |
|---|---|---:|---|
| SEO | **100** | 100 | ✅ |
| Accessibilité | **90** (était 75) | ≥ 90 | ✅ |
| CLS | **0.00** | < 0,1 | ✅ |
| LCP | **2,4 s** (lab, image LCP désormais eager + fetchpriority) | < 2,5 s | ✅ |
| Best Practices | **73** | ≥ 90 | ⚠️ plafonné par l'infra Shopify (cookies tiers, web-pixel, iframe sandbox) — hors code thème |

**Correctifs a11y appliqués (75 → 90)** : `aria-label` bouton favori (`my-like-button`, ×24) · retrait `role="checkbox"` redondant (`custom-checkbox`, ×16) · `aria-label` liens sociaux (`tw-social-link-start`/`tw-list-social`) + lien Accueil breadcrumb.
**Schema** : bug des URLs `ItemList` (espace `shop.url␣collection.url`) corrigé dans `main-collection-product-grid`. 4 schemas valides (Breadcrumb, ItemList, CollectionPage, FAQPage).
**LCP** : 1ʳᵉ image de la grille rendue `eager` + `srcset` réel + `fetchpriority="high"` (`card-product`) → supprime ~1,8 s de « load delay ».

**Dette a11y restante (→ mission dédiée, cible 95+)** : voir [missions/a11y-theme/README.md](../a11y-theme/README.md)
- color-contrast (×16, liens footer `text-main-80`)
- list + listitem (×25, grille produits : `<anime-product-card>` enveloppe le `<li>` → restructurer)
- target-size (×2, liens breadcrumb popup) · svg-img-alt (×1, cœur header) · label-content-name-mismatch (×1, bouton filtre mobile)

- [x] Liens internes du maillage : handles confirmés rendus sans 404 (carrousel 7 collections OK sur le live).

## Étapes de mise en ligne (workflow Walid — NON exécutées)

1. **Local → preview** : `shopify theme dev` (port 9292) *ou* push `staging` (déploie sur thème staging non public).
2. **Admin** : assigner le template `tableau-salon` à la collection + saisir title/meta/description (cf [PHASE-4](PHASE-4-contenu.md) §C). Sur le store de preview pour valider.
3. **Validation visuelle Walid** sur staging.
4. **GO** → merge `main` = live.
5. **Post-live** : soumettre l'URL à Search Console + créer le suivi.

## Suivi GSC

Après live : check **J+14** et **J+30** vs baseline (383 clics / pos 10,98). Voir [FOLLOWUP.md](FOLLOWUP.md).
