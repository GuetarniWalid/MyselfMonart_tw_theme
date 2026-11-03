# 01: Corriger l'épaisseur annoncée des toiles

**What to build:** les fiches toiles annoncent aujourd'hui une profondeur de 3 cm. Le châssis réel fait 2 cm (confirmé par Walid le 03/11/2026), comme le montre déjà la 3D de la fiche. Tout texte de la boutique qui donne l'épaisseur des toiles dit désormais 2 cm, dans toutes les langues. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Plus aucune mention de 3 cm pour l'épaisseur des toiles : textes des modèles de page, traductions (fr, en, de, es, nl), réglages du thème et métachamps, relus un par un, car le hook pre-commit ne voit pas les métachamps.
- [ ] Si les données lues par Google mentionnent l'épaisseur, elles disent 2 cm.
- [ ] Vérifié sur une fiche toile en ligne après le déploiement, en français et dans une autre langue.
