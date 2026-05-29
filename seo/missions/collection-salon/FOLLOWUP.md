# FOLLOWUP — Suivi GSC Collection Salon

> Comparer à la **baseline** (90 j au 2026-05-28) : **383 clics / 29 863 impressions / CTR 1,28 % / position moyenne 10,98**.
> Requête head à surveiller en priorité : **« tableau salon »** (pos 11.56 → objectif top 6) + cluster « cadre ».

| Jalon | Date prévue | Clics | Impr. | Pos moy. | Pos « tableau salon » | FAQPage/Breadcrumb en SERP ? | Notes |
|---|---|---|---|---|---|---|---|
| Baseline | 2026-05-28 | 383 | 29 863 | 10,98 | 11,56 | — | Avant refonte |
| Déploiement | **2026-05-29** | — | — | — | — | — | Fichiers déployés sur thème live (run CI success). ⚠️ Page effective une fois le template assigné en admin + URL soumise à Search Console. |
| J+14 | **2026-06-12** | | | | | | ☐ à faire |
| J+30 | **2026-06-28** | | | | | | ☐ à faire |

> ⚠️ Le « top du chrono » GSC = moment où le template `tableau-salon` est **assigné** à la collection en admin (la nouvelle page devient effective) + URL soumise à Search Console. Si l'assignation est faite après le 2026-05-29, décaler J+14/J+30 en conséquence.

## Commandes de check (skill gsc-query)

```powershell
# Agrégat page
node "$env:USERPROFILE\.claude\scripts\gsc\gsc.mjs" query --site sc-domain:myselfmonart.com --dimensions page --country fra --page https://www.myselfmonart.com/collections/tableau-salon --page-operator equals --format csv

# Top requêtes de la page
node "$env:USERPROFILE\.claude\scripts\gsc\gsc.mjs" query --site sc-domain:myselfmonart.com --dimensions query --country fra --page https://www.myselfmonart.com/collections/tableau-salon --page-operator equals --row-limit 60 --format csv
```

> ⚠️ Le filtre `--page` doit utiliser le domaine **`www.`** (canonique).
