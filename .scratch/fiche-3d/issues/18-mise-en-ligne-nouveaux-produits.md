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
- [ ] « Mes j'aime » montre ces œuvres comme la collection : `my-likes.js` remplit certaines cartes avec l'ancien balisage. À régler avant de passer le 1er produit au modèle `oeuvre-3d` : `my-likes.liquid` prend pour modèle la carte du 1er produit de la boutique (`collections.all.products.first`), que `my-likes.js` recopie pour chaque œuvre aimée en ne changeant que l'image. Si ce 1er produit est un nouveau produit, toutes les cartes aimées, anciennes comprises, prennent son cadre et ses proportions.
- [ ] Le panier montre ces œuvres : la page panier (`page-cart-items.liquid`, ligne 32) n'affiche la vignette que s'il existe une 2e photo (`images[1]`), et les suggestions de lot du tiroir panier (`tw-cart-drawer.liquid`, ligne 113) lisent le format de la 2e photo sans repli.
- [ ] Reflet des posters essayé sur un vrai Firefox et un Safari d'avant la version 26 : le banc du 16/11 n'a fait tourner le chemin de secours que dans Chrome.
- [ ] Au 1er produit passé au modèle `oeuvre-3d`, sa carte regardée en ligne, dans une collection et dans la recherche : le banc du 16/11 rendait le Liquid avec liquidjs, pas avec Shopify.
