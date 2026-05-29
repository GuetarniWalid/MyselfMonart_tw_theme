# FOLLOWUP — Suivi GSC Collection Salon

> Comparer à la **baseline** (90 j au 2026-05-28) : **383 clics / 29 863 impressions / CTR 1,28 % / position moyenne 10,98**.
> Requête head à surveiller en priorité : **« tableau salon »** (pos 11.56 → objectif top 6) + cluster « cadre ».

| Jalon | Date prévue | Clics | Impr. | Pos moy. | Pos « tableau salon » | FAQPage/Breadcrumb en SERP ? | Notes |
|---|---|---|---|---|---|---|---|
| Baseline | 2026-05-28 | 383 | 29 863 | 10,98 | 11,56 | — | Avant refonte |
| Déploiement | _à venir_ | — | — | — | — | — | _date de mise en live_ |
| J+14 | _déploiement + 14 j_ | | | | | | |
| J+30 | _déploiement + 30 j_ | | | | | | |

## Commandes de check (skill gsc-query)

```powershell
# Agrégat page
node "$env:USERPROFILE\.claude\scripts\gsc\gsc.mjs" query --site sc-domain:myselfmonart.com --dimensions page --country fra --page https://www.myselfmonart.com/collections/tableau-salon --page-operator equals --format csv

# Top requêtes de la page
node "$env:USERPROFILE\.claude\scripts\gsc\gsc.mjs" query --site sc-domain:myselfmonart.com --dimensions query --country fra --page https://www.myselfmonart.com/collections/tableau-salon --page-operator equals --row-limit 60 --format csv
```

> ⚠️ Le filtre `--page` doit utiliser le domaine **`www.`** (canonique).
