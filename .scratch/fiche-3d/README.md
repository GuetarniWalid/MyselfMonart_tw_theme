# Fiche produit 3D à image unique

Plan validé par Walid le 03/11/2026. Les tickets sont dans `issues/`, numérotés dans l'ordre des blocages : un ticket démarre quand tous ceux qui le bloquent sont faits. Les tickets 01 à 06 peuvent démarrer tout de suite, en parallèle.

## But

Ajouter un tableau à partir d'une seule image à plat, sans Photoshop ni mockups, en gardant l'effet premium du site et le SEO des fiches. Le visiteur doit trouver le site et les animations si fluides que la qualité du produit en devient évidente, et ne jamais chercher le bouton d'achat.

## Point de départ (relevé du 03/11/2026)

- Catalogue : environ 1 590 produits, dont 662 posters, 224 toiles récentes et environ 670 anciennes toiles « Tableau mural » sur le même schéma. Ni diptyque, ni format rond.
- Une même œuvre existe en deux produits jumeaux, une toile et un poster, reliés par des métachamps. La fiche passe de l'un à l'autre sans recharger la page.
- Options de la toile : Tailles, Bordures (blanche, noire, étirée, miroir, pliée), Cadres (sans cadre, blanc, noir mat, argent ancien, chêne clair, noyer). Options du poster : Tailles, Cadres (sans ou avec). La couleur du cadre du poster (noir, blanc, chêne clair, noyer) et le contour blanc (passe-partout) passent par des propriétés de ligne, pas par des variantes.
- Formats : portrait 3:4 (de 30x40 à 90x120), paysage 4:3, carré 1:1 (toile seulement).
- Ordre des médias, dont dépendent les vignettes de collection, le panier et les textes alternatifs : 1re image = le tableau encadré sur fond blanc ; 2e = l'image à plat, source de la 3D ; puis les mockups. Les variantes n'ont aucune image.
- Une 3D maison existe déjà (`<perspective-canvas>`, WebGL1 écrit à la main) : toile sur châssis, cadres, tranches, inclinaison au doigt. Elle ne sait pas exporter d'image.
- Le Publisher du backend crée déjà le produit à partir d'une image : textes par Claude, variantes copiées d'un produit modèle, traductions la nuit. Seuls les mockups (moteur Photopea sur le PC, insertion par Gemini) ralentissent.
- SEO sur 90 jours à fin octobre 2026 : Google Images fait 27 % des clics Google et 42 % de ceux qui arrivent sur les fiches ; les fiches pèsent 34 % des clics Google ; Google Shopping gratuit est en hausse ; deux tiers des clics Google viennent du mobile.
- Fiche toile actuelle : tableau principal affiché en 0,99 s, aucun décalage de mise en page.

## Décisions

1. Périmètre : toiles et posters. Personnalisés, tapisseries, gourdes et sur-mesure ne changent pas.
2. Calendrier : prototype validé courant novembre ; nouveaux produits sur la nouvelle fiche dès qu'elle est prête, avant Noël ; aucun produit qui se vend déjà ne change de fiche avant janvier.
3. Image de départ : l'œuvre à plat, de face, sans cadre ni décor. Sous 4 000 px sur le grand côté, le Publisher l'agrandit, pour le site seulement.
4. Moteur : three.js, comparé au prototype à la 3D actuelle.
5. Affichage : une vraie image d'abord, puis la 3D prend le relais en fondu, sans décaler la page. Appareil trop faible, 3D indisponible ou animations réduites : on reste sur les photos, avec de simples fondus.
6. Arrivée : l'œuvre seule, de face, sur un mur clair, avec une lumière douce et une ombre réaliste.
7. Mise en scène guidée, plus une légère inclinaison au doigt ou à la souris (pas de 3D libre) :
   - taille : la caméra recule dans la pièce, le tableau change de taille à la vraie échelle, cote en cm ;
   - bordure : le tableau pivote pour montrer la tranche ;
   - cadre : zoom sur un coin du cadre ;
   - contour blanc : zoom de face sur la marge ;
   - poster sans cadre : un coin du papier se soulève et s'enroule, puis retombe (demande de Walid du 04/11) ;
   - toile : le tableau quitte le mur et fait un tour complet pour montrer le châssis au dos (bande blanche agrafée, pin clair), puis revient au mur (demande de Walid du 04/11) ;
   - la caméra revient de face quand on passe à une autre option.
8. Châssis des toiles : 2 cm.
9. Bouton d'achat toujours visible : barre fixe en bas sur mobile ; sur ordinateur, bouton visible dès l'arrivée et 3D fixe pendant qu'on parcourt les options. Le prix et le bouton changent au clic ; l'animation ne bloque jamais rien.
   - Décision du 08/11, après l'essai de la fiche en ligne sur son téléphone : tout dans l'image, plus d'options sous la 3D. L'œuvre occupe l'écran ; ses options sont des vignettes de part et d'autre du tableau, chacune dessinée par la 3D avec le choix en cours. Toucher une vignette ouvre à côté d'elle une rangée d'aperçus, un par choix ; toucher un aperçu applique le choix (prix aussitôt) et la 3D joue sa mise en scène (la rangée reste ouverte depuis le 09/11, voir plus bas). Barre d'achat nettement plus petite, en bas, sur l'œuvre. Titre, description, avis et FAQ suivent au défilement. Maquette à valider : ticket 07.
   - Design des chips du 09/11 : il vient du fichier « Fiche chips v2 » de Walid (Claude Design, projet « MyselfMonArt · chips de la fiche 3D »), direction 2b et ses formats (390 × 844, iPhone SE entier et dans Safari, ordinateur). Walid a refusé les vignettes de la maquette du 08/11 : plus de miniatures, l'œuvre en 3D est le seul aperçu. Au repos, rien ne cache l'œuvre : la bascule Toile | Poster au-dessus, une légende de chaque côté (bordure ou contour à gauche, cadre à droite) reliée au bord de l'œuvre par un filet, la taille et sa cote dessous. Toucher une légende ouvre sous l'œuvre une rangée de verre dépoli, un choix par pastille avec son prix. Appliqué à la maquette 3D le 09/11, en module réutilisable pour le thème (`prototype/src/chips.js` et `chips.css`) : ticket 07.
   - Retour de Walid sur la version 14, le 09/11 : un choix s'applique (légende, prix, mise en scène) et la rangée reste ouverte, pour enchaîner les choix. Elle se ferme seulement par un toucher en dehors d'elle, ou Échap, qui ramène l'œuvre de face. Pendant ce temps, chaque mise en scène se cadre dans la zone visible au-dessus de la rangée. Valable pour la bordure (ou le contour), le cadre et la taille ; la bascule Toile | Poster n'a pas de rangée.
10. Pièces : photos générées une fois par Gemini, triées par Walid, lumière réglée une fois par pièce. L'IA choisit la pièce de chaque produit. Décisions du 05/11 après le premier test :
    - la scène dépend de la taille : un 30 × 40 sur un mur étroit entre deux meubles, un 60 × 80 au-dessus d'une console, les grands formats au-dessus d'un canapé ou d'un lit ;
    - les intérieurs sont habités, pas vides : « autant un mur blanc » sinon ;
    - le tableau prend la lumière de la pièce par le calcul (méthode 1 du ticket 11), avec la tranche et l'ombre de la 3D ;
    - les pièces restent un bonus : la fiche démarre sur le mur neutre, et sort sans elles si elles n'atteignent pas le niveau voulu par Walid.
11. Photos automatiques : le moteur rend 5 ou 6 vraies photos par produit (de face sur fond clair, de trois-quarts avec la tranche, gros plan de la matière, coin du cadre, dans la pièce), décrites par Claude et visibles sous la 3D dans une bande « Sous tous les angles ». Une image par cadre pour les variantes.
12. Publisher : une image donne la toile et le poster par défaut (carré : toile seule). L'IA propose la collection et la pièce ; Walid valide sur un seul écran, puis un clic publie.
13. Rendus : sur le serveur actuel, à la demande, un à la fois, jamais en même temps que le studio des posters personnalisés. On n'agrandit le serveur que si la mesure l'exige. La base MySQL sert encore : on la garde.
14. Agrandissement : Recraft Crisp Upscale sur Replicate (0,006 $ par image), choisi par Walid après le banc d'essai (ticket 03) ; chaque image agrandie est comparée automatiquement à l'originale.
15. Impression : hors projet. Walid continue avec ses propres fichiers.
16. Mesure : test en deux temps. D'abord les nouveautés, comparées aux nouveautés des mois précédents ; puis, en janvier, la moitié des best-sellers contre l'autre moitié pendant 3 semaines. PostHog tourne dans une organisation à part, MyselfMonArt (projet 334087, région Europe), créée le 04/11 dans le compte PostHog existant de Walid et séparée de Made By Mood, avec sa propre offre gratuite. Clarity est retiré dès que PostHog tourne. La bannière cookies garde l'acceptation automatique, par choix de Walid.
17. Version 2 : vidéo automatique, réalité augmentée, fichier d'impression HD.

## Règles

Les conventions du skill `shopify-section-dev` s'appliquent : réutiliser l'existant, Tailwind, réglages de schéma, accessibilité, Lighthouse ≥ 90. Tout se pousse sur `main`, qui déploie le thème en ligne (voir `CLAUDE.md`). Aucun secret en clair : les secrets du backend vivent dans les secrets GitHub Actions.
