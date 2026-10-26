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

Demander à Claude « lance le suivi SEO des collections », avec un label (par exemple `J146`). Par défaut, la fenêtre fait 28 jours et s'arrête 3 jours avant aujourd'hui, au dernier jour de données définitives. On peut aussi donner une fenêtre passée à rejouer (`2026-06-07..2026-07-05`).

Claude suit alors ces étapes :

1. Il relève les pages collection avec le connecteur Claude « Search Console », outil `performances` : `dimensions: ["page"]`, `pays: "fra"`, type `web`, la fenêtre en `debut`/`fin`, et un filtre `regex` sur l'URL canonique (piège n° 1 plus bas). Avec `limite: 500`, il continue avec `debut_ligne` s'il reste des lignes.
2. Il relève les sessions GA4 avec l'outil `analytics` du même connecteur, sur la même fenêtre en `debut`/`fin`. Par défaut, l'outil lit la propriété `374096343` et le seul canal « Organic Search » (piège n° 2). Il passe `chemin: "^/collections/[a-z0-9-]+/?$"` et `limite: 500`, puis `debut_ligne` s'il reste des lignes. Il additionne par handle, en minuscules, `/collections/<handle>` et `/collections/<handle>/`. Une collection absente du résultat compte 0 session.
3. Il garde les collections au statut `done` dans `collections-worklist.json`.
4. Il fait un **upsert** par label dans `suivi-collections-tracking.json` : relancer le même label remplace le snapshot au lieu d'en créer un doublon. Les snapshots restent triés par fenêtre.
5. Il régénère `suivi-collections-tracking.md` sur le même modèle. Le total « Sessions Organic » y est la somme des collections, comme dans les snapshots précédents. Il ne reprend pas le « Total » d'`analytics`, qui ne compte qu'une fois une session passée par plusieurs collections.

GA4 se relève comme avec l'ancien script `ga4.mjs`, sans filtre de pays. Son `pagePath` n'a pas de paramètres : les sessions des pages `?page=N` comptent avec leur collection. Contrôle du 2026-10-26 : rejoué sur la fenêtre de J118, `analytics` redonne exactement ses 938 sessions, collection par collection.

Le connecteur garde sa connexion 30 jours. Ensuite, l'outil demande de le reconnecter dans Claude (Paramètres → Connecteurs), avec le compte guetarni.walid@gmail.com. Chez Google, il faut cocher les deux cases, Search Console et Google Analytics.

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

**2. L'ancien `ga4.mjs` plafonnait à 100 lignes par défaut** — le jeu réel dépasse 10 000 lignes (`pagePath` × canal), dominé par Direct et les fiches produit. Sans `--limit`, la quasi-totalité des collections tombait hors du top-100 et remontait à 0 session.
→ Filtrer chez Google, par canal et par chemin, puis lire toutes les lignes : `analytics` en rend 500 au plus par appel et dit combien il en reste. Et filtrer sur `Organic Search` **exact**, le défaut de l'outil : un filtre « contient Organic » embarque aussi Organic Social et Organic Shopping.

**3. La position moyenne est un indicateur piège** — quand une page perd ses impressions de longue traîne (mal classées), sa position moyenne **s'améliore mécaniquement** sans aucun gain réel. Ne jamais la lire seule.

**4. Un snapshot vide ne doit jamais s'écrire** — le premier script écrivait silencieusement des zéros quand l'API échouait, ce qui rendait le bug invisible. Si la Search Console ou GA4 ne rend aucune page collection canonique, ou si un outil répond par une erreur, on n'écrit rien et on cherche pourquoi.

---

## Fichiers

- `suivi-collections-tracking.json` — historique brut des snapshots.
- `suivi-collections-tracking.md` — rapport lisible (régénéré à chaque snapshot).

Le script PowerShell `suivi-collections-snapshot.ps1` a été supprimé le 2026-10-26. Il appelait les scripts `gsc.mjs` et `ga4.mjs`, disparus, et pointait vers l'ancien emplacement du dépôt.
