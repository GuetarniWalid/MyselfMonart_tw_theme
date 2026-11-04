# 06: PostHog en place, Clarity retiré

**What to build:** PostHog mesure la boutique dès maintenant, sur les fiches actuelles, pour disposer d'une base de comparaison avant la nouvelle fiche. L'organisation MyselfMonArt existe depuis le 04/11, dans le compte PostHog existant de Walid (région Europe, projet 334087 encore nommé « Default project ») : c'est un choix de Walid, plus simple qu'un compte team@. Elle est séparée de Made By Mood et a sa propre offre gratuite, vérifiée : 1 projet, 1 million d'événements et 5 000 enregistrements de visites par mois. La bannière cookies garde l'acceptation automatique, par choix de Walid. Une fois PostHog en marche, Clarity est retiré. Contexte : README du dossier `fiche-3d`.

Ce que fait Walid : la désinstallation de l'application Clarity.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Claude lit le nouveau projet par le connecteur.
- [ ] PostHog se charge sans ralentir l'affichage des pages.
- [ ] Événements suivis : vue de fiche, choix d'option, ajout au panier, clic sur la barre d'achat. Enregistrements de visites échantillonnés sur les fiches.
- [ ] Réglages protecteurs : champs de saisie masqués, adresses IP non conservées.
- [ ] Un premier tableau de bord : visites des fiches, ajouts au panier et commandes, par appareil.
- [ ] Clarity désactivé dans le thème, puis désinstallé par Walid.
