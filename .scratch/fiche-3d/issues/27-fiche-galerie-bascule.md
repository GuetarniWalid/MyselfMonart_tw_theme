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

**Status:** needs-walid

- [ ] Walid a validé la vue de test sur son téléphone.
- [ ] Les mesures avant / après sont notées, et la nouvelle page ne fait pas moins bien.
- [ ] La fiche des produits 3D est la nouvelle page, en cinq langues, toile et poster.
- [ ] Les anciennes fiches, les collections et l'accueil sont inchangés.
