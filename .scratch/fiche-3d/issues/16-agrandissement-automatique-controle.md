# 16: Agrandissement automatique contrôlé

**What to build:** dans le Publisher, une image de moins de 4 000 px sur le grand côté est agrandie avec l'outil choisi au ticket 03, pour le site seulement (3D et photos). Chaque image agrandie est comparée automatiquement à l'originale ; au-delà du seuil retenu au ticket 03, le Publisher alerte Walid au lieu de publier. L'image envoyée par Walid est conservée telle quelle. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 03 (banc d'essai), 09 (du Publisher à la fiche)

**Status:** ready-for-agent

- [x] Une image de moins de 4 000 px est agrandie automatiquement ; au-dessus, on n'y touche pas. *(en production le 08/11 : Bonsaï 1904 × 2544 agrandi ; une image de 4096 × 4096 laissée telle quelle, sans appel)*
- [x] Le contrôle de fidélité tourne à chaque image, avec une alerte claire sur l'écran de validation. *(contrôle en production sur le Bonsaï ; l'alerte et les choix vus sur un banc local, vraie page, vrai front, backend simulé : l'écran demande une connexion)*
- [x] La durée et le coût par image sont notés. Aucun secret en clair : seulement les secrets GitHub Actions. *(voir « Essai réel » ; le jeton Replicate était déjà un secret GitHub, l'enfant de mesure ne reçoit aucun secret)*
- [x] L'image originale reste disponible. *(sur Spaces, identique octet pour octet, liée au brouillon en base, lien sur l'écran de validation)*

## Notes de réalisation (08/11/2026)

**Fait.** Backend `ee52467`, déployé ; front `6cac200`, miroir régénéré par `sync-prod.js`. Sur le chemin « Nouvelle fiche » seulement :
- une image de moins de 4 000 px sur le grand côté passe par Recraft Crisp Upscale sur Replicate ; au-dessus, elle part telle quelle. Prix relu le 05/11 sur la page du modèle : « $6 per thousand output images », soit 0,006 $ ;
- l'image agrandie sert aux photos et devient le 2e média ; celle de Walid reste à son adresse sur Spaces (`artwork-photos/<uuid>/oeuvre.<ext>`), liée au brouillon (`artwork_drafts.source_url`), avec « Ouvrir votre image d'origine » sur l'écran ;
- chaque image agrandie est comparée à l'originale, seuils du ticket 03 (SSIM de la pire zone sous 0,45, ΔE moyen au-dessus de 4, détail ajouté au-delà de ×4). Au-delà, ou si la mesure échoue, l'écran passe à « À vérifier : l'image agrandie », dit ce qui a changé en mots simples et montre les deux images côte à côte, avec un gros plan au même endroit. Il propose « Garder l'image agrandie » ou « Garder mon image d'origine » (photos refaites, environ 45 s). Rien ne se crée avant ce choix, et le serveur le refuse aussi ;
- un agrandissement raté, crédit épuisé compris (dit tel quel) : « Garder mon image d'origine » ou « Réessayer ». Une image payée est notée aussitôt et n'est jamais repayée ; un calcul abandonné est annulé chez Replicate ;
- pendant l'attente, l'écran annonce « comptez deux minutes environ » et compte les secondes ;
- `node ace artwork:upscale --image <adresse>` et l'entrée « Agrandir » du workflow « Brouillon d'essai » : l'agrandissement et le contrôle seuls, sans Claude ni produit. `artwork:draft --choice upscaled|original` (entrée « choix ») tranche une image à vérifier, comme l'écran.

**La mesure : celle du banc, au bit près.** D'un seul tenant, elle aurait pris 500 Mo pour le Bonsaï, et l'application n'a que 768 Mo pour tout. Elle passe donc par bandes de 128 lignes, avec des chiffres identiques au bit près à l'ancienne version, Lanczos compris. Rejouée sur les sorties Recraft payées au ticket 03, elle redonne leurs chiffres : visage 0,6801 / 3,349 / ×2,98, motifs 0,9385 / 2,586 / ×2,29, aplats 0,5125 / 2,667 / ×3,26. Elle tourne dans un process à part (`measure-child`) : sans secret, en priorité basse, et premier arrêté si la mémoire manque. Elle passe sous le verrou des rendus : jamais pendant un rendu ni pendant le studio, qui l'arrête s'il arrive. Les photos partent après elle.

**Essai réel, 08/11, Bonsaï (`media[1]`, 1904 × 2544) dans Tableau Zen.** Un seul passage payant.
- Recraft : 3066 × 4096 en WebP de 13,2 Mo. 11,8 s de l'appel au fichier déposé, dont 8,4 s de calcul. 0,006 $.
- Contrôle sur le serveur : 23,9 s, 238 Mo au pic. Fidèle : SSIM de la pire zone 0,772, ΔE moyen 1,88, détail ajouté ×1,28. C'est mieux que toutes les œuvres du banc.
- Préparation complète : 1 min 27 s jusqu'à la validation, photos rendues depuis l'image agrandie et textes de Claude en parallèle. Avant ce ticket : 51 s.
- À l'œil, côte à côte en gros plan : formes et couleurs fidèles, coups de pinceau du tronc et des branches plus nets. Mais le léger grain du mur du fond devient une trame régulière, comme un tissage de toile, nettement plus marquée que dans l'original. Elle se voit à 100 % sur l'image à plat, justement dans la « pire zone » que l'écran montre en gros plan. Sur la photo de face (2048 × 2400), elle se lit comme un grain de toile, sans moiré. Le seuil ne l'arrête pas : c'est à l'œil de Walid de juger.
- Coût de l'essai : 0,006 $ chez Replicate, plus sept appels à Claude pour les textes (description, mots-clés, texte alternatif, titre et SEO, trois textes de photos). Leur coût n'est pas journalisé par le backend : le chiffre exact est sur la console Anthropic.
- Brouillon créé par le workflow (commande, pas l'écran) : [10871297376603](https://admin.shopify.com/store/team-689/products/10871297376603). Il est en `DRAFT`, modèle `oeuvre-3d`, sur aucun canal. Ses 5 médias sont `READY` dans l'ordre : de face, l'image agrandie (3066 × 4096, le WebP de 13 Mo accepté par Shopify), trois-quarts, matière, coin. Les 95 variantes ont été copiées par le webhook ; la catégorie, `artwork.type`, la collection mère, le titre court, les couleurs et les thèmes sont en place. Un seul nouveau brouillon, rien de supprimé.

**Ancien chemin.** `app.js`, `personalized.js` et `bulk-posters.js` servis en production sont identiques au bit près avant et après le déploiement (`743e821c7efd`, `57b44135784d`, `a98d9bd56dbe`). `publishOnShopify` et les services de Claude n'ont pas changé. Côté écran, les seuls ajouts sont dans la fenêtre de la nouvelle fiche et des règles `.draft-*` ; le `?v=` du CSS change aussi sur la page des posters en masse. Sur le banc, le chemin « Mockups » reste le défaut : cartes Mockups et Rendus, « Publier l'œuvre », aucun appel au nouveau chemin. Le studio répond la même chose avant et après (`/api/custom-art/teams`, même empreinte).

**Vérifié aussi.** `npm run test:golden` en local et sur la CI : 63 contrôles du flux (39 avant), 32 de l'écran (19 avant), 22 de l'agrandissement (appel Recraft simulé, mesure sur images fabriquées), verrou et mesure. Type-check, ESLint, Prettier, build, déploiement. Après le déploiement : `/login`, `/promo/status` et le studio répondent, aucun redémarrage ni arrêt pour mémoire. Banc navigateur, 9 parcours : fidèle jusqu'au brouillon créé, alerte puis « Garder l'image agrandie », alerte puis « Garder mon image d'origine », échec puis « Réessayer », échec puis image d'origine, crédit épuisé, comparaison impossible, image assez grande, téléphone (375 px, sans défilement horizontal). Revue de code sur deux axes, corrigée : image payée notée aussitôt, calcul abandonné annulé, photos après la comparaison, choix en ligne de commande.

**Limites.**
- L'écran n'a tourné que sur le banc, jamais connecté en production. À voir par Walid : une image de moins de 4 000 px en « Nouvelle fiche », la comparaison côte à côte et ses gros plans.
- L'alerte n'a pas été vue en production : le Bonsaï ne la déclenche pas, et la provoquer coûterait un appel de plus.
- Les seuils restent provisoires (trois œuvres au banc, une ici). Ils laissent passer une trame accentuée comme celle du Bonsaï.
- Quand la comparaison attend le studio ou un autre rendu, l'écran dit seulement « Comparaison en cours » ; le compteur continue.
- Sans build (développement), la mesure échoue : l'écran demande alors de comparer soi-même. Dans `node ace artwork:draft` et `artwork:upscale`, elle tourne dans le process de la commande, hors du verrou du process web.
- Chaque image agrandie ajoute environ 21 Mo sur Spaces (WebP et original), jamais nettoyés. Elle part sur Shopify telle que rendue, en WebP.
- Couleurs : ΔE moyen de 1,9 sur le Bonsaï, environ 3 au banc. Un léger écart, comme prévu au ticket 03.
