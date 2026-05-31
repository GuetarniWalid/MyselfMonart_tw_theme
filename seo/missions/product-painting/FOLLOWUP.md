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
| 2026-06-14 | J+14 | _à remplir_ | _à vérifier_ | _à vérifier_ | |
| 2026-06-30 | J+30 | _à remplir_ | _à vérifier_ | _à vérifier_ | |

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
