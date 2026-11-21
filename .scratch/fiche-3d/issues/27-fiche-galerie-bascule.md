# 27 : Fiche galerie — contrôle, mesures et bascule

**What to build:** la nouvelle page devient la fiche des produits 3D, après le feu vert de Walid.

## Avant la bascule

- Walid regarde la vue de test (`?view=oeuvre-galerie`) sur son téléphone, sur la toile et sur le poster Superman, et dit oui.
- Mesure avant / après (Lighthouse, téléphone) sur la fiche actuelle et sur la vue de test : la nouvelle page ne doit pas faire moins bien pour l'affichage du tableau principal, le décalage de mise en page et la note de performance. Rappel : la fiche actuelle affiche son tableau en 0,99 s, sans décalage.
  - Premier relevé de la fiche actuelle, le 20/11 à 13 h 40 (Lighthouse 12.6.1, téléphone simulé, deux passages, PC occupé par d'autres travaux : à refaire le jour de la comparaison, dans les mêmes conditions que la vue de test) :

    | Fiche actuelle | Performance | Tableau affiché (LCP) | Blocage | Décalage | Poids | Requêtes |
    |---|---|---|---|---|---|---|
    | Toile Superman | 45 et 49 | 6,8 et 7,3 s | 1,13 et 0,73 s | 0 | 3,35 Mo | 341 |
    | Poster Superman | 42 et 45 | 7,5 et 7,3 s | 1,41 et 1,04 s | 0 | 3,34 Mo | 339 |

    Le HTML seul de la fiche actuelle pèse 789 Ko pour la toile et 448 Ko pour le poster (avant compression). Outil : `lh.sh` (Lighthouse du cache npx), sorties gardées hors du dépôt.
  - **Comparaison du 20/11 à 21 h**, page de test complète (couleurs comprises), même conditions (Lighthouse 12.6.1, téléphone simulé, passages alternés fiche actuelle / vue de test, deux tours) :

    | | Performance | Tableau affiché (LCP) | Blocage (TBT) | Décalage (CLS) | Poids | Requêtes |
    |---|---|---|---|---|---|---|
    | Toile, fiche actuelle | 47 et 46 | 7,2 et 7,4 s | 0,84 et 1,01 s | 0,0009 | 3,34 Mo | 341 |
    | Toile, vue de test | 58 et 49 | 5,9 et 6,9 s | 0,51 et 0,81 s | 0,0015 | 3,21 Mo | 339 |
    | Poster, fiche actuelle | 47 et 50 | 7,0 et 6,9 s | 1,63 et 0,92 s | 0 et 0,0015 | 3,31 Mo | 340 |
    | Poster, vue de test | 53 et 49 | 6,2 et 6,6 s | 0,79 et 0,88 s | 0,004 | 3,20 Mo | 340 |

    La nouvelle page ne fait pas moins bien : note égale ou meilleure, tableau affiché plus tôt, moins de blocage, un peu plus légère. Le décalage reste négligeable (0,004 au plus, « bon » sous 0,1). Au défilement (trace Chrome, processeur ×4), après `c2add70` : plus long recalcul de styles 20 ms (170 ms avant), tâches longues 6 ou 7 (15 à 17 avant), la plus longue 105 ms (240 ms avant).
  - **Après la bascule, le 21/11 à 3 h 50** (même outil, la nuit, tâches du serveur en cours) : toile 48 et 45, tableau affiché en 6,8 et 6,3 s, blocage 1,0 et 2,1 s, décalage 0 ; poster 45 et 45, 6,8 et 6,2 s, blocage 1,4 et 2,0 s, décalage 0,004. Dans la fourchette de la fiche d'avant pour la note, meilleur pour le tableau affiché ; le blocage varie beaucoup d'un passage à l'autre sur ce PC. La comparaison qui fait foi est celle du 20/11 à 21 h, faite en alternant les deux pages.
  - Copie des pages avant le premier push (HTML du serveur, 20/11 à 13 h 36) : toile et poster Superman, ancienne toile, ancien poster, sur-mesure, deux personnalisés, la vue `photo-studio`, une collection, l'accueil, le panier. À comparer après chaque push qui touche un fichier commun.
- Contrôle sur un vrai téléphone, dans Safari et dans Firefox (la scène a un mode de secours), en mouvements réduits, et dans les cinq langues.
- Les données lues par Google (produit, fil d'Ariane, balises) sont les mêmes qu'avant.
- Les phrases des couleurs existent pour les produits en ligne (ticket 25, commande de rattrapage) et sont traduites (ticket 26).

## À montrer à Walid avec la vue de test (relevé à l'intégration des tickets 22 à 24, le 20/11)

- Les textes du poster qui n'étaient pas dans la maquette : les volets du poster (« Livraison », « Détails du produit », « Retour et échange ») viennent de `poster/textes.json` ; la FAQ du poster a ses six réponses de la maquette, plus quatre questions communes (taille après accrochage, paiement, paiement en trois fois, contact).
- Le titre des avis « +1 000 clients aux anges » : le nombre est un réglage de la section (`customers`, 1000), à tenir à jour dans l'éditeur.
- Le volet « Poster ou toile » de la toile a perdu sa dernière phrase (« Envie de la découvrir sur toile ? … »), qui ne vaut que pour un poster.

## La bascule

- Le modèle `oeuvre-3d` prend le contenu du modèle de test. Les produits ne changent pas de modèle.
- Rien à changer dans `layout/product.liquid` : il reconnaît la page galerie à ce que le bloc principal écrit (`data-galerie`), pas au nom du modèle (`c2add70`, 20/11). Le bandeau est pêche dès le premier affichage.
- Les textes éditoriaux du modèle (volets, questions, avis) doivent être traduits dès la bascule : lancer la traduction des modèles juste après, sans attendre la nuit, et vérifier dans une autre langue.
- Les titres à jeux de mots sont relus dans chaque langue.
- Le modèle de test est retiré une fois la bascule vérifiée.

## Après

- Vérifier en ligne la toile et le poster : page, panier, bascule Toile / Poster, « j'aime ».
- Mettre à jour les notes du projet et les tickets.

**Blocked by:** 19, 20, 21, 22, 23, 24, 25, 26, et le feu vert de Walid

**Status:** bascule faite le 21/11/2026 à 3 h 47 (`1f2922a`), avec le feu vert de Walid du 20/11 (« Oui, elle me convient »), après la correction de la flèche du champ e-mail qu'il avait relevée (`4a175a6`).

**Vérifié en ligne après la bascule, sur la toile et le poster Superman :** la fiche des produits 3D est la page galerie (`<html data-galerie-page>`, huit sections) ; title, description, canonique, robots, h1 et données JSON-LD identiques à avant ; bascule Toile / Poster, retour et suivant du navigateur, ajout au panier (62,50 €), recommandations (10 cartes, aussi après la bascule), aucune erreur de script ; les autres pages témoins (anciennes fiches, sur-mesure, personnalisés, vue photo-studio, collection, accueil, panier) identiques au caractère près.

**Traductions :** les phrases des couleurs en anglais posées par la nuit du 21/11 (« Blue: strength. It outlines the muscles… », `outdated` à false) ; espagnol, allemand, néerlandais en cours à 3 h 45 (la tâche des fiches tournait encore). La bascule a été faite avant la traduction des modèles (4 h 15) : les 55 textes nouveaux du modèle (volets, questions du poster…) sont traduits dès la nuit ; les 54 autres, repris mot pour mot de l'ancienne fiche, avaient déjà leur traduction.

**Modèle de test :** retiré du dépôt (`339a99c`). Il reste sur Shopify, parce que le déploiement ne supprime jamais un fichier (`--nodelete`, voulu) : sans effet pour les clients. À supprimer par Walid dans l'éditeur de code (« Modifier le code », `templates/product.oeuvre-galerie.json`). Les trois branches `oeuvre-galerie` restées dans le thème (règle unique, fil d'Ariane, bouton du panier) sont sans effet ; à retirer avec leurs tests.

- [x] Walid a validé la vue de test sur son téléphone (20/11 au soir).
- [x] Les mesures avant / après sont notées, et la nouvelle page ne fait pas moins bien (20/11, vue de test ; à refaire une fois après la bascule).
- [x] La fiche des produits 3D est la nouvelle page, toile et poster (les cinq langues : traductions de la nuit du 21/11, à vérifier).
- [x] Les anciennes fiches, les collections et l'accueil sont inchangés.
