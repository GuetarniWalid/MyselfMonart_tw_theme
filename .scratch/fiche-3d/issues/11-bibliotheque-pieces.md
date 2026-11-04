# 11: Bibliothèque de pièces

**What to build:** une dizaine de pièces photoréalistes, générées une fois par Gemini (déjà utilisé par le backend), avec un mur libre. Par exemple : deux salons, une chambre, une chambre de bébé, une chambre d'enfant, une cuisine, une salle à manger, un bureau, une entrée. Walid garde les meilleures. Chaque pièce est réglée une fois :
- la position et la perspective du mur ;
- l'échelle en cm, pour que le tableau y soit à sa vraie taille ;
- la direction et la teinte de la lumière ;
- la zone d'accrochage.

Les pièces sont rangées dans Shopify, une fiche par pièce, avec une pièce par défaut : un salon. Contexte et décisions : README du dossier `fiche-3d`.

Exigences de Walid après avoir vu le prototype (04/11) :
- **Haut de gamme :** la pièce provisoire du prototype (canapé, plante) fait bas de gamme et casse l'effet des animations. Les pièces doivent avoir la qualité d'un magazine de décoration.
- **Petits formats :** un 30 × 40 ne doit pas paraître ridicule. On montre qu'il est petit sans exagérer : cadrage resserré, ou meuble plus petit (console, commode) selon la taille, toujours à la vraie échelle.
- **Murs :** il prévoit des décors variés : africains, cuisine, chambre d'enfant à motifs. Chaque pièce a sa matière de mur (papier peint, carrelage, motifs), la même de près et de loin. L'essai des murs du prototype (ticket 02) dit comment le régler.

Ce que fait Walid : trier les pièces.

**Blocked by:** 02 (prototype validé, qui confirme la méthode d'accrochage)

**Status:** ready-for-agent

- [ ] Une page accroche le Bonsaï dans chaque pièce, à la bonne échelle, avec une ombre et une lumière cohérentes, aux 4 tailles.
- [ ] Le tri de Walid est fait et les pièces refusées sont retirées.
- [ ] Chaque pièce est rangée dans Shopify avec son type (salon, chambre de bébé, cuisine…) et ses réglages, lisibles par la fiche et par le serveur.
- [ ] Ajouter une pièce plus tard ne demande que sa génération et son réglage.

## Notes de réalisation : série test (04/11/2026)

**Galerie à trier par Walid :** https://myselfmonart-space.fra1.digitaloceanspaces.com/bench/pieces/galeries/2026-11-04-736c36d26a1d/index.html

12 pièces retenues sur 13 images. Chaque pièce y paraît seule, puis avec le Bonsaï à plat en 30 × 40 et en 90 × 120. Rien n'est rangé dans Shopify : la suite attend le tri.

- Pages de travail (toutes les images, aperçus quadrillés, prompts) : [passage 1](https://myselfmonart-space.fra1.digitaloceanspaces.com/bench/pieces/2026-11-04-7b7e49692a92/index.html), [passage 2](https://myselfmonart-space.fra1.digitaloceanspaces.com/bench/pieces/2026-11-04-83ebaa2bde60/index.html). Le prompt complet de chaque image est dans `sorties/<clé>.json`, à côté de l'image.
- Backend : commit `4739775` sur `main`. Déploiement `41853661409` réussi : tous les tests dorés et le build TypeScript sont passés. Prettier n'a pas tourné : ni le PC ni le déploiement ne le lancent.
- Banc : `scripts/banc-pieces.js`, workflow manuel `banc-pieces.yml`. L'entrée `plan` génère (payant), `selection` compose la galerie (gratuit). Les prompts passent par `plan` : en changer un ne redéploie pas la production. Modules `app/Services/Gemini/imagePricing.ts` et `app/Services/RoomPlacement`, tests `gemini-image-pricing.js`, `room-placement.js` et `banc-pieces.js`.
- Le stockage du banc du ticket 03 passe dans `scripts/lib/banc.js`. Son essai à blanc tourne encore. Sa lecture échoue désormais franchement en cas de panne : sa reprise réelle n'a pas été rejouée.
- Passages GitHub : `41854858586` (4 images), `41856386118` (9 images), `41858164167` (galerie, gratuit).
- Droit `workflow` ajouté au jeton `gh` du PC par Walid le 04/11, qui a choisi de le garder.

### Prix et coût

Prix vérifié le 04/11 sur la page de Google, https://aistudio.google.com/docs/pricing (`ai.google.dev/gemini-api/docs/pricing` y redirige). Secret du backend : `GEMINI_API_KEY`.

| Modèle | Rôle dans le backend | Prix 4K publié | Images | Coût moyen | Durée |
|---|---|---|---|---|---|
| `gemini-3-pro-image` | haute fidélité | 0,24 $ | 11 | 0,249 $ | 31 à 37 s |
| `gemini-3.1-flash-image` | standard | 0,151 $ | 2 | 0,153 $ | 24 à 29 s |

**Coût de la série : 3,04 $**, sous le plafond de 4,50 $ (moins de 5 € tant que l'euro vaut plus de 0,90 $). Il est calculé d'après les jetons comptés par Google et son tarif ; la facture exacte est sur le compte Google. L'écart avec le prix publié vient de la réflexion et du texte, facturés en plus. Google a bien compté 2 000 et 2 520 jetons par image en 4:3, comme sur sa page. Le plafond couvre tous les passages, grâce au registre `bench/pieces/depenses.json`. Une relance n'a pas été nécessaire.

### Résultat face au cahier des charges

| Exigence | Résultat |
|---|---|
| Niveau magazine | Très au-dessus de la pièce provisoire. Le jugement final revient à Walid. |
| Vue de face, verticales droites | Réussi sur les 13. Plafond de niveau à 2 px près sur 1 600, sauf `bebe-motif`, où la mesure a pris une autre moulure ; l'image est droite à l'œil. |
| Mur libre, ni œuvre, ni texte, ni personne | Réussi sur les 13, sauf le rectangle fantôme ci-dessous. |
| Résolution | 4800 × 3584 px, la plus haute disponible. Nette à 100 %, Pro un peu plus que Flash. |
| Meuble de dimensions courantes | Partiel : la largeur déborde. Canapé de 220 cm demandé : environ 330 cm avec « long, low sofa », 270 cm une fois décrit par son rapport. Console de 120 cm : environ 135 cm. Lit de 130 cm : 140 à 150 cm. |
| Fenêtre hors champ | Raté sur 8 images sur 13, même avec une consigne explicite. Sans gêne : elle reste au bord gauche et un recadrage la retire. |
| Zone libre centrée | Centrée en largeur. En hauteur, son centre est plus haut que celui de la photo (voir plus bas). |

**Image écartée : `salon-plan`.** Un rectangle fantôme d'environ 130 × 126 cm s'y dessine au milieu du mur. Il se voit à l'œil et se mesure : marche de luminosité de 3,3 contre 1,9 au plus sur les murs unis. Il correspond à la « zone de 150 × 150 cm » du prompt.

### Meilleure formulation

Un récit de magazine, pas une fiche technique. Le récit donne un mur plus riche, et la fiche chiffrée a fait dessiner la zone sur une image sur deux. Ce qui marche, d'après 13 images seulement :

- Décrire le mur nu par ce qu'il est (« one continuous surface », « completely bare and uninterrupted »), sans jamais chiffrer la zone libre.
- Dire que l'image servira de fond à une galerie d'art : aucune œuvre n'est apparue.
- Donner le meuble par son rapport (« three times as wide as it is tall ») et ne pas écrire « long ».
- Parler en photographe : « square-on », « 35 mm shift lens », « strict one-point perspective », et la largeur de mur couverte.

Modèle : Pro, pour sa finesse à 100 %, puisqu'une pièce ne se génère qu'une fois. Flash fait presque aussi bien à taille d'écran pour 0,10 $ de moins par image. Il n'y a que deux images Flash : c'est une impression, pas une mesure.

### Échelle

Mesurée à l'œil sur les aperçus quadrillés : hauteur sous plafond (2,70 m demandés), recoupée par la hauteur du meuble. **La largeur du meuble n'est pas fiable** : caler le salon clair sur un canapé de 220 cm aurait grossi le tableau de 50 %. Marge d'erreur : ± 8 %, et ± 10 % pour les cuisines, où le pied du mur est caché. Elle vient surtout de la hauteur réelle du plafond (2,60 à 2,80 m) et de la lecture des lignes.

| Pièce | Mur dans la largeur (cm) | Centre du tableau (y) |
|---|---|---|
| `salon-recit` | 465 | 0,425 |
| `salon-sombre` | 450 | 0,38 |
| `salon-flash` | 460 | 0,425 |
| `entree-recit` | 410 | 0,43 |
| `entree-plan` | 400 | 0,425 |
| `entree-flash` | 425 | 0,405 |
| `bebe-uni` | 470 | 0,405 |
| `bebe-motif` | 455 | 0,405 |
| `cuisine-zellige` | 485 | 0,43 |
| `cuisine-claire` | 440 | 0,43 |
| `afrique-terre` | 505 | 0,395 |
| `afrique-motif` | 497 | 0,41 |

Le centre est partout à x = 0,5, et y est compté depuis le haut de la photo.

### Pour la suite du ticket, à ne pas faire dans cette étape

- Poser un papier peint ou un carrelage sur le mur d'une pièce demandera un masque du mur par pièce : le motif ne doit pas traverser le meuble (constat de l'essai de murs du prototype).
- Le point d'accrochage devra dépendre de la taille. Le même centre pour tous fait flotter un 30 × 40 un peu haut, alors qu'un 90 × 120 touche presque le plan de travail ou la console.
- Le meuble a de la profondeur et pas le mur : la 3D doit se caler sur le plan du mur, pas sur le devant du meuble.

### Point du cahier des charges à connaître

Un meuble de 90 cm et une zone libre de 150 cm placent le centre de la zone à 165 cm du sol au moins, soit 30 cm au-dessus de la caméra (135 cm). La zone ne peut donc pas être exactement au centre en hauteur. C'est sans gravité : le recadrage en portrait coupe les côtés et garde la hauteur, donc c'est le centrage horizontal qui compte.
