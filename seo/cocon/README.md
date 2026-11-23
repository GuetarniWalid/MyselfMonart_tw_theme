# Cocon des collections

Le plan des collections et sous-collections de MyselfMonArt, décidé avec Walid le 22/11/2026. Il sert le SEO (une page par intention de recherche, reliée à sa mère, à ses sœurs et à sa jumelle) et la navigation (fil d'Ariane vers le haut, pastilles vers le bas).

Carte vivante : [Carte des collections](https://claude.ai/artifact/BVe1r3KNmDx6GWB3Y6wbWY), Artifact privé. Elle lit l'état du veilleur en direct.

## Les règles décidées avec Walid

- **Au fil de l'eau.** Une collection ne se crée qu'à **20 tableaux**. Toiles et posters se comptent à part : « Tableau Chat » demande 20 toiles, « Poster & Affiche Chat » 20 posters. Une collection prête est créée, 10 par jour au plus.
- **Anciens tableaux.** Ils reçoivent les tags des nouvelles collections et y entrent. Leur page ne change pas (accord de Walid du 22/11).
- **Deux arbres jumeaux.** Tableaux (toiles) et Posters & Affiches suivent le même découpage. Sur la carte et sur les pages racines, les collections se rangent par rayon : pièces, styles, sujets, couleurs, inspirations, personnalisés.
  - Le best-seller se place en tête de chaque arbre, sans rayon.
  - « Coloré » est le multicolore : une couleur au même niveau que les autres, pas leur mère.
  - Les deux posters personnalisés (Famille, signe astrologique) sont côte à côte.
- **Une page par intention.** Une collection n'est pas créée quand une page existante répond déjà à sa recherche, ou quand la recherche cherche autre chose que ce que la boutique vend. Elle est alors **écartée**, avec sa raison dans le plan :
  - Femme africaine : Tableau Africain est déjà 4e sur Google.
  - Zen nature : déjà couverte par Tableau Zen.
  - Asiatique : déjà couverte par Tableau Japonais.
  - Contemporain : fondu dans Tableau Moderne.
  - Photo : les gens veulent faire imprimer leurs propres photos.
  - Botanique : presque un doublon de Fleurs, faute de vraies planches.
- **Séries d'inspiration** (Keith Haring…).
  - Walid les annonce, et elles entrent au plan avec la décision `idee`.
  - Dans le Publisher, la case Série pose leur tag sur la toile et son poster jumeau.
  - Claude ne propose jamais un tag de série de lui-même.
  - Une série garde sa décision quand sa collection se crée : le statut « en ligne » se calcule à part.
- **Les adresses existantes ne bougent pas.** Seule exception, une fusion décidée avec Walid, faite avec une redirection : « Nos best-sellers » a été fondu dans Tableau best-seller le 22/11, avec la redirection `/collections/best-sellers` → `/collections/bestsellers-1`.
- **Une page ne relie que sa famille** (23/11/2026). Le fil d'Ariane monte vers la mère. Les pastilles du haut descendent vers les filles. Le bas de page mène aux sœurs et à la jumelle ; sous une racine, seulement les sœurs du même rayon (Tableaux Nature → les autres sujets). Retirés le même jour, parce qu'ils menaient partout ou répétaient les mêmes liens :
  - la liste de toutes les collections, de A à Z, dans les filtres ;
  - « Nos autres collections », écrit à la main dans les modèles ;
  - les grands blocs d'images qui répétaient les pastilles (Nature, Animaux, Chambre, Chambre Enfant, Ethnique) ;
  - les liens de collection du « Pour aller plus loin », qui ne garde que les articles de blog.
  Avant, la page Tableaux Nature comptait 230 liens, dont 9 vers Tableau Animaux.
- **Pas de pages « par sujet », « par style », « par pièce » ni « par couleur »** (décision de Walid du 23/11/2026). Personne ne les cherche sur Google, et elles montreraient les mêmes tableaux que la racine. Le fil d'Ariane suit les recherches : Tous les Tableaux › Tableaux Nature › Tableau Animaux › Tableau Lion. Les rayons se voient sur les pages racines, dans les groupes du menu et dans le bas de page (« Autres sujets »).

## Où vivent les choses

| Quoi | Où |
|---|---|
| Le plan, source de vérité (nœuds, parents, rayons, décisions, tags, règles de remplissage) | `app/Services/Cocon/cocon-plan.json` du backend, un dépôt public. Il ne contient ni ventes ni chiffres Google. Le veilleur le recopie dans le métachamp du shop `cocon.plan`. |
| Le veilleur | Tâche `VeillerCocon` du backend, chaque heure à h+40. Il ajoute les tags, compte et écrit l'état dans le métachamp du shop `cocon.etat`. Coupure d'urgence : `COCON_DISABLED=true`. |
| Essai à blanc | Workflow « Commande sur le serveur », commande `cocon-etiquettes`, essai coché : il liste sans rien écrire. |
| L'état, pour Claude et la carte | Outil `etatCocon` du connecteur Shopify, en lecture seule. |
| Les pastilles des sous-collections | `sections/sous-collections.liquid`, sous le fil d'Ariane de chaque modèle de collection. Elle lit `cocon.plan`. |
| Le bas de page des sœurs et de la jumelle | `snippets/cocon-famille.liquid`, à la fin de la grille des produits de chaque page de collection. Il lit `cocon.plan` (champs `parent`, `rayon` et `jumeau`). Tests : `scripts/cocon-famille.test.cjs`. |
| Le fil d'Ariane | Métachamp de collection `breadcrumb.parentCollection`, posé à la création. |
| La création d'une collection | [PROCEDURE-COLLECTION.md](PROCEDURE-COLLECTION.md), à la main ou par la routine quotidienne. |
| Les textes publiés | `seo/cocon/textes/<handle>.json` : un fichier par collection créée par le cocon, identique au texte en ligne. |
| La routine quotidienne | Routine Claude « Cocon MyselfMonArt – collections du jour », chaque matin vers 7 h (heure de Paris). Elle crée au plus 10 collections prêtes, range leurs textes, écrit le journal, puis commite et pousse sur `main`. |
| Le journal des créations | [journal.md](journal.md) |
| Les analyses du 22/11 (Search Console, ventes, catalogue, concurrents) et les scripts de la carte | `.scratch/cocon/` du thème, hors du dépôt. `plan.cjs` y refait `plan.json`, et `plan-boutique.cjs` le plan compact du backend. |

## Changer le plan

- **Ajouter une idée ou une série.**
  1. Ajoute le nœud à la liste `IDEES` de `.scratch/cocon/plan.cjs` : titre toile et poster, parent, rayon, règle de remplissage, décision `idee`.
  2. Lance `node plan.cjs`, puis `node plan-boutique.cjs`.
  3. Copie `cocon-plan.json` dans `app/Services/Cocon/` du backend et pousse sur `main`.
  4. Republie la carte avec le nouveau `plan.json`.
- **Écarter ou rouvrir une collection** : même chemin, en changeant sa décision et en écrivant sa raison.
- **Ne jamais** renommer, déplacer ni supprimer une collection en ligne sans l'accord de Walid.
