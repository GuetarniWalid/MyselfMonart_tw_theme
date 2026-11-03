# 04: Une seule règle pour reconnaître une fiche d'œuvre

**What to build:** aujourd'hui, le thème vérifie à une dizaine d'endroits si un produit est une toile ou un poster, d'après son modèle de page : boutons d'ajout au panier, tiroir du panier, grille des collections, section produit. La nouvelle fiche aura son propre modèle de page. Une seule règle, à un seul endroit, doit dire « ce produit est une œuvre (toile ou poster) », pour que l'ajout de la nouvelle fiche tienne en une modification. Au passage, corriger le test de la grille des collections qui utilise un `else if`, que Liquid ne connaît pas. Aucun changement visible. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Tous les endroits qui testent le modèle de page des toiles et des posters passent par la même règle.
- [x] Ajouter un modèle de page à la liste des œuvres ne demande qu'une modification.
- [x] Le test invalide de la grille des collections est corrigé.
- [x] Fiches toile et poster, panier, tiroir et collections identiques avant et après, vérifiés en ligne.

## Notes de réalisation

**Fait (03/11).** La règle vit dans `snippets/artwork-kind.liquid`. Elle reçoit le produit et le suffixe du modèle, et renvoie `toile` (pour `painting`), `poster` ou rien. Elle passe partout par `capture` + `render`, comme `filter-color-label`.
- Elle remplace les 9 tests de `main-product` (3D, sélecteur, données 3D pour Google), des deux boutons d'achat (prix d'appel) et du tiroir (vignette, tailles des lots).
- Les tests `personalized` et `tapestry` ne changent pas. Le JS ne testait que `tapestry`.
- Grille des collections : le `else if` valait un simple `else`, si bien que la 2e photo sortait pour tous les produits. Ce rendu est gardé tel quel ; l'intention d'origine (1re photo hors toiles) changerait les données Google, à trancher au ticket 15 si besoin.
- Vérifié : aucun test du suffixe hors de la règle (contrôle statique), `i18n-lint` vert, chaque condition relue suffixe par suffixe. Aucun moteur Liquid disponible : rien n'a tourné.

**Pour la nouvelle fiche (07, 14).**
- Modèle propre à un type : ajouter son suffixe sur la ligne `when` de ce type.
- Modèle partagé par toile et poster : une ligne `when` qui tranche d'après `product` (par exemple `frames_poster`).
- Si elle reprend la section `main-product`, être « toile » y allume aussi l'ancienne 3D et l'ancien sélecteur : à couper dans le ticket 07.

**Vérifié en ligne le 03/11 (déploiement 0077695 réussi).**
- Avant le push : l'`ItemList` des collections donnait déjà la 2e photo à 10 produits sur 10 (posters, toiles, personnalisés). Après : toujours la 2e photo, aucun produit sans image.
- Fiche toile Bonsaï : 3 rangées d'options, 3D présente, bouton à 62,50 € sans `?variant=` (prix d'appel) et à 207,00 € avec la variante 90x120 / pliée / sans cadre ; JSON-LD avec les 4 propriétés 3D, dont les bordures.
- Fiche poster Bonsaï : tailles, cadres (4 couleurs), contour blanc, 3D et bascule toile/poster présents ; bouton à 24,90 € ; JSON-LD avec les propriétés 3D du poster.
- Fiche personnalisée (Horoscope Balance) : studio présent, bouton « JE CRÉE SON POSTER 39,90 € ».
- Tiroir : la toile montre son image à plat, le poster sa 1re photo, le kit d'accrochage est proposé. Les deux lignes de test ont été retirées du panier.

**Liste de contrôle d'origine (avant et après le push).**
1. Collection de posters (`/collections/poster-et-affiche`) et collection de toiles : grille identique, et dans le JSON-LD `ItemList`, même URL d'image pour un même produit. Avant le push, l'image d'un poster doit déjà être sa 2e photo. Sinon, ne pas pousser la grille.
2. Fiche toile : sélecteur tailles/bordures/cadres, 3D en dernière vignette, prix « à partir de » sans `?variant=` et prix de la variante avec. Dans le JSON-LD, les 4 propriétés 3D avec bordures.
3. Fiche poster : sélecteur cadre, couleur et contour blanc, 3D, prix du bouton inchangé. Dans le JSON-LD, les propriétés 3D du poster.
4. Fiche personnalisée : studio et prix d'appel inchangés.
5. Tiroir : une toile avec lot (vignette = image à plat, lot à la bonne taille), un poster (vignette = 1re photo), proposition du kit d'accrochage.
