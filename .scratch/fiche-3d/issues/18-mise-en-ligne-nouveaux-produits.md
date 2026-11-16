# 18: Mise en ligne pour les nouveaux produits

**What to build:** toutes les nouvelles toiles et tous les nouveaux posters passent par le nouveau chemin : une image, l'écran de validation, la nouvelle fiche. Les anciens produits ne changent pas. Pendant les premières semaines, on suit les ajouts au panier et les commandes des nouveautés face aux nouveautés des mois précédents, au même âge, avec les rapports Shopify et PostHog. Des enregistrements de visites montrent si les visiteurs trouvent le bouton et utilisent la 3D. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 06 (PostHog), 10 (cadres et bordures), 13 (pièce et collection), 14 (poster jumeau), 15 (photos et données Google), 16 (agrandissement), et 17 si la mesure du ticket 08 l'exige

**Status:** ready-for-agent

- [ ] Le Publisher utilise le nouveau chemin par défaut pour les toiles et les posters.
- [ ] Les anciens mockups ne servent plus pour les toiles ni les posters, et le code devenu inutile est retiré.
- [ ] Un point envoyé à Walid au bout de 2 semaines, puis de 4 : chiffres et observations.
- [ ] Aucune fiche existante n'a changé de modèle de page.

Un produit qui n'a que l'œuvre à plat (relevé le 15/11/2026, essai des vignettes de collection) :

- [ ] La fiche 3D s'affiche avec cette seule image. Aujourd'hui, `main-product.liquid` attend l'image à plat en 2e position (`media[1]`).
- [x] Les vignettes de collection montrent l'œuvre en objet : la toile de face, sans cadre, avec son ombre et sa lumière ; le poster sous verre, avec un reflet discret au défilement (choix de Walid du 15/11). Code et notes de l'essai du 15/11 dans le dossier `vignettes-collection`. Les cartes des anciens produits ne changent pas. Posé dans le thème le 16/11/2026 (f5226d7, 2788534) : rien ne se voit tant qu'aucun produit n'a le modèle `oeuvre-3d`.
- [x] Les données Google de la page collection (`ItemList` de `main-collection-product-grid.liquid`) et le texte alternatif de la carte prennent la 1re image pour ces produits (16/11/2026, avec les vignettes).
- [x] « Mes j'aime » montre ces œuvres comme la collection (16/11/2026). Il n'y a plus de carte modèle : chaque carte est celle de la collection, rendue par Shopify dans le contexte du produit. C'est la section `my-likes-card`, appelée par la Section Rendering API (`/products/<handle>?section_id=my-likes-card`, derrière le préfixe de langue et de marché). Trois défauts relevés en ligne le même jour disparaissent avec elle :
  - toutes les cartes affichaient le prix du produit modèle (39,90 €) ;
  - le titre complet, lu par les lecteurs d'écran, avait disparu ;
  - un seul produit introuvable bloquait le chargeur.

  Reste à faire après le déploiement : vérifier la page en ligne. Ce changement touche tout de suite tous les produits, anciens compris, et le banc ne rendait le Liquid qu'avec liquidjs.
- [x] Le panier montre ces œuvres (16/11/2026) :
  - la vignette de la page panier vient de l'œuvre à plat (snippet `artwork-flat-index`) ;
  - le format des tableaux proposés en lot dans le tiroir en vient aussi ;
  - les produits de toujours restent identiques à l'octet près (banc : 970 paniers).
- [ ] Reflet des posters essayé sur un vrai Firefox et un Safari d'avant la version 26 : le banc du 16/11 n'a fait tourner le chemin de secours que dans Chrome.
- [ ] Au 1er produit passé au modèle `oeuvre-3d`, sa carte regardée en ligne, dans une collection et dans la recherche : le banc du 16/11 rendait le Liquid avec liquidjs, pas avec Shopify.
