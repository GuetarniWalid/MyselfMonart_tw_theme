# 24 : Fiche galerie — « Ce qu'un tableau change chez vous », pied de page et couleurs

**What to build:** la dernière section de la maquette, et les couleurs de l'étude du 20/11 pour ce qui entoure la page.

Référence : la maquette v13, `.scratch/fiche-3d/galerie/proto/index.html` (section `.difference`, pied de page, pilule d'achat, bandeau), et `.scratch/fiche-3d/galerie/README.md` (« Ce que montre la maquette », point 7 ; « L'étude des couleurs » ; « D'où viennent les arguments de la section 7 »).

## Ce qu'un tableau change chez vous

- Chapeau : « Un mur nu, et la pièce ne paraît jamais finie, même bien meublée. Un tableau règle ça. Et il fait bien plus. »
- Quatre cartes de couleur, une raison chacune, son personnage détouré qui monte du bas de la carte et sa bulle : « Il donne le ton. » (le fifre et ses deux notes), « Tout change, sans travaux. » (l'ouvrier de l'Égypte ancienne, « Chez moi, les travaux sont pharaoniques. »), « Un plaisir qui ne fane pas. » (le bouquet, « Jamais arrosé. »), « L'effet « waouh ». » (le personnage qui crie, « Tu l'as trouvé où ? »).
- Phrase de fin : « Et un coup de cœur, ça ne se discute pas. »
- Poster : « poster » à la place de « tableau » partout dans cette section.
- Les mêmes phrases pour toutes les œuvres : rien n'y dépend du produit.

## Couleurs autour de la page (seulement sur cette fiche)

- Bouton d'achat de la pilule : vermillon `#d8361b`, libellé blanc.
- Pied de page : menthe, texte encre. Bandeau d'annonce : pêche.
- Ces trois éléments sont communs à tout le site : les règles ne s'appliquent qu'à la page qui porte la scène 3D des nouveaux produits. Aucune autre page ne change de couleur.
- Le mur de la scène 3D ne change pas.

## À respecter

- Les personnages : images de `.scratch/fiche-3d/galerie/proto/img/`, en différé, sans texte alternatif, jamais nommés.
- Les titres sont des jeux de mots (« donner le ton », « ne fane pas ») : dans chaque langue, les adapter, pas les traduire mot à mot.
- Cinq langues.

**Blocked by:** 19 (ossature)

**Status:** done, en ligne le 20/11/2026 (`e957899` la section et les couleurs autour, `bd41efb` le modèle).

Vérifié en ligne le 20/11/2026 sur la toile et le poster Superman (vue `?view=oeuvre-galerie`, téléphone 390 × 844 et ordinateur 1440 × 900) : mêmes données pour Google que la fiche normale (title, description, canonique, robots, og, h1 unique, deux blocs JSON-LD identiques), aucun débordement, aucune erreur de script, bascule Toile / Poster qui garde la vue de test ; les douze pages témoins du site identiques avant et après le push des fichiers. Pas vérifié : un vrai téléphone, Safari et Firefox (à faire au ticket 27). Bandeau pêche, pied de page menthe à texte encre, bouton d'achat vermillon : seulement sur la vue de test.

**Reste pour la bascule (ticket 27) :** sur un téléphone lent, le bandeau s'affiche d'abord saumon puis passe au pêche en fondu (mesuré en 4G lente simulée : bandeau peint à 1,2-1,5 s, pêche à 2,4-2,8 s). La règle attend le bloc principal (`:has`), qui arrive après le bandeau dans la page. Correction prévue à la bascule : la couleur du bandeau posée dans le `<head>` de `layout/product.liquid` pour le modèle `oeuvre-3d`.

- [x] La section est fidèle à la maquette sur téléphone et sur ordinateur (le personnage ne grandit pas quand le texte allonge la carte ; pas de débordement).
- [x] Toile et poster : le bon mot partout.
- [x] Le bouton d'achat, le pied de page et le bandeau prennent leurs couleurs sur cette fiche seulement ; une fiche ancienne, une collection et l'accueil sont inchangés.
- [x] Contrastes lisibles (bouton : 4,5 pour 1 au moins).
- [x] Les cinq langues sont en place ; la vérification des traductions passe.
