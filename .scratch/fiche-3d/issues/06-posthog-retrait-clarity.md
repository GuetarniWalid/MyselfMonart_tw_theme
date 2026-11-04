# 06: PostHog en place, Clarity retiré

**What to build:** PostHog mesure la boutique dès maintenant, sur les fiches actuelles, pour disposer d'une base de comparaison avant la nouvelle fiche. L'organisation MyselfMonArt existe depuis le 04/11, dans le compte PostHog existant de Walid (région Europe, projet 334087 encore nommé « Default project ») : c'est un choix de Walid, plus simple qu'un compte team@. Elle est séparée de Made By Mood et a sa propre offre gratuite, vérifiée : 1 projet, 1 million d'événements et 5 000 enregistrements de visites par mois. La bannière cookies garde l'acceptation automatique, par choix de Walid. Une fois PostHog en marche, Clarity est retiré. Contexte : README du dossier `fiche-3d`.

Ce que fait Walid : la désinstallation de l'application Clarity.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Claude lit le nouveau projet par le connecteur.
- [x] PostHog se charge sans ralentir l'affichage des pages.
- [x] Événements suivis : vue de fiche, choix d'option, ajout au panier, clic sur la barre d'achat. Enregistrements de visites échantillonnés sur les fiches.
- [x] Réglages protecteurs : champs de saisie masqués, adresses IP non conservées.
- [ ] Un premier tableau de bord : visites des fiches, ajouts au panier et commandes, par appareil.
- [ ] Clarity désactivé dans le thème, puis désinstallé par Walid.

## Notes de réalisation

**Fait (04/11), en ligne (commits 1fc9f0e et 428dc0d).** `snippets/posthog.liquid`, rendu par `head-base`, porte le jeton, l'hôte Europe et le taux d'enregistrement. La logique est dans `assets/posthog-tracking.js`, testée par `scripts/posthog-tracking.test.cjs`. La fiche se décrit dans `#product-tracking-json` (`sections/main-product.liquid`), que la bascule toile/poster remplace avec le reste. Les 4 chemins d'ajout au panier annoncent leur réussite par `mma:cart-add`.

**Chargement.** La bibliothèque pèse 119 Ko compressés et l'enregistreur 69 Ko, contre 26 Ko pour Clarity. PostHog ne se charge donc que s'il y a quelque chose à envoyer (une fiche, ou un ajout au panier ailleurs), après un vrai geste, la fin du chargement, le repos du navigateur et le consentement. Ce que cela implique :
- Une vue de fiche est une vue avec au moins un geste. Les chiffres ne se comparent pas directement à GA4 ou à Shopify.
- PostHog voit l'entrée de session à la 1re fiche, pas à la collection d'arrivée. GA4 reste la référence pour les sources de trafic.
- Lighthouse ne déclenche aucun geste : il ne voit pas PostHog.

**Événements.** `product_viewed` (à chaque bascule aussi), `product_option_selected` (`option`, `option_value`), `floating_buy_button_clicked`, `product_added_to_cart` (`source` : main, float, bundle ou studio ; `quantity`, `value`). Tous portent `currency`. Les trois événements de fiche portent le produit, le type (`product_kind`), la variante, le prix et les options. Rien d'autre ne part : ni pages vues, ni clics automatiques. Le texte libre des lignes de panier ne part jamais.

**Projet « Boutique » (334087).** Onboarding passé. Domaines autorisés, pour la barre d'outils et les enregistrements : `https://www.myselfmonart.com` et `https://myselfmonart.com`. Adresses IP non conservées. Capture automatique, cartes de chaleur, clics morts, signaux web, erreurs, console et mesures réseau coupés. Enregistrements activés : 10 s minimum, champs de saisie masqués, lignes du panier (`cart-item`) bloquées, car elles contiennent des prénoms et des aperçus. Fuseau (UTC) et devise (USD) laissés par défaut.

**Enregistrements.** Fiches toile et poster seulement, jamais les personnalisés, à cause des photos et des prénoms. Le taux de 25 % est dans le snippet, pas dans PostHog : PostHog chargerait l'enregistreur et le ferait tourner chez tout le monde avant de tirer au sort (vérifié dans son code). Le champ de taux reste donc vide dans le projet : ne pas le remplir, les deux taux se multiplieraient.

**Budget.** Relevé GA4 du 04/11. Les 36 000 sessions annoncées sont la moyenne de ces trois périodes : le trafic réel vient par vagues.

| Période | Sessions | Dont direct | Sur une fiche |
|---|---|---|---|
| Août | 8 879 | | |
| Septembre | 90 461 | 83 863 (93 %) | 65 384 |
| 5 oct. au 1er nov. (28 jours) | 7 010 | 2 811 | 4 430 |

- Événements (quota de 1 million) : 4 750 sessions sur fiche par mois × 3 événements ≈ 14 000, soit 1,4 %. Même une vague comme septembre, si tous ses robots passaient, resterait sous 80 000, soit 8 %.
- Enregistrements (quota de 5 000) : 3 500 humains sur fiche par mois × 25 % × 70 % de visites de plus de 10 s (estimation) ≈ 600, soit 12 %, et 1 800 si Noël triple le trafic. Sans geste, une vague de robots n'enregistre rien. Si elle passait quand même : 65 000 × 25 % ≈ 16 000, quota atteint en 9 jours environ, PostHog s'arrêterait sans facturer.

**Commandes.** Le thème ne voit pas le paiement. Sans pixel, le tableau de bord montre les fiches et les ajouts au panier, pas les commandes. Il faudrait un pixel personnalisé dans l'admin (Réglages > Événements clients), abonné à `checkout_completed`, qui envoie `order_completed` à PostHog avec `distinct_id` et `$sesid`, lus dans le cookie `ph_<jeton>_posthog`. Non créé.

**Consentement.** Refusé, rien ne se charge ; retiré après coup, PostHog cesse de capter et d'enregistrer. Aujourd'hui un refus ne dure qu'une page : `shouldShowBanner()` reste vrai après un choix, et la bannière réaccepte tout à la page suivante.

**Essai réel, avant déploiement.** Script injecté dans un onglet sur la fiche Bonsaï en ligne :
- Rien avant un geste, rien sur une collection, rien avec un refus sur la vraie API Shopify.
- Après un geste : 1 vue, 1 choix par clic, 1 vue par bascule sans doublon, clic flottant et ajout au panier d'après la vraie réponse de `/cart/add.js`.
- Arrivés dans le projet, avec `$ip` vide et aucun événement parasite. Ces événements de test restent dans le projet, avec 1 enregistrement.
- Non testés en réel : `#product-tracking-json` rendu par le Liquid, et `mma:cart-add` émis par les fichiers du thème, reproduit par un harnais.

**Défaut déjà en ligne, trouvé pendant l'essai, non corrigé.** Le bouton flottant vit sur `<body>`, la bascule ne le remplace pas : s'il a été créé avant la bascule, il reste rattaché à l'ancienne fiche.
- Jusqu'au choix suivant, il affiche et ajoute l'autre produit : vu « Commander 94 € » sur un poster à 24,90 €.
- Ses propriétés de ligne restent vides, même après un choix : un poster « Cadre chêne clair » est entré au panier sans couleur ni contour blanc, alors que le bouton principal aurait envoyé `Couleur du cadre` et `Contour blanc`.

**Vérifié en ligne le 04/11.** Sur la fiche poster du Bonsaï : rien ne se charge avant un geste ; après un vrai clic, `product_viewed`, `product_option_selected` et `product_added_to_cart` (source main, 47,90 EUR, propriétés de ligne présentes) arrivent dans le projet, et `#product-tracking-json` est rendu par le thème. Clarity n'est plus chargé. Les premiers événements viennent tous de nos essais (`$browser: Claude`) : l'arrivée de vrais visiteurs reste à constater.

**Tableau de bord** : https://eu.posthog.com/project/334087/dashboard/1083520 (9 tuiles, sans commandes). Seul `Desktop` remonte pour l'instant.

**Reste** : désinstallation de Clarity par Walid, accès du connecteur à l'organisation, pixel de commandes dans l'admin si Walid le veut.
