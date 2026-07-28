# Suivi récupération SEO collections — Runbook

**Contexte.** Le 2026-06-05, 46 collections ont reçu un éditorial E-E-A-T (intro + guide + FAQ) via metafields, pour récupérer le trafic perdu au Google Core Update de déc. 2025 (voir `collections-applied-log.md` et `PLAN-recuperation-collections-post-core-update.md`).

---

## ⚠️ Les snapshots ont été reconstruits le 2026-07-28

Les snapshots J0/J14/J30 d'origine étaient **faux** (deux bugs de mesure, corrigés depuis — cf. « Pièges » plus bas). Ils ont été **rejoués depuis les données brutes GSC/GA4** sur les mêmes fenêtres. Les chiffres publiés avant cette date (baseline « 51 clics / 13 259 impressions ») sont à ignorer.

Baseline réelle après reconstruction (46 collections, pages canoniques FR, 28 j) :

| Snapshot | Fenêtre | Clics | Impressions | Sessions Organic |
|---|---|---|---|---|
| REF-avant-CU | 2026-04-20..2026-05-17 | 409 | 59 852 | 1 102 |
| J0 | 2026-05-08..2026-06-05 | 347 | 52 024 | 885 |
| J14 | 2026-05-22..2026-06-19 | 260 | 42 593 | 716 |
| J30 | 2026-06-07..2026-07-05 | 239 | 36 188 | 665 |
| J53 | 2026-06-29..2026-07-26 | 239 | 34 749 | 575 |

---

## ⚠️ Le core update du 21/05 fausse la lecture J0→J30

Google a déployé un **core update du 21/05 au 02/06/2026**. Les livraisons SEO (salon 29/05, 46 collections 05/06) tombent **en plein rollout**.

Conséquence : J0, J14 et J30 mesurent la descente algorithmique, **pas** l'effet de l'éditorial. C'est pour ça que le snapshot `REF-avant-CU` (fenêtre antérieure au rollout) a été ajouté comme vraie référence.

La reprise est visible **à partir de la mi-juillet**, et surtout sur des fenêtres de 14 jours — la fenêtre 28 j de J53 englobe encore le creux.

---

## Lancer un snapshot

Fenêtre glissante de 28 jours (usage courant) :

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "seo\suivi-collections-snapshot.ps1" -Label "J60"
```

Rejouer une fenêtre passée (reconstruction / comparaison) :

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "seo\suivi-collections-snapshot.ps1" -Label "J30" -Start 2026-06-07 -End 2026-07-05
```

Le script **upsert** par label : relancer le même label remplace le snapshot au lieu d'en créer un doublon. Les snapshots sont triés chronologiquement par fenêtre, et `suivi-collections-tracking.md` est régénéré à chaque run.

⚠️ **Token GSC expire ~7 j.** En cas d'erreur d'auth :

```bash
node C:\Users\gueta\.claude\scripts\gsc\gsc.mjs auth
```

(choisir le compte **guetarni.walid@gmail.com**). GA4 = compte team@kindopia.com, token séparé géré par `ga4.mjs`.

---

## Ce qu'on surveille

- **Impressions GSC** — l'indicateur le plus précoce. Elles remontent avant les clics.
- **Clics GSC** — la métrique qui compte. C'est elle qui doit valider le levier éditorial.
- **Position GSC** — utile **seulement lue avec les impressions** (voir piège n°3).
- **Sessions Organic GA4** — métrique de volume (le CA GA4 n'est pas fiable → croiser avec Shopify).

---

## Pièges (à ne jamais réintroduire)

**1. Regex d'URL non ancrée** — la cause du faux tableau de bord d'origine.
`'/collections/([a-z0-9\-]+)'` matche aussi `?page=4` et `/de-ch/collections/…`. Comme la boucle écrasait à chaque match et que le CSV est trié par clics décroissants, c'est la **dernière variante (une page de pagination à 0 clic)** qui gagnait. `tableau-salon` remontait ainsi « 0 clic, position 1,4 » alors que la vraie page faisait **75 clics**.
→ Toujours ancrer l'URL entière : `^https?://(?:www\.)?myselfmonart\.com/collections/([a-z0-9\-]+)/?$`.

**2. `ga4.mjs` plafonne à 100 lignes par défaut** — le jeu réel dépasse 10 000 lignes (`pagePath` × canal), dominé par Direct et les fiches produit. Sans `--limit`, la quasi-totalité des collections tombait hors du top-100 et remontait à 0 session.
→ Toujours passer `--limit 20000`. Et filtrer sur `Organic Search` **exact** : `-match 'Organic'` embarque aussi Organic Social et Organic Shopping.

**3. La position moyenne est un indicateur piège** — quand une page perd ses impressions de longue traîne (mal classées), sa position moyenne **s'améliore mécaniquement** sans aucun gain réel. Ne jamais la lire seule.

**4. Un snapshot vide ne doit jamais s'écrire** — l'ancien script écrivait silencieusement des zéros quand l'API échouait, ce qui rendait le bug invisible. Le script abandonne désormais avec un code d'erreur si GSC ou GA4 ne rend aucune page canonique.

---

## Fichiers

- `suivi-collections-snapshot.ps1` — script de snapshot (GSC `type=web` + GA4 `Organic Search`, 28 j).
- `suivi-collections-tracking.json` — historique brut des snapshots.
- `suivi-collections-tracking.md` — rapport lisible (régénéré à chaque run).
