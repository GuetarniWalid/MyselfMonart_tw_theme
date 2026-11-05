# 12: Vue dans une pièce, changement de taille

**What to build:** sur la nouvelle fiche, changer de taille fait reculer la caméra dans la scène du produit adaptée à cette taille (décision du 05/11 : un 30 × 40 sur un mur étroit, un grand format au-dessus d'un canapé), ou dans la scène par défaut si aucune n'est choisie. Le tableau y apparaît à sa vraie échelle face au mobilier, avec la cote en cm, et prend la lumière de la pièce (méthode 1 du ticket 11). Si les pièces ne sont pas retenues, ce ticket est abandonné et la fiche reste sur le mur neutre. Un bouton « Voir dans une pièce » ouvre la même vue. La photo de la pièce ne se charge que lorsqu'on en a besoin. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 07 (nouvelle fiche), 11 (bibliothèque de pièces)

**Status:** ready-for-agent

- [ ] Le changement de taille anime le tableau à la vraie échelle, avec la cote en cm, pour les 4 tailles de chaque format.
- [ ] Le bouton « Voir dans une pièce » s'utilise au clavier, et on revient à la vue de face.
- [ ] La photo de la pièce ne se charge qu'à la première ouverture : l'arrivée sur la fiche n'est pas ralentie.
- [ ] Sur mobile, la vue reste lisible et la barre d'achat reste visible.
