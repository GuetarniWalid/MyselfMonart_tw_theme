# 19 : Fiche galerie — ossature, modèle caché et présentation

**What to build:** le socle de la nouvelle page des produits 3D, sans rien changer pour les clients : un modèle caché, visible seulement à l'adresse d'un produit suivie de `?view=oeuvre-galerie`, avec la scène 3D et la pilule d'achat d'aujourd'hui, puis le premier bloc de la maquette, la présentation.

La référence est la maquette v13 : `.scratch/fiche-3d/galerie/proto/index.html` (section `.intro`, et les variables de couleur et de typo en tête de sa feuille de style). Notes : `.scratch/fiche-3d/galerie/README.md` (« Parti pris », « Ce que montre la maquette », « La version poster », « La mise en place sur le vrai site »).

## Le modèle caché

- Un nouveau modèle de produit, `oeuvre-galerie`. Les produits gardent leur modèle `oeuvre-3d` : rien ne leur est réattribué. La page se voit en ajoutant `?view=oeuvre-galerie` à l'adresse d'un produit `oeuvre-3d`.
- Dans cette vue, tout ce qui dépend du modèle `oeuvre-3d` marche comme sur la fiche actuelle : la scène 3D, le fil d'Ariane en capsule, la pilule d'achat, le bouton du panier, la bascule Toile / Poster (qui reste dans la vue de test en passant au jumeau), le panier.
- Le modèle garde, dans cet ordre, le fil d'Ariane puis le bloc principal du produit (la scène 3D). Dans le bloc principal, il garde le titre (le seul `h1` de la page), le bloc Trustpilot (les étoiles de Google en dépendent), le titre court avec le « j'aime », l'achat et le sélecteur caché. Il n'y met plus les volets, la description ni les arguments : ils reviendront dans le ticket 22.
- Les données lues par Google (produit, fil d'Ariane, balises) restent exactement celles de la fiche actuelle.

## La présentation

Sous la scène 3D, comme dans la maquette :
- la collection du produit, en pastille, qui mène à la collection ;
- le titre court en très grand, son dernier mot en gras ;
- le titre complet, en petit dessous : c'est le `h1`, inchangé ;
- les étoiles Trustpilot et le « j'aime » ;
- cinq lignes de fiche. Toile : Support « Toile d'art tendue à la main », Châssis « Bois massif, 2 cm », Formats, Fabrication « Conçu en France, imprimé en Europe », Livraison « Offerte, sous 7 jours ouvrés ». Poster : Support « Papier photo 250 g/m² », Cadre « En option : blanc, noir, chêne vieilli ou noyer », puis les trois mêmes. La ligne Formats se lit dans les tailles du produit (« De 30 × 40 à 90 × 120 cm »).
- Sur ordinateur, le titre à gauche et la fiche à droite ; sur téléphone, l'un sous l'autre.

## Le socle pour les tickets suivants

- Les styles de la nouvelle page vivent dans leur propre fichier, chargé seulement par ce modèle : la maquette pèse 15 Ko de styles compressés, et la feuille commune du site ne doit pas grossir pour toutes les pages. C'est une exception voulue à la règle « Tailwind seulement » du skill ; la noter dans le skill ou le README.
- Les couleurs et la typo de la maquette (encre, crème, ciel, rose, soleil, menthe, lilas, pêche ; Albert Sans, déjà chargée par la scène 3D) sont posées une fois, pour toutes les sections à venir.
- Le script de la page : des éléments personnalisés dans un fichier d'`assets`, qui démarrent à leur arrivée dans la page et se nettoient à leur départ. Après la bascule Toile / Poster, tout le contenu sous la scène est remplacé et aucun script en ligne n'est rejoué.
- Les textes fixes de la nouvelle page vont dans les fichiers de langue, sous `sections.mma.galerie`, dans les cinq langues. Les textes éditoriaux qui existent déjà dans le modèle (volets, questions, avis) restent des blocs du modèle.
- Un réglage du bloc principal dit « page galerie » : les styles s'y accrochent, pas au nom du modèle, pour que la bascule finale (ticket 27) soit un simple échange de modèle.

## À respecter

- Les autres modèles de produit et la fiche `oeuvre-3d` actuelle rendent exactement le même HTML qu'avant (les tests du dépôt, `npm test`, verrouillent déjà les données Google des produits de toujours).
- Les sections communes (fil d'Ariane, avis, recommandations, questions, badges) ne sont pas modifiées.
- Conventions du skill `shopify-section-dev`, règles de `CLAUDE.md` (note Trustpilot par les jetons, jamais en dur).
- À la livraison : pousser les sections avant le modèle (Shopify refuse un modèle qui cite une section qu'il ne connaît pas encore).

**Blocked by:** rien

**Status:** ready-for-agent

- [ ] `…/products/<produit oeuvre-3d>?view=oeuvre-galerie` montre la scène 3D, la pilule, la capsule et la présentation de la maquette, pour une toile et pour un poster, sur téléphone et sur ordinateur.
- [ ] Sans `?view`, la fiche est exactement celle d'aujourd'hui ; les fiches des autres produits aussi.
- [ ] Un seul `h1`, le même qu'aujourd'hui ; les données Google de la page sont les mêmes que sur la fiche actuelle.
- [ ] La bascule Toile / Poster, l'ajout au panier depuis la pilule et le « j'aime » marchent dans la vue de test.
- [ ] `npm test` passe ; la vérification des traductions passe ; la feuille commune du site n'a pas grossi de plus de quelques centaines d'octets.
