# 07: Nouvelle fiche : la toile en 3D

**What to build:** le premier tracé de la nouvelle fiche, sur une toile de test non publiée, prévisualisée depuis l'admin. Un nouveau modèle de page pour les œuvres réutilise les blocs actuels (titre, avis Trustpilot, options, achat, description, onglets, FAQ) et remplace la galerie par la 3D three.js validée au prototype.
- La vraie image s'affiche d'abord, puis la 3D la remplace en fondu, sans décaler la page.
- La toile est de face sur un mur clair, avec la bordure choisie et une légère inclinaison au doigt, qui laisse défiler la page.
- Sur mobile, une barre fixe (prix et « Ajouter au panier ») reste visible. Sur ordinateur, le bouton est visible dès l'arrivée et la 3D reste fixe pendant qu'on parcourt les options.
- Le moteur 3D est un module que le serveur réutilisera pour les photos (ticket 08).

Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 02 (prototype validé), 04 (règle unique des fiches d'œuvre), 05 (options et événement de choix)

**Status:** ready-for-agent

- [ ] Le modèle de page fait partie des œuvres, grâce à la règle du ticket 04 : le panier, le tiroir et les collections le traitent comme une toile. *(règle vérifiée par un vrai rendu Liquid : `kind: toile` ; panier et tiroir à revoir en ligne)*
- [ ] Sur mobile, le tableau s'affiche en moins de 2,5 s (0,99 s aujourd'hui), sans aucun décalage de page, avec des interactions de moins de 200 ms et un score Lighthouse ≥ 90. *(à mesurer en ligne ; banc local ci-dessous)*
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
- La 3D démarre au premier geste (souris, doigt, molette, touche), ou 8 s après le chargement. Sans cela, Lighthouse comptait 460 ms de blocage de plus. Lighthouse ne voit donc plus ce travail : son score ne dit rien de la 3D. Pour revenir au démarrage du prototype : `QUIET_AFTER_LOAD_MS = 0`.
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
