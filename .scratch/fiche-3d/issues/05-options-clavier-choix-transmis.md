# 05: Options au clavier, choix transmis

**What to build:** les options de la fiche (taille, bordure, cadre, couleur du cadre, contour blanc) reposent sur des boutons radio cachés : impossible de les choisir au clavier. Et un changement d'option n'envoie aucun signal propre : chaque composant relit la page de son côté. Après ce ticket, chaque option se choisit au clavier avec un focus visible. Chaque choix envoie un seul événement qui donne la variante et toutes les options, couleur du cadre et contour blanc compris. L'adresse de la page suit la variante choisie, pour un lien partageable. Les fiches actuelles en profitent sans changer visuellement. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Toutes les options se choisissent au clavier, avec un focus visible, et sont annoncées par un lecteur d'écran.
- [ ] Un événement unique et documenté à chaque choix : variante, options, couleur du cadre, contour blanc.
- [ ] L'adresse de la page suit la variante ; un lien partagé rouvre la même variante, avec le même prix dans le bouton.
- [ ] La 3D actuelle, le bouton flottant et les prix fonctionnent toujours, vérifiés en ligne sur une toile et un poster.
