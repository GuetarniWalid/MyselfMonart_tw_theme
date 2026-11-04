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

- **Prototype** : https://claude.ai/artifact/MSMMJ5KFKrEuJ8xZSw69yz (Artifact privé, version 4). Code : `.scratch/fiche-3d/prototype/` ; mise en scène, géométrie et densité testées par `node --test` (27 tests). La page affiche ses propres mesures (poids, délai, images/s, couleurs) sur l'appareil qui l'ouvre.
- **Sources** : image à plat = media[1] de la toile 10807148708187 (PNG 1904 × 2544, publiée en JPEG 1536 × 2052). Pièce provisoire : « a couch with pillows and a potted plant », rendu photoréaliste de dada design sur Unsplash. Licence Unsplash vérifiée : usage commercial permis, sans attribution, interdit de revendre l'image telle quelle.
- **Mesures** (portable Intel Iris Xe, navigateur intégré, format téléphone 375 × 455 px en densité 2, version 4) :
  - three.js r170 depuis cdnjs : 136 Ko transférés (692 Ko décompressés), en 134 ms. Code du prototype : 94 Ko non compressés.
  - Image à plat : 616 Ko en JPEG. Le CDN Shopify enverrait un WebP de 592 Ko en 1536 px, ou de 372 Ko en 1200 px.
  - Source complète (1904 × 2544, gros plans) : 914 Ko, chargée à l'approche des options, jamais à l'arrivée. Envoi au GPU de 40 à 70 ms, à l'arrêt, puis fondu de 350 ms. WebP du CDN : 860 Ko.
  - Bois : 40 Ko, chargé au repos de la page. Pièce : 211 Ko, chargée quand on touche les tailles.
  - Photo affichée à 0,1 s, 3D de 0,3 à 0,6 s avec three.js en cache. La répétition de l'arrivée en prend 60 ms, photo à l'écran.
  - Coût d'une image, carte graphique comprise : 0,9 à 1,2 ms en densité 2, 1,5 à 2,3 ms en densité 3. Processeur : 0,5 à 0,9 ms en moyenne. Un téléphone moyen, 3 à 5 fois plus lent, reste à lire sur le téléphone de Walid.
  - Couleurs : écart ΔE moyen de 0,8 à 0,9 (invisible sous 2), décalage de teinte de 0,3°.
  - Mémoire graphique : 17 Mo pour l'œuvre, 26 Mo une fois la source chargée (les deux pendant le fondu), 17 Mo pour la pièce, 3 Mo pour le bois.
  - La photo d'arrivée et la façade 3D tombent au pixel près au même endroit : le fondu ne décale rien.
- **Retour de Walid du 04/11** (version 4) : bord de l'œuvre en marches d'escalier dans le plan du coin, œuvre molle de près, à-coups.
  - Cause confirmée : le bord de l'œuvre dans la marge était tracé par `step()` dans le shader, que l'anticrénelage matériel ne voit pas.
  - Bord de l'œuvre (poster 75 × 100, contour blanc, chêne) : écart à la droite de 0,29 px à 0,08 px, en densité 2 comme en 3 ; marches de 6 px disparues ; 84 % des colonnes ont un pixel de transition, contre 1 à 18 %.
  - Crénelures, écart à un rendu 3 fois plus fin : au repos, 0,023 % des pixels au plus dépassent 40 niveaux sur 255 ; en plein trajet, 0,051 %.
  - Netteté du plan du coin, contre la source PNG : 36,1 dB et 71 % du détail avant, 43,0 dB et 97 % après (bicubique et source complète). Coût de l'arrivée : nul, la source part à l'approche des options.
  - À-coups : clic sur un cadre avant l'arrivée de la 3D, de 1 248 ms à 19 ms. Première apparition d'un cadre : 2,1 ms de processeur au pire. Le parcours complet, à une minuterie de 16 ms : aucune image lente.
  - Image d'environ 4 000 px de la vraie fiche (3 000 × 4 000) : 40 px/cm sur le 75 × 100 au lieu de 25, pour 65 à 97 px/cm à l'écran dans le plan du coin. Le bicubique reste donc utile, sauf sur le 30 × 40 (100 px/cm). Elle pèse environ 2,3 Mo, 64 Mo en mémoire graphique, et son envoi au GPU prendrait plusieurs centaines de ms sur téléphone. Jamais à l'arrivée : à la demande et à l'arrêt, ou mieux, seulement la tuile du coin recadrée par le CDN.
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
  - Cadres : matériau propre, sans lumières three.js ni environnement précalculé. Diffus 0,64 · N·L, ambiance plus claire en haut qu'en bas, brillance et reflet d'une pièce simplifiée (plafond clair, sol chaud, fenêtre) calculés à la volée, creux assombris par le profil.
  - Ombre projetée sur le mur : pénombre de 0,35 cm plus 0,42 cm par cm d'écart, opacité 0,34 qui faiblit avec l'écart, ombre de contact de 12 % sur 1,6 cm. Pas de carte d'ombre.
- **Matières** :
  - Toile : trame de 7 fils par cm (relief 0,38, creux assombris de 7,5 %), châssis de 2 cm, arête arrondie de 2,5 mm.
  - Bordures : blanche #efede8, noire #272727. Étirée, miroir et pliée sont prises dans l'image ; la pliée montre en façade le centre de l'image.
  - Caisse américaine (supposée) : écart de 0,6 cm, face de 1,2 cm, 3,2 cm de profondeur. Cadre poster (supposé) : face de 1,6 cm, 2 cm de profondeur, feuillure de 0,5 cm.
  - Verre : voile de 1,2 %, reflet d'une fenêtre à carreaux de 6 %, brillance rasante (Fresnel).
  - Papier : grain fin. Contour blanc : 8 % du petit côté, égal en cm sur les 4 côtés.
  - Chêne clair : image cuite de 512 × 1024 px (`tools/chene.js`), tuile de 10 × 30 cm, relief 0,9, rugosité 0,55. Noir mat : relief 0,5, rugosité 0,68.
- **Netteté** :
  - Tout bord calculé dans un shader est lissé sur un pixel par sa couverture (`fwidth`, dérivées) : bord de l'œuvre et de la marge, bords de la photo de la pièce, pénombres, verre.
  - Image grossie : lecture bicubique (Catmull-Rom, 5 lectures), au coût non mesurable. Image réduite : mipmaps avec un biais de 0,6, sans quoi la 3D de face est plus molle que la photo ; 0,009 % des pixels scintillent en inclinaison vive. Filtrage anisotrope au maximum du matériel.
  - Densité de rendu : celle de l'écran, plafonnée à 3, jamais sous 2 pour la taille de la scène. Calibrée une seule fois à l'arrivée, canvas encore invisible : au-delà de 18 ms par image, elle baisse, sans descendre sous 1,5. Elle ne change plus pendant la visite.
- **Arrivée** : les programmes se compilent hors du fil de la page, puis 30 images limitées à un pixel, avec cadre et verre, rodent le code : 0,3 ms par image au lieu de 1 à 2 ms, et plus d'interruption de 15 ms au premier mouvement.
- **Pièce**, réglée à la main (méthode pour le ticket 11) : 6,6 px par cm au plan du mur, estimés d'après le dossier du canapé (91 cm) et l'assise (42 cm), à ±10 % près. Sol à 1 216 px, bas du tableau à 20 cm au-dessus du dossier. Mur #e9e9e8, un peu plus sombre vers la droite ; il prolonge la photo au-dessus de 184 cm pour le 75 × 100.
- **Limites connues** :
  - Testé sur les mêmes fichiers servis en local, pas dans le lecteur d'Artifacts : le navigateur intégré n'est pas connecté à claude.ai.
  - Fluidité non mesurée sur un vrai téléphone. Sur ce portable, le volet du navigateur était masqué : le parcours complet a tourné sur une minuterie de 16 ms, pas sur le vrai rythme de l'écran.
  - Dans le plan du coin, l'œuvre reste grossie 2,6 à 3,8 fois : elle est nette, mais sans le grain d'une image plus fine.
  - Profils de cadre et teinte du chêne à comparer aux vrais produits (tickets 10 et 14).
  - Bruit et bois repris de `component-perspective-canvas.js`, à fusionner au ticket 07.
  - En économie de données, sur un appareil modeste ou avec les animations réduites, la page reste sur la photo, comme la vraie fiche, et propose de voir la 3D quand même.
- **Verdict de Walid** : en attente.
