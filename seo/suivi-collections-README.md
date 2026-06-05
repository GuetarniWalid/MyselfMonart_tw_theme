# Suivi récupération SEO collections — Runbook J+14 / J+30

**Contexte.** Le 2026-06-05, 46 collections ont reçu un éditorial E-E-A-T (intro + guide + FAQ) via metafields, pour récupérer le trafic perdu au Google Core Update déc. 2025 (voir `collections-applied-log.md` et `PLAN-recuperation-collections-post-core-update.md`).

## Échéances
- **Baseline J0** = **2026-06-05** (capturée) → 51 clics / 13 259 impressions GSC (28 j, FR) · 818 sessions Organic GA4.
- **J+14** = **2026-06-19**
- **J+30** = **2026-07-05**

→ Deux tâches planifiées (`suivi-seo-collections-j14`, `suivi-seo-collections-j30`) lancent automatiquement le snapshot à ces dates **si Claude Code est ouvert** (sinon au prochain lancement). Gérables via `/schedule` ou le panneau des tâches planifiées.

## Comment relancer un snapshot (manuel)
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "seo\suivi-collections-snapshot.ps1" -Label "J14"
```
(puis `-Label "J30"`). Chaque exécution **ajoute** un snapshot daté dans `suivi-collections-tracking.json` et régénère `suivi-collections-tracking.md` (table baseline → dernier + Δ position).

⚠️ **Token GSC expire ~7 j.** Si erreur d'auth, lancer d'abord :
```
node C:\Users\gueta\.claude\scripts\gsc\gsc.mjs auth
```
(choisir le compte **guetarni.walid@gmail.com**). GA4 = compte team@kindopia.com (token séparé, géré par `ga4.mjs`).

## Ce qu'on surveille (signal de récupération)
- **Position GSC** par collection : doit **baisser** (page 2 → page 1). C'est le signal le plus précoce. Δpos positif (▲) = remontée.
- **Clics GSC** : doivent **monter** à mesure que les positions reviennent en page 1 (le CTR explose entre pos 11 et pos 5).
- **Sessions Organic GA4** : tendance haussière (métrique volume ; CA GA4 non fiable → croiser avec Shopify).
- **Témoins de tête** : `tableau-salon` (refondu 29/05, ~1 semaine d'avance) puis `tableau-africain`. S'ils remontent les premiers, le levier éditorial est validé.

## Fichiers
- `suivi-collections-snapshot.ps1` — script réutilisable (GSC `--dimensions page` + GA4 Organic, fenêtre 28 j).
- `suivi-collections-tracking.json` — historique des snapshots (données brutes).
- `suivi-collections-tracking.md` — rapport lisible (régénéré à chaque run).

## Notes
- Le levier SEO réagit en **2-6 semaines**, et surtout **au prochain Core Update** Google. J+14 peut n'être qu'un frémissement ; J+30 plus net.
- Fenêtre glissante 28 j → à J+30, le « avant » (mai) est encore partiellement dans la fenêtre : comparer surtout **position** (peu sensible à la fenêtre) et la **tendance** des clics.
