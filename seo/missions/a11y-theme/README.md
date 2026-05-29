# Mission — Accessibilité thème (transverse) → cible Lighthouse a11y 95+

> Statut : 🔜 À démarrer. Issue de l'audit Lighthouse de la mission Collection Salon (2026-05-29).
> Contexte : la page salon est déjà à **a11y 90** (correctifs faits). Les échecs restants sont des **composants partagés du thème** (footer, grille produits, breadcrumb, header) — donc une mission transverse, pas spécifique au salon.

## Pourquoi
Une meilleure accessibilité = meilleur signal UX/SEO (Google mesure l'engagement) + conformité WCAG AA + lisibilité réelle pour tous. Et ça profite à **toutes les pages** (composants partagés).

## Baseline (Lighthouse mobile, 2026-05-29)
- Page salon : **a11y 90**, SEO 100, CLS 0, Best Practices 73.
- Best Practices 73 = infra Shopify (cookies tiers, web-pixel, iframe sandbox) → **non corrigeable côté thème**, à ignorer.

## Backlog (audits échoués restants → fichiers → approche → risque)

| Audit (poids) | Éléments | Fichier(s) | Approche | Risque |
|---|---|---|---|---|
| **color-contrast** (7) | ×16 (liens footer) | `sections/tw-footer.liquid` | Passer les liens/textes `text-main-80` → `text-main` ou `text-main-90` ; viser ≥ 4,5:1. Vérifier au contrast checker. | Faible (assombrir le texte footer) |
| **listitem** (7) + **list** (7) | ×24 + ×1 (grille produits) | `sections/main-collection-product-grid.liquid` (+ `assets/my-like-button.js`, `assets/my-likes.js`, `assets/collection.js`) | Restructurer `<ul><anime-product-card><li>` → `<ul><li><anime-product-card>` pour que `<li>` soit enfant direct de `<ul>`. **Attention** : `my-like-button.js` (`closest('anime-product-card')`) + la page my-likes + l'animation `anime-product-card` dépendent de la structure → adapter la suppression (`closest('li')`) et tester unlike + my-likes + anim. | **Moyen-élevé** — tester à fond |
| **target-size** (mod.) | ×2 (liens breadcrumb popup) | `sections/breadcrumb.liquid` / `assets/breadcrumb-popup.js` | Cibles tactiles ≥ 24×24 px (padding / min-height). | Faible |
| **svg-img-alt** (1) | ×1 (cœur header) | `snippets/tw-icon-heart-outline.liquid` | `aria-hidden="true"` si décoratif, ou `<title>` si porteur de sens (sinon nom sur le lien parent). | Faible |
| **label-content-name-mismatch** (0) | ×1 (bouton filtre mobile) | `snippets/tw-filter-drawer.liquid` (`#filter-button-mobile`) | Le nom accessible doit contenir le texte visible. | Faible |

> Poids = 0 n'affecte pas le score (label-content-name-mismatch) — bonus only.

## Pour passer de 90 à 95+
Le plus rentable + faible risque : **color-contrast (footer)** + **target-size** + **svg-img-alt**. Le gros morceau (listitem/list, ×25) est le plus impactant mais **le plus risqué** (structure grille partagée + JS like/my-likes) → le traiter en dernier, isolé, avec tests (unlike, page my-likes, animation, rendu grille toutes collections).

## Méthode
1. Brancher le **MCP chrome-devtools** (Lighthouse) et auditer en local (`?view` si besoin) — itérer fichier par fichier, re-auditer à chaque lot.
2. Respecter les conventions (`shopify-section-dev`) : Tailwind only, vars globales, ne pas casser le visuel.
3. Déployer via staging → validation Walid → main (workflow habituel).
4. Re-auditer le live (attendre la purge du cache CDN Shopify, ~30 min, ou PageSpeed Insights).

## Garde-fous
- Composants **partagés** → tester l'impact sur **toutes** les pages (home, produit, autres collections), pas seulement salon.
- Ne pas dégrader le visuel pour gagner un point a11y (cf. règle UX-first).
