# FOLLOWUP — Mission Refonte fiche produit `painting`

> Journal de suivi GSC du template painting. Mis à jour à chaque check.
> Voir [ROADMAP](../../ROADMAP.md) pour le pilotage global, [README](README.md) pour le contexte.

## Repères

- **Déployée en live** : 2026-05-31
- **Périmètre** : tout le catalogue tableaux (template `product.painting`).
- **Pas de keyword unique** — on suit les **agrégats** sur l'ensemble des fiches produit.

## Baseline (avant refonte — 90 j FR)

| Métrique | Valeur de départ |
|---|---|
| `/products/*` — clics totaux | _à mesurer J0 si besoin (post-déploiement)_ |
| `/products/*` — impressions totales | _à mesurer_ |
| `/products/*` — position moyenne | _à mesurer_ |
| Erreurs Product/Offer dans GSC (Améliorations) | 0 attendu (validation Rich Results) |

> ⚠️ La baseline reste partiellement réelle : le déploiement étant déjà fait, on n'a pas
> pré-mesuré formellement le J0 isolé. Première mesure GSC J+14 servira de référence
> pour comparer J+30, et on regardera les 30 j AVANT le déploiement comme baseline implicite.

## Journal des checks

| Date | Jalon | /products/* clics / imp / pos | Erreurs Product GSC | Rich results marchand | Notes |
|---|---|---|---|---|---|
| ~~2026-06-14~~ | J+14 | ⊘ sauté | — | — | En plein core update du 21/05-02/06 : lecture faussée |
| ~~2026-06-30~~ | J+30 | ⊘ sauté | — | — | Remplacé par la lecture J+126 |
| **2026-10-04** | **J+126** | FR, 28 j : **22 / 2 164 / 13,7** (304 fiches avec impressions) | Non vérifiable par l'API (rapport « Améliorations » GSC à ouvrir à la main) | Extraits produit (tous pays, 28 j) : **928 clics** contre 448 en juin ; fiches marchands dans la recherche : 76 contre 25 | Voir lecture ci-dessous |

## Lecture J+126 (2026-10-04)

> Fenêtres de 28 jours, FR, web : avant la core update (20/04-17/05), creux (29/06-26/07), maintenant (04/09-01/10), il y a un an (05/09-02/10/2025).

- **Clics des fiches produit FR : 12 → 11 → 22**, avec 304 fiches qui reçoivent des impressions (contre 75 avant mai). Il y a un an : 43 clics. Les fiches profitent de la reprise générale, sans gain propre mesurable au template.
- **Le balisage Product fonctionne** : les extraits produit (prix, avis dans les résultats) rapportent 928 clics sur 28 jours tous pays confondus, contre 448 en juin. C'est aussi ce balisage JSON-LD que lit l'autofeed de Merchant Center depuis le 5 août (11 484 produits approuvés en fiches gratuites, 462 clics en septembre).
- Lighthouse mobile du 04/10 sur la fiche « Le Petit Prince » : SEO 100, accessibilité 97, performance 60 (LCP labo 11,7 s en 4G lente). Données terrain du site (Chrome, 28 j) : LCP 2,0 s, INP 97 ms, CLS 0, validé.

## Comment lancer le check (procédure)

Via le skill **`gsc-query`** (local). Requêtes utiles :

1. **Trafic agrégé fiches produit** (90 j ou période adaptée) :
   ```
   query --dimensions page --page /products/ --page-operator contains --country fra
   ```
   Comparer J+14 vs 30 j précédant le déploiement (= baseline implicite).

2. **Top requêtes longue traîne sur les paintings** :
   ```
   query --dimensions query,page --page /products/ --page-operator contains --country fra --limit 50
   ```
   Repérer les nouvelles requêtes qui apparaissent, les gains de position.

3. **Validation schema Product** : GSC > Améliorations > Produit
   (ou Rich Results Test sur 2-3 URLs tableaux pour confirmer 0 erreur).

4. **Eligibilité rich results marchand** : GSC > Améliorations > Pages avec annotations
   marchand (livraison/retour) — devraient apparaître progressivement.

Après chaque check : remplir la ligne du journal + mettre à jour
[ROADMAP](../../ROADMAP.md) (cocher l'échéance + tableau de bord).

## Indicateurs à surveiller

- 📈 **Augmentation impressions/clics** sur `/products/*` (objectif : +10 % à J+30).
- 📈 **Position moyenne s'améliore** sur les requêtes longue traîne tableaux.
- ✅ **0 erreur Product** dans GSC > Améliorations.
- ✅ **Apparition rich results** marchand (livraison gratuite, retour 14 j) — variable selon Google.

## Si sous-performance à J+30

Pistes de diagnostic :
- Le `priceValidUntil` est-il toujours dans le futur ? (validité 1 an glissante depuis le déploiement)
- Les `shippingDetails` / `hasMerchantReturnPolicy` sont-ils bien parsés par Google ?
- Les `<title>` et meta description des fiches produit sont-ils riches (admin Shopify) ?
- Le poids des pages produit s'est-il dégradé (regression LCP) ?

## Dette traitée par d'autres missions

- Contraste footer → Mission 3 [a11y-theme](../a11y-theme/) (transverse).
- H1/H2 dans descriptions admin → mission séparée si besoin (bulk audit via Shopify MCP).
