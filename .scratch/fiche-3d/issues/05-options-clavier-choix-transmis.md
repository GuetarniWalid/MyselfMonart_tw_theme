# 05: Options au clavier, choix transmis

**What to build:** les options de la fiche (taille, bordure, cadre, couleur du cadre, contour blanc) reposent sur des boutons radio cachés : impossible de les choisir au clavier. Et un changement d'option n'envoie aucun signal propre : chaque composant relit la page de son côté. Après ce ticket, chaque option se choisit au clavier avec un focus visible. Chaque choix envoie un seul événement qui donne la variante et toutes les options, couleur du cadre et contour blanc compris. L'adresse de la page suit la variante choisie, pour un lien partageable. Les fiches actuelles en profitent sans changer visuellement. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Toutes les options se choisissent au clavier, avec un focus visible, et sont annoncées par un lecteur d'écran.
- [x] Un événement unique et documenté à chaque choix : variante, options, couleur du cadre, contour blanc.
- [ ] L'adresse de la page suit la variante ; un lien partagé rouvre la même variante, avec le même prix dans le bouton.
- [ ] La 3D actuelle, le bouton flottant et les prix fonctionnent toujours, vérifiés en ligne sur une toile et un poster.

## Notes de réalisation (03/11/2026)

**Fait.**

- Options au clavier (`snippets/painting-variant-picker.liquid`).
  - Les radios passent de `hidden` à `sr-only`. Leur pixel est au centre de la pastille, et `relative` les garde dans la rangée qui défile.
  - Chaque rangée est un groupe radio nommé par l'option, avec un `data-option-kind`.
  - Bordures et cadres reçoivent un nom en `sr-only`. « Sans cadre » sur toile n'en avait aucun.
  - Halo de focus clavier : `ring` des variables `option_focus` et `option_focus_round`, décalé de 4 px sur les vignettes rondes.
  - En animations réduites : `motion-reduce:transition-none` et `motion-reduce:scroll-auto`.
  - Rien ne change à la souris ou au doigt, sauf un cas rare. Une pastille cachée à plus de moitié par le bord gauche, dont on vise le bout visible, est ramenée en vue.
- Au clavier, l'option atteinte est amenée en vue hors du dégradé de la flèche (`mmaRevealFocusedOption`, `assets/main-product.js`).
- Sans tiret à droite, le `endif` de `data-render-key` ne colle plus l'attribut suivant (défaut relevé sur la fiche en ligne).
- Nouveau `assets/product-selection.js`, chargé par le sélecteur : l'événement et l'adresse.
- `product-variant-picker.liquid` (gourdes, cartes cadeaux, `product.json`) est inchangé, conformément à la décision 1. Si Walid le veut, il peut recevoir le même correctif clavier, en trois lignes.

**Événement `mma:selection-change`**, émis sur `document`, une seule fois par choix, après les réactions de la fiche. La bascule automatique vers un cadre disponible n'en déclenche pas un second. Contenu de `e.detail` :

- `changed` : `'size'`, `'border'`, `'frame'` ou `'whiteBorder'`. Vaut `null` si la fiche a changé seule, sans geste du visiteur.
- `variant` : `{ id, title, price, compareAtPrice, available }`, prix en centimes, sans la remise du bloc d'achat. Vaut `null` si la combinaison n'existe pas.
- `options` : `[{ position, kind, value, key }]`, dans l'ordre Shopify. `key` est le handle stable du métaobjet (bordure, cadre de toile).
- `frameColor` : `{ name, key }` pour la couleur du cadre du poster, sinon `null`.
- `whiteBorder` : `true` ou `false` sur un poster à contour blanc, sinon `null`.

L'état courant se lit avec `window.MMASelection.read()`, par exemple au chargement ou après `mma:soft-navigation`. La documentation complète est en tête du fichier.

**Adresse.** `?variant=<id>` suit la variante par `history.replaceState`. Les autres paramètres, l'ancre et `history.state` (le marqueur de la bascule toile/poster) sont gardés. La couleur du cadre et le contour blanc ne sont pas dans l'adresse : un lien « Avec cadre / Noyer » rouvre la première couleur. Walid doit décider s'il veut l'ajouter.

**Vérifié.**

- `npm test` : 8 tests du calcul pur (`scripts/product-selection.test.cjs`, lanceur intégré de Node).
- `node scripts/i18n-lint.cjs`.
- Équilibre des balises Liquid.
- Banc local hors dépôt, 51 vérifications dans Edge headless (vraies touches, vrais clics, arbre d'accessibilité), sur une copie du balisage avec les vrais `main-product.js` et `product-selection.js` :
  - Tab et flèches ;
  - halo au clavier seulement ;
  - un seul événement, y compris lors des bascules automatiques ;
  - adresse et `history.state` ;
  - remplacement de `#MainContent` sans doublon ;
  - mise en page identique au pixel près ;
  - pas de défilement horizontal ;
  - animations réduites ;
  - noms annoncés.

**À vérifier en ligne, après le déploiement**, sur une toile et sur un poster avec contour blanc et jumeau :

1. Au clavier : Tab, flèches, halo visible, options amenées en vue. Avec un lecteur d'écran, les noms et les groupes sont annoncés.
2. À la souris et sur mobile : rendu identique ; la 3D réagit aux bordures, aux cadres, aux couleurs et au contour blanc ; le bouton fixe, le bouton flottant et le prix suivent.
3. L'adresse prend `?variant=` à chaque changement de variante. Recharger ou ouvrir le lien dans un autre navigateur redonne la même variante et le même prix dans le bouton.
4. Bascule toile/poster, puis un choix : un seul `mma:selection-change` dans la console (`document.addEventListener('mma:selection-change', e => console.log(e.detail))`).
5. Toile en 90x120 avec un cadre indisponible : la bascule sur un cadre disponible ne produit qu'un seul événement.
6. Ajout au panier : la variante, la couleur du cadre et le contour blanc sont bien dans la ligne.
