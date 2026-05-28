# FOLLOWUP — Mission Homepage

> Journal de suivi GSC de la homepage. Mis à jour à chaque check.
> Voir [ROADMAP](../../ROADMAP.md) pour le pilotage global, [STRATEGY](STRATEGY.md) pour les décisions.

## Repères

- **Déployée en live** : 2026-05-28
- **Keyword cible** : tableau décoration murale (stratégie multi-keyword)
- **Search Console soumise** : 2026-05-28 (URL home demandée en indexation)

## Baseline (Phase 1, avant refonte — 90 j FR)

| Métrique | Valeur de départ |
|---|---|
| Home `/` — clics | 8 (dont 7 brand "myselfmonart") |
| Home `/` — impressions | ~410 |
| Home `/` — position moyenne | 17.36 |
| "tableau décoration murale" (exact) | **0 impression** |
| "tableau décoration" (exact) | 58 imp, 0 clic, pos 48 |

## Journal des checks

| Date | Jalon | Home clics / imp / pos | "tableau décoration murale" imp/pos | Cannibalisation home vs /collections/tableau-salon ? | Rich snippets FAQ ? | Notes |
|---|---|---|---|---|---|---|
| 2026-06-11 | J+14 | _à remplir_ | _à remplir_ | _à vérifier_ | _à vérifier_ | |
| 2026-06-27 | J+30 | _à remplir_ | _à remplir_ | _à vérifier_ | _à vérifier_ | |

## Comment lancer le check (procédure)

Via le skill **`gsc-query`** (local). Requêtes utiles :

1. **Home sur N jours** : `query --dimensions query --page https://www.myselfmonart.com/ --page-operator equals --country fra` (period adaptée)
2. **Keyword cible** : `query --dimensions query,page --query "tableau décoration murale" --query-operator contains --country fra`
3. **Cannibalisation** : `query --dimensions query,page --query "tableau" --query-operator contains --country fra` → vérifier si home ET /collections/tableau-salon sortent sur les mêmes requêtes
4. **Rich snippets FAQ** : non visible dans GSC directement → vérifier via Google Rich Results Test sur l'URL home, ou recherche manuelle des questions FAQ dans la SERP

Après chaque check : remplir la ligne du journal + mettre à jour le tableau de bord et cocher l'échéance dans [ROADMAP](../../ROADMAP.md).

## Améliorations mineures en attente (non bloquantes, cf. PHASE-5)

- A11y : contraste sur 1 élément, liens icônes / SVG drapeaux (sélecteur pays) sans nom accessible
- Fix de fond n8n email-hub : ajouter un node "Respond to Webhook" (erreur "did not return a response")
