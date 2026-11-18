# 15: « Sous tous les angles » et données Google

**What to build:** sous la 3D, une bande « Sous tous les angles » montre les vraies photos du produit, chargées en différé : ni l'image à plat, ni les images de variantes. Les données lues par Google listent toutes les photos et décrivent chaque variante, avec son image quand elle en a une, sous forme de groupe de produits. Elles servent à Google Images et à Google Shopping. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 09 (du Publisher à la fiche)

**Status:** fait autrement le 18/11/2026. Pas de photos rendues par la 3D. À la place, une photo studio par produit : l'œuvre seule au mur, qui devient la 1re image des données Google et l'image de partage. La bande « Sous tous les angles » et les images par variante ne sont pas faites.

- [ ] La bande est visible et accessible, et elle se charge sans ralentir l'arrivée sur la fiche. *(abandonnée avec les photos 3D)*
- [ ] Les données produit listent toutes les photos, et chaque variante avec son prix, sa disponibilité et son image. Elles passent sans erreur dans l'outil de test des résultats enrichis de Google. *(la photo studio puis l'œuvre à plat ; pas d'image par variante ; test des résultats enrichis à faire au 1er produit)*
- [x] L'image de partage sur les réseaux sociaux est la 1re photo. *(og:image = la photo studio)*
- [x] Les fiches actuelles gardent leurs données tant qu'elles n'ont pas basculé. *(vérifié en ligne sur le Bonsaï le 18/11)*

## La photo studio (18/11/2026)

Walid refuse les photos avec la femme pour Google : il veut « l'œuvre seule », en grand, mais jolie (« il s'agit de ma surface de vente »). Il choisit le mur B, clair chaud, sur la page d'essai (https://claude.ai/artifact/R38rYyBpRvPc2NiM3mykGz). Il ajoute une règle : avec un cadre, il y a une vitre, donc le reflet net de la fenêtre ; sans cadre, pas de vitre, et le papier brille, mais flou, sans contour de fenêtre.

- La photo :
  - 2000 × 2000 en JPEG, l'œuvre sur 84 % (Google demande 75 à 90 %) ;
  - fond uni et clair, ni texte ni logo ;
  - dessinée par le CSS des vignettes de collection (`artwork-object`, contexte `studio`) ;
  - la toile sans cadre, et le poster sous verre dans son cadre noir, comme sa carte.
- Thème (26bf7a0) :
  - `templates/product.photo-studio.liquid` (layout none, noindex), contrat avec le serveur en tête du fichier ;
  - `snippets/artwork-studio-index.liquid` reconnaît la photo à `photo-studio` dans le nom du fichier, nouveaux produits seulement ;
  - JSON-LD `image` = la photo, puis l'œuvre à plat ; og:image = la photo ;
  - la photo est tenue hors des photos du repli sans 3D.
- Serveur :
  - 317a186 : mode `photo-studio` du conteneur de rendu. Chromium charge lui-même la page ; il ne joint que la boutique et cdn.shopify.com, jamais `/cdn-cgi/`.
  - 739eb8f : l'essai du moteur 3D ne bloque plus l'image du conteneur (voir le ticket 08).
  - f060a7e : la photo est déposée sur Spaces, puis ajoutée au produit en 2e média, derrière l'œuvre, avec l'alt de l'œuvre. Refaite, elle remplace l'ancienne une fois prête. Un produit qui n'est pas en `oeuvre-3d` est refusé.
  - 099b2e4 : le Publisher demande la photo de la toile et celle du poster après la mise en vente, sans attendre. Coupe-circuit : `ARTWORK_STUDIO_PHOTO_DISABLED`.
  - 44bd8ff : commande `photo-studio` du workflow « Commande sur le serveur » ; « essai » = rendu et dépôt seulement.
- Vérifié le 18/11 :
  - la page en ligne, en toile, en poster encadré et en poster sans cadre, est identique aux photos validées (écart moyen 1,2 sur 255) ;
  - essai depuis le droplet sur la toile Bonsaï (JPEG de 683 Ko, écart moyen 1,8) et sur son poster : les deux rendus sont faits, rien n'est refusé. Shopify renvoie le droplet vers `/de-de/…`, ce qui ne change rien : la photo n'a pas de texte ;
  - JSON-LD et og:image du Bonsaï inchangés.
- Effet de bord voulu : Pinterest et Instagram prennent l'image 1 avant l'image 0 (`IMAGE_PRIORITY` [2, 3, 1, 0]). Ils publieront donc la photo studio d'un nouveau produit, une fois là.
- Reste, au 1er vrai produit :
  - la photo ajoutée en 2e média ;
  - le JSON-LD et l'og:image de sa fiche ;
  - le test des résultats enrichis de Google ;
  - rien de changé sur la fiche 3D, les cartes, le panier, « Mes j'aime » et les mails.
- Pas décidé : une photo par cadre en images de variantes. Pour le poster, la teinte du cadre est une propriété de la ligne, pas une variante.

## Une photo par cadre, pour Google Shopping (18/11/2026, pas en ligne)

Codé, en attente de la validation de Walid sur les captures (`photos-cadres/` du bloc-notes de la session : chaque cadre en 2000 px et en 200 px, le poster avec et sans cadre, la planche face aux photos de l'atelier, l'avant/après de la caisse).

- Les photos :
  - toile : la principale (sans cadre), puis une par autre cadre vendu, dans l'ordre de l'option 3 : `cadre-blanc`, `cadre-noir`, `cadre-argent`, `cadre-chene`, `cadre-noyer` ;
  - poster : la principale (cadre noir sous verre), puis `sans-cadre` (le papier, la brillance floue) ; la couleur du cadre reste une propriété de ligne.
- La caisse américaine en grand, pour la photo seulement (cartes, panier et « Mes j'aime » inchangés) :
  - quatre baguettes en onglet, la face plate, sans gradin ;
  - le fil du bois de la fiche 3D (`texture-chene-clair-cadre.jpg`) dans le sens de chaque baguette : le bois naturel, le noyer, l'argent brossé plus fin ; le blanc et le noir unis, comme dans la 3D ;
  - la lumière de la photo : arêtes claires en haut et à gauche, à l'ombre en bas et à droite ;
  - le jour à la teinte du cadre, aux angles vifs, jamais un trait sombre ;
  - teintes au milieu des baguettes, mesurées sur les rendus : celles de l'atelier à 1,6 près sur 255 (noir de la toile #4a4a4a, blanc #ececec, argent #9a9380, chêne #bcaa97, noyer #866554).
- Thème :
  - `templates/product.photo-studio.liquid` : un `[data-photo]` par photo, les unes sous les autres ; le cadre de chaque valeur d'option lu par `artwork-frame` ; prête une fois le bois chargé (`data-photo-erreur="bois"` sinon) ;
  - `snippets/artwork-object.liquid` : les baguettes, contexte `studio` seulement ;
  - `sections/main-product.liquid` : un nouveau produit se décrit en groupe de produits (`ProductGroup`), chaque variante avec sa taille, son cadre en `color`, son offre d'avant, et la photo de son cadre, retrouvée par son nom de fichier (`photo-studio-<handle>-cadre-<id>`, `…-sans-cadre` ; snippet `artwork-studio-index`, `photo:`), sinon l'image du groupe ; jamais l'image de la variante dans Shopify. Livraison et retours décrits une fois. Les produits de toujours gardent leur JSON-LD à l'octet près (relevé `scripts/fixtures/json-ld-produits-de-toujours.txt`) ;
  - `snippets/oeuvre-3d-stage.liquid` : aucune photo studio parmi les photos du repli sans 3D.
- Serveur (branche `photo-par-cadre`) : les photos de cadre ajoutées derrière la principale ; refaites, les anciennes partent une fois toutes les nouvelles prêtes et rangées. Aucune image n'est donnée aux variantes (décision du 18/11) : Shopify la montrerait au paiement, sur la page de commande, dans l'appli Shop, l'admin et les mails ; le cadre d'un poster est une propriété de ligne (un poster encadré en blanc y paraîtrait en noir) ; et la fiche porterait l'image de chaque variante. Pinterest et Instagram gardent la principale. Le conteneur de rendu ne change pas.
- Reste :
  - la validation de Walid, puis la mise en ligne : le thème, puis l'application ; refaire les photos des produits déjà publiés avec `artwork:studio-photo` ;
  - au 1er produit : le test des résultats enrichis de Google sur la fiche.
