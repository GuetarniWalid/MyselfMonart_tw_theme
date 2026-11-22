# 28 : Fiche galerie — les couleurs à toucher

**What to build:** les couleurs quittent la scène qui défile et deviennent une section à part, `galerie-couleurs`, juste après la scène et avant l'histoire. L'œuvre y reste en couleurs. Toucher une couleur change la phrase et pose ses points sur les endroits où elle se trouve dans l'œuvre. La scène garde trois temps : le regard, la lumière et la matière.

**Pourquoi (retour de Walid du 22/11/2026).** « Les users ne comprennent pas : ils tentent tous de cliquer sur les couleurs et ne comprennent pas qu'il faut scroller pour que ça évolue. » Un agent UX/UI a revu la section. Selon lui, les pastilles ressemblent à un choix de produit, posé juste au-dessus du bouton d'achat. Pour passer d'une couleur à l'autre, il fallait faire défiler environ 270 px, sans que rien ne l'indique. Et le gris de l'œuvre la faisait paraître éteinte.

**Décisions de Walid, le 22/11 :**
- Prototype essayé et validé (voir Références).
- « Oui, bloc à part » : les couleurs ont leur propre section après la scène, qui passe à trois temps.
- « Oui, le garder » : au toucher d'une couleur, ses zones s'entourent d'un trait blanc pendant 1,5 s environ, puis il ne reste que les points.

## Références

- **Prototype validé** (un seul fichier, autonome) : `C:\Users\gueta\dev\MyselfMonart_tw_theme\.scratch\fiche-3d\galerie\couleurs-interactif\prototype.html`, publié pour Walid sur https://claude.ai/artifact/MG7NRgwSGQjs44voGuGdUk. Il est assemblé à partir de `couleurs-interactif\outils\` par `faire-prototype.cjs` :
  - `gabarit.html` : la feuille de style et la page. Les classes `.gc-*` forment le bloc ; `.proto*`, `.etiquette`, `.fin-scene`, `.histoire` et `.pilule` n'appartiennent qu'au prototype.
  - `bloc.js` : le HTML du bloc tel que le serveur l'écrirait.
  - `travail.js` : le Worker (points, contours, carte des couleurs, calculés à partir des masques du moteur).
  - `page.js` : l'élément `<galerie-couleurs>`. Ce qui suit l'élément, c'est-à-dire changer de tableau et voir sans script, ne sert qu'au prototype.
  - Outils d'essai : `servir.cjs`, `capturer.mjs`, `mesurer.mjs` et `verifier.mjs`.
- Captures du prototype : `couleurs-interactif\captures\` (planches `planche-telephone-superman.png`, `planche-ordinateur-superman.png`, `planche-autres-tableaux.png`, `planche-ordinateur-autres.png`). Les deux images des choix de Walid : `choix-1-bloc-a-part.png` et `choix-2-eclat.png`.
- Ce qui existe aujourd'hui : le ticket 21 (`21-fiche-galerie-couleurs.md`, temps 2 de la scène : les règles des données restent valables, voir plus bas), le ticket 20 (`20-fiche-galerie-scene.md`, la scène), `.scratch\fiche-3d\galerie\README.md` (« Les couleurs du temps 2 », « Mouvement », « Parti pris ») et les consignes communes `.scratch\fiche-3d\galerie\PORTAGE.md`. Elles s'appliquent toutes, avec les écarts listés sous « Livraison ».
- Le moteur `assets/galerie-couleurs.js` : **on n'y touche pas**. Il est identique à l'octet à celui du serveur (`app/Services/ArtworkColors/couleurs.ts` du backend, sha256 commençant par `58c19596`). Tout ce qui s'ajoute (points, contours, carte) se calcule dans le Worker, à partir des masques qu'il rend, comme dans `travail.js`.

## La section `galerie-couleurs`

- Nouveau fichier `sections/galerie-couleurs.liquid`, avec le schéma « Galerie : les couleurs », `limit` 1, `enabled_on` product, sans réglage. Un paragraphe d'aide de 500 caractères au plus (`scripts/sections-schema.test.cjs`) dit à quoi elle sert, où la placer (juste après la scène, dans une fiche en page galerie) et d'où viennent les couleurs et les phrases.
- Elle ne rend rien hors d'une fiche d'œuvre (snippet `artwork-kind`), sans image à plat (snippet `artwork-flat-index`), ou **quand aucune couleur n'a de phrase à montrer**. Les cas 2 et 3 du ticket 21 (couleurs déclarées complétées, ou image seule, sans phrase) disparaissent donc. Le serveur écrit les phrases de chaque nouveau produit à sa mise en vente (ticket 25).
- **Les données** sont celles du ticket 21, cas 1. Ce sont `artwork.colors` (dans l'ordre) et `artwork.color_text_1` à `_3`. On ne montre que les couleurs qui ont un texte, et jamais `multicolore` ni `blanc-noir`. Le cas du noir et blanc reste : si le produit déclare `blanc-noir` (`shopify.color-pattern`) et que `artwork.colors` contient noir et blanc, le moteur reçoit `blanc-noir` à leur place, et la page montre deux pastilles, noir puis blanc. La première phrase d'un texte, jusqu'au premier point, sert de titre en gras ; le reste est la suite. Le texte est échappé et passe par `snippets/trustpilot-tokens.liquid`. Le nom de la pastille est le libellé du métaobjet, coupé avant « / ». Une couleur que le moteur ne retrouve pas dans l'image perd sa pastille et sa phrase.
- **Ce qu'écrit le serveur** (lu par Google et visible sans script) : le surtitre « Les couleurs », sans numéro ; le titre « Chaque couleur **agit sur vous.** » en `h2` ; les phrases, toutes ; l'œuvre en couleurs (même image et mêmes paliers que la scène, avec `crossorigin="anonymous"` pour que ses pixels restent lisibles) ; enfin les pastilles, écrites mais cachées (`hidden`), qu'une pastille sans script ne réponde jamais. Les textes fixes sont dans les fichiers de langue. Les clés `colors` et `colors_title_html` de `sections.mma.galerie.scene` vont sous `sections.mma.galerie.couleurs`, avec leurs traductions actuelles, dans les cinq langues. Toute clé nouvelle (le nom de la liste des pastilles, par exemple) est traduite dans les cinq langues (`scripts/i18n-lint.cjs`).
- **Le comportement**, celui du prototype, porté tel quel :
  - Le script montre les pastilles et fait des phrases des onglets : `role="tablist"`, `tab` et `tabpanel`, avec `aria-selected` et `aria-controls`, et les flèches, Début et Fin au clavier. La première couleur est choisie d'avance : sa phrase se lit sans rien toucher. Les phrases se superposent à la même place : changer de couleur ne fait pas bouger la page.
  - Toucher une pastille change la phrase. Ses points volent de la pastille jusqu'à l'œuvre, et ses zones s'entourent d'un trait blanc pendant 1,5 s environ ; ensuite, seuls les points restent. Toucher à nouveau la même couleur rejoue l'éclat.
  - Toucher l'œuvre choisit la couleur qui se trouve sous le doigt, grâce à la carte calculée par le Worker. Sur ordinateur, le survol de l'œuvre montre une petite étiquette avec le nom de la couleur.
  - Les calculs se font dans un Worker, à l'approche du bloc, et jamais pendant le défilement. Mesures du prototype avec un processeur ralenti 4 fois : un toucher prend de 3 à 14 ms, les calculs de 130 à 310 ms dans le Worker. Sans Worker ni OffscreenCanvas (iOS avant 16.4), les pastilles et les phrases marchent, mais sans points ni traits.
  - En mouvements réduits, rien ne vole et aucune entrée ne suit le défilement : les changements sont immédiats. Sans script, l'œuvre en couleurs et les phrases s'affichent à la suite, sans pastilles.
- **La mise en page**, celle du prototype, aux mêmes tailles. Sur téléphone, de haut en bas : le surtitre et le titre, l'œuvre, la phrase, puis les pastilles sur la bande soleil. Sur ordinateur (900 px et plus) : le texte, la phrase et les pastilles à gauche, l'œuvre à droite, accrochée au-dessus du sol soleil. Le mur et le sol sont ceux du temps 2 validé (`--creme`, `--soleil`). Le nom d'une pastille reste à l'écart de son anneau, avec un espacement de 15 px dans le prototype (retouche du 22/11).
- Le nouvel élément se nomme `<galerie-couleurs>`, comme dans le prototype. L'ancien, celui de la scène, disparaît dans le même commit (b).

## La scène en trois temps

- `sections/galerie-scene.liquid` perd le temps 2 : l'article `.galerie-scene-couleurs`, le `<galerie-couleurs>` posé dans l'œuvre et la palette `.galerie-scene-palette`. Le mur crème et le sol soleil partent aussi, s'ils ne servaient qu'au temps 2. Les temps sont numérotés 1, 2 et 3 (le regard, la lumière, la matière). Le repère a trois traits, dont les `data-temps` sont recalculés. « Les quatre temps » devient « Les trois temps » (`sections.mma.galerie.scene.steps`), dans les cinq langues. Le commentaire de tête et le paragraphe du schéma sont mis à jour.
- La scène raccourcit de la durée du temps 2 : d'environ 3,82 écrans à environ 2,6. Toutes les plages de défilement qui suivent le temps 2 sont recalculées, dans le CSS comme dans le mode de secours sans `animation-timeline`, côté script. Le passage du regard à la lumière reste fluide : le regard se termine, puis la pièce passe à la nuit. Le reste de la scène est inchangé : le regard, la lampe, la dame, la main, les tailles et les vitesses.
- Dans `assets/oeuvre-galerie.css` et `.js`, le bloc « Couleurs de la scène (ticket 21) » est remplacé par un bloc « Couleurs à toucher (ticket 28) », avec les mêmes repères de début et de fin. Les règles qui vivaient ailleurs pour le temps 2, dans le bloc de la scène (ticket 20), partent aussi. Le nom du bloc de la scène peut devenir « Scène en trois temps (tickets 20 et 28) », si les tests qui citent les noms de blocs suivent.

## À respecter

- Toutes les règles de `PORTAGE.md` : styles dans la feuille de la page, sans Tailwind et sans couleur hors des variables du socle ; `:root[data-galerie-page]`, jamais `:root:has()` ; mouvement seulement sous `prefers-reduced-motion: no-preference` ; ce qui suit le défilement seulement sous le `@supports` du socle ; un élément personnalisé qui démarre dans `connectedCallback` et se nettoie dans `disconnectedCallback` (Worker, observateurs, minuteries), à cause de la bascule Toile / Poster ; aucun objet global ; aucune police nouvelle ; aucun décalage de page.
- Les autres pages rendent exactement le même HTML qu'avant : anciennes fiches, sur-mesure, personnalisés, collections, accueil, panier. La section n'entre que dans `templates/product.oeuvre-3d.json`, entre `galerie_scene` et `galerie_histoire`, sous la clé `galerie_couleurs`. Le modèle de test `templates/product.oeuvre-galerie.json` (réimporté par la synchronisation, que Walid doit supprimer dans Shopify) n'est pas touché.
- Les données lues par Google ne changent pas, et les phrases restent dans le HTML.
- La vitesse : aucune tâche longue pendant le défilement. Au chargement, pas moins bien que la comparaison du 20/11 à 21 h (ticket 27). Le bloc est sous la scène, donc rien ne s'y calcule avant qu'on s'en approche.

## Livraison

- Copie isolée (worktree), sans push ni déploiement, comme le dit `PORTAGE.md`. **Les deux commits diffèrent de ceux de `PORTAGE.md`** :
  - (a) `sections/galerie-couleurs.liquid`, ses tests et ses clés de langue. Ce commit ne change rien de visible en ligne, puisque la section n'est dans aucun modèle.
  - (b) La bascule : le modèle (section ajoutée et ordre), la scène en trois temps, les blocs du CSS et du JS, les clés de langue de la scène et les tests mis à jour.
  - La session principale pousse (a), attend le déploiement, puis pousse (b).
- Tests : `scripts/galerie-couleurs.test.cjs` est réécrit pour la section (avec phrases, sans phrase, noir et blanc, jetons Trustpilot, échappement, toile et poster, autres pages inchangées). `scripts/galerie-scene.test.cjs` passe à trois temps. Tous les tests passent : `NODE_PATH="C:/Users/gueta/dev/MyselfMonart_tw_theme/growth/emails-commande/node_modules" npm test`, 837 à la dernière intégration.
- Captures du rendu local à côté de celles du prototype, à 320 × 700, 390 × 844 et 1440 × 900, toile et poster : arrivée, éclat, repos, clavier, mouvements réduits, sans script. Et la scène en trois temps, aux mêmes largeurs, à chaque temps.

**Blocked by:** — (21 et 27 sont en ligne).

**Status:** done, en ligne le 22/11/2026. Deux pushes : `7dca553` (a, la section seule, invisible) à 14 h 40, puis `c8a1d69` (b, la bascule) à 14 h 44. Une synchronisation de l'admin (`29e1613`, textes Black Friday de Walid) est arrivée entre les deux. Shopify n'a refusé aucun fichier.

Réalisé par un sous-agent dans sa copie (méthode /implement, relecture par deux sous-agents, normes et spécification). Une coupure de connexion l'a arrêté à la fin ; il a repris et fini. En local : 884 tests sur (a), 882 sur (b), contrôle des traductions passé, moteur identique à l'octet (`58c19596…`). Captures du rendu local côte à côte avec le prototype : identiques à 1 px près.

**Vérifié en ligne le 22/11 vers 15 h**, avec `scratchpad/mesures/verifier-couleurs.mjs` (mesures d'audience coupées) :
- Toile Superman, téléphone (390 × 844) et ordinateur (1440 × 900) :
  - la section suit la scène ; elle montre trois pastilles (Bleu, Rose, Jaune), trois phrases et six points ;
  - les zones sont lues dès l'arrivée ;
  - toucher « Rose » la choisit en 26 à 63 ms (pilotage compris) et montre l'éclat, puis les points ;
  - toucher l'œuvre choisit la couleur sous le doigt ;
  - aucun débordement, un seul h1.
- Poster Superman : ses couleurs à lui (Rose, Bleu, Jaune), avec ses phrases.
- Bascule Toile → Poster sans recharger la page : la section repart sur le poster (Rose d'abord, zones lues, points posés).
- Aucune erreur de script de la page. Le seul « Failed to fetch » vient des scripts d'audience de Shopify (`shop_events_listener`), que le contrôle coupe.
- Allemand : « Die Farben », « Jede Farbe wirkt auf Sie. », phrases traduites, « Die Farben des Wandbilds », repère « Die drei Momente ».
- La scène a trois traits (0,02, 0,94, 2,52 : « 1, Le regard », « 2, La lumière », « 3, La matière ») et ne contient plus rien des couleurs. Captures à neuf positions : enchaînement continu ; la foule sort pendant que la nuit tombe (0,74 à 0,86).
- Les douze pages témoins (`avant-28b` contre `apres-28`) : identiques, hors des trois fiches 3D. Sur celles-ci, title, description, canonique, robots, h1 et JSON-LD sont identiques.

Captures en ligne : `.scratch/fiche-3d/galerie/couleurs-interactif/captures/en-ligne-telephone.png` et `en-ligne-ordinateur.png`.

**Non vérifié :** un vrai téléphone, Safari et Firefox (sans OffscreenCanvas dans un Worker : pastilles et phrases sans points), mouvements réduits et sans script en ligne (vérifiés en local).

**Vitesse, Lighthouse le 22/11 vers 15 h 10** (même outil que le ticket 27, téléphone simulé, deux passages) :

| Page | Note | Tableau affiché (LCP) | Blocage | Décalage | Poids |
|---|---|---|---|---|---|
| Toile | 52 et 71 | 7,0 et 3,8 s | 0,59 et 0,45 s | 0 et 0,002 | 3,16 Mo |
| Poster | 56 et 53 | 6,4 et 6,9 s | 0,62 et 0,80 s | 0,001 et 0 | 3,14 Mo |

Pas moins bien qu'au 20/11 à 21 h (vue de test : 49 à 58, 5,9 à 6,9 s), ni qu'après la bascule du 21/11 (45 à 48). La page est un peu plus légère.

**Jonction entre le regard et la lumière : Walid garde la version en ligne** (« Oui, ça me va », le 22/11, après l'image `couleurs-interactif/captures/jonction-regard-lumiere.png`). La nuit tombe pendant que la foule sort. L'autre choix, reculer de 1,14 au lieu de 1,26, ferait tomber la nuit après la foule, avec un court moment sans titre.

**Reste :** Walid supprime le modèle de test `templates/product.oeuvre-galerie.json` dans l'éditeur de code de Shopify. Ce modèle a la scène en trois temps, mais pas la section des couleurs.

- [x] Sur la toile et le poster Superman, la section montre l'œuvre en couleurs, les trois couleurs, leurs phrases et leurs points.
- [x] Toucher une pastille ou l'œuvre change la phrase, montre l'éclat, puis laisse les points.
- [x] Sans script : les phrases à la suite, sans pastilles. En mouvements réduits : rien ne vole (vérifié en local).
- [x] La scène a trois temps, sans trou ni saut entre le regard et la lumière.
- [x] Les autres pages et les données Google sont inchangées.
