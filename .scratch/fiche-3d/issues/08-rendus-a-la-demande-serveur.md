# 08: Rendus à la demande sur le serveur

**What to build:** le serveur du backend transforme une image à plat en photos d'une toile, avec exactement le moteur de la fiche (ticket 07). Il rend quatre photos :
- de face sur fond clair, la future 1re image, comme aujourd'hui le tableau sur fond blanc ;
- de trois-quarts, avec la tranche ;
- un gros plan de la matière ;
- un coin du cadre.

Le rendu tourne à la demande, un à la fois, jamais pendant le jugement du studio des posters personnalisés. Il ne gêne ni le SAV ni le Publisher. On mesure sa mémoire et sa durée réelles sur le serveur. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 07 (moteur 3D réutilisable)

**Status:** ready-for-agent

- [x] Une commande ou une route reçoit une image à plat et rend les quatre photos en haute définition. *(`artwork:render-photos`, 2048 × 2400, vérifié en production le 05/11)*
- [x] Les photos sont identiques à ce que montre la fiche pour les mêmes réglages. *(dans la tolérance fixée avant la comparaison, pas au pixel près ; voir « Écart avec la fiche »)*
- [x] File d'attente : un rendu à la fois, jamais en même temps que le studio. *(verrou testé, ordre d'arrêt essayé en plein rendu sur le serveur ; jamais avec un vrai job du studio)*
- [x] Mémoire maximale et durée mesurées sur le serveur et notées dans le ticket. Si elles dépassent la place libre, le ticket 17 devient nécessaire. *(elles ne la dépassent pas)*
- [x] Rien d'autre ne ralentit sur le serveur pendant un rendu. *(sondes sur le site, la base et le MCP : rien au-delà de la variation du repos ; pas essayé pendant un vrai passage du SAV ou du Publisher)*
- [x] Aucun secret en clair : seulement les secrets GitHub Actions. *(le conteneur de rendu n'en a aucun)*

## Notes de réalisation (05/11/2026)

**Fait.** `node ace artwork:render-photos <adresse de l'image> [--sizes …] [--wait]` met un rendu en file (table `artwork_photo_renders`). Le worker du process web le fait rendre et dépose les PNG sur Spaces. Pour le ticket 09 : `requestPhotos()` de `App/Services/ArtworkPhotos`, puis `result.photos[].url` quand le statut passe à `done`. Page des photos : https://myselfmonart-space.fra1.digitaloceanspaces.com/bench/rendus/2026-11-05-bonsai/index.html

**Le moteur : aucune copie.** À chaque rendu, le conteneur lit `data-config` dans la fiche et télécharge les `three`, `engine` et `wood` qu'elle sert à cet instant, avec leur `?v=`. Sans fiche lisible, pas de photo. Une copie n'aurait même pas été le bon fichier : le CDN réécrit le moteur (128 Ko dans le dépôt, 81 Ko servis). Chaque résultat garde l'adresse et le SHA-256 de ce qui a servi. Le moteur n'a pas changé.

**Chromium : un conteneur à part, arrêté hors d'un rendu.** L'application a 768 Mo pour elle, studio compris : un pic de 728 Mo n'y tenait pas, et un dépassement aurait touché le site. Le serveur le démarre quand l'application pose un fichier (`Docker/renderer/rendu-photos.path`, une règle systemd). L'application n'a pas accès à Docker, et un conteneur en veille aurait coûté de la mémoire. Le conteneur n'a ni secret ni accès à la base. Son image n'est reconstruite que si `Docker/renderer` change, après un vrai rendu et un essai au-delà de la limite de mémoire.

**Le verrou : `RenderGate`, en mémoire du process web.** Le worker du studio et le « tester le prompt » du Publisher y tournent aussi, et ce dernier juge sans créer de job : le statut en base n'aurait pas suffi. Tout job et tout jugement y passent. Le studio entre seulement une fois le rendu arrêté, ou après 10 s si le rendu est bloqué : une cliente n'attend pas. La demande reprend seule ensuite, sans compter d'essai.

**Mesures sur le droplet** (2 vCPU, 1 967 Mo de RAM, 4 Go de swap), quatre photos 2048 × 2400, par le vrai parcours :

| Image à plat | Rendu | Demande à fin | Mémoire vive au pic | Pic, cache compris | Disponible au plus bas |
|---|---|---|---|---|---|
| Bonsaï, 1904 × 2544 | 38 s | 45 s | 526 Mo | 720 Mo | 692 Mo |
| Format Recraft, 3073 × 4096 | 40 s | 48 s | 622 Mo | 665 Mo | 619 Mo |
| Pire cas, 4344 × 5792, PNG de 33 Mo | 50 s | 53 à 60 s | 728 Mo | 854 Mo | 475 Mo |

- Place libre avant : 1 207 Mo de mémoire, 8,3 Go de disque. Après, au repos : 1 235 Mo, 7,7 Go. L'image pèse 546 Mo, et le rendu n'occupe aucune mémoire hors d'un rendu. **Le ticket 17 n'est pas nécessaire.**
- Plafond du conteneur : 1 000 Mo, sans swap. Essayé à 250 Mo : le rendu échoue (`failed`) et ne rend aucune photo vide.
- Effet sur le reste, médiane / 95 % / pire, en ms, pire cas :

| Sonde, toutes les 2 s | Au repos | Pendant le rendu |
|---|---|---|
| `/login` | 24 / 45 / 45 | 24 / 58 / 66 |
| `/promo/status` (base) | 30 / 81 / 81 | 32 / 62 / 86 |
| MCP | 18 / 45 / 45 | 17 / 49 / 100 |

  Sur tous les essais épinglés, la médiane bouge de −3 à +9 ms, autant que d'un essai à l'autre au repos. Swap : 0 à 49 Mo sortis.
- Sans précaution, le rendu prend les deux processeurs : `/login` passe de 28 à 58 ms au 95e centile. `cpus: 1` ne vaut pas mieux, le noyau le laisse les prendre par rafales (pire réponse 124 ms). Épinglé sur le second processeur, l'effet disparaît, pour 15 s de plus.
- Ordre d'arrêt en plein rendu, sur le serveur : conteneur arrêté en 513 ms, mémoire rendue aussitôt, demande reprise et finie, aucun essai compté.

**Écart avec la fiche.** Tolérance fixée avant la comparaison : écart moyen ≤ 0,5 niveau sur 255, 99,9 % des pixels à ≤ 8 niveaux, au plus 0,1 % à plus de 16. Fiche en ligne dans Chrome avec la carte du PC (Intel Iris Xe), contre les photos du droplet, aux mêmes réglages (1408 × 1384) et avec les mêmes images du CDN. Face et coin par de vrais gestes sur la fiche.

| Photo | Écart moyen | PSNR | 99,9 % à ≤ | Plus de 16 niveaux |
|---|---|---|---|---|
| Face | 0,068 | 58,1 dB | 1 | 0,008 % |
| Trois-quarts | 0,127 | 52,5 dB | 8 | 0,021 % |
| Matière | 0,061 | 59,7 dB | 2 | 0,000 % |
| Coin | 0,073 | 53,6 dB | 2 | 0,048 % |

Les écarts sont sur les arêtes et, en biais, sur les détails fins de l'œuvre : le lissage et le filtrage propres à chaque pilote. Trois-quarts touche la limite sans la passer. Le rendu logiciel, lui, est déterministe : les photos du droplet et d'un PC sous Windows sont identiques au bit près. Rejouer : `scripts/serveur/comparer-fiche.js`.

**Choix à faire valider par Walid.**
- La 1re image. Conforme au ticket et à la fiche, elle est moins serrée que l'actuelle : le tableau prend 72 % de la hauteur, contre 89 %, sans cadre, sur un mur gris très clair au lieu du blanc pur. En vignette de collection, il paraîtra plus petit que sur les anciens produits.
- Trois-quarts : le plan `material`, pas celui de la bordure, qui coupe l'œuvre et où la tranche mange l'image.
- Matière : le plan du contour blanc, sur le plus petit format, là où le grain se voit de plus près. C'est un coin : un vrai gros plan demanderait un plan de plus dans le moteur.
- Coin : le chêne, qui a sa vraie matière. Format 2048 × 2400 : le ratio de l'actuelle 1re image.

**Limites.**
- Aucun vrai job du studio n'a croisé un rendu : ce serait des appels payants et une vraie cliente. Le verrou est couvert par 14 tests et la file par 16 scénarios, et l'ordre d'arrêt est essayé en production. Le contrôle des photos et les fichiers d'impression du studio n'y passent pas : ils ne jugent pas.
- `trois-quarts` et `matiere` ne se voient pas sur une fiche de toile : ils sont comparés sur le canvas et la scène de la fiche, avec le directeur sans transition.
- Une seule carte graphique, aucun téléphone. Deux cartes diffèrent aussi entre elles.
- Une image au-delà de 25 Mpx n'a pas été mesurée : la limite arrête alors le rendu, pas le serveur.
- Photo de dos : pas faite, le moteur n'a pas de plan fixe de dos.
- Un job du studio resté `pending` (worker coupé) bloque les rendus.
- Un déploiement tire `renderer:latest` : cette image doit exister sur Docker Hub.
