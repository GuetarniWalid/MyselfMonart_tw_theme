# 03: Banc d'essai de l'agrandissement

**What to build:** choisir l'outil qui agrandit une image à plat jusqu'à environ 4 000 px sur le grand côté sans rien inventer, pour le site seulement : l'impression est hors projet. Trois outils sont comparés, dont Real-ESRGAN, déjà utilisé par le studio, sur trois œuvres de styles différents (un visage, des motifs fins, de grands aplats). Walid compare en gros plan et choisit. Le seuil d'écart qui déclenchera une alerte dans le Publisher est fixé ici. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Une page de comparaison en gros plan, chaque résultat côte à côte avec l'original simplement agrandi.
- [x] Pour chaque outil : qualité perçue, détails inventés repérés, durée et coût par image.
- [x] Une mesure automatique de fidélité (l'image agrandie, réduite, comparée à l'original) et le seuil d'alerte retenu.
- [x] Le choix de Walid est écrit dans le ticket.

## Notes de réalisation (03/11/2026)

- Page de comparaison : https://myselfmonart-space.fra1.digitaloceanspaces.com/bench/agrandissement/2026-11-03-22b0182a48e7/index.html
- Résultats bruts : même dossier, `resultats.json`. Les sorties de chaque outil sont dans `sorties/`.
- Backend : commits `127d43c` et `fc4e059` sur `main`. Mesure dans `app/Services/UpscaleFidelity` (test doré `tests/golden/upscale-fidelity.js`), banc dans `scripts/banc-agrandissement.js`, workflow manuel `banc-agrandissement.yml`.
- Passages GitHub : `41721329691` (le seul payant, 18 appels prévus) et `41726421141` (reprise sans aucun appel payant, après correction du témoin et des coûts).
- Coût calculé : 0,38 $ d'après les tarifs publiés (Topaz 0,35 $, Recraft 0,024 $, Real-ESRGAN 0,008 $). La facture exacte est sur le compte Replicate. Le prix de Recraft est celui de Recraft : Replicate n'affiche pas le sien.

### Mesures

« Vérité » : image réduite de moitié, agrandie ×2, comparée à la vraie. « Publisher » : cas réel, agrandie jusqu'à 4 000 px, réduite, comparée à l'originale. « Détail » : énergie de fin détail, divisée par celle de la vraie image, ou par celle du témoin pour le détail ajouté. Durée et coût : cas réel / vérité.

| Œuvre | Outil | Vérité SSIM moyen | Vérité SSIM pire zone | Vérité ΔE moyen | Détail ÷ vraie | Publisher SSIM pire zone | Publisher ΔE moyen | Détail ajouté | Calcul (s) | Coût ($) |
|---|---|---|---|---|---|---|---|---|---|---|
| Visage | Lanczos | 0,984 | 0,958 | 0,77 | 0,81 | 0,999 | 0,22 | ×1 | sans objet | 0 |
| Visage | Real-ESRGAN | aucun résultat | | | | | | | | |
| Visage | Topaz | 0,746 | 0,420 | 4,18 | 3,36 | 0,714 | 2,73 | ×5,29 | 18,5 / 7,9 | 0,05 / 0,05 |
| Visage | Recraft | 0,882 | 0,725 | 3,57 | 2,09 | 0,680 | 3,35 | ×2,98 | 13,1 / 15 | 0,004 / 0,004 |
| Motifs | Lanczos | 0,953 | 0,748 | 1,63 | 0,56 | 0,994 | 0,24 | ×1 | sans objet | 0 |
| Motifs | Real-ESRGAN | 0,942 | 0,790 | 2,96 | 1,30 | 0,946 | 2,35 | ×2,82 | 15,3 / 4,4 | 0,0034 / 0,001 |
| Motifs | Topaz | 0,909 | 0,643 | 3,15 | 1,54 | 0,916 | 1,64 | ×3,86 | 18,4 / 6,6 | 0,10 / 0,05 |
| Motifs | Recraft | 0,946 | 0,774 | 2,91 | 1,33 | 0,939 | 2,59 | ×2,29 | 8,4 / 5,9 | 0,004 / 0,004 |
| Aplats | Lanczos | 0,592 | 0,297 | 1,94 | 0,16 | 0,944 | 0,61 | ×1 | sans objet | 0 |
| Aplats | Real-ESRGAN | 0,553 | 0,236 | 2,47 | 0,34 | 0,381 | 3,16 | ×9,24 | 12,6 / 3,3 | 0,0028 / 0,0007 |
| Aplats | Topaz | 0,551 | 0,232 | 2,76 | 0,43 | 0,482 | 2,19 | ×3,29 | 15,6 / 6 | 0,05 / 0,05 |
| Aplats | Recraft | 0,551 | 0,232 | 2,47 | 0,27 | 0,513 | 2,67 | ×3,26 | 16,6 / 27,5 | 0,004 / 0,004 |

### Ce que ça montre

- Face à la vraie image, le simple Lanczos a le meilleur SSIM moyen et le meilleur ΔE moyen sur les trois œuvres. C'est le seul à ne jamais dépasser le détail de la vraie image : il en perd, il n'en invente pas. Il reste à voir s'il paraît trop mou en gros plan.
- Sur le visage, Topaz produit 3,4 fois le détail de la vraie image et Recraft 2,1 fois. C'est le signe d'un détail inventé. Topaz, pourtant non génératif selon son éditeur, y est le plus éloigné de la vérité.
- Parmi les trois outils payants, Recraft est le plus proche de la vérité sur le visage et les motifs, et à égalité sur les aplats. Il coûte le moins cher et accepte toutes les tailles. Sa sortie plafonne à 4 096 px, ce qui suffit, et ses couleurs dérivent un peu (ΔE moyen autour de 3).
- Real-ESRGAN refuse toute image au-delà de 2,1 MP, faute de mémoire GPU. Le visage (4,2 MP) a été rejeté, et il en irait de même pour les images à plat d'environ 1 800 × 2 400 px du catalogue. Il faudrait les réduire avant, ce qui perd du détail.
- L'œuvre « aplats » porte un grain fin que réduire puis agrandir ne peut pas retrouver : son SSIM de vérité est bas pour tous, Lanczos compris. Là, seule la comparaison entre outils a un sens.

### Limites

- Real-ESRGAN n'a aucun résultat sur le visage : le cas réel a échoué sur la limite de taille, la vérité terrain sur la limite de débit de Replicate (corrigée depuis dans le script). Compléter la vérité coûterait environ 0,001 $, mais demande un nouvel appel payant.
- Trois œuvres, et une seule mesure par cas : les seuils ci-dessous sont provisoires. Aucune de ces mesures ne remplace l'œil de Walid.
- La mesure par réduction ne voit pas un détail plus fin qu'un pixel de l'originale. D'où l'énergie de détail, ajoutée à cette fin.
- sharp 0.34 décale ses agrandissements d'un demi-pixel de sortie (ses réductions sont exactes). À ne pas oublier dans le Publisher : passer par `enlargeLanczos`.

### Seuil d'alerte proposé (à retenir avec l'outil)

- Avec Lanczos : alerte si le SSIM de la pire zone passe sous 0,90 ou si le ΔE moyen dépasse 1. Pire valeur mesurée : 0,944 et 0,61.
- Avec Recraft : alerte si le SSIM de la pire zone passe sous 0,45, si le ΔE moyen dépasse 4, ou si le détail ajouté dépasse ×4. Pire valeur mesurée : 0,513, 3,35 et ×3,26. Ces seuils auraient arrêté Topaz sur le visage (×5,29) et Real-ESRGAN sur les aplats (0,381 et ×9,24).

### Choix de Walid

**Topaz High Fidelity V2**, choisi par Walid le 04/11/2026 après comparaison des gros plans : « le meilleur est toujours Topaz High Fidelity V2 ». Son œil l'emporte sur les mesures, qui recommandaient Lanczos ou Recraft.

- Coût : 0,05 $ par œuvre jusqu'à 24 MP de sortie (4 000 px sur le grand côté en 3:4 font 12 MP). Un seul agrandissement sert à la toile et au poster.
- Durée : 15 à 19 s de calcul par image sur le banc.
- À garder en tête : c'est l'outil qui ajoute le plus de détail sur un visage (×3,4 face à la vraie image). Le site peut donc montrer de près des détails absents de l'impression, faite avec les fichiers de Walid.

Seuil d'alerte retenu pour le ticket 16, provisoire, à recaler sur plus d'œuvres : alerte si le SSIM de la pire zone passe sous 0,42, si le ΔE moyen dépasse 3,3, ou si le détail ajouté dépasse ×6,5. Pire valeur mesurée pour Topaz : 0,482, 2,73 et ×5,29.
