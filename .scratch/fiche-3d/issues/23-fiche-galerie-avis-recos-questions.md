# 23 : Fiche galerie — avis, « Vous aimerez aussi », questions

**What to build:** les trois blocs qui suivent « En pratique » dans la maquette, chacun avec son personnage de tableau ancien détouré.

Référence : la maquette v13, `.scratch/fiche-3d/galerie/proto/index.html` (sections `.avis`, `.recos`, `.faq`), et `.scratch/fiche-3d/galerie/README.md`. Textes du poster : `.scratch/fiche-3d/galerie/poster/textes.json`.

## Avis : « +1 000 clients aux anges »

- Bande soleil, titre, phrase, bouton « retours vérifiés sur Trustpilot », une rangée de photos de clients qui glisse, et les deux angelots qui montent du bas.
- Les photos et les mots des clients sont ceux que la fiche actuelle montre déjà (bloc d'avis du modèle `product.oeuvre-3d.json`).
- Le nombre d'avis et la note viennent du réglage Trustpilot du thème, par les jetons `[[TP_SCORE]]` et `[[TP_COUNT]]` et le snippet `trustpilot-tokens` : jamais un chiffre en dur.

## Vous aimerez aussi : « D'autres tableaux, d'autres perles. »

- Titre (poster : « D'autres posters, d'autres perles. »), bouton vers la collection du produit, la Jeune Fille dont la perle scintille, et une rangée de cartes.
- Les œuvres proposées sont celles que la fiche actuelle propose (recommandations de Shopify), avec la carte de produit du thème : pour un nouveau produit, la vignette d'œuvre déjà en place.

## Questions fréquentes

- Carte ciel avec la Joconde en casque-micro et sa bulle « Allô, j'écoute ! », et les questions en volets.
- Les questions d'aujourd'hui sont reprises pour la toile ; le poster a ses réponses (plus de châssis, de toile 285 g/m² ni de 75 ans pour lui).
- Si la fiche actuelle publie ces questions dans les données pour Google (FAQPage), elles restent publiées, avec les réponses qui correspondent au produit.

## À respecter

- Les personnages (angelots, Jeune Fille, Joconde) : images de `.scratch/fiche-3d/galerie/proto/img/`, en différé, sans texte alternatif, jamais nommés.
- Réutiliser les composants du thème (rangée qui glisse, volets, recommandations) sans changer leur comportement ailleurs.
- Cinq langues.

**Blocked by:** 19 (ossature)

**Status:** ready-for-agent

- [ ] Les trois blocs sont fidèles à la maquette sur téléphone et sur ordinateur, sans débordement.
- [ ] La note et le nombre d'avis suivent le réglage du thème ; le contrôle du dépôt (chiffre en dur) passe.
- [ ] Toile et poster : titres et réponses propres à chacun.
- [ ] Les recommandations se chargent comme aujourd'hui, et les cartes mènent aux bons produits.
- [ ] Les cinq langues sont en place ; la fiche actuelle et les autres pages sont inchangées.
