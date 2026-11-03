# 04: Une seule règle pour reconnaître une fiche d'œuvre

**What to build:** aujourd'hui, le thème vérifie à une dizaine d'endroits si un produit est une toile ou un poster, d'après son modèle de page : boutons d'ajout au panier, tiroir du panier, grille des collections, section produit. La nouvelle fiche aura son propre modèle de page. Une seule règle, à un seul endroit, doit dire « ce produit est une œuvre (toile ou poster) », pour que l'ajout de la nouvelle fiche tienne en une modification. Au passage, corriger le test de la grille des collections qui utilise un `else if`, que Liquid ne connaît pas. Aucun changement visible. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Tous les endroits qui testent le modèle de page des toiles et des posters passent par la même règle.
- [ ] Ajouter un modèle de page à la liste des œuvres ne demande qu'une modification.
- [ ] Le test invalide de la grille des collections est corrigé.
- [ ] Fiches toile et poster, panier, tiroir et collections identiques avant et après, vérifiés en ligne.
