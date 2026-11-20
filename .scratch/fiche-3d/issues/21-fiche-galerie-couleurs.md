# 21 : Fiche galerie — les couleurs de la scène

**What to build:** le temps 2 de la scène, « Chaque couleur agit sur vous. » : l'œuvre passe en gris pâle, puis chacune de ses couleurs revient seule, avec sa pastille et sa phrase. Trois couleurs si possible, les couleurs principales déclarées du produit d'abord.

Références :
- La décision de Walid et la méthode : `.scratch/fiche-3d/galerie/README.md`, « Les couleurs du temps 2 » et « Le contrat entre le serveur et la page ».
- Le moteur : `.scratch/fiche-3d/galerie/couleurs/couleurs.js` (`lire`, `masques`). Il passe dans le thème tel quel : le serveur en a une copie identique (ticket 25), les deux doivent rester les mêmes.
- La façon de montrer : la page d'essai `.scratch/fiche-3d/galerie/couleurs/demo.gabarit.html` (masque calculé sur une copie de 320 px de large, puis agrandi sur l'image nette ; gris de fond `grayscale(1) contrast(0.42) brightness(1.22)`), et le temps 2 de la maquette `proto/index.html` pour le déroulé au fil du défilement (une couleur à la fois, sa pastille cerclée, sa phrase).

## Ce que la page lit

1. `artwork.colors` (liste de métaobjets `shopify--color-pattern`, dans l'ordre) et `artwork.color_text_1`, `_2`, `_3` : la liste est arrêtée, la page ne complète rien (`completer: false`). La première phrase d'un texte (jusqu'au premier point) est son titre, le reste son texte.
2. Sinon, les couleurs déclarées du produit (`shopify.color-pattern`) : la page complète elle-même jusqu'à trois, et ne montre pas de phrase.
3. Sinon : la page lit seule les couleurs de l'image, sans phrase.

L'identifiant d'un métaobjet donne la couleur au moteur (`bleu`, `vert`, `noir`, `beige`, `marron`, `jaune`, `or`, `bronze`, `orange`, `rouge`, `rose`, `violet`, `gris`, `blanc` ; `multicolore` n'est pas montré ; `blanc-noir` vaut noir puis blanc). Le nom sous la pastille est le libellé du métaobjet, déjà traduit, coupé avant « / » (« Doré / Or » : « Doré »).

**Noir et blanc (relevé au ticket 25, le 20/11).** Pour un produit qui déclare `blanc-noir`, le serveur écrit `artwork.colors` = noir puis blanc. Le moteur ne lit pas l'image de la même façon selon qu'on lui donne `blanc-noir` ou `noir` et `blanc` séparés (`couleurs.js`, ligne 154) : sur le zèbre d'essai, le blanc tombe de 15,9 % à 1,5 % de l'image. Donc, dans le cas 1 : si le produit déclare `blanc-noir` (`shopify.color-pattern`) et que `artwork.colors` contient noir et blanc, la page donne `blanc-noir` au moteur à leur place, et montre toujours deux pastilles, noir puis blanc, chacune avec son texte. À couvrir par un test sur le zèbre.

## À respecter

- Le calcul ne gêne jamais le défilement : il se fait à l'approche de la scène, hors du fil principal ou par petites tranches dans les temps morts. Mesuré le 20/11 : environ 0,03 s sur un ordinateur, 0,12 à 0,2 s sur un téléphone simulé.
- Les textes sont dans la page dès le chargement (Google les lit sans le script) ; le script ne fait que l'effet.
- Sans script ou en mouvements réduits : l'œuvre en couleurs, et les phrases à la suite.
- Une couleur déclarée que le moteur ne retrouve pas dans l'image n'est pas montrée, sa phrase non plus.
- La note Trustpilot et les autres règles du dépôt ne sont pas concernées ; la vérification des traductions doit passer.

**Blocked by:** 20 (la scène). Le ticket 25 (serveur) peut arriver avant ou après : sans ses métachamps, la page suit les cas 2 et 3.

**Status:** done, en ligne le 20/11/2026 (`fbdae20` les couleurs, `4c97f15` le texte d'aide de la section raccourci : Shopify refusait le schéma, 561 caractères pour 500).

Vérifié en ligne le 20/11 sur la toile et le poster Superman : le serveur écrit les trois couleurs arrêtées (`data-arretees` : bleu rose jaune pour la toile, rose bleu jaune pour le poster), leurs noms (Bleu, Rose, Jaune) et leurs trois phrases, titre en gras ; à l'écran, l'œuvre passe en gris pâle, puis chaque couleur revient seule avec sa pastille cerclée et sa phrase, dans l'ordre du produit, puis la nuit du temps 3. Le moteur du thème (`assets/galerie-couleurs.js`) est identique à l'octet à celui du dossier d'essai et du serveur. Calcul dans un Worker, à l'approche de la scène. Pas vérifié : un vrai téléphone, Safari et Firefox (sans OffscreenCanvas dans un Worker, iOS avant 16.4 : l'œuvre reste en couleurs, sans pastilles, les phrases défilent quand même), les phrases dans les autres langues (traduites la nuit, ticket 26).

- [x] Avec `artwork.colors` et ses textes, la page montre exactement ces couleurs, dans cet ordre, chacune avec sa phrase.
- [x] Sans eux, la page montre les couleurs déclarées, complétées jusqu'à trois, sans phrase ; sans rien de déclaré, elle lit l'image.
- [x] Toile et poster, portrait, paysage et carré ; un tableau en noir et blanc, un tableau d'une seule couleur, un tableau multicolore donnent un résultat juste (les 25 images d'essai sont dans `couleurs/demo/img/`, ce qui est déclaré pour chacune dans `couleurs/declare.json`).
- [x] Le défilement reste fluide pendant le calcul ; rien ne bloque plus de quelques millisecondes d'affilée.
- [x] Le moteur du thème est identique à celui du dossier d'essai (même fichier).
- [x] La fiche actuelle et les autres pages sont inchangées.
