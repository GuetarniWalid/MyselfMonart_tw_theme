# 16: Agrandissement automatique contrôlé

**What to build:** dans le Publisher, une image de moins de 4 000 px sur le grand côté est agrandie avec l'outil choisi au ticket 03, pour le site seulement (3D et photos). Chaque image agrandie est comparée automatiquement à l'originale ; au-delà du seuil retenu au ticket 03, le Publisher alerte Walid au lieu de publier. L'image envoyée par Walid est conservée telle quelle. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 03 (banc d'essai), 09 (du Publisher à la fiche)

**Status:** ready-for-agent

- [ ] Une image de moins de 4 000 px est agrandie automatiquement ; au-dessus, on n'y touche pas.
- [ ] Le contrôle de fidélité tourne à chaque image, avec une alerte claire sur l'écran de validation.
- [ ] La durée et le coût par image sont notés. Aucun secret en clair : seulement les secrets GitHub Actions.
- [ ] L'image originale reste disponible.
