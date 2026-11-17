# 18: Mise en ligne pour les nouveaux produits

**What to build:** toutes les nouvelles toiles et tous les nouveaux posters passent par le nouveau chemin : une image, l'écran de validation, la nouvelle fiche. Les anciens produits ne changent pas. Pendant les premières semaines, on suit les ajouts au panier et les commandes des nouveautés face aux nouveautés des mois précédents, au même âge, avec les rapports Shopify et PostHog. Des enregistrements de visites montrent si les visiteurs trouvent le bouton et utilisent la 3D. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 06 (PostHog), 10 (cadres et bordures), 13 (pièce et collection), 14 (poster jumeau), 15 (photos et données Google), 16 (agrandissement), et 17 si la mesure du ticket 08 l'exige

**Status:** ready-for-agent

- [ ] Le Publisher utilise le nouveau chemin par défaut pour les toiles et les posters.
- [ ] Les anciens mockups ne servent plus pour les toiles ni les posters, et le code devenu inutile est retiré.
- [ ] Un point envoyé à Walid au bout de 2 semaines, puis de 4 : chiffres et observations.
- [ ] Aucune fiche existante n'a changé de modèle de page.

Un produit qui n'a que l'œuvre à plat (relevé le 15/11/2026, essai des vignettes de collection) :

- [x] La fiche 3D s'affiche avec cette seule image (16/11/2026). Elle attendait l'œuvre à plat en 2e image (`media[1]`) : avec une seule image, elle retombait sur l'ancienne galerie ; avec l'image « passe-partout » d'un poster en 2e, la 3D la prenait pour l'œuvre. La place de l'œuvre vient désormais du snippet `artwork-flat-index` :
  - la fiche (`main-product.liquid`) : la scène 3D, et ses données Google ;
  - la scène (`oeuvre-3d-stage.liquid`) : l'image d'arrivée, la texture et les gros plans de la 3D, le texte alternatif, les photos du repli sans 3D ;
  - les données Google de la collection, qui recopiaient la règle.

  Banc du 16/11 (liquidjs, thème d'avant et thème modifié) :
  - 1 284 fiches de produits de toujours identiques à l'octet près, sous les modèles painting et poster comme sous `?view=oeuvre-3d`, et l'`ItemList` de la collection aussi ;
  - 9 nouveaux produits (toiles portrait, paysage et carrée ; posters avec et sans passe-partout) ont la scène, l'œuvre en 1re image avec son texte alternatif, et les données 3D.

  Dans Chrome, sur le Bonsaï changé en nouveaux produits jumeaux :
  - la 3D part avec l'œuvre à plat ;
  - le contour blanc du poster marche, propriétés de ligne comprises ;
  - sans WebGL, l'œuvre reste seule, sans flèches ;
  - la bascule toile/poster marche ;
  - aucune erreur, aucun débordement à 390 et 1440 px.

  Vérifiés, rien à changer : la bascule et le jumeau (chaque fiche prend la place de sa propre œuvre, l'adresse garde `?view=oeuvre-3d`), le fil d'Ariane, les propriétés de ligne envoyées au panier, les balises de partage (1re image). Laissées telles quelles, car un nouveau produit n'y arrive jamais : la galerie avec sa perspective, et la tapisserie.

  Vérifié en ligne le 16/11/2026, après le déploiement de 3e87372, avec un relevé fait juste avant dans un Chrome neuf. Aucune différence sur 5 pages : l'image d'arrivée, les photos du repli, les médias de la galerie et les données Google (`Product` et `ItemList`). Les pages relevées :
  - le Bonsaï toile et le Bonsaï poster sous `?view=oeuvre-3d` ;
  - les mêmes en galerie ;
  - la collection `tableau-zen`.

  Reste : les photos du repli sans 3D commencent à la 3e image (`start_from_media` du modèle `oeuvre-3d`, réglé pour les produits de toujours). Un nouveau produit n'a pas d'autre photo aujourd'hui ; si le ticket 15 lui en ajoute, une photo en 2e position n'y figurerait pas.
- [x] Les vignettes de collection montrent l'œuvre en objet : la toile de face, sans cadre, avec son ombre et sa lumière ; le poster sous verre, avec un reflet discret au défilement (choix de Walid du 15/11). Code et notes de l'essai du 15/11 dans le dossier `vignettes-collection`. Les cartes des anciens produits ne changent pas. Posé dans le thème le 16/11/2026 (f5226d7, 2788534) : rien ne se voit tant qu'aucun produit n'a le modèle `oeuvre-3d`.
- [x] Les données Google de la page collection (`ItemList` de `main-collection-product-grid.liquid`) et le texte alternatif de la carte prennent la 1re image pour ces produits (16/11/2026, avec les vignettes).
- [x] « Mes j'aime » montre ces œuvres comme la collection (16/11/2026). Il n'y a plus de carte modèle : chaque carte est celle de la collection, rendue par Shopify dans le contexte du produit. C'est la section `my-likes-card`, appelée par la Section Rendering API (`/products/<handle>?section_id=my-likes-card`, derrière le préfixe de langue et de marché). Trois défauts relevés en ligne le même jour disparaissent avec elle :
  - toutes les cartes affichaient le prix du produit modèle (39,90 €) ;
  - le titre complet, lu par les lecteurs d'écran, avait disparu ;
  - un seul produit introuvable bloquait le chargeur.

  Vérifié en ligne le 16/11/2026, juste après le déploiement (d7796c0), dans un Chrome neuf, avec 3 j'aime :
  - Shopify sert la section, en français comme sous `/en/` ;
  - chaque carte a son prix : 24,90 €, 62,50 € et 63,50 €, au lieu de 39,90 € pour toutes ;
  - le titre complet est revenu pour les lecteurs d'écran ;
  - un produit introuvable est sauté. Shopify répond alors 200 avec une section vide, et non 404 ;
  - sans j'aime, la liste vide s'affiche ;
  - aucun débordement à 390 et 1440 px.
- [x] Le panier montre ces œuvres (16/11/2026) :
  - la vignette de la page panier vient de l'œuvre à plat (snippet `artwork-flat-index`) ;
  - le format des tableaux proposés en lot dans le tiroir en vient aussi ;
  - les produits de toujours restent identiques à l'octet près (banc : 970 paniers).

  Relevé en passant, laissé tel quel pour garder les anciens produits identiques : dans la page panier, la hauteur de la vignette (`height`) divise 150 par `image.aspect_ratio`, alors que `image` y est une adresse. Le calcul échoue sans doute pour tous les produits, depuis bien avant le 16/11. À regarder sur un vrai panier : en ajouter un ici compterait un ajout au panier dans les chiffres de la boutique. Corrigé le 17/11/2026 (point suivant) : `image` est l'image elle-même.
- [x] Le panier montre chaque toile et chaque poster tels que commandés, nouveaux produits et produits de toujours, page panier et tiroir (17/11/2026 ; validé par Walid sur les captures avant/après, en ligne le jour même, main e6662f6) :
  - le même objet que la carte de collection, par un snippet commun (`snippets/artwork-object.liquid`) ; la commande se lit comme la fiche 3D la lit (`snippets/cart-item-artwork.liquid`) : le cadre de la toile (option 3, métaobjet `frames_canvas`), la couleur du poster (`_cadre`), son contour blanc (`_passe_partout`) ;
  - la toile de face, ou dans sa caisse américaine à la teinte commandée ; le poster sous verre dans son cadre, avec son contour blanc, ou en papier s'il n'a pas de cadre ; la bordure reste dans le texte de la variante ; « Avec cadre » sans couleur connue : cadre noir ;
  - entière, à son format, jamais étirée ni coupée, dans la case d'avant : 80 px de large dans le tiroir (sa hauteur suit la ligne), 120 × 150 dans la page panier, centrée, jamais plus haute que la ligne ; fond #f5f4f2, le mur des posters de la collection ;
  - rien ne bouge : la vitre garde un reflet fixe, une bande de lumière (la porte-fenêtre des cartes et son masque pesaient un quart de la peinture du tiroir) ; la même œuvre à plat, en 1x et 2x, aucune autre image ;
  - inchangées : les lignes à aperçu personnalisé (`_preview`), et les produits ni toile ni poster (personnalisés, tapisserie, sur-mesure, carte cadeau).

  Banc du 17/11 (liquidjs, thème d'avant et thème modifié, Chrome sans écran, aucune requête en ligne) :
  - cartes de collection : 500 cartes de toujours identiques à l'octet près ; celles des nouveaux produits identiques au pixel près, à 390 et 1440 px (le noir des cadres reste celui de la carte, #353535 ; les autres teintes sont celles du moteur 3D) ;
  - panier : 60 paniers (303 lignes : chaque toile et chaque poster du relevé du 05/11, cadres, propriétés, quantités, remises, lots et kits) identiques à l'octet près hors des vignettes ; les vignettes des lignes inchangées aussi, sauf la hauteur corrigée ;
  - mise en page : chaque ligne et chaque case de vignette à la même place au dixième de pixel, à 320, 390 et 1440 px ; aucun débordement, aucune erreur ;
  - ouverture du tiroir (5 lignes, émulation mobile, processeur ralenti 4 fois, 11 ouvertures, médianes) : 4 calques fermé, 6 ouvert, avant comme après ; 1re image 26 → 27 ms ; peinture 13,9 → 19,7 ms ; rastérisation 5,1 → 5,9 ms ; décodage inchangé ; aucune tâche longue.

  Validé par Walid le 17/11/2026 sur les captures avant/après (« Oui, mets en ligne ») : le fond de la case, le poster sans cadre en papier simple, le noir par défaut, la baguette du poster plus large qu'en carte. Le noir des cadres reste celui de la carte (#353535), choix de Claude : à cette taille, l'écart avec le noir du moteur ne se voit pas.

  En ligne le 17/11/2026 (main e6662f6, « Aucun fichier refusé par Shopify »). Vérifié juste après dans un Chrome neuf, sans rien mettre au panier, avec un relevé fait juste avant le déploiement :
  - 8 réponses identiques, hors numéro de version des fichiers : la collection `tableau-zen`, l'accueil, la page panier vide, les deux fiches du Bonsaï avec leur tiroir vide, leurs deux cartes de « Mes j'aime » (`?section_id=my-likes-card`) et le tiroir seul (`?sections=tw-cart-drawer`) ;
  - la recherche « bonsai » : chaque carte identique, hors de l'identifiant de recherche (`_sid`) que Shopify change à chaque recherche. Le nombre de résultats et leur ordre ont changé (90 puis 251), ce qui vient du moteur de recherche de Shopify, pas du thème ;
  - aucune erreur nouvelle dans la console ;
  - le CSS en ligne a les règles du panier (`.oeuvre-card[data-context]`, le mur, les cinq cadres), et le script du reflet laisse de côté les vignettes du panier.

  Retouche du 17/11/2026 (main 52b8c9e). Retour de Walid après la mise en ligne : « comme un trait noir ou sombre entre le canvas et le cadre, donnant une impression du choix bordure noire ».
  - Avant : le jour de la toile encadrée était peint avec 40 % de la teinte du cadre et 60 % d'un brun presque noir.
  - Après : il prend la teinte du cadre, à 84 % en haut et à gauche (dans l'ombre de la baguette) et à 95 % en bas et à droite. Seule cette règle change dans `output.css`.
  - Captures avant/après envoyées à Walid.
  - Vérifié en ligne après le déploiement (« Aucun fichier refusé par Shopify ») : le CSS en ligne a le nouveau jour, et l'ancien n'y est plus. Les 9 pages du relevé du matin sont inchangées ; la recherche ne diffère que par l'ordre de ses résultats, qui vient de Shopify.
  - La fiche 3D peint aussi le fond du jour dans l'ombre (`frameProfile` d'`oeuvre-3d-engine.js`, lumière 0,3). Pas vu à l'œil : la 3D ne s'est pas affichée dans le Chrome sans écran du banc. Laissée telle quelle, Walid ne l'a pas demandé.
- [x] « Mes j'aime » montre chaque œuvre comme elle a été aimée, nouveaux produits et produits de toujours. Demande de Walid du 17/11/2026 : « si c'était encadré alors il faut le montrer encadré avec le même cadre ». Walid a vu les captures avant/après, puis « Oui » : en ligne le 17/11/2026 (main 6031911), vérifié en ligne (ci-dessous).
  - Un j'aime donné sur la fiche, classique ou 3D, garde la ligne que l'ajout au panier ferait à cet instant (`cartLine` de `assets/main-product.js`) :
    - la variante du bouton d'achat, ou de la pilule sur la fiche 3D ;
    - pour un poster, la couleur du cadre (`_cadre`) et le contour blanc (`_passe_partout`).

    La ligne va dans une nouvelle clé, `productLikedLines`. Les clés de toujours ne changent pas. Un j'aime donné depuis une carte n'en garde aucune et efface celle de l'œuvre ; retirer un j'aime efface sa ligne.
  - « Mes j'aime » demande la carte d'une œuvre gardée avec sa variante : `/products/<handle>?variant=<id>&section_id=my-likes-card`. La carte la montre en objet, par le même rendu que la vignette du panier (`snippets/artwork-line.liquid`, qui lit le cadre par `snippets/artwork-frame.liquid`) :
    - la toile encadrée dans sa caisse, à l'échelle de la toile seule (une règle de plus dans `output.css`) ;
    - le poster sous verre ou en papier. `assets/my-likes.js` pose la couleur du cadre et le contour blanc, que la variante ne dit pas.

    Le lien ouvre la fiche sur la variante aimée ; le prix ne change pas.
  - Une œuvre sans ligne gardée (aimée depuis une carte, ou j'aime d'avant) garde sa carte d'aujourd'hui, comme une œuvre dont la variante n'existe plus.
  - Tous les accès des j'aime à localStorage passent par un try/catch, compteur de l'en-tête compris.

  Banc du 17/11 (liquidjs, main 25b9f65 et le thème modifié, Chrome sans écran, aucune requête en ligne). Identiques à l'octet près :
  - 777 cartes de collection (259 produits, chargement différé, immédiat et par défaut) ;
  - la grille de collection (3 pages) ;
  - les 259 cartes de « Mes j'aime » sans ligne gardée ;
  - 60 paniers, page panier et tiroir (303 lignes).

  « Mes j'aime » à 390 px, avec sept œuvres aimées : chacune comme aimée, sans erreur ni débordement. Captures avant/après pour Walid.

  Lu en ligne le 17/11, sur la section principale de la fiche du Bonsaï toile (une page, trois requêtes, mesures bloquées) :
  - la Section Rendering API sélectionne la variante de `?variant=` (bouton d'achat, et une seule offre dans les données Google) ;
  - sous `/en/`, la redirection vers le handle anglais garde `variant` et `section_id` ;
  - `variant.url` a le préfixe `/en/`.

  Vérifié en ligne après le déploiement (« Aucun fichier refusé par Shopify »), dans un Chrome neuf, mesures de la boutique bloquées, sans cliquer de cœur (aimer pour de vrai compte dans le compteur de j'aime de la boutique : seulement par Walid ou avec son accord) :
  - le relevé refait juste avant (10 pages) est inchangé : la collection `tableau-zen`, l'accueil, la page panier vide, les deux fiches du Bonsaï, leurs cartes de « Mes j'aime » sans `?variant=`, le tiroir seul et « Mes j'aime » vide. La recherche ne diffère que par l'ordre de ses résultats, qui vient de Shopify et déplace le chargement immédiat d'une image ;
  - le CSS en ligne a la règle de la toile encadrée hors panier ; `my-likes.js` et `my-like-button.js` en ligne sont les nouveaux ;
  - « Mes j'aime » à 390 px, avec cinq œuvres de toujours (localStorage préparé, variantes relues en ligne dans `/products/<handle>.js`). La toile Bonsaï est dans son cadre chêne clair, avec un jour clair. La toile Chevaux est sans cadre. Le poster Bonsaï est au cadre noyer avec contour blanc, et son reflet est chargé. Le poster Zèbre est sans cadre, en papier sans contour (`options_with_values[1].values.first` lu par Shopify). La toile Duel, aimée depuis une carte, est inchangée.
  - Les liens ouvrent la fiche sur la variante aimée. Ni débordement, ni autre erreur que le « Failed to fetch » déjà présent sur toutes les pages : c'est une requête tierce, bloquée par le banc ;
  - les cartes suivent le marché de la visite, comme avant ce changement. Elles sont sous `/fr-eu/` quand Shopify situe le Chrome du banc en Italie, et à la racine quand il le situe en France (vu les deux le même jour) ;
  - `cartLine()` lu sur deux fiches classiques. La toile Bonsaï sur sa variante chêne clair donne cette variante, sans propriété. Le poster Bonsaï tel qu'il s'ouvre donne sa variante par défaut avec `_passe_partout: oui` ; la propriété visible « Contour blanc » n'est pas gardée ;
  - Lighthouse mobile, deux passages par état, même page et mêmes œuvres. Sans ligne gardée, la page a les cartes d'avant : performance 71 et 77. Avec les lignes : 72 et 73. Les deux états ont l'accessibilité à 89, les bonnes pratiques à 96 (73 une fois, sur `/fr-eu/`, pour des cookies tiers), un LCP vers 6 s et un CLS de 0.
  - Les audits d'accessibilité en échec sont les mêmes des deux côtés : contraste, ordre des titres, `li` hors liste. Le SEO varie avec le marché servi, pas avec ce changement : robots.txt écarte `/pages/mes-j-aimes`, pas `/fr-eu/pages/mes-j-aimes`.

  Pas vu en ligne : la fiche 3D (`cartLine` par la pilule), faute de produit `oeuvre-3d` publié. C'est dans le dernier point de ce ticket.
- [ ] Après la mise en ligne, sur un vrai panier : une toile encadrée, un poster avec couleur et contour blanc, un poster « Avec cadre » sans couleur, une ligne personnalisée. Le banc rend le Liquid avec liquidjs, pas avec Shopify : `options_with_values[1].values.first`, les propriétés de ligne et `image_url` sur l'image plutôt que sur son adresse restent à voir en vrai. Un panier de test pourrait compter un ajout au panier dans les chiffres de la boutique : seulement avec l'accord de Walid.
- [ ] Reflet des posters essayé sur un vrai Firefox et un Safari d'avant la version 26 : le banc du 16/11 n'a fait tourner le chemin de secours que dans Chrome.
- [ ] Point du 17/11/2026, avant le 1er produit (question de Walid : « a-t-on tout fini, pas de cas caché ? »). Le thème est prêt, mais :
  - **Le Publisher n'est pas aligné sur l'image unique.** Son nouveau chemin (backend, `DraftFlow.ts`, `mediaOrder`) met encore le rendu « de face » du serveur en 1re image, puis l'œuvre à plat, puis trois rendus (trois-quarts, matière, coin). Walid a refusé ces rendus le 15/11. Depuis le 16/11, le thème prend l'image 0 d'un produit `oeuvre-3d` pour l'œuvre. Un produit créé aujourd'hui montrerait donc le rendu à la place de l'œuvre : dans la 3D, les cartes, le panier, « Mes j'aime » et les données Google.
    - À faire avant le 1er produit : l'œuvre à plat agrandie, seule et en 1re image, sans rendu ; le poster jumeau (ticket 14) ; une image carrée ne donne que la toile.
    - Le brouillon du 08/11 (produit 10871297376603) a l'ancien ordre : ne pas le publier tel quel.
  - **OpenAI** (couleurs, thèmes, traductions de nuit) :
    - solde de 10,88 $ le 17/11 ;
    - recharge automatique plafonnée à 30 $ par mois, plafond atteint (recharges des 10, 13 et 16/11) ;
    - 22,58 $ dépensés du 11 au 17/11 (3 430 requêtes, toutes en gpt-5), alors qu'aucun produit n'a été créé depuis le 08/11 ;
    - au rythme du 17/11, arrêt vers le 20/11 jusqu'au 1er décembre.
    - Cause trouvée et corrigée le même soir (backend 84bd1e4), sur les journaux du conteneur. Chaque nuit depuis mars 2025, les 92 collections repartaient chez OpenAI dans les 4 langues : l'alignement de leurs textes alternatifs recréait un métaobjet sans traduction. S'y ajoutaient les échos des modèles du thème. On attend une poignée d'appels par nuit, à vérifier sur la nuit du 18/11 (commande « journaux-openai »).
  - **Jamais essayée sur un vrai iPhone ni sur Safari** : seulement sur le Pixel de Walid et dans Chrome.
  - **Mails de commande** (`growth/emails-commande`) : ils montrent l'image de la ligne (`line.image`). Pour un nouveau produit, c'est l'œuvre à plat sur la tuile blanche ; le cadre et le contour blanc ne sont que dans le texte. Les mails peuvent dessiner le cadre à sa teinte et le contour blanc autour de l'image, en tables, comme le panier : à faire si Walid le veut.
  - **Pinterest et Instagram** : avec une seule image, ils prennent l'image 0 (`IMAGE_PRIORITY` [2, 3, 1, 0]), sans carrousel. Pas d'erreur, mais l'œuvre à plat seule. Même remède que Google Images : le ticket 15.
- [ ] Au 1er produit passé au modèle `oeuvre-3d`, le regarder en ligne : sa fiche (la 3D, le contour blanc d'un poster, le repli sans 3D), sa carte dans une collection, dans la recherche et dans « Mes j'aime », puis sa ligne dans la page panier et dans le tiroir. Lire aussi `cartLine()` dans la console de sa fiche, sans cliquer de cœur : la variante de la pilule et les propriétés choisies. Le banc du 16/11 rendait le Liquid avec liquidjs, pas avec Shopify.
