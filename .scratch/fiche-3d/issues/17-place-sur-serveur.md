# 17: Place sur le serveur, si la mesure l'exige

**What to build:** ce ticket ne sert que si la mesure du ticket 08 montre que la mémoire manque. Il s'agit alors de recenser ce qui tourne sur le serveur du backend et ce qui ne sert plus, puisque le backend se recentre sur les produits, et de le retirer pour laisser la place aux rendus, sans agrandir le serveur. La base MySQL reste : elle sert encore au studio, à la newsletter, aux messages et aux publications Pinterest et Instagram. Rien n'est retiré sans l'accord de Walid. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 08 (mesure des rendus sur le serveur)

**Status:** ready-for-agent

- [ ] Un inventaire de chaque service : à quoi il sert et quelle mémoire il utilise réellement.
- [ ] La liste de ce qui peut partir, validée par Walid avant tout retrait.
- [ ] Après le ménage, un rendu passe sans ralentir le reste.
- [ ] Si le ticket 08 montre qu'il y a assez de place, ce ticket est fermé sans rien faire.
