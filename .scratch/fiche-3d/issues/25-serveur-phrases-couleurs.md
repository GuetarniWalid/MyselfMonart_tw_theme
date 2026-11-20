# 25 : Serveur — les couleurs montrées sur la fiche et leurs phrases

**Dépôt :** `MyselfMonArt_Backend` (pas le thème).

**What to build:** pour chaque nouveau produit (modèle `oeuvre-3d`, toile ou poster), juste après que le serveur a déclaré ses couleurs principales et ses thèmes, il arrête les couleurs que la fiche montrera (trois si possible) et fait écrire par l'IA une phrase unique par couleur. Aucun clic de plus pour Walid.

Contexte et décisions de Walid (20/11/2026) : `.scratch/fiche-3d/galerie/README.md` du dépôt du thème, section « Les couleurs du temps 2 ». Exemples de phrases validés sur 25 tableaux : `.scratch/fiche-3d/galerie/couleurs/phrases-oeuvres.json`.

## Ce que le serveur écrit (le contrat avec le thème)

Métachamps du produit, espace `artwork` :

| Clé | Type | Contenu |
|---|---|---|
| `artwork.colors` | `list.metaobject_reference` (métaobjets `shopify--color-pattern`) | Les couleurs montrées, dans l'ordre d'affichage. |
| `artwork.color_text_1`, `artwork.color_text_2`, `artwork.color_text_3` | `multi_line_text_field` | Le texte de chaque couleur, dans le même ordre. Autant de textes que de couleurs. |

Les couleurs montrées :
1. D'abord les couleurs déclarées du produit (`shopify.color-pattern`), dans leur ordre. « Multicolore » (`multicolore`) n'est pas une couleur à montrer : on l'enlève. « Noir & Blanc » (`blanc-noir`) est remplacé par « Noir » puis « Blanc ».
2. S'il y en a moins de trois, le moteur complète avec d'autres couleurs de la même liste, lues dans l'image, si elles y sont en quantité suffisante. La liste des couleurs de la boutique ne change jamais, et les couleurs déclarées du produit non plus.
3. Une, deux ou trois couleurs au final. Zéro : on n'écrit rien.

Le moteur est celui de la page : `.scratch/fiche-3d/galerie/couleurs/couleurs.js` (dépôt du thème), fonction `lire(pixels RGBA, largeur, hauteur, identifiants déclarés)` → `choisis[].cle`. Il est à recopier tel quel dans le serveur (même calcul des deux côtés), sur une copie de l'image de 320 px de large (l'adresse de l'image du produit avec `&width=320`, décodée en pixels bruts). Les clés du moteur sont celles de la boutique, sauf `dore` pour l'identifiant `or`.

Le texte d'une couleur, en français :
- Une première phrase : le nom de la couleur avec son article, deux-points, ce qu'elle apporte en un à quatre mots, point. « Le bleu : l'aplomb. »
- Puis une ou deux phrases courtes : où est cette couleur dans ce tableau, et ce qu'elle apporte à la pièce et à la personne. « Il sculpte le visage du héros. Chez vous, il pose la pièce et donne de l'assurance. »
- 220 caractères au plus. Vouvoiement. Des mots simples, pas de vocabulaire de galerie d'art, aucun nom d'artiste ni d'œuvre.
- Chaque phrase dépend de la couleur et du thème du tableau : elle doit être unique, jamais une phrase qui irait à n'importe quel tableau.
- Le nom de la couleur est un nom simple (« le bleu », « le beige », « le doré »), sans nuance (« bleu nuit » : non).
- « tableau » pour une toile, « poster » pour un poster, si le mot vient.

L'IA voit l'image et reçoit : les couleurs à traiter (leurs libellés), les thèmes déclarés du produit (`shopify.theme`), son titre, et s'il s'agit d'une toile ou d'un poster.

## Quand

- Dans la suite du webhook `products/create`, après la déclaration des couleurs puis des thèmes.
- Dans le rattrapage de chaque heure (`RepairIncompleteArtworks`), si `artwork.colors` manque.
- Une commande pour les produits déjà en ligne (aujourd'hui : la toile et le poster Superman), avec une option pour refaire.

Une erreur ici ne bloque jamais la mise en ligne : elle est notée, et le rattrapage réessaie.

**Blocked by:** rien

**Status:** done, en service le 20/11/2026.

**Fait (dépôt du backend, sur `main`) :** `ae68441` l'étape (`App/Services/ArtworkColors`), `46248fa` la commande `artwork:colors` et `phrases-couleurs` dans « Commande sur le serveur », `363f52e` les branchements (webhook `products/create`, filet des variantes d'un brouillon, rattrapage de chaque heure). Mis en ligne en deux fois : l'étape et sa commande à 15 h 21, essayées à la main, puis l'automatique à 15 h 31.

**Essai réel sur les deux Superman, le 20/11 :**
- essai sans écriture : toile « Bleu, Rose, Jaune (ajoutée) », poster « Rose, Bleu, Jaune (ajoutée) » ;
- écriture : `artwork.colors` et les trois textes sur chaque produit, du premier coup, sans texte refusé.
  - Toile : « Le bleu : la force. Il dessine les muscles et l'emblème du super-héros. Dans votre pièce, il donne du caractère et de l'énergie. » ; « Le rose : l'explosion. Il éclabousse le portrait comme un graffiti sauvage. Chez vous, il met de la vie et fait vibrer le mur. » ; « Le jaune : l'éclair. Il traverse le tableau en coups de pinceau rapides. Un coup de peps qui réveille la pièce. »
  - Poster : « Le rose : l'énergie de la rue. Il éclabousse le torse et les épaules du super-héros comme un graffiti géant. Sur votre mur, il met l'ambiance et réveille la pièce. » ; « Le bleu : la force. Il dessine les bras et traverse le poster par grandes touches. Il donne du caractère à la déco et de l'assurance à la pièce. » ; « Le jaune : l'emblème. Le S légendaire brille au centre, entouré d'éclats lumineux. Un coup de peps qui attire l'œil et met de la bonne humeur. »
- Pour refaire les textes d'un produit : `phrases-couleurs`, ses identifiants dans « produits », « refaire » dans « passes ».

**Dans Shopify :** quatre définitions de métachamps créées le 20/11 (produit, espace `artwork`, non épinglées) : `colors` (liste de couleurs de la boutique), `color_text_1` à `3`.

**Limites connues, laissées :** un produit sans thèmes déclarés attend (sinon une panne d'OpenAI figerait des phrases sans thème) : après une panne, `couleurs-themes` puis le rattrapage suit seul ; un produit `oeuvre-3d` sans `artwork.type` est noté en échec chaque heure, sans alerte ; « toile d'araignée » sur un poster ferait refuser le texte ; le webhook et le filet des brouillons peuvent écrire deux fois le même produit s'ils se croisent (sans dommage).

- [x] Un nouveau produit `oeuvre-3d` reçoit `artwork.colors` et ses textes, sans action de Walid ; un produit d'un autre modèle n'est pas touché. (testé, et essayé à la main sur les deux Superman ; le premier produit mis en vente depuis le Publisher reste à observer)
- [x] Les couleurs déclarées passent d'abord, dans leur ordre ; « Multicolore » n'est jamais montré ; « Noir & Blanc » donne Noir puis Blanc ; le complément ne dépasse jamais trois couleurs.
- [x] Le moteur du serveur donne les mêmes couleurs que celui de la page sur des images de référence (tests).
- [x] Chaque texte respecte la forme demandée (première phrase « couleur : effet. », longueur), sinon il est redemandé une fois, puis laissé de côté.
- [x] Rien n'est réécrit si `artwork.colors` existe déjà, sauf demande expresse (commande).
- [x] Une panne de l'IA ou de la lecture de l'image ne bloque pas la mise en ligne, et le rattrapage réessaie.
- [x] Les tests n'appellent ni l'IA ni Shopify pour de vrai. Aucun secret en clair.
