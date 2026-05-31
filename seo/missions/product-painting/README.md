# Mission — Refonte fiche produit `painting` (template)

> Mission **transverse** : amélioration **structurelle** du template produit `product.painting`
> qui s'applique automatiquement à **tous les tableaux** du catalogue (≈ tout le catalogue MyselfMonArt).
> Pas de keyword unique cible — on optimise le SOCLE de chaque fiche.

## Contexte

Walid avait pris le tableau « Petit Prince » (et autres tableaux abstrait/chaton/etc.)
comme cas d'usage : « ne pas optimiser pour ce mot-clé, mais améliorer le template
pour que TOUS les tableaux qui l'utilisent en bénéficient ».

## Périmètre déployé (2026-05-31)

### Lot A — Schema Product (JSON-LD)
- Fix `availability` (suppression espace bug enum) + `@context` https.
- Ajout `priceValidUntil` rolling 1 an.
- Ajout `shippingDetails` (livraison gratuite FR) et `hasMerchantReturnPolicy` (14 j FR) — admin-configurable.
- Optimisation poids : `shippingDetails` une seule fois (1ʳᵉ offre), `hasMerchantReturnPolicy` au niveau Product
  → **JSON-LD passé de 104 Ko à 56 Ko** (-46 %) sur les produits à nombreuses variantes.

### Lot B — Hiérarchie Hn + design H1
- Setting `tone` (headline | subtitle) sur le bloc title de `main-product`.
- Painting template : H1 (`product.title`) en sous-titre discret sous les accordéons,
  classes `text-xs font-normal text-brand-700 leading-relaxed tracking-wide`.
- Accordéons summary `<h4>` → `<h2>` (suppression saut H1→H4).
- Popups guides variant picker `<h4>` → `<h3>`.
- Richtext admin des accordéons : `<h5>` → `<h3>` (Qualité artisanale, Montage, etc.).

### Lot C — Note Trustpilot honnête + global
- Vraie note **4.1 / 80** (au lieu de 4.5 / 30 inventé).
- `trustpilot_score` + `review_count` promus en **settings globaux du thème**
  (`config/settings_schema.json` → Trustpilot) — 1 source de vérité pour tous les templates produit.

### Bonus a11y
- `aria-label` sur scroll-arrow variant picker + 3 boutons close popups (Size/Border/Frame).
- `<title>` rempli sur SVG cœur favoris (full + outline).
- `text-secondary-50` → `text-secondary` dans testimonials + cartes (contraste WCAG OK).

### Image LCP/CLS
- 1ʳᵉ image produit : `srcset` réel + `fetchpriority="high"` + `loading="eager"`.
- Dimensions intrinsèques au lieu de `height="auto"` (CLS réservé).

## Scores Lighthouse mobile (page tableau, post-déploiement)

| Catégorie | Avant | Après |
|---|---|---|
| SEO | 100 | **100** ✓ |
| Accessibilité | 92 | **97** ✓ |
| LCP | — | **990 ms** ✓ |
| CLS | — | **0.00** ✓ |

## Stratégie de suivi GSC

Pas de keyword unique → on suit l'**agrégat des fiches produit painting** :

1. **Trafic global produits** : clics/impressions/CTR sur `/products/*` (90 j vs J+14 / J+30).
2. **Position moyenne** sur les requêtes longue traîne (nom de tableau, style, support).
3. **Apparition rich results marchand** : éligibilité aux annotations "livraison gratuite" /
   "retour 14 j" / "prix" dans les SERP (visible via Rich Results Test + GSC > Améliorations).
4. **Validation schema** : 0 erreur Product/Offer dans GSC > Produits.

Voir [FOLLOWUP.md](FOLLOWUP.md) pour le journal de suivi.

## Limites connues / dette restante

- **Footer** : `color-contrast` Lighthouse fail (liens blancs sur fond peach `#d79b86`).
  Sujet design global, traité dans Mission 3 a11y-theme (transverse).
- **Description admin** : certains tableaux ont des `<h1>`/`<h2>` dans la description Shopify
  (richtext admin). Hierarchy non parfaite sur ces produits.
  → bulk audit possible via Shopify MCP en mission séparée.
