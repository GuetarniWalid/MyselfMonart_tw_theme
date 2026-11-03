# 10: Cadres et bordures, de la fiche au panier

**What to build:** la toile se montre avec ses 5 cadres (blanc, noir mat, argent ancien, chêne clair, noyer) et ses 5 bordures (blanche, noire, étirée, miroir, pliée), avec des matières réalistes (textures sous licence libre). Choisir un cadre fait glisser la caméra sur un coin ; choisir une bordure fait pivoter le tableau pour montrer la tranche ; la caméra revient de face quand on passe à une autre option. Le serveur rend aussi une image par cadre, « sans cadre » compris, et le Publisher l'attribue aux variantes de ce cadre. Le panier, Google Shopping et les mails de commande montrent ainsi le bon cadre. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 09 (du Publisher à la fiche)

**Status:** ready-for-agent

- [ ] Les 5 cadres et les 5 bordures sont rendus fidèlement ; Walid les compare aux vrais produits.
- [ ] Mises en scène du cadre et de la bordure, avec retour de face au changement d'option.
- [ ] Une image par cadre, attribuée à toutes les variantes de ce cadre. Une variante « Sans cadre » montre une toile sans cadre dans le panier, sur Shopping et dans les mails.
- [ ] Ces images ne sont pas chargées dans la page : la fiche ne s'alourdit pas.
