# 07: Nouvelle fiche : la toile en 3D

**What to build:** le premier tracé de la nouvelle fiche, sur une toile de test non publiée, prévisualisée depuis l'admin. Un nouveau modèle de page pour les œuvres réutilise les blocs actuels (titre, avis Trustpilot, options, achat, description, onglets, FAQ) et remplace la galerie par la 3D three.js validée au prototype.
- La vraie image s'affiche d'abord, puis la 3D la remplace en fondu, sans décaler la page.
- La toile est de face sur un mur clair, avec la bordure choisie et une légère inclinaison au doigt, qui laisse défiler la page.
- Sur mobile, une barre fixe (prix et « Ajouter au panier ») reste visible. Sur ordinateur, le bouton est visible dès l'arrivée et la 3D reste fixe pendant qu'on parcourt les options.
- Le moteur 3D est un module que le serveur réutilisera pour les photos (ticket 08).

Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 02 (prototype validé), 04 (règle unique des fiches d'œuvre), 05 (options et événement de choix)

**Status:** ready-for-agent

- [ ] Le modèle de page fait partie des œuvres, grâce à la règle du ticket 04 : le panier, le tiroir et les collections le traitent comme une toile.
- [ ] Sur mobile, le tableau s'affiche en moins de 2,5 s (0,99 s aujourd'hui), sans aucun décalage de page, avec des interactions de moins de 200 ms et un score Lighthouse ≥ 90.
- [ ] La 3D suit les choix grâce à l'événement du ticket 05 ; le prix et le bouton changent au clic, sans attendre l'animation.
- [ ] Animations réduites, appareil faible ou 3D indisponible : photos et simples fondus.
- [ ] Un doigt posé sur la 3D peut toujours faire défiler la page.
- [ ] Le moteur rend la même scène dans la page et hors de la page, à l'identique.
- [ ] Les textes de la 3D sont traduits ; aucun libellé n'est écrit en dur.
