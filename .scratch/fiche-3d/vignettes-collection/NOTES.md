# Vignettes de collection des œuvres à image unique : notes pour le thème

Essai du 15/11/2026, rien n'est encore dans le thème.

- Page d'essai, publiée en page privée pour Walid : https://claude.ai/artifact/GFWunKvBpwpWc5EyFqeD3L (autonome, 1,4 Mo, images en data URI).
- Code prêt à porter, dans ce dossier : `oeuvre-card.css` (CSS) et `oeuvre-card-reflet.js` (script du reflet). Silhouette du poster A : `papier.py`.
- Le banc (puppeteer), les captures et l'outil qui construit la page sont restés dans le dossier temporaire de la session. Les mesures du § 6 en viennent.

## 1. Quelles cartes changent

Seuls les produits au modèle de page `oeuvre-3d` changent : les nouveaux produits, qui n'ont que l'œuvre à plat.

Pour ne nommer aucun suffixe hors de `artwork-kind`, la règle de ce snippet, ajouter un paramètre `image_unique`. Avec `image_unique: true`, le snippet ne répond que pour `oeuvre-3d` :

```liquid
{%- liquid
  case suffix
    when 'painting'
      unless image_unique
        echo 'toile'
      endunless
    when 'poster'
      unless image_unique
        echo 'poster'
      endunless
    when 'oeuvre-3d'
      if product.metafields.painting_options.frames_poster != blank
        echo 'poster'
      else
        echo 'toile'
      endif
  endcase
-%}
```

(Ajouter `image_unique` dans le bloc « Accepts » du snippet.)

Tous les autres produits gardent leur carte à l'octet près : le balisage actuel passe tel quel dans la branche `else`.

L'image de la vignette est `product.media[0]`, la seule image de ces produits. Si l'on ajoute un jour des photos à ces produits (photos pour Google), l'œuvre à plat doit rester la première.

## 2. Balisage (`snippets/card-product.liquid`)

```liquid
{%- capture vignette -%}{% render 'artwork-kind', product: product, suffix: product.template_suffix, image_unique: true %}{%- endcapture -%}
{%- if vignette != blank and product.media[0].media_type == 'image' -%}
  {%- liquid
    assign art = product.media[0]
    # L'œuvre n'occupe qu'une partie de la carte : environ 75 % de sa largeur (toile), 60 % (poster).
    if vignette == 'toile'
      assign art_sizes = '(min-width: 1280px) 240px, (min-width: 1024px) 26vw, 39vw'
    else
      assign art_sizes = '(min-width: 1280px) 200px, (min-width: 1024px) 22vw, 33vw'
    endif
    # Contour blanc : même test que la fiche (snippets/oeuvre-3d-model.liquid, has_passe_partout).
    assign no_contour = true
    for m in product.media
      if m.media_type == 'image' and m.preview_image.src contains 'passe-partout'
        assign no_contour = false
        break
      endif
    endfor
  -%}
  {%- comment -%} srcset : la même capture que primary_srcset, avec art à la place de primary_image. {%- endcomment -%}
  <div class="mb-2 md:mb-5">
    <div class="oeuvre-card{% if vignette == 'poster' and no_contour %} no-contour{% endif %}" data-kind="{{ vignette }}"
      {%- if vignette == 'poster' %} data-look="verre" data-frame="noir"{% endif %}
      style="--r: {{ art.preview_image.aspect_ratio | round: 4 }}">
      <div class="oeuvre-card-stage">
        <div class="oeuvre-card-piece">
          {%- if vignette == 'poster' -%}<div class="oeuvre-card-sheet">{%- endif -%}
          <div class="oeuvre-card-face skeleton">
            {%- comment -%} La même balise <img> qu'aujourd'hui (eager ou lqip selon lazy_load), sizes: art_sizes,
              alt de l'image 0 (alts.value[0] puis art.alt), classe « w-full h-full object-cover ». {%- endcomment -%}
          </div>
          {%- if vignette == 'poster' -%}
            </div>
            <span class="oeuvre-card-glass" aria-hidden="true"><span class="oeuvre-card-glare" data-allow-empty></span></span>
          {%- endif -%}
        </div>
      </div>
    </div>
  </div>
{%- else -%}
  {%- comment -%} balisage actuel, inchangé {%- endcomment -%}
{%- endif -%}
```

Walid a choisi B (15/11) : c'est le balisage ci-dessus. Pour A (papier libre), écrire `data-look="papier"` et ne pas rendre la vitre.

À garder tel quel, chaque point a été vérifié au banc :

1. **La face est le parent direct de l'`<img>` et porte `skeleton`.** `removeSkeletonOnImagesLoad` (tw-global.js) le veut ainsi, et la forme de l'œuvre pulse à sa place pendant le chargement. `.skeleton` la met en `position: relative` : le CSS la replace avec un sélecteur à deux classes.
2. **`data-allow-empty` sur les `<span>` décoratifs vides.** La règle `*:empty { display: none }` du thème les cacherait.
3. **Le format de la scène est celui des vignettes actuelles** : 500 / 587 pour les toiles, 1 / 1 pour les posters. Les rangées gardent leur rythme, mélangées aux anciennes cartes. Toutes les tailles découlent de `--r`, connu en Liquid. Aucun décalage au chargement.
4. **`.oeuvre-card { position: relative; z-index: 1; pointer-events: none }`.** Le lien étiré du titre (`after:absolute after:inset-0`) couvre toute la carte. Peint au-dessus d'un calque composité (le reflet de B, comme la toile en 3D de la première version), il en forçait un second par carte (mesuré : 20 de plus pour 48 cartes). Sous la vignette, il ne coûte rien. `pointer-events: none` lui laisse les clics : toute la carte reste un lien, comme aujourd'hui.
5. **`overflow: clip` et non `hidden` sur la scène et la vitre.** `hidden` en fait des conteneurs de défilement, et la timeline `view()` du reflet se mesure alors contre la scène, qui ne défile pas : le reflet restait figé (bogue trouvé au banc).

## 3. CSS (`input.css`)

Coller `theme/oeuvre-card.css` dans `input.css`, **hors `@layer`**, comme les règles `oeuvre-3d-*` : dans `@layer components`, Tailwind retirerait les classes absentes des fichiers lus. Tailles : 19 Ko avec commentaires, 12 Ko sans, 2,5 Ko compressé.

Vérifié avec la vraie commande du thème (`tailwindcss --minify`) : `cqw`, `overflow: clip`, `animation-timeline`, `view-timeline`, `mask-composite`, le polygone `clip-path` et le filtre `drop-shadow` sortent intacts, calculs compris.

Principes du rendu (lumière de la fiche 3D : en haut à gauche, devant ; ombres en bas à droite) :

- **Toile, de face** (choix de Walid du 15/11 : « je le veux de face »). Aucune rotation : on ne voit aucun de ses côtés, et plus aucune transformation 3D, donc plus de calque composité. Ce qui en fait un objet décollé du mur par son châssis de 2 cm :
  - L'ombre portée à droite et en bas, celle de 2 cm de recul sous la lumière de la fiche : décalée de 0,8 D × 0,62 D (D = 2 cm), adoucie par la pénombre, plus un voile plus large.
  - Un contact sombre et serré au ras des bords droit et bas, là où le côté de la toile rejoint son ombre.
  - Le pli de la toile autour du châssis (arrondi de 2,5 mm, `CANVAS_EDGE` de la fiche), 0,7 % de la largeur de la scène. Il fait partie de la face, vu de face : ce n'est pas une tranche. Ses arêtes haute et gauche prennent la lumière, la basse et la droite sont à l'ombre ; les coins s'arrondissent à peine. C'est lui qui donne l'épaisseur de face, surtout sur les œuvres sombres.
  - La face éclairée, un peu plus claire en haut à gauche.
  - Scène 500/587 et taille inchangées ; l'œuvre et son ombre sont recentrées ensemble (décalage de -1,5 × -1,1 % de la scène).
  - Ce qui la distingue d'un poster encadré au premier coup d'œil : l'image va jusqu'au bord, sans cadre ni marge blanche, avec son ombre de châssis.
- **Poster A.** Un beau tirage tenu par le haut, qui s'est doucement relâché. Un seul modèle d'onde règle la silhouette, la lumière et l'ombre : crêtes (papier le plus loin du mur) à 27 % et 71 % de la largeur, creux à 5 %, 49 % et 93 %.
  - Silhouette (`clip-path` sur la feuille, polygone de `papier.py`, retraits en `cqw`) : bord haut droit, tenu ; côtés qui s'ouvrent vers le bas ; bord bas plus bas sur les crêtes ; coin bas droit soulevé, qui s'écarte et s'arrondit. Le coin bas gauche, côté lumière, reste près du mur.
  - Lumière : sur chaque onde, le flanc tourné vers la fenêtre s'éclaire (reflet satiné, jusqu'à +22 % de blanc), l'autre s'assombrit (jusqu'à -19 %). Les bandes traversent l'œuvre ; l'onde naît en haut et s'amplifie vers le bord libre. Sans contour blanc, elles sont un quart plus douces, pour rester du papier et ne pas tourner au tissu.
  - Coin soulevé : un pli doux en travers du coin, le papier au-delà tourné vers la lumière.
  - Ombre : `drop-shadow` sur la pièce, qui suit exactement la silhouette et ses ondes ; plus large sous les crêtes, et sous le coin soulevé, décollée de lui ; une ombre floutée de la feuille relâchée, nulle en haut, qui s'élargit vers le bas.
  - Pour régler l'onde : modifier `papier.py`, puis recopier sa sortie dans `--paper-edge`. Les bandes de lumière sont placées d'après les mêmes crêtes.
  - Aucun calque composité (vérifié : 28 calques pour 48 cartes, comme avant le filtre).
- **Poster B.** Baguette de 2,4 % de la vignette, teintes des vrais cadres (`data-frame` : noir, blanc, chene, noyer).
  - Lèvre du cadre en ombre sur le tirage, reflet fixe de la petite fenêtre.
  - La porte-fenêtre de GLASS_ROOM : 2 battants de 4 carreaux, ciel plus clair en haut, bords doux.
  - Intensité adoucie de moitié (retour de Walid du 15/11 : « elle éclaire un peu trop […] on n'arrive plus trop à distinguer l'œuvre ») : au plus fort, 25 % de blanc en haut de la fenêtre, 18 % au milieu, 10 % en bas, halo à 5 %. Le reflet fixe de la petite fenêtre et le voile de la vitre suivent (8 %, 4,5 %). Forme, course et rythme inchangés. L'œuvre reste lisible à travers la vitre, même sombre (méditation, zèbre) ; sur une œuvre très claire, le reflet ne se voit plus que sur ses parties sombres, comme une vraie vitre.
  - Elle entre en haut de la vitre à 12 % de la traversée de l'écran par la carte et sort en bas à 88 %. Elle glisse donc à un peu moins de la moitié de la vitesse de la carte, comme un reflet de la pièce et non de l'écran.
  - Sa place dans la vitre dépend de la colonne (`anime-product-card:nth-child`, 2/3/4 colonnes) : toute la rangée reflète la même fenêtre.

## 4. Script du reflet (`assets/oeuvre-card-reflet.js`)

`theme/oeuvre-card-reflet.js` : 3,4 Ko avec commentaires, 2,3 Ko sans, 1,1 Ko compressé.

- Le charger en module `defer` là où l'on rend `card-product` : collection, recherche, mes j'aime. Appeler `oeuvreGlass()` une fois.
- Il ne fait rien là où le CSS suffit : Chrome, Edge, Samsung Internet, Safari 26 et plus.
- Ailleurs (Firefox, Safari avant 26) :
  - un IntersectionObserver garde les vitres proches de l'écran ;
  - un seul écouteur de défilement passif, regroupé par `requestAnimationFrame`, met à jour ces vitres-là seulement ;
  - rien quand l'utilisateur demande moins de mouvement.
- Appeler `.refresh()` quand des cartes arrivent :
  - après le remplacement de grille de `collection-tag-filter.js`, à côté de `removeSkeletonOnImagesLoad(insertedGrid)` ;
  - après l'ajout d'une page par le défilement infini (`collection.js`).

**Écart voulu avec la consigne « écrire une variable CSS ».** Le script règle l'instant (`currentTime`) d'une animation Web en pause, créée une fois par vitre. Mesuré avec le processeur ralenti 4 fois, trace Chrome d'un défilement de 3 600 px :

- **Écrire un style à chaque image** (variable CSS, `translate` ou `transform`) : 1 280 à 1 350 ms de recomposition des calques (Layerize), et la moitié des images au-delà de 25 ms (77 à 81 sur environ 155).
- **Régler l'instant d'animations créées d'avance** (retenu) : 2 ms de recomposition pour le même défilement, et aucune image au-delà de 25 ms sur le banc complet (7 200 px, § 6).

Un style réécrit sur un calque composité oblige Chrome à recomposer tous les calques de la page à chaque image. Une animation, non : il réserve sa place d'avance.

Les animations sont créées d'avance, et non à l'approche de chaque carte : créer ou retirer des calques pendant le défilement donnait des tâches longues (55 et 75 ms).

## 5. Ce qui ne change pas pour les produits existants

Rien.

- Même snippet, même branche de balisage pour tout produit qui n'est pas `oeuvre-3d`.
- Les nouvelles classes n'apparaissent que dans la nouvelle branche.
- Le script ne trouve aucune vitre sur une page sans nouveau poster, et s'arrête là.

## 6. Mesures (banc, `bench/perf.cjs`)

Conditions :

- 48 cartes (24 de la page du prototype, deux fois), écran 390 × 844 de densité 3.
- Processeur ralenti 4 fois, comme un téléphone moyen de gamme.
- Défilement composité de 7 200 px : 3 600 à 1 200 px/s, puis 3 600 à 3 000 px/s, simulé à la molette (le geste tactile ne défile pas dans Chrome sans écran).
- Chrome 157 sans écran, carte graphique réelle.

Dernier passage (15/11 au soir, toile de face et reflet adouci). La machine était chargée par d'autres applications (environ 20 à 30 % du processeur), ce qui pèse sur le fil principal une fois ralenti 4 fois. Deux mesures, donc :

**Images vues à l'écran** (sorties du compositeur, `bench/frames-vues.cjs`), ce que l'œil voit :

| Grille | Images/s à l'écran | Écart médian | p95 | Écarts > 25 ms | Calques | Mémoire des tuiles | Images en mémoire graphique |
|---|---|---|---|---|---|---|---|
| Cartes actuelles (une image) | 58 | 16,7 ms | 16,8 ms | 4 | 8 | 14,1 Mo | 18,3 Mo |
| Toiles + posters B, reflet en CSS | 58 | 16,7 ms | 16,8 ms | 5 | 27 | 14,4 Mo | 19,3 Mo |
| Toiles + posters B, reflet par le script | 58 | 16,7 ms | 16,8 ms | 4 | 27 | 14,3 Mo | 19,3 Mo |
| Toiles + posters A | 59 | 16,7 ms | 16,8 ms | 2 | 9 | 14,1 Mo | 19,1 Mo |

**Fil principal** (`requestAnimationFrame`, `bench/perf.cjs`, même jour) : cartes actuelles 59 images/s, 0 tâche longue ; posters B en CSS 38 images/s, 2 tâches longues ; par le script 35 et 1 ; posters A 53 et 1. Ces chiffres suivent la charge de la machine, pas le code :

- passés en alternance dans les mêmes conditions, l'ancien prototype (toile de trois quarts, reflet plein) donne 32 à 36 images/s et 0 à 4 tâches longues, le nouveau 30 à 35 et 1 à 3 ;
- le même code de B donnait 60 images/s sans tâche longue sur la machine au calme, une heure plus tôt (tableau ci-dessous).

Le reflet de B est animé par le compositeur : le fil principal ne fait que tenir ses comptes, et l'écran reste à 58 images/s.

Passage précédent, machine au calme (toile encore de trois quarts, reflet plein) :

| Grille | Images/s | p95 | Plus lente | > 25 ms | Tâches longues | Styles recalculés | Calques | Mémoire des tuiles | Images en mémoire graphique |
|---|---|---|---|---|---|---|---|---|---|
| Cartes actuelles (une image) | 60 | 16,8 ms | 17,1 ms | 0 | 0 | 0 | 8 | 10,8 Mo | 15,6 Mo |
| Toiles + posters B, reflet en CSS | 60 | 16,8 ms | 33,4 ms | 2 | 0 | 249 | 46 | 15,4 Mo | 20,6 Mo |
| Toiles + posters B, reflet par le script | 60 | 16,8 ms | 33,3 ms | 1 | 0 | 251 | 46 | 15,8 Mo | 20,6 Mo |
| Toiles + posters A | 60 | 16,8 ms | 17 ms | 0 | 0 | 0 | 28 | 15,3 Mo | 20,3 Mo |

- **Rastérisation du poster A** (le filtre `drop-shadow` y déplace le coût) : 60 tâches, 8 ms au total sur les 7 200 px, contre 5 ms pour les cartes actuelles. Négligeable.

- **Calques.** Un par poster B (le reflet animé). Aucun pour la toile, vue de face sans transformation 3D (elle en coûtait un chacune), ni pour le poster A. Pour 48 cartes : 27 calques en mode B (46 avant la toile de face), 9 en mode A (28). Les 8 calques de base sont ceux de la page, plus la bande « avant / après » du prototype.
  - Mémoire au premier écran du téléphone (memory-infra) : à peine +0,3 Mo de tuiles et +1 Mo d'images en mode B par rapport aux cartes actuelles, contre +5 Mo et +5 Mo quand la toile était en 3D.
- **Styles.** Même en CSS, Chrome recalcule le style des reflets à chaque image (0,7 ms par image au ralenti, environ 0,2 ms à pleine vitesse). Aucune mise en page.
- **Trace du fil principal** (3 600 px de défilement, processeur ralenti 4 fois, posters B) : travail par image de 4,4 ms en médiane et 11,3 ms au 95e centile, loin des 16,7 ms d'une image. Recomposition des calques : 4 ms au total en CSS, 2 ms par le script.
- **Réseau.** Aucune requête en plus : pas d'image, pas de texture. Le reflet et l'ondulation sont des dégradés.
- Sans ralentissement, tout est à 60 images/s.

## 7. À faire valider par Walid

1. **Poster : B, sous verre** — choisi par Walid le 15/11, avec un reflet plus discret (fait). A reste dans le prototype, à comparer.
2. **Toile : de face** — demandé par Walid le 15/11 (fait).
3. **Cadre de B.** Noir par défaut : sur les fonds clairs des vignettes, c'est lui qui dessine le mieux l'objet, et la vitre s'y lit le mieux. Le blanc se perd sur le fond #f5f4f2.
4. **Contour blanc.** Le prototype le montre, comme la fiche par défaut (`pp_default_on`). Mais la fiche ne le propose que si le produit a une image « passe-partout ». Un poster à image unique n'en a pas : sans changement de cette règle, sa vignette serait sans contour (test du §2).

## 8. Relevé en chemin, hors vignette, à régler avec les nouveaux produits

- **Données Google de la collection** (`main-collection-product-grid.liquid`, `"image"` de l'ItemList) : elles lisent `product.images[1]`. Pour un produit à image unique, l'image est vide. Prendre `images[0]` pour `oeuvre-3d`.
- **Texte alternatif de la carte** : il lit `alts.value[1]` / `media[1].alt`. Prendre l'index 0 pour ces produits.
- **Fiche 3D** (`main-product.liquid`, l. 29) : elle exige l'image à plat en `media[1]`. Avec une seule image, la scène 3D ne s'affiche pas.
- **Page « Mes j'aime »** : `my-likes.js` remplit certaines cartes côté navigateur (`images[0]`, ancien balisage). Les nouvelles œuvres y apparaîtraient à plat dans une carte classique. À vérifier au portage.
