# Run-log — Collections « Entrée & Couloir » (toile + poster)

Demande Walid 2026-07-07 : créer les collections entrée/couloir (toile + poster), classifier intelligemment toutes les toiles, taguer produits + jumeaux posters, images héros via playbook, copy/SEO Hayate, publication tous canaux, puis brancher la carte « Entrée & couloir » de la home.

## Collections créées (2026-07-07)

| Type | Handle | gid | Règle smart (AND) | H1 |
|---|---|---|---|---|
| toile | `tableau-entree-couloir` | 675652632923 | TAG = `entrée couloir` · TYPE ≠ `poster` | Tableau Entrée et Couloir |
| poster | `posters-affiches-entree-couloir` | ~~675652731227~~ → **675666887003** (recréée 2026-07-07 pour repasser la règle en « Type de produit » après édition admin ; contenu identique) | TAG = `entrée couloir` · TYPE = `poster` | Poster & Affiche Entrée et Couloir |

- Éditorial metafield-first (`custom.{intro,guide,faq,editorial_h1}` + `cocon_links` côté poster), rendu par `snippets/collection-editorial-auto.liquid` — pas de template dédié.
- `custom.type_of_collection` = painting / poster. Breadcrumb toile → `tous-les-tableaux` (607051088219).
- SEO title/desc posés à la création (mots-clés : tableau entrée, tableau couloir / poster entrée, affiche couloir — terrain GSC quasi vierge, « tableau entrée maison » pos ~76 servi par tableau-salon faute de page dédiée).

## Classification des toiles (816 publiées)

- Workflow 58 agents : triage textuel (816) → jugement VISUEL sur l'œuvre (617 candidates, score 1-5) → revue + repêchage. Un lot de 15 mort en route, rejugé à la main.
- **Retenues : 449** (312 score 4, 127+10 score 5). Exclusions dures : cuisine/nourriture, toilettes/salle de bain, nursery, nu/boudoir, anxiogène, lit/sommeil.
- Artefact : [`selection-toiles.json`](./selection-toiles.json) (id, handle, score, motif).

## Tag & peuplement

- Tag décidé : **`entrée couloir`** (convention multi-mots avec espaces/accents du store, cf. « noir et blanc », « poster et affiche »).
- 449/449 toiles taguées (workflow 18 lots, 0 erreur). Sémantique updateProduct = remplacement → tags fusionnés avant écriture.
- Jumeaux posters découverts en scrapant le lien `data-twin-url` des PDP toiles (le metafield `link.poster` n'est pas lisible en masse à coût raisonnable) : **362 jumeaux** sur 449 ([`jumeaux-posters.csv`](./jumeaux-posters.csv)).
- 362 posters tagués via workflow 15 lots (même tag ; la collection poster filtre TYPE = poster).

## Images héros (playbook growth/HERO-IMAGE-PLAYBOOK.md)

- Curation : 7 œuvres score 5 (porte jaune « Paradis », ruelle ocre, dunes, turban, cheval blanc doré, lune/turquoise, bouquet) — palette chaude + 1 accent froid, 0 aimant à doublon, 0 personne réelle/figure religieuse (blocages Gemini).
- Pièce : entrée/couloir réelle (console chêne, banc, tapis jute, lumière du matin) ajoutée à `growth/hero-tools/rollout-config.json` (folder `entree-couloir`).
- 3 variantes toile (gallery-wrap) + 3 poster (passe-partout) via `gemini-3-pro-image-preview`. QC panel 24 juges (4 lentilles × 6) : toile v1/v2/v3 = 4/4 ; poster v2 = 4/4 (v1 et v3 = doublon). **Retenus : toile-v2, poster-v2.**
- Publiés via branche temporaire → CDN Shopify 200 → branche supprimée. Fichiers : `tableau-entree-couloir-deco-murale.jpg`, `poster-affiche-entree-couloir-deco-murale.jpg` (1200×1200) + alt SEO.

## Thème (LOCAL, en attente validation Walid)

- `templates/index.json` : carte `room_entree` branchée sur `collection: tableau-entree-couloir` (lien + libellé « Découvrir la collection », description ajustée) — s'appuie sur la refonte cards-carousel du même jour (image = toujours l'image admin de la collection, ratio carré).

## Caveats / notes

- ⚠️ Gotcha outillage : en tâche de fond (Bash background), `$(curl …)` dans une boucle `while read` renvoie 0 octet → scraping fait en Python (`urllib`). Throttle Cloudflare réel en rafale (429) : espacer les requêtes.
- Le compteur produits de la collection toile peut mettre du temps à converger après un tag de masse (recalcul smart asynchrone).
- 87 toiles retenues sans jumeau poster (fiches poster non créées à ce jour) : elles rejoindront la collection poster automatiquement dès que leur jumeau existera ET portera le tag (penser au tag à la création des futurs jumeaux).
