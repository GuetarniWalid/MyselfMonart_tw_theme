# STRATEGY — Mission Collection Salon (décisions verrouillées)

> Page cible : **`/collections/tableau-salon`** · Mission #2 du programme SEO.
> Lire d'abord [ROADMAP](../../ROADMAP.md) + [METHODOLOGY](../../shared/METHODOLOGY.md).
> Date de travail : 2026-05-28.

## Keyword cible (validé sur data réelle GSC)

- **Primaire** : `tableau salon` (964 impressions / pos 11.56 → page 2, gros potentiel).
- **Secondaires (même page, intention transactionnelle)** : tableau salon chic, tableau déco salon, tableau décoration salon, tableau mural salon, tableau pour salon, tableau moderne salon, tableau salon tendance, tableau contemporain salon, tableau design salon.
- **Cluster « cadre » sous-exploité** à récupérer (synonyme FR) : cadre déco salon, cadre salon, cadre pour salon, cadre salon design (pos 10-29 → marge énorme).

## Différenciation sémantique (anti-cannibalisation) — VÉRIFIÉE

- **Home** = générique « tableau décoration murale » (Mission 1).
- **Cette page (collection salon)** = **pièce + style** : « tableau salon » + chic / moderne / déco / contemporain.
- **Blog `/blogs/tableau-salon/…`** = **informationnel** (cocon) : styles, cocooning, petit/grand salon, salon beige, marocain/berbère… → **complémentaire, pas concurrent**. Diagnostic GSC : aucune cannibalisation nuisible entre la collection et les autres collections. Le blog nourrit la collection (maillage à exploiter).

## Angles différenciants retenus (vides concurrentiels)

1. **FAQ avec schema FAQPage** — aucun des 3 concurrents directs ne l'a → featured snippets + AI Overview + GEO.
2. **Vocabulaire « cadre »** intégré naturellement dans la copy (capter le cluster sous-exploité + USP réel « cadre bois massif »).
3. **Curation + DA identifiée (Hayate) + matières factuelles** vs « fabrication française + volume d'avis » des concurrents. On ne joue PAS sur le terrain « Made in France » (cf garde-fous).
4. **Maillage collection ↔ cocon blog salon** (asset unique MyselfMonArt que les concurrents n'ont pas).

## Parti pris UX (cf METHODOLOGY §5bis) — VERROUILLÉ

- **Above the fold = les tableaux**. Les **produits passent en premier** (avant même le H1) ; le fil d'ariane situe déjà la page « tableau salon ».
- **H1 + intro + tout le texte éditorial SEO + FAQ = SOUS la grille.** Choix validé par Walid (2026-05-28). Position du H1 **SEO-neutre** (Google lit tout le DOM) ; DOM = visuel, aucun trick CSS `order` (légitime mais inutile en SEO et coûteux en accessibilité).

## Parti pris technique — REUSE FIRST (cf METHODOLOGY §5)

- **Aucune section réécrite.** La page est une **composition de sections existantes** configurées dans un template dédié.
- **1 seul fichier neuf** justifié : `snippets/json-ld-collection.liquid` (schema CollectionPage — n'existait pas).
- Template scopé à la seule collection salon (`templates/collection.tableau-salon.json`) → **zéro risque** sur les 700 produits / 50 collections.

## Garde-fous respectés

- ❌ Pas de « Made in France » → « conçus en France », « imprimés en Europe », « studio à Toulouse ».
- ❌ Pas de chiffres gonflés → « plus de 1 000 tableaux » (factuel), pas de note Trustpilot affichée en gros.
- ❌ Pas de délai de livraison inventé → renvoi à la fiche produit + SAV.
