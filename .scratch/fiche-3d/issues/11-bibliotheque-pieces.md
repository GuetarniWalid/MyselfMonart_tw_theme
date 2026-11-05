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

### Test d'intégration du tableau (05/11/2026)

Walid a jugé la galerie « catastrophique » : le tableau gardait sa propre lumière, comme un autocollant, surtout dans les pièces sombres. Le défaut venait de la composition, pas des pièces. Deux méthodes ont été comparées sur le salon vert, l'intérieur africain terre et le salon clair, en 30 × 40 et 75 × 100.

**Page de comparaison :** https://myselfmonart-space.fra1.digitaloceanspaces.com/bench/pieces/integration/2026-11-05-1a086c7d3a43/index.html

- **Coût : 1,75 $**, calculé d'après les jetons comptés par Google : 6 toiles en 4K à 0,246 $ et 2 en 2K à 0,14 $. La méthode 1 ne coûte rien. Le plafond de 2 € a été compté à 1,80 $, ce qui porte le plafond du script à 4,84 $. Registre : 4,80 $ en tout.
- **Backend :** commits `ade4f09` et `049ab5a` sur `main`. Déploiements `42003069955` et `42008611503` réussis, tous les tests dorés et le build verts. Prettier est passé sur les fichiers modifiés, avec une copie déjà présente dans le cache du PC.
- **Code :** `app/Services/RoomRelight`, `scripts/banc-integration.js`, entrée `integration` du workflow. Ce que les bancs partagent est dans `scripts/lib/banc.js`.

**Méthode 1, la lumière calculée.** En linéaire : le mur libre donne le dégradé, une référence claire donne l'exposition et la teinte. Plus d'effet autocollant en vue entière, à toutes les tailles et dans les trois pièces. La photo reste intacte. Au gros plan, le tableau reste un peu plat, faute de tranche : la 3D l'apportera par sa géométrie. Le dégradé du mur a dû être tempéré (`force` à 0,6) : sur le salon vert il va de 1 à 20, alors que les deux coussins blancs restent presque égaux. La courbe de tonalité de la photo l'exagère dans les sombres.

**Méthode 2, la toile de Gemini.** La plus crédible au gros plan en 75 × 100 : vraie ombre, tranche. Mais elle n'est pas fiable :
- Sur la photo entière, Gemini a ignoré la taille des trois 30 × 40 : il a dessiné une toile trois fois trop grande, et même en paysage dans l'intérieur africain.
- Un cadrage serré (220 cm de mur) rétablit la taille, testé sur 2 pièces. Sur l'intérieur africain, il lisse le mur autour du tableau, décale la toile de 2,7 cm et garde un blanc froid : ce rendu fait encore autocollant. Le plafond n'a pas permis ce second essai sur le salon clair.
- Il reste neutre dans la pièce orange, sans prendre sa chaleur.
- Il ne décale pas l'image (1 px au plus sur 1 600), mais il change le reste de la photo de 5 à 9 niveaux en moyenne. Seuls les abords de la toile sont donc repris, en fondu.

**Exposition trouvée, un blanc parfait valant 1 :**

| Pièce | Méthode 1 (rouge, vert, bleu) | Toile de Gemini, 75 × 100 |
|---|---|---|
| Salon vert | 0,78 0,71 0,65 | 0,72 0,69 0,63 |
| Intérieur africain | 0,67 0,54 0,48 | 0,75 0,76 0,76 |
| Salon clair | 0,72 0,64 0,58 | 0,71 0,65 0,58 |

Les deux méthodes concordent sur les salons, sans s'être concertées : le calage sur une référence claire tient. L'écart de l'intérieur africain est une vraie différence de teinte. La référence y est un lin beige, qui réchauffe peut-être trop la méthode 1 ; Gemini, lui, reste trop froid.

**Direct ou à l'avance :**
- **Méthode 1, en direct dans la 3D.** Une pièce tient en une vingtaine de nombres, calculés une fois et sans frais. Le shader les applique à l'œuvre à n'importe quelle taille, et le changement de taille reste continu. Travail : repérer à la main une zone de mur et une référence claire, quelques minutes par pièce.
- **Méthode 2, à l'avance, par pièce et par taille.** 0,25 $ pour un grand format, 0,14 $ pour un petit en cadrage serré. Pour 10 pièces, 4 tailles et 3 formats : 120 images, environ 25 $ avant reprises et tri à l'œil. Chaque taille est une image à part : pas de changement de taille continu.

**Avis :** méthode 1 pour la fiche. Une toile de Gemini par pièce peut servir à contrôler son exposition, pour 0,25 $.

**Réglages de la méthode 1, pièce par pièce** (zones de 0 à 1 dans la photo) :

| Pièce | Mur libre (x0, y0, x1, y1) | Référence claire | Albédo | Point du mur voisin |
|---|---|---|---|---|
| `salon-sombre` | 0,10 0,08 0,76 0,58 | coussins : 0,27 0,66 0,31 0,70 et 0,69 0,66 0,73 0,70 | 0,85 | 0,29 0,56 et 0,71 0,56 |
| `afrique-terre` | 0,08 0,12 0,82 0,56 | matelas : 0,32 0,71 0,68 0,74 | 0,70 | 0,50 0,53 |
| `salon-recit` | 0,06 0,14 0,82 0,62 | dossier : 0,35 0,68 0,55 0,73 | 0,80 | 0,47 0,60 |

Partout : `force` 0,6 ; ombre décalée de 2,6 et 2,4 cm, flou 1,5 cm, force 0,7 ; contact décalé de 0,25 et 0,35 cm, flou 0,4 cm, force 0,75 ; flou de l'œuvre 1,6 px en 4K ; voile 0,02 ; blanc de l'œuvre 0,9.

**Limites :** trois pièces, une seule œuvre, jugées à l'œil. `force` et les réglages d'ombre sont choisis à la main. Caméra centrée et mur de face, la tranche de 2 cm n'est pas visible : la méthode 1 ne la dessine pas.

### Pour la suite du ticket, à ne pas faire dans cette étape

- Poser un papier peint ou un carrelage sur le mur d'une pièce demandera un masque du mur par pièce : le motif ne doit pas traverser le meuble (constat de l'essai de murs du prototype).
- Le point d'accrochage devra dépendre de la taille. Le même centre pour tous fait flotter un 30 × 40 un peu haut, alors qu'un 90 × 120 touche presque le plan de travail ou la console.
- Le meuble a de la profondeur et pas le mur : la 3D doit se caler sur le plan du mur, pas sur le devant du meuble.

### Point du cahier des charges à connaître

Un meuble de 90 cm et une zone libre de 150 cm placent le centre de la zone à 165 cm du sol au moins, soit 30 cm au-dessus de la caméra (135 cm). La zone ne peut donc pas être exactement au centre en hauteur. C'est sans gravité : le recadrage en portrait coupe les côtés et garde la hauteur, donc c'est le centrage horizontal qui compte.
