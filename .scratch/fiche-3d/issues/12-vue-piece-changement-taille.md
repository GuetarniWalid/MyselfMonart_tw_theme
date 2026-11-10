# 12: Changement de taille : la femme à côté du tableau (et vue dans une pièce)

**What to build:** sur la nouvelle fiche, changer de taille, ou ouvrir la Taille, montre une femme debout à côté du tableau, sur un mur clair, une pose par taille : le tableau y est posé à sa vraie échelle, avec la lumière de la photo, son ombre, sa tranche et la cote en cm (choix de Walid du 10/11, décision 10 ; avant, la caméra reculait dans une pièce, et le 30 × 40 y était ridicule sur un mur immense). Les photos ne se chargent qu'à la première ouverture de la Taille. Si les pièces du ticket 11 sont retenues, un bouton « Voir dans une pièce » ouvre en plus la scène du produit. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 07 (nouvelle fiche) ; 11 (bibliothèque de pièces) pour la seule vue dans une pièce.

**Status:** ready-for-agent (mise en scène faite sur la maquette le 10/11, à porter dans le thème)

- [ ] Le changement de taille anime le tableau à la vraie échelle, avec la cote en cm, pour les 4 tailles de chaque format. *(maquette : les 4 tailles du portrait 3:4 ; le paysage et le carré n'ont pas encore de poses)*
- [ ] Le bouton « Voir dans une pièce » s'utilise au clavier, et on revient à la vue de face.
- [ ] Les photos ne se chargent qu'à la première ouverture : l'arrivée sur la fiche n'est pas ralentie. *(maquette : aucune requête avant la Taille, vérifié)*
- [ ] Sur mobile, la vue reste lisible et la barre d'achat reste visible. *(maquette : 4 formats, vérifié)*

## Maquette du 10/11/2026 : la femme à côté du tableau

Demande transmise par le coordinateur : « une femme se tient à côté du tableau, sur un mur clair », sur quatre photos générées par Gemini et validées par Walid (4800 × 3584 px, 16 px/cm dans le plan du mur, même mur, plinthe, parquet et appareil ; un rectangle blanc à la place du tableau ; lumière du jour douce venue de la gauche).

**Fait** (`prototype/`, même lien d'Artifact que la maquette) :
- `src/poses.js` : les quatre poses, leurs fichiers et leurs mesures en px de la photo d'origine (rectangle, femme, tête, calque, bandes sans la femme le long des bords).
- `src/staging.js` : les quatre photos se posent au même endroit du mur (bord gauche en x = 0, pied du mur en y = 0), et le tableau de chaque taille s'accroche sur son rectangle, dans tous les plans : il ne glisse jamais sur le mur, et changer de taille fond une pose dans l'autre sans bouger la pièce. Le plan de la taille (`poseShot`) cadre pour la forme réelle de la zone au-dessus de la rangée : le tableau et ses cotes (hauteur à gauche, la femme est à droite ; largeur dessous quand elle n'a plus la place au-dessus), qui descendent sous le bouton « De face » s'ils tombaient dans son coin, la tête de la femme toujours, la femme en entier sur un écran en hauteur ; sur un écran large, le mur vide ne prend pas plus d'un cinquième de la largeur et la femme est coupée au plus bas à mi-cuisse. La vue prend le temps du plan habituel (900 ms) ; la vue de la pièce ne s'incline toujours pas au doigt.
- `src/scene.js` : la photo de la pose remplace celle du salon, en deux places (A et B) pour le fondu entre poses. Au-delà de ses bords, elle se prolonge par un miroir de sa bande sans la femme, à la lumière du bord (`pose-<taille>-lumiere.png`) : le cadrage peut montrer jusqu'à 80 cm de mur à gauche et 60 cm au-dessus, sans raccord visible. À droite, il ne le fait qu'en dernier recours : la femme y est près du bord (12 cm de mur libre pour le 90 × 120) et le miroir d'une bande si étroite se voit en rayures. Sous le sol de la photo, derrière la rangée et la barre d'achat, le parquet s'estompe dans sa lumière. Le calque de la femme (`pose-<taille>-femme.png`) est reposé sur le tableau, sur sa silhouette ramenée au mur : sa main passe devant le 90 × 120 (sous le 75 × 100, même encadré en chêne, ses doigts restent juste sous le cadre) ; l'ombre du tableau et l'occlusion de ses bords s'effacent là où elle est. Photos sans mipmaps, environ 17 Mo de mémoire graphique par pose.
- `src/maquette.js` : la pose de la taille en cours part dès qu'on approche la Taille, les trois autres ensuite, une à une, la 3D arrêtée. Le salon ne sert plus à la maquette (il reste pour le prototype du ticket 02) ; `fitRoom` est retiré. La cote de hauteur prend son étiquette à gauche de sa ligne (`.dim-h.is-left`). Crédit en pied de page mis à jour.
- `tools/poses-detourer.py` et `tools/poses-preparer.py` : la préparation des photos, sur le PC, reproductible (les fichiers publiés sont refaits à l'octet près).

**Préparation des photos.**
- Détourage : BiRefNet, licence MIT, modèle `ZhengPeng7/BiRefNet_HR-matting` téléchargé depuis son dépôt officiel sur Hugging Face, sur le processeur, environ 7 minutes par photo à 2048 px. Installés dans un environnement Python à part, hors du dépôt (`%TEMP%\birefnet`, 425 Mo de modèle) : PyTorch 2.15 et torchvision 0.29 pour processeur (dépôt officiel de PyTorch), transformers 4.57, timm, kornia, einops, Pillow, NumPy, SciPy et PyMatting 1.1.16 (licence MIT, couleurs de la femme sans le mur). Aucune clé, aucun service.
- Rectangle blanc effacé : le mur y est refait avec sa lumière prolongée depuis autour (membrane harmonique) et le grain du mur dégagé à gauche, raccordé sur 6 px. Un trait de crayon d'environ 25 cm, présent sous le rectangle sur les quatre photos, est effacé de la même façon. La femme est reposée par-dessus avec ses couleurs estimées : aucun liseré blanc autour de la main du 90 × 120.
- Poids : 2400 × 1792 px, JPEG à 80, 190 à 205 Ko par photo ; calques de 31 à 58 Ko, lumière 7 Ko. 982 Ko pour les quatre poses, chargés seulement à la première ouverture de la Taille.

**Écarts.**
- Les quatre photos ne placent pas le rectangle au même endroit (30 × 40 à 126 cm du bord gauche, les autres à 112,5 cm ; centre à 150 cm du sol, 140 cm pour le 90 × 120) : en changeant de taille, le tableau glisse d'un rectangle à l'autre en grandissant, pendant le fondu des poses.
- Le mur uni de la vue de face (233, 233, 232) est plus clair que celui des photos (200 à 228 près du tableau) : en arrivant dans la pose, le mur s'assombrit un peu, en fondu.
- Le rectangle du 75 × 100 et du 90 × 120 touche presque le haut de la photo : leur cote de largeur passe dessous, et sur un téléphone en hauteur la vue montre jusqu'à 60 cm de mur prolongé au-dessus du tableau, pour garder le visage de la femme à côté de l'œuvre (145 cm pour le 90 × 120 depuis la version 22, voir plus bas).
- Sur ordinateur, la zone est très large (2,5 : 1) : le 30 × 40 se voit avec la tête et les épaules de la femme, les grands formats avec la femme jusqu'aux hanches ; le 90 × 120 montre 68 cm de mur prolongé à gauche.
- Le bouton « De face » occupe le coin en haut à gauche de la zone : sur un téléphone, le tableau et ses cotes descendent sous lui, et la vue montre d'autant plus de mur au-dessus (jusqu'à 55 cm prolongés en 375 × 667). Sur ordinateur, il ne gêne pas.
- Le paysage et le carré n'ont pas de poses : à générer comme les quatre portraits si la nouvelle fiche les reçoit.

**Vérifié** (tests, Chrome sans écran, carte graphique du PC, scripts hors dépôt) :
- Tests du directeur (`tests/poses.test.js`) : la pose seule de la taille choisie, le tableau exactement sur le rectangle (cadre ou non), sans glisser entre la face et la pose, le fondu entre deux poses (parts qui somment à 1, sans retour), la cote de hauteur à gauche dans tous les plans ; pour les quatre formes de zone, les 4 tailles, avec et sans cadre : coins de l'écran dans la photo prolongée, jamais sous son sol ni au-delà de son bord droit, tableau, cotes et étiquettes entiers, hors du coin du bouton « De face », tête toujours visible, pieds sur un écran en hauteur, pas de mur vide inutile. Sans poses, le salon reste comme avant.
- 76 contrôles dans la vraie page, sur les quatre formats : aucune pose chargée avant la Taille (puis 12 fichiers, 982 Ko) ; chaque taille ouverte, la pose seule à la place du salon ; tableau entier au-dessus de la rangée ; rien sous le bouton « De face » ; cotes visibles, hauteur à gauche ; fondu en plein changement 75 × 100 → 90 × 120 (deux poses mêlées) ; console vide.
- Captures regardées : chaque taille sur les quatre formats, le fondu, la main devant le 90 × 120 sur téléphone et ordinateur, le 75 × 100 encadré en chêne, les bords de la photo prolongée (haut sur téléphone, gauche et droite sur ordinateur). Agrandissements des détourages : les mains et les bras sur fond sombre et sur fond clair (aucun liseré), les cheveux sur magenta ; le rectangle effacé et ses bords, à 2 fois.
- L'ancien prototype (`index.html`, ticket 02) garde son salon, console vide. Les 50 contrôles généraux, les 82 de la rangée ouverte, les 181 de la mise en scène à l'ouverture, les 58 des légendes et les 100 du jour repassent.

**Pas vérifié** : un vrai téléphone (mémoire des quatre photos, fluidité du fondu), Safari, le lecteur d'Artifacts de claude.ai.

### Version 22 : la femme entière en largeur (retour sur la version 21, 10/11)

Version 21 vérifiée par le coordinateur (mains et cheveux propres, main devant le 90 × 120, fondu d'environ 0,3 s, mur prolongé invisible, poses chargées à l'approche de la Taille), sauf un défaut : en 90 × 120, sur les trois téléphones, la main tendue côté droit sortait du cadre, et le pied droit aussi en 390 × 844. C'est la pose bras grands ouverts : le geste doit se voir en entier.

**Fait** (`poseShot`, `staging.js`) :
- La femme entière en largeur, mains comprises, avec la marge des autres cadrages (4 % de la largeur), fait partie de ce qui doit se voir, sur tous les formats et toutes les tailles. Le centrage de côté ne change pas : seules les mains le décalent quand il le faut.
- En 90 × 120 sur téléphone, le tableau rapetisse pour ça : en 390 × 844, la vue passe de 284 à 369 cm de haut (le tableau de 242 à 187 px de haut), le mur se prolonge jusqu'à 145 cm au-dessus de la photo, jamais sous son sol ; en 375 × 667, la vue se décale seulement vers la droite (même taille).
- Coupée, la femme l'est de préférence à mi-cuisse et au plus bas au-dessus du genou ; si la largeur à montrer l'interdit, elle se voit entière. C'est le cas du 90 × 120 en 375 × 553 : avec ses bras ouverts et le bouton « De face », la coupe tomberait aux chevilles ; la vue la montre entière, pieds compris (le tableau de 214 à 147 px de haut).
- Ordinateur et autres tailles : cadrages identiques ; en 60 × 80, sur 390 × 844 et 375 × 553, la vue glisse de moins d'un centimètre pour garder la marge à droite de la femme.

**Vérifié** : 217 tests (la femme entière en largeur dans chaque zone, jamais coupée sous le genou) ; 69 contrôles sur les trois téléphones, dont la femme entière en largeur pour chaque taille, console vide ; captures du 90 × 120 et du 30 × 40 sur les trois, et le mur prolongé au-dessus du 90 × 120 en 390 × 844, contraste poussé : des plis à peine visibles, invisibles à l'œil normal. Les 58 contrôles des légendes repassent ; ceux de la mise en scène à l'ouverture aussi, sauf deux départs en retard sur ordinateur au premier passage (482 et 707 ms, dont le contour du poster, que la règle ne touche pas ; le PC était chargé), 64 sur 64 au second.

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.
