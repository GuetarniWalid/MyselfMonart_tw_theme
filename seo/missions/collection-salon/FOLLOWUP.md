# FOLLOWUP — Suivi GSC Collection Salon

> Comparer à la **baseline** (90 j au 2026-05-28) : **383 clics / 29 863 impressions / CTR 1,28 % / position moyenne 10,98**.
> Requête head à surveiller en priorité : **« tableau salon »** (pos 11.56 → objectif top 6) + cluster « cadre ».

| Jalon | Date prévue | Clics | Impr. | Pos moy. | Pos « tableau salon » | FAQPage/Breadcrumb en SERP ? | Notes |
|---|---|---|---|---|---|---|---|
| Baseline | 2026-05-28 | 383 | 29 863 | 10,98 | 11,56 | — | Avant refonte |
| Déploiement | **2026-05-29** | — | — | — | — | — | Fichiers déployés sur thème live (run CI success). ⚠️ Page effective une fois le template assigné en admin + URL soumise à Search Console. |
| J+14 | ~~2026-06-12~~ | | | | | | ⊘ sauté (en plein core update du 21/05-02/06 : lecture faussée) |
| J+30 | ~~2026-06-28~~ | | | | | | ⊘ sauté, remplacé par la lecture J+128 |
| **J+128** | **2026-10-04** | 311 (90 j) | 27 184 | 11,57 | **6,1** (sept.) | — | Voir lecture ci-dessous |

## Lecture J+128 (2026-10-04)

> Fenêtre 90 j = 04/07 → 01/10/2026, FR, web. Contexte : core update du 21/05 au 02/06, aucune core update depuis.

- **Sur 90 jours, la page reste sous la baseline** (311 clics contre 383, −19 %), parce que la fenêtre contient encore le creux de juillet. **Sur 28 jours, elle remonte nettement** : 182 clics avant la core update (20/04-17/05) → 75 au creux (29/06-26/07) → **127** (04/09-01/10). Il y a un an, sur les mêmes 28 jours : 233.
- **Objectif de la requête cible quasi atteint** : « tableau salon » (exacte) passe de la position **11,3 en mai à 6,1 en septembre** (11 clics en juillet, 12 en septembre). Les autres têtes progressent aussi : « tableau salon tendance » 10,4 → 4,4, « tableau salon chic » 3,4 → 2,9 (28 clics, 1ʳᵉ requête de la page).
- **Les variantes qui faisaient le volume en 2025 ont glissé** : « tableau mural salon » 31 clics à la position 4,0 en sept. 2025 → 3 clics à 6,4 ; « tableau deco salon » 28 → 10 clics ; « tableaux modernes pour salon » 12 → 2. → Reprendre ces formulations nommément dans les intertitres et l'intro (leçon de juillet : le levier éditorial marche sur ce qu'on cible nommément).
- **Correctif lié (déployé le 2026-10-04, `e2049eb`)** : l'intro, le guide et la FAQ du salon s'affichaient aussi sur `?page=2, 3…`. Ils ne sont plus rendus que sur la page 1 ; vérifié en ligne sur `tableau-salon?page=2` (il ne reste que « Collection » + le H1). Cf [ROADMAP](../../ROADMAP.md).
- Lighthouse mobile du 04/10 (avant correctif) : SEO 100, accessibilité 90, performance 60, LCP labo 29,8 s à cause des vignettes en pleine résolution. Correctif des images déployé le même jour (`a0dbb5c`) : à remesurer. Données terrain du site (Chrome, 28 j) : LCP 2,0 s, INP 97 ms, CLS 0, validé.

> ⚠️ Le « top du chrono » GSC = moment où le template `tableau-salon` est **assigné** à la collection en admin (la nouvelle page devient effective) + URL soumise à Search Console. Si l'assignation est faite après le 2026-05-29, décaler J+14/J+30 en conséquence.

## Commandes de check (skill gsc-query)

```powershell
# Agrégat page
node "$env:USERPROFILE\.claude\scripts\gsc\gsc.mjs" query --site sc-domain:myselfmonart.com --dimensions page --country fra --page https://www.myselfmonart.com/collections/tableau-salon --page-operator equals --format csv

# Top requêtes de la page
node "$env:USERPROFILE\.claude\scripts\gsc\gsc.mjs" query --site sc-domain:myselfmonart.com --dimensions query --country fra --page https://www.myselfmonart.com/collections/tableau-salon --page-operator equals --row-limit 60 --format csv
```

> ⚠️ Le filtre `--page` doit utiliser le domaine **`www.`** (canonique).
