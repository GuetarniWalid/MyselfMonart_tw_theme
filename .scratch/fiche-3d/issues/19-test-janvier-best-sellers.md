# 19: Janvier : test sur la moitié des best-sellers

**What to build:** à partir de janvier 2027, la moitié des best-sellers en toile et en poster passe sur la nouvelle fiche. Les deux moitiés sont tirées au hasard parmi des paires comparables. Le serveur rend leurs photos et leurs images de variantes à partir de leur image à plat existante (leur 2e image) ; leurs photos actuelles restent, complétées par les rendus. Après 3 semaines, on compare les ajouts au panier et les commandes avec l'autre moitié, puis Walid tranche. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 18 (mise en ligne pour les nouveaux produits) ; pas avant janvier 2027

**Status:** ready-for-agent

- [ ] Les groupes sont comparables (ventes, type, format) et choisis avant la bascule.
- [ ] La bascule se défait en un geste, en revenant à l'ancien modèle de page.
- [ ] Bilan après 3 semaines : ajouts au panier et commandes, par appareil. La décision de Walid est écrite dans le ticket.
