# 12: Vue dans une pièce, changement de taille

**What to build:** sur la nouvelle fiche, changer de taille fait reculer la caméra dans la pièce du produit, ou dans la pièce par défaut si aucune n'est choisie. Le tableau change de taille sous les yeux, à sa vraie échelle face au mobilier, avec la cote en cm. Un bouton « Voir dans une pièce » ouvre la même vue. La photo de la pièce ne se charge que lorsqu'on en a besoin. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 07 (nouvelle fiche), 11 (bibliothèque de pièces)

**Status:** ready-for-agent

- [ ] Le changement de taille anime le tableau à la vraie échelle, avec la cote en cm, pour les 4 tailles de chaque format.
- [ ] Le bouton « Voir dans une pièce » s'utilise au clavier, et on revient à la vue de face.
- [ ] La photo de la pièce ne se charge qu'à la première ouverture : l'arrivée sur la fiche n'est pas ralentie.
- [ ] Sur mobile, la vue reste lisible et la barre d'achat reste visible.
