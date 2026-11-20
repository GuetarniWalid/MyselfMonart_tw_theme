# Fiche galerie : maquette de la refonte de la fiche 3D

Demande de Walid du 19/11/2026 : refaire tout le design de la page des nouveaux produits (modèle `oeuvre-3d`). Référence : human-md.ai (aplats de couleur, grande typo sans empattement, personnages de tableaux anciens détourés), en beaucoup plus fluide.

- Maquette en ligne (privée) : https://claude.ai/artifact/CyciSAvm1WfY9gXXZYsXnU
- Étude des couleurs du 20/11 (privée) : https://claude.ai/artifact/8MATMKnrMrDuYfmHqtpWkY ; source dans `etude/`.
- Essai de la section des couleurs sur 25 tableaux, du 20/11 (privé) : https://claude.ai/artifact/ABowVtthbEhmXJpQB2f31v ; source dans `couleurs/`. Voir plus bas « Les couleurs du temps 2 ».
- Version poster de la maquette (v13, 20/11) : même lien, bouton « Toile / Poster » du haut, ou directement https://claude.ai/artifact/CyciSAvm1WfY9gXXZYsXnU#poster.
- Source : `proto/index.html` et `proto/img/`. En local : `node serve.cjs`, puis http://127.0.0.1:8791/ (le serveur ajoute le squelette de page que l'Artifact ajoute en ligne). `#secours` à la fin de l'adresse force le mode de secours.
- Versions écartées :
  - `proto-v1/` : esprit musée, murs sombres, Cormorant Garamond.
  - `index.v2.html` : murs colorés au temps 3, mentions des tableaux anciens.
  - v3 (version 5 de l'Artifact, dans son historique) : les vraies tailles au temps 3, à l'échelle d'une personne assise. Écartée : la scène 3D du haut le fait déjà.
  - `index.v4.html` : un salon au temps 3 (mur blanc, canapé gris, coussin, plaid et lampadaire aux couleurs de l'œuvre). Walid a beaucoup aimé, mais l'a écartée : parler de canapé ne va pas à toutes les œuvres (un tableau de cuisine…). Il en garde la dame allongée et l'idée de la lampe.
  - `index.v5.html` : la lampe de tableau au temps 3, avec un soir en voile lilas clair. « Super », mais il veut la pièce « vraiment en sombre noir » quand la lampe est allumée, pour que tout ressorte : les écritures, la dame et le tableau.
  - `index.v6.html` : le temps 3 dans le noir, avec un lit, un oreiller et un plaid dessinés sous la dame. « Super ! », mais il préfère que le lit et le coussin soient détourés dans le vrai tableau.
  - `index.v7.html` : la dame sur son lit d'origine (« Super »), avec en bas de page « Ce qui fait la différence », quatre atouts illustrés d'icônes. Section écartée : elle « n'apporte plus rien de plus que ce qui a été dit », et Walid ne veut pas d'icônes.
  - v8 (version 12 de l'Artifact) : la nouvelle section « Ce qu'un tableau change chez vous ». « Parfait ! », sauf l'image de « Tout change, sans travaux. » : un ouvrier des Raboteurs de parquet de Caillebotte, sorti de son parquet, « on le comprend mal » (`raboteur.py`, `decoupes/raboteur.png`).
  - v9 (version 13 de l'Artifact) : au temps 1, le voyageur était seul devant l'œuvre. Walid veut « un public au lieu de juste un homme, mais qui arrive de façon stylée de partout, de sorte qu'on comprenne qu'on contemple l'œuvre » (20/11).
  - v10 (version 14 de l'Artifact) : le public devant l'œuvre. « Super je valide », mais « il manque le footer », et il demande « une étude approfondie des meilleures couleurs » pour ce qu'on n'avait pas touché : le bouton d'achat, le pied de page, le fond derrière la toile en 3D.
  - v11 (version 15 de l'Artifact, `index.v11.html`) : le pied de page et les couleurs de l'étude. « Super ! », mais au temps 1 « c'est mal fait » : avec quatre personnages pris dans quatre tableaux, celui de gauche « semble regarder autre chose, le côté du mur plutôt que le tableau ». Il demande « une foule, d'un tableau déjà », mise « devant, qui regarde », qui arrive « joliment », en gardant l'oiseau, « parfait ». Et « dans le footer la zone mail semble buguer » (20/11).
- La scène 3D du haut et la pilule d'achat ne changent pas : la maquette les figure par une image.

## Parti pris (retours de Walid des 19 et 20/11, en treize fois)

- Clair, vif, pop : aplats ciel, rose, soleil, menthe, lilas, crème. Une seule exception, voulue par Walid : le temps de la lumière se joue dans le noir, pour que la lampe, le tableau, la dame et le texte ressortent.
- Une seule police, Albert Sans (celle de la scène 3D) : titres en maigre avec un mot en gras.
- Pas de vocabulaire de galerie, des mots simples. « Comme au musée » vient de lui, pour la lampe.
- La signature : des personnages de tableaux anciens détourés, chacun avec un lien direct et drôle avec son bloc. Ce qui va avec un personnage (le lit et les coussins de la dame) est détouré dans son tableau, pas dessiné à côté.
- On ne nomme jamais les tableaux ni leurs auteurs dans la page (ce serait du bruit pour le SEO).
- Les titres disent clairement de quoi on parle (« tableaux », « le tableau », pas « elles »).
- Tout suit le défilement : chaque geste fait bouger quelque chose, sans temps mort.
- La scène ne refait rien de ce que la scène 3D du haut montre déjà. Elle montre : la taille à la vraie échelle (une femme à côté du tableau, dans une pièce meublée, cote en cm), la tranche et la bordure, le coin du cadre, le dos de la toile, le zoom sur l'œuvre. Voir `../README.md`, décisions 7 et 10.
- Le modèle sert à toutes les œuvres, très différentes les unes des autres : aucun passage ne suppose une pièce (salon, canapé) ni un sujet.
- Les arguments partent de la raison de fond de l'achat d'un tableau de décoration, qui n'est pas celle d'un tableau d'art : on l'achète pour une pièce et pour s'y sentir bien, pas pour un artiste. Aucun ne redit ce que la page a déjà montré.
- Pas d'icônes : un propos s'illustre par un détourage d'œuvre ancienne, « pour augmenter la prestance du propos ».
- Un personnage détouré doit se comprendre seul, au premier coup d'œil : sorti de son décor, l'ouvrier qui rabotait un parquet ne disait plus rien.
- Devant l'œuvre, un public plutôt qu'un seul homme. Pas des personnages pris dans plusieurs tableaux : chacun regarde alors dans sa direction, et l'un a l'air de fixer le mur. Une foule entière, tirée d'un seul tableau, posée devant l'œuvre, et qui arrive joliment.
- Tout doit marcher en masse (20/11) : Walid met ses tableaux en ligne en nombre et ne réglera rien tableau par tableau. Ce qui dépend de l'œuvre (ses couleurs, les phrases qui en parlent) doit se faire tout seul, pour n'importe quel tableau : un noir et blanc, un tout en bleus, un pastel, un multicolore.
- Les couleurs sont celles que la boutique déclare déjà : des couleurs principales, sans nuances (« juste le bleu », pas de bleu nuit). Chaque phrase est unique pour le tableau : elle dépend de la couleur et du thème du tableau (20/11).

## Ce que montre la maquette (v13)

1. Présentation : nom court en très grand, titre complet (H1), avis, cinq lignes de fiche.
2. L'œuvre en quatre temps, une scène épinglée (mur et sol en aplats, comme une pièce) :
   - 1. Le regard : mur ciel, sol rose. L'œuvre est un peu plus petite et plus haute, pour laisser la place à son public : la foule d'un tableau de 1810 (le public d'un Salon massé devant une grande peinture), posée devant elle, les têtes au bas du tableau. À gauche, un officier en bicorne et une femme au livret lèvent les yeux vers l'œuvre ; deux enfants sont hissés sur des épaules, des chapeaux se lèvent, un homme de dos pointe le doigt vers elle. La foule arrive en trois groupes qui se dandinent : le groupe du milieu et celui de droite entrent chacun par son côté et se referment devant l'œuvre, le couple de gauche ferme la marche (il reste hors de l'écran sur téléphone). Un chardonneret arrive du ciel et se pose sur le coin de l'œuvre. À la fin du temps, chacun repart par où il est venu et l'œuvre reprend sa taille.
   - 2. Les couleurs, « Chaque couleur agit sur vous » : l'œuvre passe en gris et chaque teinte revient seule, avec sa pastille et une phrase qui dit ce qu'elle apporte dans cette œuvre précise (ici : le rose, l'audace ; le bleu, l'aplomb ; le jaune, l'étincelle). Teintes lues dans l'image, phrases écrites pour le produit.
   - 3. La lumière, « Éclairé comme au musée » (idée de Walid) : la pièce passe au noir dès l'arrivée du titre, qui est en blanc pendant tout ce temps. L'œuvre, accrochée au-dessus d'une dame de tableau ancien allongée sur son lit d'origine (ses coussins, son drap et son divan, pris dans le tableau, les bords fondus dans le noir), s'efface presque (« Le soir, sans lumière. Les couleurs s'endorment avec le jour. »). Une lampe de tableau en laiton vient se fixer au-dessus d'elle (« Une lampe de tableau. Fixée juste au-dessus, comme dans les musées. »). Puis elle s'allume : une nappe de lumière chaude sur le mur noir, l'œuvre s'avive, la dame et son lit sortent de l'ombre (« Lampe allumée. Les couleurs se réveillent : le tableau prend toute sa prestance. »). La dame dit « Laissez allumé. »
   - 4. La matière : la toile grossit jusqu'à remplir l'écran, sa trame apparaît, la main avance et la touche (étincelle).
3. L'histoire (description) et « En pratique » (volets, quatre engagements).
4. Avis, « +1 000 clients aux anges » : bande soleil, photos de clients, les angelots qui montent du bas.
5. Vous aimerez aussi, « D'autres tableaux, d'autres perles » : la Jeune Fille dont la perle scintille, bouton vers la collection, tuiles pastel.
6. Questions fréquentes : carte ciel avec la Joconde en casque-micro et sa bulle « Allô, j'écoute ! ».
7. « Ce qu'un tableau change chez vous » (remplace « Ce qui fait la différence »). Chapeau : « Un mur nu, et la pièce ne paraît jamais finie, même bien meublée. Un tableau règle ça. Et il fait bien plus. » Puis quatre cartes de couleur, une raison chacune, avec son personnage détouré qui monte du bas de la carte :
   - « Il donne le ton. » (carte ciel, le fifre et ses deux notes) : « Chic, zen ou plein de peps : c'est le tableau qui donne son style à une pièce. On le voit avant les meubles. »
   - « Tout change, sans travaux. » (carte soleil, un ouvrier de l'Égypte ancienne penché sur son moule à briques, bulle « Chez moi, les travaux sont pharaoniques. ») : « Envie de changement ? Pas besoin de repeindre ni de changer les meubles. Un tableau au mur, et la pièce n'est plus la même. »
   - « Un plaisir qui ne fane pas. » (carte rose, le bouquet de tournesols, bulle « Jamais arrosé. ») : « Un bouquet tient une semaine. Un tableau, vous en profitez tous les jours, pendant des années. »
   - « L'effet « waouh ». » (carte lilas, le personnage qui crie, bulle « Tu l'as trouvé où ? ») : « Le tableau, c'est ce que vos invités remarquent en premier, et ce dont ils vous parlent. »
   - Phrase de fin : « Et un coup de cœur, ça ne se discute pas. »
8. Le pied de page du site, repris tel quel (mêmes rubriques et mêmes liens, newsletter, réseaux, devise, langue, douze moyens de paiement, vague du haut), en menthe à texte encre. Il se prolonge sous la pilule d'achat. Le champ de la newsletter a un seul contour, « Votre e-mail » en texte d'attente et un halo doux quand on y écrit ; il répond « Merci ! » (dans la maquette, rien n'est envoyé). Avant le 20/11, l'étiquette du champ dépassait au-dessus de lui et un second contour apparaissait à la saisie : c'est ce que Walid a vu « buguer ».

Couleurs posées par l'étude du 20/11 (variables en tête de la feuille de style) : bouton d'achat vermillon `#d8361b` à libellé blanc (`--achat`, `--achat-texte`), pied de page menthe à texte encre (`--pied-fond`, `--pied-encre`), bandeau d'annonce pêche (`--annonce-fond`). Le mur de la scène 3D ne change pas.

### La version poster (v13, version 17 de l'Artifact, 20/11)

Question de Walid : « on a vu ce que ça donne avec une toile, mais on n'a pas vu avec poster. Qu'est-ce que ça donnerait si je sélectionnais poster au lieu de toile ? » Le bouton « Toile / Poster » du haut de la maquette, jusque-là dessiné, est devenu actif : il montre la même page dans sa version poster. L'adresse garde le choix : https://claude.ai/artifact/CyciSAvm1WfY9gXXZYsXnU#poster ouvre directement le poster.

Ce qui change en version poster (`patch-v13.cjs`, à partir de `index.v12.html` ; textes et sources dans `poster/textes.json`, texte de présentation dans `poster/description-poster.html`) :
- Le haut : « Poster & Affiche Street Art », légendes « Contour : Aucun », « Cadre : Aucun », « Taille : 30 × 40 cm » (comme la fiche en ligne du poster le 20/11), l'œuvre à plat comme une feuille (ombre courte), « 24,90 € » dans la pilule.
- La présentation : le titre du poster, « Papier photo 250 g/m² », « Cadre en option : blanc, noir, chêne vieilli ou noyer ».
- La scène : les temps 1 à 3 sont les mêmes (« le poster prend toute sa prestance »). Le temps 4 ne montre plus la trame d'une toile : « Un vrai papier photo. Épais, 250 g/m², pour un tirage net aux couleurs éclatantes. À encadrer, ou à poser tel quel. », avec le reflet doux du papier qui glisse (`.oeuvre-brillance`), la main et l'étincelle.
- L'histoire : le texte du poster. Il n'a pas de titre (celui de la toile en a un) : sa première phrase en tient lieu.
- En pratique : trois volets réécrits (livraison, détails, retour), et les engagements « Avec ou sans cadre », « Couleurs fidèles » (sans les 75 ans), « Vrai papier photo ».
- Questions : six réponses réécrites (« C'est un vrai tirage photo ? », « Faut-il acheter un cadre en plus ? »…).
- « D'autres posters, d'autres perles », « Ce qu'un poster change chez vous », et « poster » à la place de « tableau » dans les quatre cartes.

Ce qui ne change pas : la foule, les couleurs, la lampe et la dame, les avis, les personnages, le pied de page.

Comment c'est fait : la classe `poster` sur `<html>` ; ce qui ne vaut que pour une version porte `si-toile` ou `si-poster`. Après le choix, la scène refait ses mesures (événement `support`). `SUPPORT=poster node capturer.mjs …` photographie la version poster. Vérifié en local à 320, 390 et 1440 px, à plat, et le bouton dans les deux sens ; en ligne dans Chrome sur ordinateur. Pas sur un vrai téléphone.

**Constat sur le site d'aujourd'hui (20/11).** Le modèle `product.oeuvre-3d.json` est le même pour la toile et le poster, et ses textes sont écrits pour la toile : sur la fiche en ligne d'un poster, on lit « sa toile est tendue à la main sur son châssis », « toile polyester 285 g/m² », « garanties 75 ans », « Votre toile arrive déjà montée sur châssis », « Le grain d'une vraie toile ». Seul le volet « Poster ou toile : lequel choisir ? » parle du poster (« Un vrai papier photo de 250 g/m², un tirage HD aux couleurs éclatantes »). La boutique ne dit nulle part, pour un poster : la finition du papier, le verre du cadre, l'emballage. Les textes poster de la maquette n'utilisent que ce que la boutique dit déjà ; ils sont à faire valider par Walid.

## L'étude des couleurs (20/11)

Demande de Walid : les meilleures couleurs pour ce qu'on n'avait pas touché. Page de l'étude : https://claude.ai/artifact/8MATMKnrMrDuYfmHqtpWkY (source : `etude/index.html` et `etude/img/`).

- Ce qu'il y a dans le thème : `main_color` #21150c (encre), `buy_button_color` et `brand_color` #d79b86 (saumon), `--color-terra-rgb` (un saumon foncé, #a2543a) pour le bouton d'achat de la fiche 3D (`.oeuvre-3d-buy`, input.css) ; pied de page `.footer` = `bg-buy-button text-secondary` (saumon, texte blanc) ; bandeau d'annonce saumon à texte encre ; mur de la scène `--wall: #dfd9ce`, qui est le mur des quatre photos de pose (`POSES.wall` dans `assets/oeuvre-3d-engine.js`).
- Mesures (contraste WCAG 2.1, 4,5 demandé) : texte blanc sur saumon 2,35 (insuffisant) ; encre sur menthe 13,3, sur pêche 12,1, sur crème 16,0 ; libellé blanc sur terre 5,4, sur vermillon #d8361b 4,7, sur corail #ff5436 3,2 ; libellé encre sur corail 5,6. Contraste perçu (APCA) : blanc sur vermillon 77, encre sur corail 45, blanc sur corail 63 (environ 75 conseillés pour un libellé gras de 14 px). D'où le vermillon à libellé blanc plutôt que le corail à libellé encre : le seul qui passe la norme et se lit bien à l'œil.
- Trois boutiques relevées le 20/11 sur une fiche produit : Desenio (bouton noir, page blanc cassé, pied de page crème à texte noir), Juniqe (bouton violet rgb(126, 90, 240) arrondi, page et pied de page blancs), Posterlounge (bouton bleu rgb(0, 155, 250) arrondi, page et pied de page blancs).
- Lectures vérifiées : Bounteous, « Orange You Accessible? » (2019) : sur un bouton orange, le noir passe la norme (6,44) et pas le blanc (3,26), mais 61 % d'une vingtaine de personnes daltoniennes trouvaient le blanc plus lisible ; Speero, « Testing Button Colors » (2022) : tester la couleur d'un bouton est souvent surestimé, ce qui compte est qu'il se voie.
- Choix proposés : bouton vermillon à libellé blanc ; pied de page menthe à texte encre ; mur inchangé ; bandeau pêche ; petits accents de la scène à l'encre, pastille du panier au vermillon. Sur le site, seulement la nouvelle fiche (le bandeau et le pied de page sont communs à tout le site).
- Six couleurs de pied de page essayées en bas de page (saumon, menthe, pêche, crème, encre, ciel) : la pêche fond le bouton d'achat (même famille), la crème marque peu la fin de page, sur l'encre les logos de paiement sans fond disparaissent.

## D'où viennent les arguments de la section 7

Relevé le 19/11/2026, pour ne pas refaire la recherche :

- Recherches Google qui amènent sur la boutique (Search Console, France, 90 jours) : on cherche une pièce et un effet, jamais un artiste. « tableau salon chic », « tableau salon tendance », « tableau moderne salon », « tableau coloré », « tableau zen », « tableau apaisant », « tableau pour salon cosy », « idée pour habiller un mur de cuisine », « comment habiller un mur blanc de cuisine », « comment décorer un mur vide », « tableau bureau », « tableau chambre garçon ».
- Avis des clients repris dans le thème : « merci de sortir de l'ordinaire pour habiller nos murs », « trône dans mon salon », « ça apporte tellement de chaleur et de gaieté à mon salon », « transforme l'ambiance de mon salon », « l'effet est waouh ».
- Étude Ipsos pour BUT (2014, ancienne) : les Français décorent d'abord pour eux (deux sur trois préfèrent passer du temps chez eux), les pièces à vivre aussi pour les autres ; un sur deux craque sur un coup de cœur de décoration. Mintel (États-Unis, 2018) : on achète de la décoration pour rafraîchir, se faire plaisir ou remplacer.
- Ce qu'on en tire : finir la pièce (le mur vide), lui donner son style, la changer sans travaux, un plaisir qui dure, la fierté devant les invités, et le coup de cœur comme déclencheur.

## Mouvement

- La scène est en `position: sticky`. Tout élément mobile porte la classe `a` : une animation CSS dont l'avancement est la position de défilement, comptée en écrans depuis l'épinglage (`--a` début, `--b` fin). Seulement `transform` et `opacity`.
- Mode `natif` : `view-timeline` sur la section, `animation-range: contain calc(var(--a) * 100svh) …`. Aucun script pendant le défilement, tout tourne hors du fil principal.
- Mode `secours` (navigateur sans animations liées au défilement) : un script écrit `--t` à chaque image, les mêmes animations sont mises en pause et positionnées par `animation-delay`.
- Sans script ou avec « mouvements réduits » : la scène se déplie, l'œuvre puis tous les textes à la suite (ni lit, ni lampe, ni nuit ; les trois phrases de la lumière, si, en couleur d'encre).
- Le temps 3 :
  - La nuit : deux aplats noirs, un pour le mur et un pour le sol (`.m-nuit`, `.s-nuit`), qui tiennent tout le temps 3. Le texte de ce temps est blanc (règles `.anime .c3`), et le repère du haut passe au blanc (`rail-nuit`, la seule animation de couleur de la page, sur huit petits traits).
  - La dame et son lit sont une seule image (`.allongee`), placée en centimètres depuis son milieu et le sol (`--x`, `--y`, `--w`, `--h`), à l'échelle `--cm` ; sur téléphone, elle tient toute la largeur de l'écran. Sur le noir, baisser son opacité revient à l'éteindre : elle passe de 0,2 à 1 quand la lampe s'allume, sans filtre.
  - La lampe (`.applique`) et sa lumière sur le mur (`.lueur`) sont des enfants de l'enveloppe de l'œuvre : elles la suivent.
  - L'œuvre dans le noir est couverte d'un cache presque opaque (`.oeuvre-nuit`), qui se retire à l'allumage. L'œuvre allumée est une copie de l'image, avivée par un filtre fixe, qui apparaît en fondu (`.oeuvre-vive`), avec un reflet en haut et un halo (`.oeuvre-reflet`).
  - L'allumage (`@keyframes allume`) a un petit battement au début, puis monte jusqu'à la fin du temps.
- Le script mesure au chargement et au redimensionnement : l'échelle de la scène sur téléphone (le plus grand possible entre le bas du texte et le sol, sans sortir de l'écran), la place de l'œuvre au-dessus du lit (`--yc`, `--e3`) et le grossissement du temps 4.
- Le public du temps 1 : un élément `.foule` qui contient trois fois la même image (`foule.webp`), chacune découpée par `clip-path` le long du bord d'un personnage, jamais au travers : `.foule-i` (le couple de gauche), `.foule-g` (le groupe du milieu), `.foule-d` (le groupe de droite). Réunies, elles refont l'image entière ; chacune déborde de 2 px sur sa voisine, pour qu'aucun trait ne se voie. `--fh` est la hauteur de la foule, `--fl` sa largeur, `--fx` sa gauche, `--fp` la ligne de ses pieds. Chaque groupe sort de l'écran par son côté (`--px`, calculé pour passer le bord quelle que soit la taille de l'écran) et marche en penchant d'un côté puis de l'autre, comme des figures de papier (`@keyframes foule-g`, `foule-d`, `foule-i`, entre -0,2 et 0,86 écran : réunis vers 0,2, repartis à partir de 0,66). Sur téléphone, la foule est plus large que l'écran : on en voit le milieu. Sur ordinateur, elle s'arrête au bord de la colonne de texte, et les groupes venus de la gauche marchent un peu plus bas (`--fy`) pour passer sous le texte. L'œuvre est réduite et remontée pendant ce temps par `--e1` et `--y1` (dans `@keyframes derive`), réglés à part pour le téléphone et l'ordinateur. L'oiseau (`.oiseau`) est un enfant de l'enveloppe de l'œuvre (`.oeuvre-place`) : il la suit. Son vol passe à droite de l'œuvre, sous le texte, pour ne jamais croiser le titre. `couture.py` tient les deux lignes de coupe et écrit les trois polygones.
- Hors de la scène, en mode natif : titres mot à mot, blocs qui montent, personnages qui surgissent, rangée d'avis qui glisse (`animation-timeline: view()`).
- Section 7 : chaque carte monte, son personnage sort du bas (`surgit`), sa bulle grossit (`dit`, propriété `scale`), les notes du fifre s'envolent (`note`). Le personnage est posé en bas à droite, sa largeur vaut une part de la largeur de la carte (`--pw`, plafonnée par `--px`) : il ne grandit donc pas quand le texte allonge la carte sur un petit écran. Le titre peut courir sur toute la carte (`--tt`), le paragraphe et la bulle restent à gauche du personnage (`--tl`). La scène de la carte laisse dépasser le haut (le képi du fifre) mais coupe les côtés (`overflow-x: clip`, sinon la page défile de côté) et le bas (`clip-path`). La phrase de fin arrive plus tôt que les autres titres : elle est tout en bas de la page. La carte « sans travaux » a un personnage large : sur téléphone, son texte passe au-dessus de lui sur toute la largeur, et la bulle se loge à sa gauche, dans une zone qui a sa hauteur (`.dit-zone`), ce qui empêche le texte de le recouvrir ; sur ordinateur, le texte est à gauche et l'ouvrier à droite.
- Durée de la scène : 3,82 écrans de défilement (temps 1 jusqu'à 0,78 ; temps 2 jusqu'à 2,04 ; temps 3 jusqu'à 3,2). Dans le temps 3 : le noir se fait de 1,98 à 2,1, la lampe arrive vers 2,3, elle s'allume de 2,5 à 2,7, la dame parle à 2,8 ; le noir se retire de 3,1 à 3,24.

## Tableaux anciens (domaine public, Wikimedia Commons) — pour nos notes, jamais dans la page

| Découpe | Œuvre | Fichier Commons |
|---|---|---|
| `voyageur` | Caspar David Friedrich, Le Voyageur contemplant une mer de nuages, vers 1818 | `Caspar David Friedrich - Wanderer above the sea of fog.jpg` |
| `allongee` | Francisco de Goya, La Maja vêtue, vers 1800-1807, avec ses coussins, son drap et son divan | `Maja vestida (Prado).jpg` |
| `main` | Michel-Ange, La Création d'Adam, vers 1511 | `Michelangelo - Creation of Adam (cropped).jpg` |
| `joconde` | Léonard de Vinci, La Joconde, vers 1503 | `Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg` |
| `perle` | Johannes Vermeer, La Jeune Fille à la perle, vers 1665 | `1665 Girl with a Pearl Earring.jpg` |
| `anges` | Raphaël, La Madone Sixtine (détail des angelots), 1512 | `Raphael - The Sistine Madonna - Google Art Project.jpg` |
| `fifre` | Édouard Manet, Le Fifre, 1866 | `Manet, Edouard - Young Flautist, or The Fifer, 1866 (2).jpg` |
| `macon` | Peinture de la tombe de Rekhmirê à Thèbes, vers 1450 av. J.-C. : les briquetiers, d'après le fac-similé de Nina de Garis Davies (Metropolitan Museum, CC0) ; l'ouvrier du haut, retourné | `Brickmakers, Tomb of Rekhmire MET DT10882.jpg` |
| `bouquet` | Vincent van Gogh, Les Tournesols, 1888 (version de Munich, fond turquoise) | `Vincent Willem van Gogh 128.jpg` |
| `cri` | Edvard Munch, Le Cri, 1893 | `Edvard Munch, 1893, The Scream, oil, tempera and pastel on cardboard, 91 x 73 cm, National Gallery of Norway.jpg` |
| `admiratrice` | Caspar David Friedrich, Femme devant le soleil couchant, vers 1818 | `Caspar David Friedrich - Frau vor untergehender Sonne.jpg` |
| `fillette` | Édouard Manet, Le Chemin de fer, 1873 (la fillette de dos) | `Edouard Manet - Le Chemin de fer - Google Art Project.jpg` |
| `couple` | Georges Seurat, Un dimanche après-midi à l'île de la Grande Jatte, 1884-1886 (le couple de droite, sans l'ombrelle) | `A Sunday on La Grande Jatte, Georges Seurat, 1884.jpg` |
| `oiseau` | Carel Fabritius, Le Chardonneret, 1654 | `Carel Fabritius - The Goldfinch - 605 - Mauritshuis.jpg` |
| `foule` | Louis-Léopold Boilly, Le Public au Salon du Louvre regardant le tableau du Sacre, 1810 (Metropolitan Museum, CC0) : toute la foule du premier plan | `The Public Viewing David’s Coronation at the Louvre MET 2012.156 1FXD.jpg` (photo gardée dans `sources/salon.jpg`) |

La Mère de Whistler (`decoupes/mere.png`) servait d'échelle dans la v3 : elle n'est plus dans la page. Le Voyageur, l'admiratrice, la fillette et le couple (le public des v9 à v11) n'y sont plus non plus depuis la v12 : leurs découpes restent dans `decoupes/`.

Détourage : BiRefNet_HR-matting (licence MIT), `detourer.py`, avec le venv de `%TEMP%\birefnet` (environ 2 min 30 par image sur le processeur). Pour la dame allongée, `lit.py` part du tableau entier : la figure garde le détourage BiRefNet ; son lit est gardé là où le tableau est clair ou vert (le fond brun tombe), les deux coussins et le drap sont pleins, et les bords coupés par le cadre du tableau se fondent, à gauche, à droite et en bas. Elle ne se montre que sur le noir. (`tourner.py` et `gommer.py` servaient à la version sans lit.) `exporter.py` resserre le contour et sort le WebP. `decoupes/` garde les PNG en pleine taille. `lister.cjs` liste les fichiers de Commons pour une recherche, sans rien télécharger ; `chercher.cjs` télécharge depuis Commons : seules les largeurs de vignette standard passent (1280, 1920, 3840…), les autres largeurs et les originaux répondent 429. Le casque de la Joconde, l'étincelle de la perle et les notes du fifre sont de petits SVG. Pour la section 7 : le fifre et le bouquet sortent tels quels de BiRefNet ; `macon.py` reprend l'ouvrier égyptien : silhouette de BiRefNet, plus son moule, sa brique, son pot, sa main et son avant-bras tracés à la main ; il comble les manques de la peinture (taches blanches sur le corps, grand éclat en travers du moule) avec la peinture qui les entoure, et le retourne vers le texte ; `cri.py` détoure le personnage qui crie à la main (contour tracé point par point), BiRefNet n'y trouvant rien. `patch-v8.cjs` reconstruit la maquette à partir de `index.v7.html` et des trois fragments `v8-raisons*` ; `patch-v10.cjs` s'applique à sa sortie et y pose le public du temps 1 (fragments `v10-public*`). Les quatre spectateurs des v10 et v11 sortaient de BiRefNet presque tels quels : `gommer.py` retirait le morceau d'ombrelle détaché au-dessus du couple, l'herbe sous sa robe et un reste de jambes sous la robe de la fillette.

La foule (v12, `foule2.py`) : BiRefNet la détoure d'un seul tenant (`decoupes/foule-brut.png`, zone 581, 1230, 3259, 2381 de la photo), mais hésite sur tout ce qui est dans l'ombre : le rang du fond sortait en fumée, l'officier de gauche y perdait sa tête et son bicorne, des manteaux sombres étaient troués. Le contour extérieur est donc tracé à la main sur le tableau éclairci (`PERMIS` : le couple de gauche d'un côté, le grand groupe de l'autre ; entre les deux, les silhouettes du fond, trop sombres, sont retirées). Tout l'intérieur du grand groupe est rendu plein jusqu'à la ligne où le sol apparaît entre les jambes, où il se fond comme une ombre (`SOL`). Les deux endroits où l'on voyait le cadre doré du grand tableau entre les enfants hissés sont vidés (`CIEL`). BiRefNet ne décide plus que du bord, là où les personnages sont éclairés. Le dernier rang, minuscule et dans l'ombre, n'est pas gardé : le contour suit les têtes du deuxième rang. La signature du peintre, sur le sol à droite, reste hors du détourage. `foule2.py … trace` pose le tracé sur le tableau pour le vérifier ; `cote.py` montre côte à côte le tableau et le détourage ; `voir-source.py` et `voir-foule.py` agrandissent une zone avec une grille graduée. Export : `Q=78 python exporter.py decoupes/foule.png proto/img/foule.webp 680 6 250 1` (1687 × 680).

Poids des onze découpes : environ 630 Ko (la dame et son lit : 100 Ko ; les quatre de la section 7 : 158 Ko ; la foule : 122 Ko, montrée trois fois mais chargée une seule), toutes chargées en différé.

## Contrôler la maquette

`capturer.mjs` ouvre la maquette locale dans un Chrome sans écran et la photographie à des moments précis de la scène, à la taille d'écran voulue, en mode natif, secours ou à plat. Il sert quand le panneau du navigateur de l'appli est masqué (ses captures sortent alors blanches). Il emprunte `puppeteer-core` au dossier `growth/emails-commande`. `planche.py` range les captures côte à côte, `rogner.py` en agrandit une zone.

```
node serve.cjs
node capturer.mjs 375 812 captures "2.2,2.5,2.66,2.95" natif
node capturer.mjs 390 844 captures "sel:#raisons:0,300,600" natif    # à 0, 300 et 600 px du haut d'un élément
node capturer.mjs 390 844 captures "el:#raisons" plat 2                # l'élément entier, sans la pilule d'achat
```

Vérifié le 19/11 sur la v9 (section 7) : 320 × 568, 360 × 640, 390 × 844 (natif, secours, à plat), 768 × 1024, 1024 × 768, 1440 × 900 ; en ligne dans Chrome sur ordinateur. La scène en quatre temps n'a pas changé depuis la v7. Le public du temps 1 (v10), vérifié le 20/11 : 320 × 568, 360 × 640, 390 × 844 (natif, secours, à plat), 412 × 915, 768 × 1024, 1024 × 768, 1440 × 900 ; en ligne dans Chrome sur ordinateur. `faire-pied.cjs` fabrique le pied de page de la maquette à partir du vrai (relevé sur la page d'accueil publique) ; `patch-v11.cjs` le pose, avec les couleurs de l'étude, à la sortie de `patch-v10.cjs`. `variantes.mjs` photographie la même vue avec plusieurs jeux de couleurs ; `voir-page.mjs` photographie une page d'Artifact en local. `deborde.mjs` cherche ce qui dépasse à droite de l'écran : il a trouvé 1,5 px de trop à 320 px de large (la carte de la Joconde), corrigé. La foule du temps 1 (v12, version 16 de l'Artifact), vérifiée le 20/11 : 320 × 568, 360 × 640, 390 × 844 (natif, secours, à plat), 412 × 915, 768 × 1024, 1024 × 768, 1280 × 720, 1440 × 900, 1920 × 1080, sans débordement ; en ligne dans Chrome sur ordinateur. `champ.mjs` photographie le champ de la newsletter dans ses états (vide, en saisie, rempli). Pas encore sur un vrai téléphone, ni dans Safari ou Firefox.

## Les couleurs du temps 2 (essais du 20/11)

Question de Walid (20/11), après avoir validé la foule (« Oui parfait ») : la section des couleurs est « super » sur ce tableau, mais marchera-t-elle sur des tableaux très différents, mis en ligne en masse, sans rien régler tableau par tableau ? Et s'il manque une étape au process, laquelle ?

**L'essai.** 25 tableaux de la boutique dans `couleurs/img/` : 24 anciens produits (on prend leur 2e image, l'œuvre seule) et le Superman. Liste et adresses dans `couleurs/oeuvres.json`.

**La lecture de la maquette v12** (`couleurs/actuel.js`, copie de sa fonction `analyser`) cherche des pics de teinte vive. Sur les 25 (`couleurs/sorties/actuel.png`) :
- bonne sur 7, les très colorés ;
- sur une douzaine, elle appelle « orange » un beige, un crème, un sépia ou un doré ;
- sur un noir et blanc, elle ne trouve rien, ou un tampon rouge qui tient 0,4 % de l'image ;
- les bleus nuit et les verts sombres lui échappent ;
- une œuvre tout en bleus ou tout en verts ne donne qu'une couleur.

### Premier tour : une lecture par nuances (écartée)

`couleurs/couleurs-nuances.js` lisait elle-même l'image et nommait les couleurs dans un vocabulaire de 38 nuances (bleu nuit, vert sapin, taupe…), en séparant un tableau tout en verts en trois verts. Elle donnait un résultat sensé sur les 25, avec des phrases par défaut, une par nuance (`couleurs/phrases.json`).

Réponse de Walid (20/11) : « Non, et que chaque phrase dépend de la couleur plus du thème du tableau. Il faut que chaque phrase soit unique pour le tableau. » Et : « je déclarais déjà les couleurs principales pour chacun des tableaux. On déclare que les couleurs primaires, juste le bleu. On ne fait pas de nuance entre bleu nuit, par exemple. […] Revois un peu mes autres fiches pour que tu comprennes comment les couleurs sont déclarées. »

Donc : pas de nuances, pas de phrases par défaut, et on part de ce que la boutique déclare déjà.

### Comment la boutique déclare les couleurs (relevé le 20/11)

- Une liste fermée de 16 couleurs principales, les métaobjets `shopify--color-pattern` (identifiant, libellé) : `gris` Gris, `blanc` Blanc, `noir` Noir, `beige` Beige / Crème, `marron` Marron / Terre, `bleu` Bleu, `vert` Vert, `jaune` Jaune / Ocre, `or` Doré / Or, `bronze` Bronze, `orange` Orange, `rouge` Rouge, `rose` Rose, `violet` Violet, et deux à part : `multicolore` Multicolore et `blanc-noir` Noir & Blanc. Chacun a sa pastille (`color`) et son libellé est traduit la nuit.
- Chaque produit en porte de zéro à trois, dans `shopify.color-pattern` et `painting.color` (la même liste dans les deux). Ils servent au filtre des collections (`sections/main-collection-product-grid.liquid`). La fiche produit ne les montre pas.
- Ils sont posés tout seuls juste après la publication, par le serveur (une IA qui voit l'image, `ColorPatternFormatter`) : une couleur doit tenir 25 à 30 % de la toile, sauf une couleur très vive qu'on voit en premier ; trois au plus ; « multicolor » à partir de quatre couleurs vives ; une liste vide est permise. Les thèmes (`shopify.theme`, quatre au plus, métaobjets `shopify--theme` : Animaux, Zen, Pop art, Nuit…) sont posés au même moment.
- Sur les 25 tableaux de l'essai (`couleurs/declare.json`) : zèbre et encre « Noir & Blanc » ; barque étoilée, cerisier et abstrait bleu « Bleu » seul ; ballerine « Noir, Rouge » ; barque aux nénuphars « Vert, Rouge » ; Superman « Multicolore, Bleu, Rose »…

### Second tour : la section suit les couleurs déclarées

`couleurs/couleurs.js` (deux fonctions pures, sans page : `lire(d, W, H, declarees)` et `masques`).

1. Elle regroupe les couleurs réellement présentes : histogramme en OKLab, 14 centres au plus, pris de proche en proche (le plus lourd, puis le plus éloigné des précédents), puis affinés.
2. Les couleurs à montrer sont les couleurs déclarées, dans leur ordre. « Multicolore » n'en est pas une ; « Noir & Blanc » en vaut deux, le noir puis le blanc.
3. Chaque centre revient à la couleur déclarée la plus proche, s'il lui ressemble assez. Chacune des 14 couleurs principales est donnée par des couleurs d'exemple (tous ses bleus, du bleu nuit au turquoise, sous « bleu »). Garde-fous : un centre ne suit pas une couleur déclarée beaucoup plus éloignée que celle qu'on lirait pour lui (un fond beige ne suit pas un bleu) ; un blanc, un gris ou un noir ne suit jamais une couleur franche. Ce qui ne ressemble à aucune couleur déclarée reste gris (la lune du cerisier, déclaré « Bleu »).
4. Pour « Noir & Blanc », tout ce qui n'est pas une couleur franche est noir ou blanc selon sa clarté (les rayures sépia du zèbre sont son blanc).
5. Une couleur déclarée restée vide reprend les centres qui lui ressemblent le plus (des robes blanches peintes dans une lumière chaude : le « Blanc » déclaré, pas un jaune), sans vider l'autre couleur. Si elle reste sous 0,4 % de l'image, elle n'est pas montrée.
6. Un presque noir revient avec la couleur déclarée très sombre qui l'entoure (les branches d'un cerisier sur un ciel de nuit sont dans le « Bleu ») : sans cela, la limite entre les deux se voit en mosaïque.
7. Toujours trois couleurs si possible (décision de Walid, voir plus bas). S'il y en a moins de trois de déclarées, on lit dans l'image les couleurs principales qui restent, dans la même liste, et on complète. Une couleur ajoutée doit couvrir au moins 3 % du tableau, ou 1,5 % si elle saute aux yeux (très vive, ou bien plus claire que le reste : une lune sur la nuit), et se distinguer nettement de celles déjà montrées. Entre plusieurs, on prend celle qui pèse le plus : sa place dans l'image, et ce qui la fait remarquer (sa vivacité, ou son contraste de clarté avec la dominante). Pour « Multicolore », des couleurs franches d'abord.
8. Rien de déclaré : la même lecture choisit jusqu'à trois couleurs (seuils plus bas : 1,2 % pour une couleur vive, 3,5 % pour une neutre).
9. `options.completer = false` : montrer seulement les couleurs données, sans compléter (quand la liste est déjà arrêtée par le serveur).

Résultat sur les 25 (`couleurs/sorties/principales.png`) : chaque tableau montre ses couleurs déclarées et leurs zones sont retrouvées, même petites (le velours rouge de la boîte de la ballerine, 8 % ; les poissons de la barque, 1,4 %). Sans rien déclarer (`… 0` en dernier argument de `essai.mjs`, `sorties/principales-lues.png`), les 25 donnent aussi des couleurs principales sensées.

**Décision de Walid (20/11).** La question portait sur les tableaux déclarés « Multicolore » (montrer les couleurs déclarées seules, ou en ajouter une lue dans l'image ; image des deux choix : `apercus/multicolore-deux-choix.jpg`). Il a d'abord demandé ce que cela changeait à sa liste (« la liste des couleurs ne peut être changée » : rien n'y est ajouté, et rien n'est changé à ce qui est déclaré sur un tableau), et si la page avait bien un moteur capable de lire les couleurs. Puis : « toujours trois couleurs dans ce cas si possible, même quand pas de multicolor et que la fiche en déclare moins, car ma fiche déclare les couleurs principales mais il peut y en avoir d'autres non principales, il faut juste choisir des couleurs en quantité suffisante ».

Sur les 25, à partir des seules couleurs déclarées : 15 tableaux arrivent à trois couleurs, 9 à deux, 1 à une (la barque étoilée, tout en bleu). Ajouts : le gris des chevaux, le noir du léopard et du cœur, le beige du tutu, le bronze des arabesques, la lune du cerisier, le soleil et le fond de la vague, le cœur du tournesol, les feuilles du renard, le voile bleu de la médina, la terre des danseuses, le blanc du zellige, le jaune du Superman.

**Les masques.** Un pixel appartient à la couleur montrée dont un centre est le plus proche ; entre deux couleurs, le passage est fondu. Ils sont calculés sur une copie de 320 px de large, puis agrandis sur l'image nette (`destination-in`) : la couleur qui revient est aussi nette que l'œuvre, même pour des traits fins.

**Le gris de fond** est plus pâle que dans la maquette (`grayscale(1) contrast(0.42) brightness(1.22)`) : sur lui, un noir ou un blanc qui revient se voit.

**Mesures** (Chrome, copie de 320 px, moyenne des 25) : sur l'ordinateur, `lire` 12 ms et `masques` 18 ms ; processeur ralenti 4 fois, 124 ms au total (173 au pire) ; ralenti 6 fois, 203 ms (282 au pire). Pas mesuré sur un vrai téléphone. Le moteur pèse 21 Ko, 8,6 Ko compressé, sans réduction. Au portage : à faire hors du fil principal (par tranches dans les temps morts, ou dans un Worker), pour ne jamais gêner le défilement.

**Les phrases.** Une par tableau et par couleur montrée, à partir de la couleur et du thème du tableau : un mot, puis une ou deux phrases courtes (« Le noir : la nuit de la savane. Il enveloppe le zèbre… »). Pour l'essai, Claude a écrit à la main celles des 25 tableaux (`couleurs/phrases-oeuvres.json`), comme le serveur les écrirait ; celles du Superman sont celles de la maquette. Pas de phrases par défaut : Walid veut des phrases uniques (et une même phrase sur des centaines de fiches serait du contenu dupliqué).

**Page d'essai.** `couleurs/demo/`, assemblée par `node faire-demo.cjs` à partir de `demo.gabarit.html`, publiée à https://claude.ai/artifact/ABowVtthbEhmXJpQB2f31v (version 3). Chaque carte rappelle ce qui est déclaré dans la boutique, marque d'un « + » les couleurs ajoutées, joue seule (l'œuvre, puis chaque couleur) et se fige sur la pastille touchée. Les couches des cartes éloignées de l'écran sont rendues. Vérifiée en local à 320, 390 et 1280 px (`voir-demo.mjs`), et en ligne dans Chrome sur ordinateur. Pas sur un vrai téléphone.

**Outils.** `essai.mjs` et `essai.html` font la planche d'une lecture sur des œuvres : `node essai.mjs nouveau sorties/x.png "zebre,ane" 2 150 1750 pale 320` (`actuel` pour la lecture de la maquette ; un `0` de plus pour ignorer les couleurs déclarées). Ne pas attendre `networkidle0` dans une capture : elle ne s'arrête jamais (images différées).

**Pas fait.** Rien de tout cela n'est dans la maquette, ni dans le thème, ni sur le serveur.

### Le process de mise en ligne, et l'étape à y ajouter

Relevé le 20/11 dans le backend par un sous-agent en lecture seule (branche `origin/main` ; la branche locale avait 80 commits de retard), à revérifier au portage :
- Dans le Publisher, Walid dépose une image, choisit la collection, clique « Préparer la fiche », relit, puis crée. Un tableau à la fois.
- À la préparation, Claude écrit, en voyant l'image, la description, les mots-clés et le texte alternatif (`ArtworkDraft`, `writer.writeProduct`).
- Juste après la publication (webhook `products/create`, puis un rattrapage chaque heure, `RepairIncompleteArtworks`), le serveur copie les options du modèle, déclare les couleurs, puis les thèmes.
- Les traductions (en, es, de, nl) ne se font que la nuit, à 03 h 30 (`TranslateProduct`), pour une liste fermée de champs ; les libellés des métaobjets à 04 h (`TranslateMetaobjects`).

L'étape à ajouter, automatique, sans clic de plus pour Walid, et que Claude écrira (Walid a demandé « qui va s'occuper du serveur ? ») : juste après la déclaration des couleurs et des thèmes, le serveur arrête la liste des couleurs à montrer (les déclarées, complétées jusqu'à trois par le même moteur, `couleurs.js`, sur une copie de 320 px de l'image), puis fait écrire par l'IA, qui voit l'image, une phrase par couleur montrée, à partir de la couleur et des thèmes du tableau. Le résultat (la liste des couleurs montrées et leurs phrases) va dans des métachamps du produit (voir « Le contrat entre le serveur et la page ») ; chaque produit a les siens, le poster ne copie pas sa toile. La page reçoit cette liste et ne complète rien elle-même (`completer: false`) ; elle ne lit seule que si rien n'est enregistré, et alors sans phrases. Le rattrapage de chaque heure la rejoue si elle a manqué. Il faut ajouter ce métachamp aux traductions de la nuit, sur le modèle de `title.short`. Tant que les phrases manquent (quelques minutes après la publication, ou un échec), la section montre les couleurs sans phrase. Dans le thème, les couleurs déclarées et leurs libellés traduits se lisent dans `product.metafields.shopify['color-pattern'].value`.

Points d'attention : le serveur n'a que 768 Mo et lit les pixels dans un processus à part (ici une copie de 320 px suffit) ; le test de référence `tests/golden/artwork-draft.js` et les tests du webhook sont à mettre à jour ; les produits déjà en ligne n'auront pas de phrases tant qu'on ne les fait pas écrire (une commande de rattrapage).

## La mise en place sur le vrai site (lancée le 20/11)

Walid, le 20/11, après la version poster : « Oui parfait, a-t-on fini ? Peut-on passer à l'implémentation sur le vrai site ? » La maquette v13 est la référence.

**Comment.** La nouvelle page se construit sur un modèle caché, à côté de la fiche actuelle : les clients ne voient rien changer. Walid la regarde sur son téléphone avec un vrai produit ; la bascule ne se fait qu'avec son feu vert. Un sous-agent neuf par ticket, la session principale intègre sur `main` et pousse un ticket à la fois.

**Tickets** (`../issues/`) : 19 ossature, modèle caché et présentation ; 20 la scène en quatre temps ; 21 les couleurs de la scène ; 22 l'histoire et « En pratique » ; 23 avis, « Vous aimerez aussi », questions ; 24 « Ce qu'un tableau change chez vous », pied de page et couleurs ; 25 serveur, les couleurs montrées et leurs phrases ; 26 serveur, les phrases traduites la nuit ; 27 contrôle, mesures et bascule.

**Le contrat entre le serveur et la page** (ticket 25 pour l'écriture, ticket 21 pour la lecture) :
- `artwork.colors` : liste de références vers les métaobjets `shopify--color-pattern`, dans l'ordre d'affichage. D'abord les couleurs déclarées (sans « Multicolore » ; « Noir & Blanc » devient Noir puis Blanc), puis les couleurs ajoutées par le moteur, trois au plus.
- `artwork.color_text_1`, `_2`, `_3` : un texte par couleur, même ordre. « Le bleu : l'aplomb. Il sculpte le visage du héros. Chez vous, il pose la pièce et donne de l'assurance. » La première phrase (jusqu'au premier point) est le titre ; le reste est le texte. Le nom de la couleur est dans le texte : il se traduit avec lui, la page ne le compose pas.
- La pastille prend son nom du libellé du métaobjet (déjà traduit), coupé avant « / » (« Doré / Or » : « Doré »).
- Chaque produit a ses propres couleurs et ses propres textes : le poster ne copie pas sa toile (une phrase unique par page).
- Sans `artwork.colors` (produit trop récent, panne) : la page prend les couleurs déclarées (`shopify.color-pattern`), complète elle-même, et ne montre pas de phrase.
- Le moteur (`couleurs/couleurs.js`) existe en deux copies identiques : dans le thème (la page trouve les zones) et sur le serveur (il arrête la liste). Les changer ensemble. La copie du serveur est `app/Services/ArtworkColors/couleurs.ts` ; son empreinte est vérifiée par `tests/golden/artwork-colors.js`, à mettre à jour avec elle.
- Un produit qui déclare « Noir & Blanc » : `artwork.colors` contient noir puis blanc, mais la page donne `blanc-noir` au moteur à leur place (il ne lit pas l'image de la même façon), voir le ticket 21.
- Les quatre métachamps ont une définition dans Shopify depuis le 20/11 (produit, espace `artwork`, non épinglées) : « Couleurs montrées sur la fiche » (liste de couleurs de la boutique) et « Texte de la couleur 1 », « 2 », « 3 ». Walid peut donc les lire et les corriger à la main dans l'admin d'un produit, sous « Champs méta », « Afficher tout ».
- Sur le serveur : l'étape est `App/Services/ArtworkColors` (dépôt du backend). Elle suit la déclaration des couleurs puis des thèmes à la mise en ligne, le rattrapage de chaque heure reprend ce qui a manqué, et la commande `phrases-couleurs` (workflow « Commande sur le serveur ») sert aux produits déjà en ligne : « essai » dit les couleurs sans rien écrire, « refaire » dans « passes » refait un produit déjà traité. Coupure : `ARTWORK_COLORS_DISABLED`.

**Les images des personnages dans le thème.** Le nom d'un fichier se lit dans la page : aucun ne rappelle un tableau ancien. Les fichiers de `proto/img/` sont copiés tels quels dans `assets/`, sous ces noms :

| Maquette (`proto/img/`) | Thème (`assets/`) | Taille | Ticket |
|---|---|---|---|
| `foule.webp` | `galerie-public.webp` | 1687 × 680 | 20 |
| `oiseau.webp` | `galerie-oiseau.webp` | 176 × 176 | 20 |
| `allongee.webp` | `galerie-dame.webp` | 1118 × 560 | 20 |
| `main.webp` | `galerie-main.webp` | 729 × 440 | 20 |
| `anges.webp` | `galerie-anges.webp` | 865 × 330 | 23 |
| `perle.webp` | `galerie-perle.webp` | 507 × 810 | 23 |
| `joconde.webp` | `galerie-ecoute.webp` | 572 × 810 | 23 |
| `fifre.webp` | `galerie-ton.webp` | 333 × 720 | 24 |
| `macon.webp` | `galerie-travaux.webp` | 567 × 380 | 24 |
| `bouquet.webp` | `galerie-bouquet.webp` | 428 × 520 | 24 |
| `cri.webp` | `galerie-waouh.webp` | 317 × 620 | 24 |

Les autres images de la maquette (`oeuvre`, `oeuvre-halo`, `reco-*`, `avis-*`) ne vont pas dans le thème : la page prend l'image du produit, les recommandations de Shopify et les photos de clients déjà réglées dans le modèle. Dans le code aussi (classes, commentaires, clés de langue), les personnages gardent ces noms neutres.

## Reste à faire

- Section 7 validée par Walid le 19/11 (« Parfait ! »), sauf l'image de « sans travaux », remplacée dans la v9 : il n'en a rien dit et est passé au temps 1. Les couleurs de l'étude et le pied de page sont passés (« Super ! », 20/11), le champ de la newsletter est corrigé. La foule du temps 1 (v12) est validée : « Oui parfait » (20/11). Fluidité à juger sur son téléphone.
- Les couleurs (temps 2) : Walid a tranché le 20/11 : des phrases uniques par tableau (la couleur + le thème), et les couleurs principales déclarées dans la boutique, sans nuances. Et toujours trois couleurs si possible. Reste, avec son feu vert : poser la section dans la maquette (`couleurs/couleurs.js`, gris plus pâle) et écrire l'étape du serveur.
- Les quatre petites icônes du bloc « En pratique » (prête à accrocher, couleurs fidèles, vraie toile, une vraie personne) sont restées : lui demander s'il veut les retirer aussi.
- Vu en passant : la fiche en ligne annonce 14 jours pour un retour, la politique de remboursement de la boutique 10 jours ouvrables. À lui de dire lequel est le bon.
- Portage dans le thème, sur le seul modèle `oeuvre-3d` : sections dédiées, styles dans `input.css`, textes dans les 5 langues, H1 et données Google inchangés, note Trustpilot par les jetons.
- Contenus à brancher au portage :
  - temps 2 : les couleurs montrées sont les couleurs principales déclarées dans la boutique, et chaque phrase est propre au tableau. Voir « Les couleurs du temps 2 » : l'étape du serveur qui écrit les phrases, le métachamp traduit la nuit, la lecture des zones dans la page.
  - temps 3 : rien à écrire par œuvre, les mêmes phrases pour toutes. Dire « le tableau » ou « le poster » selon le produit.
  - section 7 : les mêmes phrases pour toutes les œuvres, « tableau » ou « poster » selon le produit. Les titres sont des jeux de mots (« donner le ton », « ne fane pas ») : à adapter dans chaque langue, pas à traduire mot à mot.
- La version poster : faire valider ses textes par Walid (`poster/textes.json`). Au portage, les blocs « En pratique », questions et engagements doivent avoir leur version poster (aujourd'hui, la fiche d'un poster montre les textes de la toile). Le texte d'un poster n'a pas de titre : garder sa première phrase comme titre, ou en faire écrire un par le serveur. Les couleurs déclarées du poster ne sont pas dans le même ordre que celles de sa toile (Multicolore, Rose, Bleu contre Multicolore, Bleu, Rose) : chaque fiche suit les siennes, avec ses propres phrases.
- Mesure avant/après (Lighthouse).
