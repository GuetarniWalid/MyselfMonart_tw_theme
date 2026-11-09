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
