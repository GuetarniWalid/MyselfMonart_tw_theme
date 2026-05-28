# Phase 1 — Validation keyword + diagnostic cannibalisation

> Status : ✅ Validée par Walid (2026-05-23). Recréé le 2026-05-26 (docs perdus par git clean).
> Source : Google Search Console (skill `gsc-query`), 90 jours, country=fra, siteUrl `sc-domain:myselfmonart.com`

---

## 🎯 Objectif

Confirmer "tableau décoration murale" comme cible, ou pivoter, sur data réelle. Diagnostiquer la cannibalisation `/` vs `/pages/tableau-decoration`.

---

## Livrable 1 — Trafic search FR vers la home `/`

| Métrique | Valeur (90j FR) |
|---|---|
| Clicks | **8** (dont 7 sur "myselfmonart" = brand) |
| Impressions | ~410 |
| Position moyenne | **17.36** |
| Requêtes génériques "tableau" | **0** ne ramène la home |

**Note technique** : la home apparaît sous `https://www.myselfmonart.com/` (avec `www`). Les queries sans www renvoient `[]`.

**Verdict** : home invisible dans la SERP commerciale. N'existe que sur le brand.

---

## Livrable 2 — Trafic vers `/pages/tableau-decoration`

0 clic, 0 impression. Pas de template `tableau-decoration.json`. `listPages` Admin : aucun match. **Page supprimée confirmée.** → aucune 301 nécessaire (vérifier désindexation Google en Phase 5).

---

## Livrable 3 — Diagnostic cannibalisation (chiffré)

| Requête (exact) | Page qui sort | Clics | Imp | Pos |
|---|---|---:|---:|---:|
| tableau décoration | /collections/tableau-salon | 0 | 57 | 48.5 |
| tableau décoration murale | **aucune** | 0 | 0 | — |
| tableau deco | /collections/tableau-salon | 0 | 19 | 42 |
| tableau mural | /collections/tableau-salon | 0 | 2 | 68 |

**Verdict** : **PAS de cannibalisation effective** — les deux pages sont absentes de la SERP. Seule `/collections/tableau-salon` ressort (hors top 10). La vraie cannibalisation à anticiper = future home vs `/collections/tableau-salon` → gérée par différenciation sémantique (décision 6 STRATEGY).

---

## Livrable 4 — Volume keywords candidats (exact match, FR 90j)

| Keyword | Imp | Clics | Pos |
|---|---:|---:|---:|
| tableau | 0 | 0 | — |
| tableau décoration | 0 | 0 | — |
| **tableau décoration murale** | **0** | **0** | — |
| tableau deco | 0 | 0 | — |
| tableau mural | 0 | 0 | — |
| tableau décoratif | 0 | 0 | — |
| **tableau moderne** | **303** | **1** | **45.5** |

**Constat** : aucun keyword générique pur n'a d'historique, sauf "tableau moderne" (anecdotique). Google identifie le site uniquement comme spécialiste par sous-catégorie.

---

## Livrable 5 — Top 15 requêtes par impressions (cluster "tableau")

| Imp | Clics | Pos | Requête |
|---:|---:|---:|---|
| 5174 | 33 | 6.9 | tableau frida kahlo |
| 3615 | 18 | 9.3 | tableau japonais |
| 3598 | 12 | 7.7 | tableau coloré |
| 3210 | 46 | 6.3 | tableau africain |
| 2797 | 37 | 7.1 | tableau décoration salon |
| 2140 | 29 | 6.4 | tableau mural salon |
| 1972 | 41 | 4.8 | tableau deco salon |
| 1920 | 56 | 5.2 | tableau salon chic |
| 1825 | 12 | 10.4 | tableau cuisine |
| 1718 | 21 | 9.4 | tableau moderne salon |

**Cluster total** : 500 requêtes "tableau" → 90 849 impressions / 974 clics / CTR 1.07 % sur 90j. Pattern : 100% du trafic est sur "tableau + sous-catégorie".

---

## Livrable 6 — Top landing pages FR (contexte)

| Rang | URL | Clics | Pos |
|---:|---|---:|---:|
| 1 | /collections/tableau-salon | **407** | 11.9 |
| 2 | /blogs/.../couleur-moins-salissante-cuisine | 271 | 5.8 |
| 3 | /collections/tableau-africain | 213 | 6.7 |
| 4 | /collections/tableaux-frida-kahlo | 112 | 8.7 |
| 27 | **`https://www.myselfmonart.com/`** | **8** | **17.4** |

100% du trafic commercial passe par les collections.

---

## 🎯 Recommandation validée

✅ Conserver "tableau décoration murale" en **stratégie multi-keyword hiérarchisée** (décision 4 STRATEGY). ✅ Aucune 301 (page supprimée). ✅ Différenciation sémantique home vs /collections/tableau-salon (décision 6).

**Baseline pour suivi J+30** : home FR = 8 clics / ~410 imp / pos 17.36 sur 90j, presque tout brand.
