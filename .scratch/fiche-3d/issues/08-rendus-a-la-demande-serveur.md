# 08: Rendus à la demande sur le serveur

**What to build:** le serveur du backend transforme une image à plat en photos d'une toile, avec exactement le moteur de la fiche (ticket 07). Il rend quatre photos :
- de face sur fond clair, la future 1re image, comme aujourd'hui le tableau sur fond blanc ;
- de trois-quarts, avec la tranche ;
- un gros plan de la matière ;
- un coin du cadre.

Le rendu tourne à la demande, un à la fois, jamais pendant le jugement du studio des posters personnalisés. Il ne gêne ni le SAV ni le Publisher. On mesure sa mémoire et sa durée réelles sur le serveur. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 07 (moteur 3D réutilisable)

**Status:** ready-for-agent

- [ ] Une commande ou une route reçoit une image à plat et rend les quatre photos en haute définition.
- [ ] Les photos sont identiques à ce que montre la fiche pour les mêmes réglages.
- [ ] File d'attente : un rendu à la fois, jamais en même temps que le studio.
- [ ] Mémoire maximale et durée mesurées sur le serveur et notées dans le ticket. Si elles dépassent la place libre, le ticket 17 devient nécessaire.
- [ ] Rien d'autre ne ralentit sur le serveur pendant un rendu.
- [ ] Aucun secret en clair : seulement les secrets GitHub Actions.
