# 11: Bibliothèque de pièces

**What to build:** une dizaine de pièces photoréalistes, générées une fois par Gemini (déjà utilisé par le backend), avec un mur libre. Par exemple : deux salons, une chambre, une chambre de bébé, une chambre d'enfant, une cuisine, une salle à manger, un bureau, une entrée. Walid garde les meilleures. Chaque pièce est réglée une fois :
- la position et la perspective du mur ;
- l'échelle en cm, pour que le tableau y soit à sa vraie taille ;
- la direction et la teinte de la lumière ;
- la zone d'accrochage.

Les pièces sont rangées dans Shopify, une fiche par pièce, avec une pièce par défaut : un salon. Contexte et décisions : README du dossier `fiche-3d`.

Ce que fait Walid : trier les pièces.

**Blocked by:** 02 (prototype validé, qui confirme la méthode d'accrochage)

**Status:** ready-for-agent

- [ ] Une page accroche le Bonsaï dans chaque pièce, à la bonne échelle, avec une ombre et une lumière cohérentes.
- [ ] Le tri de Walid est fait et les pièces refusées sont retirées.
- [ ] Chaque pièce est rangée dans Shopify avec son type (salon, chambre de bébé, cuisine…) et ses réglages, lisibles par la fiche et par le serveur.
- [ ] Ajouter une pièce plus tard ne demande que sa génération et son réglage.
