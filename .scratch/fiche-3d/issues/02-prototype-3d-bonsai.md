# 02: Prototype 3D du Bonsaï

**What to build:** une page à part, jetable, qui rend le Bonsaï (sa toile et son poster existent déjà) en three.js à partir de sa seule image à plat. Elle montre deux cadres, deux tailles, une pièce (générée par l'IA, ou provisoire tant que la bibliothèque du ticket 11 n'existe pas) et toutes les mises en scène décidées. Walid l'ouvre sur son téléphone et la compare à la 3D actuelle de la fiche toile, sur la même œuvre. Le prototype tranche le réalisme, la fluidité et le choix du moteur (three.js ou 3D actuelle). Il ne touche pas au thème. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Un lien que Walid ouvre sur son téléphone, sans rien installer. *(lien prêt, voir les notes ; reste à l'ouvrir sur le téléphone)*
- [x] La toile montre le grain de la toile, une tranche de 2 cm et une ombre douce sur le mur ; les cadres montrent leur matière ; le poster montre le papier et le reflet du verre.
- [x] Toutes les mises en scène : coin du cadre, pivot sur la tranche, recul dans la pièce avec la cote en cm, contour blanc, passage poster ou toile ; retour de face au changement d'option ; légère inclinaison au doigt.
- [x] Les couleurs de l'œuvre restent fidèles à l'image à plat : l'éclairage ne change pas leur teinte.
- [ ] Fluide sur un téléphone de milieu de gamme ; poids et temps de chargement de la 3D notés dans le ticket. *(poids et temps notés ; la fluidité se lit dans la page, sur le téléphone de Walid)*
- [x] Les réglages de caméra, de lumière et de matières retenus sont notés pour la vraie fiche.
- [ ] Le verdict de Walid est écrit dans le ticket : « c'est ça », ou la liste de ce qui doit changer.

## Notes de réalisation

- **Prototype** : https://claude.ai/artifact/MSMMJ5KFKrEuJ8xZSw69yz (Artifact privé, version 3). Code : `.scratch/fiche-3d/prototype/` ; mise en scène testée par `node --test` (17 tests). La page affiche ses propres mesures (poids, délai, images/s, couleurs) sur l'appareil qui l'ouvre.
- **Sources** : image à plat = media[1] de la toile 10807148708187 (PNG 1904 × 2544, publiée en JPEG 1536 × 2052). Pièce provisoire : « a couch with pillows and a potted plant », rendu photoréaliste de dada design sur Unsplash. Licence Unsplash vérifiée : usage commercial permis, sans attribution, interdit de revendre l'image telle quelle.
- **Mesures** (portable Intel Iris Xe, navigateur intégré, format téléphone 375 × 455 px en densité 2) :
  - three.js r170 depuis cdnjs : 136 Ko transférés (692 Ko décompressés), en 134 ms. Code du prototype : 76 Ko non compressés.
  - Image à plat : 616 Ko en JPEG. Le CDN Shopify enverrait un WebP de 592 Ko en 1536 px, ou de 372 Ko en 1200 px.
  - Pièce : 216 Ko, chargée quand on touche les tailles.
  - Photo affichée à 0,2 s, 3D à 1,3 s au premier chargement (0,6 s avec three.js en cache). Il faut 0,2 s entre three.js prêt et la première image 3D, une fois le bois et les reflets des cadres repoussés au repos de la page (le chêne seul coûtait 0,2 s).
  - Coût d'une image, synchronisation GPU comprise : 4 à 7 ms selon le plan, soit environ 60 images/s ici. Un téléphone moyen, 3 à 5 fois plus lent, serait entre 15 et 30 ms : à lire sur le téléphone de Walid.
  - Couleurs : écart ΔE moyen de 1,1 à 1,2 (invisible sous 2), décalage de teinte de 0,4 à 0,5°.
  - Mémoire graphique : environ 17 Mo pour l'œuvre et 17 Mo pour la pièce.
  - La photo d'arrivée et la façade 3D tombent au pixel près au même endroit : le fondu ne décale rien.
- **Caméra** (champ vertical 30°, transitions de 450 ms pour le retour de face et 900 ms vers le plan, courbe cubique) :
  - De face : tableau sur 72 % de la hauteur.
  - Tranche : tableau tourné de 38° vers la lumière, penché de 6°, écarté du mur juste assez (1 cm de marge).
  - Coin du cadre : caméra à 32° de côté et 18° au-dessus, 14 cm de champ.
  - Contour blanc : de face sur le coin bas, 36 % de la hauteur du tirage.
  - Toile ou poster : orbite de 40° côté lumière et 8° au-dessus.
  - Pièce : cadrage du sol jusqu'à 238 cm, borné à la photo.
  - Inclinaison au doigt : la caméra tourne de ±12° et ±8° autour du tableau, qui reste au mur. Retour par un ressort amorti (0,6 à 1,6 Hz, rebond d'environ 10 %, posé en 1 s). Un toucher qui fait défiler la page n'incline rien.
- **Lumière** :
  - Une direction par pièce, vers la fenêtre (−0,5 ; 0,45 ; 0,74). Les plans montrent le côté éclairé.
  - Œuvre : luminosité seule, (0,55 + 0,45 · N·L) / (0,55 + 0,45 · Lz), plafonnée à 1, sans mappage de tons. La teinte ne bouge pas.
  - Cadres : PBR, avec une lumière principale de 2,0, un ciel de 0,6 et un petit environnement calculé pour les reflets.
  - Ombre projetée sur le mur : pénombre de 0,35 cm plus 0,42 cm par cm d'écart, opacité 0,34 qui faiblit avec l'écart, ombre de contact de 12 % sur 1,6 cm. Pas de carte d'ombre.
- **Matières** :
  - Toile : trame de 7 fils par cm (relief 0,38, creux assombris de 7,5 %), châssis de 2 cm, arête arrondie de 2,5 mm.
  - Bordures : blanche #efede8, noire #272727. Étirée, miroir et pliée sont prises dans l'image ; la pliée montre en façade le centre de l'image.
  - Caisse américaine (supposée) : écart de 0,6 cm, face de 1,2 cm, 3,2 cm de profondeur. Cadre poster (supposé) : face de 1,6 cm, 2 cm de profondeur, feuillure de 0,5 cm.
  - Verre : voile de 1,2 %, reflet d'une fenêtre à carreaux de 6 %, brillance rasante (Fresnel).
  - Papier : grain fin. Contour blanc : 8 % du petit côté, égal en cm sur les 4 côtés.
  - Chêne clair procédural ; noir mat avec rugosité 0,68.
- **Pièce**, réglée à la main (méthode pour le ticket 11) : 6,6 px par cm au plan du mur, estimés d'après le dossier du canapé (91 cm) et l'assise (42 cm), à ±10 % près. Sol à 1 216 px, bas du tableau à 20 cm au-dessus du dossier. Mur #e9e9e8, un peu plus sombre vers la droite ; il prolonge la photo au-dessus de 184 cm pour le 75 × 100.
- **Limites connues** :
  - Testé sur les mêmes fichiers servis en local, pas dans le lecteur d'Artifacts : le navigateur intégré n'est pas connecté à claude.ai.
  - Fluidité non mesurée sur un vrai téléphone.
  - Profils de cadre et teinte du chêne à comparer aux vrais produits (tickets 10 et 14).
  - Bruit et bois repris de `component-perspective-canvas.js`, à fusionner au ticket 07.
  - En économie de données, sur un appareil modeste ou avec les animations réduites, la page reste sur la photo, comme la vraie fiche, et propose de voir la 3D quand même.
- **Verdict de Walid** : en attente.
