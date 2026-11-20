# 20 : Fiche galerie — la scène en quatre temps

**What to build:** sous la présentation, la scène épinglée de la maquette, qui suit le défilement : le regard, les couleurs, la lumière, la matière. Ce ticket pose la scène et son mouvement ; la lecture des couleurs du temps 2 est le ticket 21 (ici, le temps 2 montre son titre et l'œuvre, sans couleurs qui reviennent).

La référence est la maquette v13 : `.scratch/fiche-3d/galerie/proto/index.html` (section `.visite`, ses styles, et dans le script : les mesures de la scène, le mode de secours, le repère cliquable). Tout ce qui la décrit est dans `.scratch/fiche-3d/galerie/README.md` (« Ce que montre la maquette », « Mouvement », « La version poster »). Lire aussi « Parti pris » : ce sont les règles de Walid.

## Ce qu'on voit

- Une scène en `position: sticky`, longue de 3,82 écrans de défilement, mur et sol en aplats de couleur qui changent à chaque temps.
- Temps 1, le regard : l'œuvre un peu plus petite et plus haute ; la foule d'un tableau ancien arrive en trois groupes des deux côtés et se referme devant elle ; un oiseau se pose sur le coin de l'œuvre ; puis chacun repart.
- Temps 2, les couleurs : le titre « Chaque couleur agit sur vous. » et l'œuvre (les couleurs : ticket 21).
- Temps 3, la lumière : la pièce passe au noir, le texte au blanc ; l'œuvre s'efface presque, une lampe de tableau vient se fixer au-dessus d'elle puis s'allume ; la dame allongée sur son lit sort de l'ombre et dit « Laissez allumé. ».
- Temps 4, la matière : l'œuvre grossit jusqu'à remplir l'écran, la main avance et la touche (étincelle). Toile : la trame apparaît, « Le grain d'une vraie toile. ». Poster : le reflet doux du papier glisse, « Un vrai papier photo. ».
- En haut, un repère de quatre traits qui se remplissent ; toucher un trait mène à son temps.

L'œuvre est l'image à plat du produit (celle de la 3D), à ses proportions (portrait, paysage ou carré : la maquette est en 3:4, la scène doit tenir aussi en 4:3 et en 1:1). Version poster : œuvre à plat comme une feuille (ombre courte), « le poster » dans le texte du temps 3, temps 4 du papier.

## Mouvement

- Chaque élément mobile est une animation CSS dont l'avancement est la position de défilement (`animation-timeline`), sur `transform` et `opacity` seulement : rien ne tourne dans le fil principal pendant le défilement.
- Navigateur sans animations liées au défilement : le mode de secours de la maquette (un script donne la position, mêmes images clés).
- « Mouvements réduits » ou sans script : la scène se déplie à plat, l'œuvre puis tous les textes à la suite, sans foule, sans nuit, sans lampe.
- Les mesures faites au chargement et au redimensionnement (échelle de la scène, place de l'œuvre au-dessus du lit, grossissement du temps 4) sont refaites quand on passe de la toile au poster.

## À respecter

- Les personnages (foule, oiseau, dame, main) sont des images détourées du dossier `.scratch/fiche-3d/galerie/proto/img/`. Elles se chargent en différé, avec leurs dimensions, sans décaler la page. Elles n'ont pas de texte alternatif (décor), et aucun tableau ancien n'est nommé dans la page.
- Textes dans les cinq langues du site. Les titres sont courts et jouent sur les mots : les adapter dans chaque langue, pas mot à mot.
- Rien ne change pour les autres pages du site, ni pour la fiche actuelle tant que la bascule (ticket 27) n'est pas faite.

**Blocked by:** 19 (ossature)

**Status:** done, en ligne le 20/11/2026 (`389f64b` la section, `eb31133` le modèle). Le sous-agent a été arrêté par une interruption juste avant ses commits : la session principale a relu, testé et commité son travail.

Vérifié en ligne le 20/11/2026 sur la toile et le poster Superman (vue `?view=oeuvre-galerie`, téléphone 390 × 844 et ordinateur 1440 × 900) : mêmes données pour Google que la fiche normale (title, description, canonique, robots, og, h1 unique, deux blocs JSON-LD identiques), aucun débordement, aucune erreur de script, bascule Toile / Poster qui garde la vue de test ; les douze pages témoins du site identiques avant et après le push des fichiers. Pas vérifié : un vrai téléphone, Safari et Firefox (à faire au ticket 27). Captures en ligne des quatre temps : fidèles à la maquette, toile (trame, « Le grain d'une vraie toile. ») et poster (« Un vrai papier photo. »). Couture laissée au ticket 21 : `.galerie-scene-messages` dans l'article du temps 2, `.galerie-scene-teintes` dans l'œuvre, `.galerie-scene-palette` sous l'œuvre.

- [x] Les quatre temps se suivent comme dans la maquette, sur téléphone (320 à 430 px de large) et sur ordinateur, pour une œuvre en portrait, en paysage et carrée.
- [x] Toile et poster : le temps 3 dit « le tableau » ou « le poster », le temps 4 montre la trame ou le papier, et la scène se recale après la bascule Toile / Poster.
- [x] Le mode de secours et la page à plat (mouvements réduits) montrent tout le texte.
- [x] Aucun débordement horizontal ; aucun décalage de mise en page au chargement ; les images des personnages ne se chargent qu'à l'approche de la scène.
- [x] Les cinq langues sont en place, et la vérification des traductions du dépôt passe.
- [x] La fiche actuelle et les autres pages sont inchangées.
