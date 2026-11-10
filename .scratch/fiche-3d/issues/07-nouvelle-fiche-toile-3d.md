# 07: Nouvelle fiche : la toile en 3D

**What to build:** le premier tracé de la nouvelle fiche, sur une toile de test non publiée, prévisualisée depuis l'admin. Un nouveau modèle de page pour les œuvres réutilise les blocs actuels (titre, avis Trustpilot, options, achat, description, onglets, FAQ) et remplace la galerie par la 3D three.js validée au prototype.
- La vraie image s'affiche d'abord, puis la 3D la remplace en fondu, sans décaler la page.
- La toile est de face sur un mur clair, avec la bordure choisie et une légère inclinaison au doigt, qui laisse défiler la page.
- Sur mobile, une barre fixe (prix et « Ajouter au panier ») reste visible. Sur ordinateur, le bouton est visible dès l'arrivée et la 3D reste fixe pendant qu'on parcourt les options.
- Le moteur 3D est un module que le serveur réutilisera pour les photos (ticket 08).

Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 02 (prototype validé), 04 (règle unique des fiches d'œuvre), 05 (options et événement de choix)

**Status:** ready-for-agent

- [x] Le modèle de page fait partie des œuvres, grâce à la règle du ticket 04 : le panier, le tiroir et les collections le traitent comme une toile. *(vérifié en ligne le 05/11 : `kind: toile`, bonne variante au panier, tiroir et vignette justes)*
- [ ] Sur mobile, le tableau s'affiche en moins de 2,5 s (0,99 s aujourd'hui), sans aucun décalage de page, avec des interactions de moins de 200 ms et un score Lighthouse ≥ 90. *(mesuré en ligne le 05/11 : aucun décalage, mais ni 2,5 s sur un téléphone moyen ni Lighthouse ≥ 90, pas plus que la fiche actuelle ; voir « Vérifié en ligne »)*
- [x] La 3D suit les choix grâce à l'événement du ticket 05 ; le prix et le bouton changent au clic, sans attendre l'animation.
- [x] Animations réduites, appareil faible ou 3D indisponible : photos et simples fondus.
- [x] Un doigt posé sur la 3D peut toujours faire défiler la page. *(touches simulées dans Chrome ; à confirmer sur un vrai téléphone)*
- [x] Le moteur rend la même scène dans la page et hors de la page, à l'identique.
- [x] Les textes de la 3D sont traduits ; aucun libellé n'est écrit en dur.

## Notes de réalisation (05/11/2026)

**Fait.** La fiche sort avec `?view=oeuvre-3d`, sur la vraie toile du Bonsaï, sans changer aucun produit.
- `assets/oeuvre-3d-engine.js` : le moteur, en un seul fichier (raison en tête du fichier : le CDN garde un an les adresses sans `?v=`, relevé le 05/11, et un `import` relatif perd le `?v=`). Le prototype y est porté, sauf ses mesures, sa pièce provisoire et ses murs d'essai (`walls.js`), à reprendre du prototype si le ticket 11 les retient.
- `assets/component-oeuvre-3d.js` : `<oeuvre-3d>`, l'arrivée, les choix, le repli photos, la libération de la carte graphique.
- `assets/three.module.min.js` : r170, fichier officiel, licence MIT dans son en-tête, identique au bit près à celui du prototype. 675 Ko bruts, 136 Ko en brotli.
- `snippets/oeuvre-3d-stage.liquid`, `templates/product.oeuvre-3d.json`, réglage `media_display` de `main-product`, suffixe dans `artwork-kind`.

**Fichiers partagés, sans effet sur `painting` et `poster`.** `sections/main-product.liquid` : balisage identique sur 6 modèles, avant et après, par un vrai rendu Liquid. `assets/main-product.js` : une branche sous `data-buy-bar`. `input.css` : règles sous `.buy-bar` et `[data-buy-bar]`. Le fichier `locales/*.json` gagne 5 clés.

**Choix à faire valider par Walid.**
- La 3D démarre au premier geste (souris, doigt, molette, touche), ou 8 s après le chargement. Sans cela, Lighthouse comptait 460 ms de blocage de plus. Sur le banc, Lighthouse ne voyait plus ce travail. En ligne, il le voit : il attend assez longtemps pour que le filet de 8 s parte. Pour revenir au démarrage du prototype : `QUIET_AFTER_LOAD_MS = 0`.
- Bouton « Voir le dos » : sans lui, le tour n'a pas de déclencheur si le produit n'a pas de jumeau. Toucher « Toile » dans la bascule le rejoue aussi.
- Le bouton d'achat passe avant les options, comme au prototype. Sinon il tombait sous le pli d'un portable. Sur ordinateur, le bouton flottant revient dès que celui de la fiche sort de l'écran.
- Mur neutre : le plus grand format prend 60 % de l'écran, le 30 × 40 le quart (la règle de la pièce). Le tableau reste centré. Plan `wall` du moteur.
- Cadres blanc, argent et noyer : teintes de l'ancienne 3D, sans matière (ticket 10).

**Pour le ticket 08.** `renderStill(THREE, { canvas, artImage, weave, room, woodImage, sizes, product, group, width, height, density })` rend une photo (Blob) sur un canvas hors de tout document. `neutralRoom(sizes)` donne le mur, `weavePixels()` la trame, `group` le plan (`border`, `frame`, `size`, rien pour la face). Il faut WebGL2 : un Chromium sans écran, pas `headless-gl`.

**Vérifié.** `npm test` (260 tests, dont ceux du prototype repris), `i18n-lint`, Shopify Theme Check. Banc local hors dépôt, dans Chrome avec le vrai GPU : la vraie page du Bonsaï, la section rendue par liquidjs, le réseau externe coupé, le panier simulé. 109 contrôles :
- façade 3D sur la photo à moins de 0,4 px, aucun décalage dans la fiche ;
- choix au doigt et à la souris, prix à jour avant la fin de l'animation, un seul événement, adresse, lien `?variant=` ;
- cote en cm, doigt qui défile ou incline, scène collée le temps des options puis libérée ;
- ajout au panier de la bonne variante, source `float`, `#product-tracking-json` ;
- replis : animations réduites, mémoire faible, économie de données, sans WebGL2, WebGL refusé, contexte perdu, animation sous 24 images/s ; three.js n'est alors pas téléchargé, sauf dans les trois derniers cas ;
- 18 bascules toile/poster : 9 contextes WebGL, aucun avertissement, une seule barre, un seul événement.
- Pixels : 12 plans identiques au prototype (dos, coin du poster et verre compris) ; 5 plans identiques entre la fiche et `renderStill()`, 0 pixel différent sur 1,5 million.

**Mesures.**
- Poids à l'arrivée : 6 Ko de code, plus l'image (155 Ko en WebP à 750 px). L'ancienne 3D (29 Ko) n'est plus chargée.
- Après le premier geste : 174 Ko (three.js et moteur), puis 38 Ko de bois au repos. Source complète : 840 Ko en WebP, à l'approche des bordures et des cadres, jamais en 2G, 3G ou économie de données.
- Piège évité : `fetch` envoie `Accept: */*`, et le CDN répond alors par le PNG d'origine, 8 Mo au lieu de 840 Ko. Le prototype ne pouvait pas le montrer.
- Portable à processeur ÷4 : du geste à la 3D 2,5 s, pire réponse à un choix 176 ms, plus longue tâche 471 ms.
- Lighthouse sur le banc, nouvelle fiche contre fiche actuelle : performance 69 contre 61, blocage 350 contre 690 ms, CLS 0,001 contre 0. Le banc ne compte que l'écart : il ne dit rien du score en ligne. Sur les deux fiches, l'essentiel du blocage vient du calcul de mise en page de la page elle-même. Le ≥ 90 n'est pas garanti.

**À vérifier en ligne.**
1. Pousser en deux temps : la section d'abord, le modèle ensuite (`?view=` garderait sinon la galerie).
2. `#product-tracking-json` : `"template": "oeuvre-3d"`, `"kind": "toile"`. `?view=sur-mesure` donne déjà le bon suffixe sur le Bonsaï, relevé le 05/11.
3. Ajout au panier, tiroir, vignette.
4. Lighthouse mobile sur `?view=oeuvre-3d`, comparé à la fiche actuelle.
5. Sur un vrai téléphone : fluidité, défilement, temps d'arrivée de la 3D, Safari.

**Limites.**
- Rien n'a tourné sur un vrai téléphone ni dans Safari.
- `Theme Check` signale des balises ouvertes et fermées sous des conditions différentes dans `main-product` : c'est voulu, pour coller la scène sans JavaScript. La sortie reste bien formée.
- Les textes du nouveau modèle (onglets, FAQ, bouton) ne sont traduits nulle part tant que Translate & Adapt ne les a pas pris : à faire avant le ticket 18.
- `?view=oeuvre-3d` sur un poster garde la galerie ; ticket 14 : trancher le type d'après `product` dans `artwork-kind`.
- Bruit et bois restent aussi dans `component-perspective-canvas.js`, à retirer quand la dernière fiche quittera l'ancienne 3D.
- Sous `npm test`, Node 22.12 au moins (le moteur est un module ES chargé par `require`).

## Vérifié en ligne (05/11/2026)

Commits `72c176d` (section) et `9a94af8` (modèle), poussés l'un après l'autre, déploiements réussis.

**Fiches actuelles inchangées.** Six fiches copiées avant et après le push de la section : toile récente, ancienne toile, poster, tapisserie, deux personnalisés. Le seul écart dans `#MainContent` est un saut de ligne en moins entre deux balises, sans effet à l'écran.

**Nouvelle fiche, sur le Bonsaï, avec `?view=oeuvre-3d`.** Testée dans un Chrome à part, profil jetable, téléphone simulé, PostHog et statistiques coupés.
- Page : `<oeuvre-3d>` et `data-buy-bar` présents, ni ancienne 3D ni galerie, un seul H1, adresse canonique sans le paramètre, `#product-tracking-json` à `"kind": "toile"` et `"template": "oeuvre-3d"`.
- 3D : apparue 0,8 à 1,6 s après le premier toucher sur ce PC.
- Doigt : vertical sur la 3D, la page défile de 245 px ; de côté, le tableau s'incline et la page ne bouge pas.
- Options : prix et barre à jour 0,3 s après le toucher, `?view=` gardé dans l'adresse avec `variant`. Cote, pivot de la bordure, coin du cadre et tour de la toile regardés sur captures.
- Achat : barre visible partout ; au panier, 60x80, Bordure noire, Sans cadre, 96 € ; tiroir et vignette justes. Sur ordinateur, le bouton est visible à l'arrivée, la 3D reste fixe et le bouton flottant revient au défilement.
- Aucune erreur JavaScript.

**À savoir.**
- L'encart promo de 15 € couvre la fiche et masque la barre d'achat tant qu'il est ouvert, comme la règle le prévoit sur les fiches actuelles.
- Le 90 × 120 n'a pas de cadre : « Aucun cadre disponible pour cette taille », comme aujourd'hui.
- « Poster » renvoie à l'ancienne fiche du poster, et « Toile » depuis celle-ci à l'ancienne fiche de la toile : `?view=` ne suit pas la bascule. Normal jusqu'au ticket 14.

**Vitesse, nouvelle fiche contre fiche actuelle, à conditions égales.**

| Mesure, en ligne | Nouvelle | Actuelle |
|---|---|---|
| Lighthouse mobile, performance (2 passages) | 46 et 47 | 48 et 39 |
| Blocage Lighthouse | 1,4 et 1,7 s | 1,2 et 1,25 s |
| Décalage de page | 0 | 0 |
| Tableau affiché, sans limitation, sur ce PC | 1,04 s | non mesuré |
| Tableau affiché, 4G correcte et processeur ÷ 4 | 3,5 et 3,7 s | 3,5 et 4,0 s |
| Tableau affiché, 4G lente et processeur ÷ 4 | 9,1 et 9,1 s | 8,1 et 11,4 s |

Lecture : la nouvelle fiche affiche le tableau aussi vite que l'actuelle. Le blocage est un peu plus haut parce que Lighthouse attend assez pour voir la 3D se préparer (592 ms de moteur au processeur ÷ 4). Le ≥ 90 du banc n'existait pas non plus (69 contre 61 sur le banc, réseau externe coupé) : en ligne, les deux fiches sont freinées surtout par les scripts de Shopify (pixels, perf-kit), Klarna et Facebook, présents sur tout le site. La fiche seule ne peut pas atteindre 90.

**Reste à voir :** un vrai téléphone et Safari. Rien de cela n'a été essayé.

## Retour de Walid du 08/11/2026 : une autre mise en page

Essayée sur son téléphone, la fiche lui plaît pour sa fluidité, pas pour sa mise en page : « je ne veux pas avoir des options en bas séparées de l'image en haut ». Il veut l'œuvre en plein écran et les options en vignettes à gauche et à droite du tableau (décision 9 du README).

- **Maquette** : `prototype/maquette.html` (`npm start` dans `prototype/`), publiée sur le lien du prototype (https://claude.ai/artifact/MSMMJ5KFKrEuJ8xZSw69yz). Moteur, mises en scène et réglages inchangés. Vignettes rendues par le moteur, à l'arrêt seulement, en cases lues sans attente (`renderThumbs` dans `scene.js`, plans dans `src/thumbs.js`) ; un croquis 2D tient la place avant la 3D, ou sans elle.
- **Choix faits sans Walid, à valider** : deux mots sous chaque vignette (l'option et le choix en cours ; « Toile, ou poster ») ; écart de prix sous chaque aperçu ; bouton « De face » après une mise en scène ; indice au premier affichage, effacé au premier geste ; les six cadres de la boutique (blanc, argent et noyer en teinte seule, ticket 10) ; dans la pièce, le grand format recule assez pour tenir entre les vignettes ; en-tête du site simulé ; vignette Toile : le tableau un peu tourné.
- **Vérifié** (Chrome sans écran, 390 × 844 et 1440 × 900, 38 contrôles) : rangées, prix au toucher, retouche qui rejoue, toucher ailleurs qui referme, 90 × 120 sans cadre, poster, clavier, défilement et inclinaison au doigt, animations réduites, thème sombre, console vide. Processeur ÷ 4 : 50 à 60 images/s, lenteur seulement à la première image après le toucher ; un lot de vignettes occupe la page 12 ms en moyenne.
- **Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.
- **Ensuite**, si Walid valide : refaire la mise en page de `?view=oeuvre-3d` sur ce modèle, pour ce modèle seulement.

## Design des chips v2 de Walid (09/11/2026)

Walid a refusé le style des vignettes du 08/11 et a itéré lui-même dans Claude Design, sur une scène fixe. Il a envoyé le résultat le 09/11 : « voici le design à implémenter ». C'est le fichier « Fiche chips v2 » du projet « MyselfMonArt · chips de la fiche 3D » (https://claude.ai/design/p/bdd4b54f-f5a0-4db0-89ce-8e8f5eba01e7?file=Fiche+chips+v2.dc.html). Retenu : la direction 2b et ses formats, 390 × 844, iPhone SE (375 × 667, et ses 553 px visibles dans Safari) et ordinateur (1440 × 820). Plus aucune miniature : l'œuvre en 3D est le seul aperçu.

**Fait**, sur la maquette (même lien) :
- `prototype/src/chips.js` et `chips.css` : les chips en module sans dépendance, pour la fiche du thème. Calculs purs : mise en page des quatre formats, place de la rangée et remontée de la scène, textes et prix. Ils sont testés sur les mesures du design (`tests/chips.test.js`). Le module gère aussi le DOM et ses états (toucher, clavier, Échap, toucher ailleurs) et `track()`, qui pose à chaque image filets, points et pulsation sur l'œuvre projetée par la 3D (`toScreen`), inclinaison comprise. Le catalogue (options, prix, règles) et les textes arrivent par un adaptateur.
- `maquette.html` et `src/maquette.js` : l'en-tête et la barre d'achat du design. La photo d'arrivée est à la place exacte de l'œuvre, en CSS dès la première image. La 3D est cadrée au même endroit sans toucher au moteur ni aux mises en scène : largeur par `framing`, hauteur par un canvas plus haut que la scène et un angle de vue élargi d'autant (`lensShift`). Hors du plan de face (pièce, coin du cadre, tranche, tour, coin du poster), les filets s'effacent et les légendes prennent leur plaque dépolie, comme dans les plans « Pièce » et « Coin » du design.
- Retirés de la page : les vignettes rendues par la 3D et l'indice de la première seconde. `thumbs.js` et `renderThumbs` restent pour le ticket 08.

**Écarts volontaires avec le design.**
- La vraie 3D remplace les photos fixes : les plans « Pièce » et « Coin » sont ceux du moteur, avec ses cotes en cm. Sur ordinateur, plus de fondu sur les bords : il masquait une photo de téléphone agrandie.
- Filets et points suivent l'œuvre projetée et s'effacent quand la caméra quitte la face, puis reviennent. Dans le design, ils dépendaient du plan choisi à la main.
- Hors de la face, la teinte des plaques vient en fondu tout de suite, mais leur flou, comme celui de la rangée ouverte, attend que la 3D s'arrête. Sur une 3D qui bouge, ce flou faisait tomber un téléphone moyen à 25 images/s.
- Retoucher un choix déjà pris rejoue sa mise en scène, « Toile » dans la bascule compris. Dans le design, rien ne se passe.
- Gardés de la maquette du 08/11, absents du design : le bouton « De face », en plaque dépolie en haut à gauche, seulement quand la 3D s'est arrêtée sur un autre plan (toucher l'œuvre fait de même) ; les flèches du clavier dans la rangée. Ajoutés : le focus rendu à la légende quand la rangée se ferme par Échap, la barre d'achat inerte quand elle s'efface, sa zone tactile portée à 46 px sans changer son dessin.
- La barre d'achat de l'ordinateur dit « Bonsaï zen », le titre du produit, au lieu de « Bonsaï éternel », titre d'exemple du design.
- En 390 × 844, les légendes sont 1 px plus bas que dans le cadre 2b : la hauteur de leur filet y était fixée à la main, la règle des cadres 3 donne 1 px de plus.
- Animations réduites : des fondus, sans glissement ni pulsation ; le design n'avait pas ce cas. Thème sombre : la scène et ses chips restent claires, l'en-tête et la fiche suivent.
- L'avis de la maquette, quand elle reste sur la photo, est passé sous la bascule : en bas, il couvrait la taille.

**Vérifié** (Chrome sans écran, carte graphique du PC, scripts hors dépôt) :
- Comparé au design dans 8 états (repos, rangées de la bordure, du cadre, de la taille et du contour ouvertes, bordure noire choisie, cadres grisés en 90 × 120, poster), bouton par bouton et panneau par panneau : 0 px d'écart sur 68 boîtes en 375 × 667 et sur 63 en 553 px visibles ; 1 px au plus en 390 × 844 ; sur ordinateur, 0 px, sauf la barre d'achat, 22 px plus étroite parce que son titre est plus court. Captures côte à côte des quatre formats, rangées ouvertes et fermées, et des plans pièce et coin.
- La photo d'arrivée et l'œuvre de face de la 3D sont à moins de 1 px de la place du design. Filets et points restent à moins de 0,1 px du bord projeté, inclinaison comprise ; ils s'effacent hors de la face et reviennent avec « De face ».
- 45 contrôles, repris à 49 après le retour de Walid (voir plus bas) : rangées ; remontée de 22, 40 ou 16 px ; barre d'achat qui s'efface en 553 px puis revient avec le nouveau prix ; toucher ailleurs qui ferme sans toucher à la 3D ; prix et légendes à jour avant l'animation ; rejeu dans la rangée et dans la bascule ; 90 × 120 sans cadre, cadres grisés ; poster (contour, quatre cadres, coin soulevé, marge), puis retour à la toile (tour) ; défilement au doigt depuis l'œuvre et depuis une légende ; inclinaison sans défilement ; clavier (Tab, Entrée, flèches, Échap, focus rendu) ; survol ; cibles d'au moins 44 px ; animations réduites ; sans WebGL ; thème sombre. Console vide.
- Processeur ÷ 4, au doigt, même parcours sur la maquette du 08/11 et sur la nouvelle, dans un ordre alterné. Médianes de 3 et 4 tours : 34 à 57 images/s selon la mise en scène pour la nouvelle (la pièce est la plus lente), contre 43 à 59 pour l'ancienne. Les images lentes tombent dans les 200 premières ms : la rangée se ferme, la scène redescend et les légendes reviennent pendant que la 3D démarre. Les mesures sont très bruitées, car le PC faisait tourner d'autres sessions (charge de 35 à 60 %) ; un tour au calme donnait 47 à 60 images/s. Inclinaison : 55 à 60 images/s. `track()` coûte 0,2 à 0,4 ms par image ; le JavaScript de la page, pendant une mise en scène, est plus court que celui de l'ancienne maquette (367 ms contre 487).

**Pas vérifié** : un vrai téléphone, Safari (flou préfixé, `translate`, `inert`, unités de conteneur), le lecteur d'Artifacts de claude.ai.

**Pour le portage dans le thème.**
- Polices : Albert Sans remplace « Welcome » (`assets/heading.woff2`, sous licence) dans le design. Le thème peut garder sa police `heading` si elle a les graisses 500, 600 et 700 ; sinon, charger Albert Sans dans ces trois graisses, 400 inutile. Roboto est déjà là ; Roboto Mono ne sert qu'aux cotes de la pièce.
- Poids : `chips.js` 34 Ko bruts et 11 Ko en gzip, commentaires compris ; `chips.css` 14 et 4 Ko. Aucune dépendance.
- Pièges relevés à processeur ÷ 4 : un `backdrop-filter` sur un élément invisible, ou devant la 3D qui bouge (rangée ouverte comprise), coûtait jusqu'à 30 images/s. Les fondus passent par l'opacité ou la transformation d'éléments HTML, au compositeur, jamais par une couleur ni par un enfant de SVG. Les vignettes de taille prennent une petite copie de l'œuvre. Rien n'est réécrit à l'identique dans la page. Reste un écart de 5 à 10 images/s avec la maquette du 08/11 au départ des mises en scène, quand plusieurs fondus du design partent avec la 3D : à surveiller sur un vrai téléphone.
- Le cadrage de la 3D (`src/framing.js`, pur et testé) : canvas plus haut que la scène, centré sur l'œuvre, angle de vue élargi d'autant (`lensShift`) ; rangée ouverte, la mise en scène se cadre dans la zone au-dessus de la rangée. Le nombre de pixels de la scène visible est gardé : densité 2,6 au lieu de 3 sur un écran × 3.
- Deux règles de placement selon la hauteur : écran haut, l'œuvre au milieu (cadre 2b) ; sinon, le bloc centré au-dessus de la barre d'achat (cadres 3a et 3b). La photo d'arrivée suit la même règle en CSS (`maquette.html`) : à garder identique au calcul de `chipsLayout`, sinon la page saute.
- Textes : `TEXTS_FR` et les noms des options passent par l'adaptateur, à brancher sur les traductions du thème, les variantes et le poster jumeau. Le module est en CSS simple : à garder en asset ou à traduire en Tailwind (règle du skill `shopify-section-dev`).

### Rangée ouverte après un choix (retour de Walid du 09/11, sur la version 14)

Walid : « quand on en sélectionne une, la pop-up du bas ne doit pas disparaître, sauf si on clique en dehors. Et dès qu'on clique en dehors, non seulement ça disparaît, mais on revient sur la vue de face du tableau. Et ce, pour tous les choix. »

**Fait.**
- Bordure (ou contour), cadre et taille : un choix s'applique (légende, prix, mise en scène) et la rangée reste ouverte ; on enchaîne les choix, chacun avec sa mise en scène. Elle se ferme seulement par un toucher en dehors d'elle (mur, œuvre, légende active, « De face », en-tête), par Échap ou quand le focus du clavier la quitte. Ce toucher ne fait rien d'autre : il ferme la rangée et ramène la 3D de face, même en pleine mise en scène ; filets revenus, plaques parties. La barre d'achat garde son effet. La bascule Toile | Poster ne change pas.
- `railEvent` (`chips.js`) décrit ces règles et les tests l'éprouvent ; la page reçoit `onDismiss` et revient de face.
- `src/framing.js` : rangée ouverte, chaque mise en scène se cadre dans la zone visible au-dessus de la plus haute rangée. La tranche, le coin du cadre, l'œuvre dans la pièce et ses cotes restent au-dessus d'elle. Le cadrage glisse au rythme de la caméra, sans toucher au moteur ni aux mises en scène. Le canvas couvre la scène dans tous les cadrages.
- Clavier : un choix garde le focus dans la rangée ; Échap ferme, revient de face et rend le focus à la légende.
- Le flou de la rangée ouverte attend l'arrêt de la 3D, comme celui des plaques.

**Vérifié** (Chrome sans écran, scripts hors dépôt) :
- 82 contrôles au doigt sur les quatre formats, 390 × 844, 375 × 667, 375 × 553 et 1440 × 820 : Bordure Noire puis Miroir, Taille 90 × 120 puis 60 × 80, Cadre Chêne puis Noir, chaque fois rangée ouverte, puis un toucher dehors (rangée fermée, vue de face) ; un toucher dehors en pleine mise en scène ; clavier. Le sujet de chaque mise en scène, mesuré sur la 3D projetée, reste au-dessus de la rangée. Captures regardées pendant et après chaque mise en scène.
- Les 49 contrôles généraux sont repris pour ce comportement, et 9 tests sont ajoutés (178 en tout). La comparaison au design est refaite, sans écart nouveau. Console vide.
- Processeur ÷ 4, rangée ouverte, un passage : 35 à 57 images/s selon la mise en scène (la pièce reste la plus lente), inclinaison 60.

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.

### Mise en scène dès l'ouverture d'une rangée (retour de Walid du 09/11, sur la version 15)

Walid : « Si je clique sur bordure blanche, la pop-up apparaît avec tous les choix et je veux que le tableau zoome vers la bordure, même si je n'ai pas encore changé le choix. »

**Fait.**
- Ouvrir une rangée (légende ou cote, au doigt ou au clavier) joue tout de suite la mise en scène de son groupe avec le choix en cours, comme si on venait de le choisir, cadrée au-dessus de la rangée : la tranche pour la bordure, la marge pour le contour du poster, le coin pour le cadre (avec « Aucun », le plan de la toile nue, là où irait le cadre), la pièce pour la taille, à la taille en cours et avec ses cotes. Le directeur et ses réglages ne changent pas : la page l'appelle avec le produit inchangé.
- `railEvent` rend l'effet `stage` à l'ouverture et `createChips` appelle `onStage(groupe)` une fois la rangée posée. Choisir, toucher dehors, Échap et la bascule ne changent pas. Rouvrir une rangée rejoue sa mise en scène.
- La caméra part quand la rangée est apparue, après son fondu de 200 ms. Le premier rendu de la rangée occupe la carte graphique pendant ses 200 premières ms : partie en même temps, la 3D perdait près d'une image sur deux à processeur ÷ 4. La rangée apparaît donc d'abord, puis l'œuvre bouge ; une mise en scène démarre lentement de toute façon. La source complète des gros plans ne se pose pas dans cet intervalle, mais à l'arrêt de la caméra, comme avant. Refermée avant ces 200 ms, la rangée ne lance rien.
- Avant la 3D (photo d'arrivée), le toucher démarre la 3D sans attendre que la page soit au repos. La mise en scène part dès que la 3D est prête, si la rangée est encore ouverte, avec le choix fait entre-temps ; une rangée refermée avant n'attend plus rien. Garde-fous (animations réduites, appareil modeste, réseau lent) et 3D en échec : comme pour un choix, sans démarrer la 3D.
- Corrigé au passage : le cadrage au-dessus de la rangée relève la remontée de la scène à son départ. Sans image entre l'ouverture et la mise en scène, il gardait celle d'avant.

**Vérifié** (Chrome sans écran, scripts hors dépôt) :
- 7 tests ajoutés (185 en tout).
- 181 contrôles nouveaux. 123 au doigt sur les quatre formats (390 × 844, 375 × 667, 375 × 553, 1440 × 820) : Bordure, Cadre avec « Aucun » et Taille ouverts sans rien changer, puis Contour sur le poster. La rangée s'ouvre aussitôt, prix et légendes inchangés ; la mise en scène part quand elle est apparue ; sujet au-dessus de la rangée et image centrée sur la zone ; un toucher dehors ramène de face, filets revenus. Aussi : rouvrir rejoue, refermer avant 200 ms ne lance rien, clavier sur ordinateur (Entrée ouvre et joue, focus sur le choix en cours, Échap). 53 pour un toucher avant la 3D, page pas encore chargée, sur les quatre formats : la 3D démarre du toucher et la mise en scène part à son arrivée ; aussi avec la rangée refermée avant, et avec « Noire » choisie avant. 5 pour les animations réduites, avec et sans 3D. Console vide.
- Les 50 contrôles généraux et les 82 de la rangée ouverte repassent. Comparaison au design refaite : aucun écart nouveau.
- Captures regardées : chaque rangée ouverte, pendant et après sa mise en scène, et le passage de la photo à la 3D après un toucher précoce, sans image fantôme.
- Processeur ÷ 4, 375 × 667 × 3, même machine (chargée par d'autres sessions), ordre alterné, 3 tours, première ouverture de la visite. Mise en scène jouée à l'ouverture : 32, 31 et 28 images/s (médianes ; bordure, cadre « Aucun », taille). Même mise en scène lancée rangée posée, version 15 : 39, 32 et 31. Caméra partie avec la rangée, sans l'attente de 200 ms : 10 à 18. Reste une image lente au départ du premier gros plan d'une visite, pendant que la source complète se décode.

**Pas vérifié** : un vrai téléphone (fluidité, et ressenti des 200 ms avant que l'œuvre bouge), Safari, le lecteur d'Artifacts de claude.ai.

### Bordure avec cadre : la tranche dans le jour (retour de Walid du 09/11, sur la version 16)

Walid : « quand il y a un cadre, on ne voit pas la bordure car le cadre vient devant. Il faut vraiment montrer l'intersection entre le cadre et la toile et zoomer dans cette intersection, peut-être à l'angle bas du tableau. »

**Fait.**
- `staging.js` : avec un cadre, le plan de la bordure (rangée Bordure ouverte, ou choix d'une bordure) devient un gros plan sur l'angle bas côté lumière, tableau au mur, dans le jour de 0,6 cm entre la toile et la caisse (`gapShot`, réglages `GAP`). Avant, il montrait le tableau entier, tourné, et la paroi de la caisse cachait la tranche.
- La caméra se tient à 6 cm de l'angle, à 17° vers la tranche éclairée et 17° vers le bas. La tranche du côté et celle du bas s'y voient sur toute leur profondeur (2 cm) : 0,46 cm à l'écran, 14 % de sa hauteur, soit 50 à 80 px selon le téléphone. À cette distance la perspective compte : à 14°, la tranche s'aplatit (12 %) ; à 19°, la lèvre en cache le fond.
- L'angle se pose en bas à gauche de l'écran, l'œuvre remplit le reste. Sur un écran large, il revient vers le milieu : le cadre prend la moitié gauche, sous la légende, l'œuvre la droite, et la caméra garde le même biais. Posé sur le côté d'un écran d'ordinateur, il obligeait la caméra à tourner de 41°, et la légende tombait sur la tranche.
- D'une bordure à l'autre, le plan ne bouge pas : seule la tranche change. L'arrivée depuis la face et le retour sont continus.
- Sans cadre, le poster, le plan du cadre et la géométrie (jour, lèvre, châssis) ne changent pas.

**Écarts et limites.**
- Le coordinateur estimait l'angle vers 13°, en rayons parallèles ; à 6 cm, l'optimum mesuré est 18°, d'où 17°.
- La tranche du bas regarde le sol : elle reçoit moins de lumière que celle du côté (0,62 contre 0,88 de la face), grisée mais lisible.
- Noire dans un cadre noir : peu de contraste avec le cadre ; le chanfrein clair de la lèvre les sépare.
- Étirée, Miroir et Pliée prolongent l'image sur la tranche : elles se distinguent par la texture (traînées étirées, coups de pinceau en miroir, image décalée sur la façade pour Pliée), pas par une couleur.
- Sur un écran × 3, l'œuvre est grossie environ 6 fois en 30 × 40 et 16 fois en 75 × 100 (source de 1904 px de large) : l'image est plus douce en 75 × 100. Le bois du cadre aussi.
- **Corrigé ensuite, après validation de la version 17 (voir plus bas)** : à l'angle, un petit triangle clair laisse voir le mur. Le fond de la caisse s'arrête au bord carré de la toile, dont l'angle est arrondi (0,3 cm). Invisible de loin, il se voit dans ce gros plan, surtout sur un cadre noir. Correctif proposé : faire passer le fond de la caisse 0,3 cm sous la toile (`frameProfile`, `geometry.js`), sans changer le jour, la lèvre ni le châssis. Non fait, la géométrie devait rester telle quelle.

**Vérifié** (Chrome sans écran, scripts hors dépôt) :
- 18 tests du directeur (202 en tout). Le plan avec cadre vise l'angle bas côté lumière, sur cinq formes d'écran, en 30 × 40 et 75 × 100. La part de tranche visible dans le jour est calculée à part, d'après le catalogue et le profil du cadre (lèvre sous le chanfrein, à 3,12 cm du mur), en au moins trois hauteurs : au moins 0,4 cm et 10 % de la hauteur de l'écran. Même plan d'une bordure à l'autre ; arrivée et retour sans à-coup ; rejeu.
- 80 captures regardées : chaque bordure avec un cadre chêne et un cadre noir, sur les quatre formats, en 30 × 40 et 75 × 100. La tranche se voit dans le jour, au-dessus de la rangée ouverte ; la lèvre ne la cache pas. La tranche blanche mesure 218 à 221 de luminance sur 255 dans le jour : éclairée, pas un trou noir. Console vide.
- Captures en vol : entrée depuis la face, passage de Blanche à Noire (caméra identique), retour de face.
- Processeur ÷ 4, 375 × 667 × 3, ordre alterné, 3 tours : entrée et sortie du jour à 47 images/s (médiane), contre 41 pour la tranche sans cadre.
- Les 50 contrôles généraux, les 82 de la rangée ouverte et les 123 de la mise en scène à l'ouverture repassent. Le prototype du ticket 02 (`index.html`), qui partage le directeur, montre le même gros plan, console vide.

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.

### Angle du jour : le fond de la caisse passe sous la toile (09/11, après la version 17)

Version 17 validée par le coordinateur, qui demande le correctif du triangle clair : il se voyait nettement sur les téléphones, surtout avec un cadre noir et la bordure Noire.

**Fait.**
- Le fond de la caisse passe 0,3 cm sous la toile, la largeur de son angle arrondi (`frameProfile`, `geometry.js`). Le triangle qui laissait voir le mur à l'angle du jour a disparu. Le jour, la lèvre, la face et le dos de la caisse ne changent pas. Tourné vers l'avant, ce rebord ne se voit pas de dos ; de face, la toile le cache partout ailleurs.
- Au passage, l'espace manquante est rétablie dans `const close = distanceFor(` (`staging.js`).

**Vérifié** (Chrome sans écran, scripts hors dépôt) :
- 2 tests de géométrie ajoutés et 1 repris (204 en tout). Aux quatre angles, en 30 × 40 et 75 × 100, les points entre l'arc de l'angle et le coin carré tombent sur le fond ; sur l'ancien profil, ils n'y tombaient pas. Le reste du profil est inchangé, point par point.
- Angle agrandi sur les quatre formats, cadre noir avec Noire et cadre chêne avec Blanche, avant et après : le triangle a disparu.
- Pixel à pixel contre la version 17 : vue de face avec cadre (30 × 40 et 75 × 100), plan du Cadre (chêne et noir), tableau retourné à 100° et 180° (dos de la caisse), poster sous verre de face et sur le coin. Aucun pixel ne diffère (écart maximal 2 sur 255). Console vide.

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.

### Bordure avec cadre reculée, légende de l'option ouverte effacée (retours de Walid du 10/11, sur la version 18)

Walid, sur le gros plan : « c'est un peu trop zoomé à mon goût […] quand on est zoomé autant près, on voit que c'est pas vrai, mais c'est fait en 3D », puis « reculez un petit peu ». Sur la légende de l'option ouverte : « l'encadré blanc est mal fait puisqu'il y a trop de padding […] Tu le fais tout simplement disparaître puisqu'il y a déjà la pop-up du bas qui explique déjà qu'on est dans l'option bordure et quelle bordure a été choisie. »

**Fait.**
- Bordure avec cadre (`GAP`, `staging.js`) : la caméra recule de 6 à 12 cm, le plan passe de 3,2 à 6,4 cm de haut. On voit toute la baguette, son bord et le mur au-delà, et davantage de tableau. Sur un écran × 3, l'image est grossie 3,2 fois au lieu de 6,3 en 30 × 40, soit à peu près la définition de sa photo ; en 75 × 100, 7,9 fois au lieu de 15,8 (la source fait 1904 px de large). L'angle passe de 17° à 15° : à cette distance l'optimum est à 16°, et la lèvre cache le fond de la tranche au-delà de 18°.
- La tranche dans le jour : 14,2 % de la hauteur de la zone au-dessus de la rangée avant, 7,0 % après. Soit environ 26 px sur l'iPhone SE dans Safari (52 avant), 30 px en 375 × 667 (61), 40 px en 390 × 844 et sur ordinateur (81 et 84), toute sa profondeur visible (2 cm).
- Rangée ouverte, il ne reste qu'elle : la bascule, la cote et les deux légendes s'effacent, la légende touchée comprise, avec tous les filets ; la pulsation est retirée. Effacées, elles sont inertes : ni doigt ni focus. Elles reviennent à la fermeture (toucher dehors, Échap), aussitôt, sans plaque tant que la 3D revient de face (`is-returning`) ; les filets reviennent avec la face. Revu après la version 19 : elles attendent la face elles aussi (voir plus bas). Clavier : à l'ouverture, le focus va dans la rangée ; Échap le rend à la légende.
- La plaque dépolie apparaît encore sans rangée ouverte, quand la 3D n'est pas de face : pendant la bascule Toile | Poster (tour de la toile, coin du poster), au repos sur un poster encadré (vu de trois-quarts, avec « De face »), et en glissant l'œuvre assez loin de la face. Elle serre désormais le texte (`.chips-label`) : 8 px de chaque côté, 5 px dessus et dessous, au lieu de la boîte du bouton (18 px au-dessus du texte sur un téléphone, jusqu'à 102 px à côté sur ordinateur). La boîte du bouton reste la cible du doigt, et le texte ne bouge pas d'un pixel.

**Écarts.**
- Le design v2 dessine la plaque sur toute la boîte de la légende (62 × 52 px sur un téléphone, colonne de 176 px sur ordinateur) : la plaque serrée s'en écarte, comme demandé.
- Le test de la tranche mesurait la longueur de son image en biais (11,5 % ici) ; il mesure maintenant sa largeur (7 %), la grandeur qui compte. Les 14 % annoncés pour la version 17 étaient déjà cette largeur.

**Vérifié** (Chrome sans écran, scripts hors dépôt) :
- 206 tests : bornes du plan reculé (6,4 cm, angle de 12 à 18°, tranche d'au moins 6,5 % de la hauteur), et 2 tests des règles de `chips.css` (toutes les légendes effacées rangée ouverte, plus de pulsation, plaque serrée sans déplacer le texte, pas de plaque sous la rangée ni pendant le retour).
- 58 contrôles sur les quatre formats : Bordure, Cadre, Taille et Contour ouverts sans légende, ni filet, ni pulsation, chips inertes ; à la fermeture, légendes revenues aussitôt sans plaque, puis filets avec la face ; plaque serrée sur le poster encadré ; clavier. 52 contrôles du plan reculé (cadre chêne avec Blanche, cadre noir avec Noire, 30 × 40 et 75 × 100, quatre formats) : tranche blanche à 219-221 de luminance dans le jour. Console vide.
- Captures regardées : chaque rangée ouverte, la fermeture, la plaque serrée, le plan reculé avant et après.
- Les 50 contrôles généraux, les 82 de la rangée ouverte et les 123 de la mise en scène à l'ouverture repassent.

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.

### Retour de face : les légendes attendent la face (retour du coordinateur sur la version 19, 10/11)

Version 19 validée, sauf un point : à la fermeture de Bordure ou de Cadre, la bascule, les légendes et la cote revenaient aussitôt, pendant que la 3D revenait de face. L'œuvre, encore agrandie, passait sous elles, sans plaque : en 390 × 844, 450 ms après le toucher dehors, « Toile | Poster » sur le tableau et « Taille 30 × 40 cm » sur son bas.

**Fait.**
- `chips.css` : tant que la 3D revient de face (`is-returning`), la bascule, les légendes et la cote restent effacées. Elles reviennent en fondu avec les filets quand la 3D est de nouveau de face, fin de `is-returning`. Sans retour à faire (3D déjà de face), elles reviennent aussitôt, comme avant.
- Clavier : Échap rend le focus à la légende comme avant ; la chip qui a le focus (`:focus-within`) reste visible pendant le retour.
- Selon le plan, la face revient vers 450 ms (bordure ; tout plan sur ordinateur) ou 800 ms (cadre, taille, contour sur téléphone). Pendant ce retour, les chips effacées ne prennent pas le doigt : on ne touche la bascule ou une légende qu'une fois revenues.

**Vérifié** (Chrome sans écran, scripts hors dépôt) :
- 1 test des règles de `chips.css` ajouté (207 en tout).
- `check.cjs` ajusté en conséquence : il attend le retour des chips avant de toucher « Poster » après Échap, et la fin de la remontée de la scène (courbe à léger rebond, 650 ms) avant de la mesurer. La version 19 et celle-ci la posent au même rythme.
- Captures en vol du retour, 150, 450 et 800 ms après le toucher dehors puis à l'arrivée, après Bordure, Cadre, Taille et Contour, sur les quatre formats. À chaque instant, aucun texte de chip visible ne tombe sur l'œuvre projetée (boîte de ses huit coins, cadre compris) ; à l'arrivée, tout est revenu, hors de l'œuvre. Le même contrôle, lancé sur la version 19 en 390 × 844, relève bien le défaut : bascule et légendes sur l'œuvre à 150 et 450 ms. Clavier : après Échap, la légende a le focus et reste visible, les autres attendent. 58 contrôles, console vide.
- Les 50 contrôles généraux, les 82 de la rangée ouverte et les 181 de la mise en scène à l'ouverture repassent.

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.

### Taille : une femme à côté du tableau, à la place du salon (choix de Walid du 10/11)

Walid : le 30 × 40 était ridicule sur un mur immense. La mise en scène de la Taille quitte le grand salon : une femme se tient à côté du tableau, sur un mur clair, une pose par taille (quatre photos générées par Gemini, validées par Walid). Détail, préparation des photos, écarts et vérifications : ticket 12, section « Maquette du 10/11/2026 ».

**Fait.**
- Ouvrir la Taille, ou y changer de taille, montre la photo de la pose à la place du salon. Le tableau 3D est posé exactement sur le rectangle de la photo, à la vraie échelle, avec la lumière venue de la gauche, son ombre et sa tranche ; la cote en cm reste, celle de la hauteur passe à gauche (la femme est à droite). Rangée ouverte, changer de taille fond une pose dans l'autre pendant que le tableau change de taille.
- La femme est détourée : sa main passe devant le 90 × 120, et l'ombre du tableau ne tombe pas sur elle.
- Cadrage au-dessus de la rangée ouverte, sur les quatre formats : le tableau, ses cotes (sous le bouton « De face ») et la tête de la femme toujours ; la femme en entier sur un téléphone en hauteur ; sur un écran large, peu de mur vide, la femme coupée au plus bas à mi-cuisse. Au-delà de la photo, le mur se prolonge en miroir, sans raccord visible.
- Photos et calques réduits à 2400 px de large (982 Ko pour les quatre poses), chargés à la première approche de la Taille seulement ; le salon ne se charge plus. Le reste de la maquette ne change pas : le tableau est simplement accroché sur le rectangle de sa pose dans tous les plans, ce qui ne se voit pas sur le mur uni.

- Version 22 (retour sur la version 21) : la femme se voit toujours entière en largeur, mains comprises ; en 90 × 120 sur téléphone, le tableau rapetisse un peu pour que son geste, bras ouverts, tienne dans le cadre. Ordinateur et autres tailles inchangés. Détail dans le ticket 12.
- Version 23 (retours de Walid sur la version 21) : les tableaux paraissent 20 % plus grands à côté d'elle, une constante (`POSES.scale`) ; le tableau semble photographié dans la pièce (lumière du mur, contraste, couleurs, netteté et grain de la photo, trame et relief de la toile, ombre douce du côté de la sienne) ; photos de pose refaites, pièce meublée (olivier, banc, vase, lampadaire, panier), mur au même blanc chaud sur les quatre ; les feuilles, les branches et sa main passent devant le tableau agrandi ; le mur se prolonge uni au-dessus et sur un bord où un objet touche la photo. Le reste de la fiche ne change pas : ces réglages ne jouent que dans la pose de la taille. Détail dans le ticket 12.
- Version 24 (choix de Walid) : photos de pose en 21:9, plus aucun bord de photo sur ordinateur ; le 90 × 120 plus grand sur téléphone (sa main lointaine en dernier) ; toutes les mises en scène glissent en sinus sur 1 s et partent dès le toucher, rangée comprise (jusqu'ici, la caméra attendait les 200 ms du fondu de la rangée) ; plus de parquet étiré sous la photo. Détail dans le ticket 12.

**Vérifié** : 217 tests ; 76 contrôles de la Taille sur les quatre formats ; captures de chaque taille, du fondu et de la main ; les contrôles généraux, de la rangée ouverte, de la mise en scène à l'ouverture, des légendes et du jour repassent (détail dans le ticket 12).

**Pas vérifié** : un vrai téléphone, Safari, le lecteur d'Artifacts de claude.ai.
