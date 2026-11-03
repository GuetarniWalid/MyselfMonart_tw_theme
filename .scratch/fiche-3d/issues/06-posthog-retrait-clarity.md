# 06: PostHog en place, Clarity retiré

**What to build:** PostHog mesure la boutique dès maintenant, sur les fiches actuelles, pour disposer d'une base de comparaison avant la nouvelle fiche. Walid ouvre lui-même un compte PostHog avec team@myselfmonart.com : l'offre gratuite donne 1 projet, 1 million d'événements et 5 000 enregistrements de visites par mois. Il y invite ensuite son compte PostHog actuel (celui de Made By Mood), pour que le connecteur de Claude lise le nouveau projet. La bannière cookies garde l'acceptation automatique, par choix de Walid. Une fois PostHog en marche, Clarity est retiré. Contexte : README du dossier `fiche-3d`.

Ce que fait Walid : l'inscription, avec la région indiquée par l'agent ; l'invitation de son compte actuel ; la désinstallation de l'application Clarity.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Le nouveau compte est dans la même région que le compte actuel, et Claude lit le nouveau projet par le connecteur.
- [ ] PostHog se charge sans ralentir l'affichage des pages.
- [ ] Événements suivis : vue de fiche, choix d'option, ajout au panier, clic sur la barre d'achat. Enregistrements de visites échantillonnés sur les fiches.
- [ ] Réglages protecteurs : champs de saisie masqués, adresses IP non conservées.
- [ ] Un premier tableau de bord : visites des fiches, ajouts au panier et commandes, par appareil.
- [ ] Clarity désactivé dans le thème, puis désinstallé par Walid.
