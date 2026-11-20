# 22 : Fiche galerie — l'histoire et « En pratique »

**What to build:** sous la scène, le bloc en deux colonnes de la maquette : à gauche « L'histoire » (le texte de présentation du produit, avec « Lire la suite »), à droite « En pratique » (quatre volets et quatre engagements).

Référence : la maquette v13, `.scratch/fiche-3d/galerie/proto/index.html` (section `.histoire`), et `.scratch/fiche-3d/galerie/README.md` (« Ce que montre la maquette », « La version poster »). Textes du poster et leurs sources : `.scratch/fiche-3d/galerie/poster/textes.json`.

## L'histoire

- Le texte est la description du produit, telle quelle. Son titre (`h2`) devient le grand titre du bloc ; le premier paragraphe est mis en avant ; la suite se replie derrière « Lire la suite ».
- Une description sans titre (celle des posters, aujourd'hui) : sa première phrase tient lieu de titre.
- Tout le texte reste dans la page, replié ou non (Google le lit).

## En pratique

- Quatre volets : « Poster ou toile : lequel choisir ? », « Livraison, paiement & délais », « Détails du produit », « Retour et échange ». Le premier vaut pour les deux ; les trois autres ont une version toile et une version poster.
- Quatre engagements avec leur petit dessin : toile « Prête à accrocher », « Couleurs fidèles », « Vraie toile d'art », « Une vraie personne » ; poster « Avec ou sans cadre », « Couleurs fidèles », « Vrai papier photo », « Une vraie personne ».
- Aujourd'hui, la fiche d'un poster affiche les textes écrits pour la toile (châssis, toile 285 g/m², garanties 75 ans) : ce ticket corrige cela. Ne rien dire d'un poster que la boutique ne dit pas déjà (ni finition du papier, ni verre, ni emballage).
- Le délai de retour reste celui que la fiche actuelle affiche (réglage `return_days`).

## À respecter

- Réutiliser ce qui existe pour les volets (`<collapsible-tab>`), sans changer son comportement ailleurs.
- Les textes d'aujourd'hui (volets du modèle `product.oeuvre-3d.json`) sont repris pour la toile ; les versions poster viennent de `poster/textes.json`.
- Cinq langues ; la note Trustpilot n'est jamais écrite en dur.

**Blocked by:** 19 (ossature)

**Status:** ready-for-agent

- [ ] Une toile et un poster affichent chacun leurs volets et leurs engagements ; plus aucun mot de toile sur la fiche d'un poster dans ce bloc.
- [ ] Une description avec titre et une description sans titre s'affichent toutes deux correctement ; « Lire la suite » déplie et replie, au clavier aussi.
- [ ] Téléphone et ordinateur comme dans la maquette, sans débordement.
- [ ] Les cinq langues sont en place, et la vérification des traductions passe.
- [ ] La fiche actuelle et les autres pages sont inchangées.
