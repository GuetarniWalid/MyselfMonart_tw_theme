# Portage de la fiche galerie dans le thème — consignes communes aux tickets 20 à 24

Ces consignes valent pour chaque sous-agent qui pose une section de la nouvelle page. Elles complètent le ticket, elles ne le remplacent pas. Le socle (ticket 19) est décrit à la fin : le lire avant d'écrire.

## Où tu travailles

- Dans une copie isolée du dépôt du thème (un worktree), sur ta propre branche. Tu commits là. Tu ne pousses jamais, tu ne déploies jamais, tu ne touches pas au dépôt principal.
- Le ticket, la maquette et les notes vivent dans le dépôt principal, en partie hors de git : lis-les par leur chemin absolu, sans les modifier.
  - Tickets : `C:\Users\gueta\dev\MyselfMonart_tw_theme\.scratch\fiche-3d\issues\`
  - Maquette validée (un seul fichier) : `C:\Users\gueta\dev\MyselfMonart_tw_theme\.scratch\fiche-3d\galerie\proto\index.html`, images dans `proto\img\`
  - Notes : `C:\Users\gueta\dev\MyselfMonart_tw_theme\.scratch\fiche-3d\galerie\README.md`
  - Textes du poster : `C:\Users\gueta\dev\MyselfMonart_tw_theme\.scratch\fiche-3d\galerie\poster\textes.json` et `poster\description-poster.html`
- D'autres sous-agents posent d'autres sections en même temps que toi, chacun dans sa copie. La session principale réunit ensuite les branches. D'où les règles « Fichiers partagés » plus bas : les suivre à la lettre.

## Plan de la maquette (`proto/index.html`)

| Lignes | Partie | Ticket |
|---|---|---|
| 16-617 | feuille de style (variables en tête, puis une partie par section, puis les règles `html.poster` et les préférences de mouvement) | tous |
| 633-644 | scène 3D (déjà dans le thème, ne pas la refaire) | — |
| 645-672 | `.intro` : la présentation | 19 |
| 673-747 | `.visite` : la scène en quatre temps | 20 (couleurs du temps 2 : 21) |
| 748-797 | `.histoire` : l'histoire et « En pratique » | 22 |
| 798-820 | `.avis` | 23 |
| 821-841 | `.recos` | 23 |
| 842-878 | `.faq` | 23 |
| 879-924 | `.difference` : « Ce qu'un tableau change chez vous » | 24 |
| 925-944 | pied de page (celui du site, recoloré) | 24 |
| 945-1149 | scripts : scène, mesures, mode de secours, repère, titres mot à mot, bascule toile / poster de la maquette | selon la section |

Dans la maquette, les classes `si-toile` et `si-poster` marquent ce qui change entre la toile et le poster, et la classe `poster` sur `<html>` bascule l'une vers l'autre. Dans le thème, chaque page est rendue par le serveur pour un seul support : écrire seulement la bonne version (`is_poster`), jamais les deux.

## Fidélité

La maquette a été validée par Walid écran par écran, après treize allers-retours. Le portage la reproduit : mêmes tailles, mêmes couleurs, mêmes espacements, mêmes images clés, mêmes textes. Ce n'est pas une réinterprétation. Reprendre le HTML et le CSS de la maquette, adaptés au socle, plutôt que de les réécrire de mémoire. Lire « Parti pris » dans le README : ce sont ses règles (pas d'icône nouvelle, pas de pièce sombre hors du temps 3, aucun tableau ancien nommé, chaque effet sert l'acheteur).

Contrôle attendu avant de rendre : des captures de ta section à côté de celles de la maquette, à 320 × 700, 390 × 844 et 1440 × 900, toile et poster. Dire franchement ce que ce contrôle couvre (un rendu local) et ce qu'il ne couvre pas (le vrai rendu de Shopify, un vrai téléphone).

## Fichiers partagés : comment y écrire

Plusieurs tickets écrivent dans les mêmes fichiers. Pour que les branches se réunissent sans conflit :

- **Ta section a ses propres fichiers** : `sections/galerie-<nom>.liquid`, et ses propres snippets s'il en faut (`snippets/galerie-<nom>-….liquid`).
- **Feuille de style de la page** (`assets/oeuvre-galerie.css`) : ajoute tes règles à la fin du fichier, dans un bloc à toi, entre deux repères `/* === <nom de ta section> (ticket NN) : début === */` et `/* === … : fin === */`. Ne déplace, ne reformate et ne réordonne rien de ce qui existe. Seule exception : une couleur qui manque, ajoutée sur sa propre ligne à la liste des variables du socle.
- **Script de la page** (`assets/oeuvre-galerie.js`) : même règle, un bloc à toi à la fin, tes éléments personnalisés dedans.
- **Tests** : ton propre fichier `scripts/galerie-<nom>.test.cjs`, avec le banc partagé `scripts/galerie-banc.cjs` (voir « Le socle »).
- **Fichiers de langue** (`locales/*.json`) : tes clés sous `sections.mma.galerie.<nom de ta section>`, dans les cinq langues. Ne retouche aucune clé existante, ne reformate pas le fichier.
- **Modèle** `templates/product.oeuvre-galerie.json` : ajoute ta section et sa place dans `order`. L'ordre final de la page est : fil d'Ariane, bloc principal, scène (20), histoire et pratique (22), avis, recommandations, questions (23), raisons (24).
- **Sections communes du site** (fil d'Ariane, avis, recommandations, questions, badges, en-tête, pied de page, panier) : ne pas les modifier. Réutiliser leurs éléments personnalisés et leurs snippets depuis ta propre section.
- `sections/main-product.liquid` : n'y touche pas, sauf si ton ticket le demande expressément, et alors seulement par un ajout gardé par le réglage « page galerie ».

## Règles du thème à ne pas oublier

- `CLAUDE.md` et le skill `.claude/skills/shopify-section-dev/SKILL.md`. Une exception voulue : les styles de cette page vivent dans sa propre feuille, pas dans Tailwind (voir le socle). La feuille commune `assets/output.css` ne doit pas grossir.
- **Bascule Toile / Poster** (`assets/product-twin-toggle.js`) : elle remplace tout le contenu de `#MainContent`, sauf la scène 3D, par celui du jumeau. Un `<script>` en ligne n'est jamais rejoué ; un `<script src>` déjà chargé non plus. Donc : tout le comportement dans des éléments personnalisés, qui démarrent dans `connectedCallback` et se nettoient dans `disconnectedCallback` (écouteurs, observateurs, minuteries). Ne jamais compter sur `DOMContentLoaded`.
- **Note Trustpilot** : jamais un chiffre en dur. Écrire `[[TP_SCORE]]/5 sur [[TP_COUNT]] avis` et passer le texte par le snippet `trustpilot-tokens`.
- **Contrôle des traductions** (`scripts/i18n-lint.cjs`, lancé avant chaque commit) : pas de texte en dur dans un `aria-label`, un `alt` ou un `title`, ni dans des données pour Google. De vraies traductions dans les cinq langues (fr, en, de, es, nl), pas de français laissé ailleurs. Les titres à jeux de mots sont adaptés, pas traduits mot à mot.
- **Shopify est plus strict que liquidjs** : pas d'accolade fermante dans une chaîne entre `{{ }}` (passer par une variable : `{%- assign trou = '{size}' -%}`). Un fichier refusé par Shopify bloque le déploiement.
- **Textes éditoriaux qui diffèrent entre toile et poster** (volets, questions) : ce sont des blocs du modèle, avec un réglage `support` (`tous`, `toile`, `poster`) ; la section n'affiche que ceux du produit. Les textes fixes du design vont dans les fichiers de langue.
- **Images des personnages** : les copier de `proto/img/` dans `assets/` sous les noms neutres du tableau « Les images des personnages dans le thème » du README. Aucun nom de tableau ancien ni d'artiste, nulle part dans le thème (fichiers, classes, commentaires, clés, textes). Pas de texte alternatif (décor : `alt=""`), `loading="lazy"`, `decoding="async"`, `width` et `height` renseignés, aucun décalage de page.
- **Accessibilité** : structure sémantique, un seul `h1` dans la page (celui du bloc principal : ta section commence à `h2`), focus visible, contrastes, « mouvements réduits » respecté, page lisible sans script.
- **Vitesse** : rien dans le fil principal pendant le défilement (animations CSS liées au défilement, sur `transform` et `opacity`), aucune requête vers un autre site, aucune police nouvelle, aucun décalage de page.
- **Les fiches des produits de toujours, la fiche `oeuvre-3d` actuelle et les autres pages rendent exactement le même HTML qu'avant.** Les tests du dépôt le verrouillent en partie (`npm test`) ; le prouver pour ce que tu touches.

## Outils sur ce PC

- `npm test` (`node --test scripts/*.test.cjs`, Node 22.12 au moins), `node scripts/i18n-lint.cjs`.
- Taille de la feuille commune : `npx tailwindcss -i ./input.css -o <fichier temporaire> --minify`, comparée à `assets/output.css`. Regarder dans `git log` si les commits passés rangent `output.css` avec le code, et faire pareil.
- Rendu local et captures : `liquidjs` et `puppeteer-core` sont installés dans le dépôt principal, à charger par `createRequire('C:/Users/gueta/dev/MyselfMonart_tw_theme/growth/emails-commande/')` ; Chrome est à `C:/Program Files/Google/Chrome/Application/chrome.exe` (sans écran : `headless: 'new'`, attendre `load`, pas `networkidle0`). Ne pas ajouter de dépendance lourde au dépôt. Fichiers temporaires dans ta copie, hors de git, ou dans le dossier temporaire du système, pas dans le dépôt principal.

## Méthode

1. Lire le ticket en entier, les parties de la maquette qui le concernent, le README (« Parti pris », « Ce que montre la maquette », « Mouvement », « La version poster », « La mise en place sur le vrai site »), ces consignes, puis le socle dans ta copie.
2. Tests d'abord là où il y a de la logique (skill `mattpocock-skills:tdd` si tu peux l'appeler, sinon rouge, vert, remaniement) : dans le style des `scripts/*.test.cjs` existants.
3. Vérifier souvent : `npm test`, le contrôle des traductions, la taille de la feuille commune, les captures.
4. Finir par une relecture de ton propre diff contre le ticket, ces consignes, le skill et `CLAUDE.md` (skill `mattpocock-skills:code-review` si tu peux l'appeler), et corriger ce qu'elle trouve.
5. Deux commits, dans le style du dépôt (`git log`), chacun terminé par la ligne d'attribution du modèle qui les écrit (depuis le 20/11 au soir : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`) :
   - (a) tout sauf le modèle JSON ;
   - (b) le modèle JSON seul. Shopify refuse un modèle qui cite une section ou un réglage qu'il ne connaît pas encore : la session principale pousse (a), puis (b).

## Ton compte rendu (en français, court, structuré)

- Chemin de ta copie, branche, les deux commits (empreinte et titre).
- Fichiers ajoutés ou modifiés, et pourquoi ; ce qui a changé dans les fichiers partagés ; la preuve que les autres pages ne changent pas.
- Tests et contrôles : les commandes et leurs vrais résultats ; taille de la feuille commune avant et après ; poids ajouté à la page (styles, script, images).
- Ce que montrent les captures (donner leurs chemins) et ce qui reste à voir en ligne.
- Les choix que tu as faits seul, et ce que la session principale doit faire à l'intégration.

## Le socle (ticket 19), en ligne depuis le 20/11/2026

La vue de test existe : `https://www.myselfmonart.com/products/<produit oeuvre-3d>?view=oeuvre-galerie`. Elle montre la scène 3D, la pilule, puis la présentation. Lire ces fichiers dans ta copie avant d'écrire : ils sont courts et très commentés.

**Le modèle** `templates/product.oeuvre-galerie.json` : le fil d'Ariane, puis `main` (`main-product`, réglage `page_galerie` coché). Ta section s'ajoute après `main`, à sa place dans l'ordre final. Son type commence par `galerie-` (un test le vérifie).

**Le crochet.** Le réglage `page_galerie` de `sections/main-product.liquid` pose `data-galerie` sur `<main-product-blocks>` (avec la scène 3D seulement). Rien ne s'accroche au nom du modèle de page.

**La feuille** `assets/oeuvre-galerie.css`, chargée par le bloc principal quand le réglage est coché :
- Le script en garde une copie dans `<head>`, qui ne quitte plus la page (elle tient pendant la bascule Toile / Poster). Donc **chaque règle porte le crochet ou un nom `galerie-…`** : `main-product-blocks[data-galerie] …` pour ce qui est dans le bloc principal, `:root:has(main-product-blocks[data-galerie]) …` pour ce qui est hors de ta section (pied de page, bandeau, pilule), une classe `galerie-<section>…` pour ta section. `scripts/oeuvre-galerie.test.cjs` le vérifie sur toute la feuille, ton bloc compris.
- Les couleurs et la typo sont des variables posées une fois : `--encre`, `--encre-70`, `--encre-55`, `--encre-12`, `--encre-06`, `--blanc`, `--creme`, `--ciel`, `--rose`, `--soleil`, `--menthe`, `--lilas`, `--peche`, `--chene`, `--sauge`, `--ciel-pale`, `--poudre`, `--corail`, `--terra`, `--saumon`, `--achat`, `--achat-texte`, `--etoile`, `--etoile-vide`, `--pied-fond`, `--pied-encre`, `--annonce-fond`, `--annonce-encre`, `--sans`, et les marges de côté `--gout`, `--goutd`. **Aucune couleur ne s'écrit hors de ces variables** (testé) : une couleur de la maquette qui manque s'ajoute à la liste du socle, dans ton commit, sur une ligne à elle.
- Classes de base : `galerie` (typo) et `galerie-bande` (marges de côté) sur la racine de ta section ; `galerie-monte` pour un bloc qui monte à son entrée dans l'écran ; l'élément `<galerie-mots>` pour un grand titre dont les mots arrivent un à un (le serveur écrit le texte, le script le découpe).
- Seuil « ordinateur » : 900 px, comme la maquette.
- Aucun mouvement hors de `@media (prefers-reduced-motion: no-preference)`, et rien de lié au défilement hors de `@supports (animation-timeline: view()) and (animation-range-start: contain 10svh)` (testé).
- Un bloc par partie de la page, entre `/* === <Nom> (ticket NN) : début === */` et `/* === <Nom> (ticket NN) : fin === */` : le tien s'ajoute à la fin, rien hors d'un bloc (testé).

**Le script** `assets/oeuvre-galerie.js` : mêmes repères, un bloc par partie, chacun dans sa propre fonction `(function () { 'use strict'; … })();`. En tête de ton bloc, pour les tests : `if (typeof window === 'undefined') { Object.assign(module.exports, { tesCalculsPurs }); return; }`. Puis tes éléments personnalisés, gardés par `if (customElements.get('galerie-…')) return;`. Aucun objet global (`window.x = …` est refusé par un test), aucun `DOMContentLoaded`. La condition « le mouvement suit le défilement » du socle (`mouvementLie`) est privée à son bloc : si tu en as besoin, réécris-la dans le tien, à l'identique.

**Polices.** Albert Sans, déclarée par la scène 3D seule (`snippets/oeuvre-3d-stage.liquid`), en 300, 400, 500, 600 et 700 depuis le commit `3b40d7f` du 20/11 (Walid a donné son accord pour les deux fichiers de plus). Écris les graisses de la maquette. Une graisse au-delà (800) n'existe pas dans le thème : elle sortirait en 700 ; ne télécharge rien, signale-le. Si ta copie est partie avant ce commit, prends-le pour des rendus fidèles : `git cherry-pick 3b40d7f` (il ne touche que la scène, deux tests de police et deux fichiers d'`assets`).

**Textes** : `sections.mma.galerie.<section>.<clé>` dans les cinq langues (`intro` existe, 16 clés).

**Snippets** : `snippets/galerie-<section>-….liquid`. Ceux du socle : `galerie-intro`, `galerie-intro-avis`, `galerie-intro-fiche`.

**Tests.** Ton fichier : `scripts/galerie-<section>.test.cjs`. Le banc partagé `scripts/galerie-banc.cjs` donne la lecture des fichiers du thème (`read`, `code`, `json`, `schemaOf`, `rules`), le produit d'essai (`product({ poster })`), le moteur liquidjs avec les filtres de Shopify (`engine(lang)`), et le rendu : `renderSectionFile('sections/galerie-<section>.liquid', { settings, blocks }, produit, { lang, suffix })` pour ta section, `renderSnippet`, `renderSection` pour le bloc principal. Un filtre ou un champ du produit qui manque : ajoute-le dans ton fichier de test (`engine(lang).registerFilter(…)`, `{ ...product(), description: … }`), pas dans le banc. Ne modifie ni le banc ni `scripts/oeuvre-galerie.test.cjs`, sauf pour un vrai défaut, que tu signales. Les tests de rendu demandent liquidjs : `NODE_PATH="C:/Users/gueta/dev/MyselfMonart_tw_theme/growth/emails-commande/node_modules" npm test`.

**Ce que le ticket 19 a vérifié en ligne** : les données lues par Google sont celles de la fiche actuelle, la bascule Toile / Poster garde la vue de test, les douze pages témoins du site n'ont pas changé d'un caractère. Le contrôle en ligne de ta section, c'est la session principale qui le fera après avoir poussé.
