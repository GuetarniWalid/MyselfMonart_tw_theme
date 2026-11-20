# 26 : Serveur — les phrases des couleurs traduites la nuit

**Dépôt :** `MyselfMonArt_Backend` (pas le thème).

**What to build:** les textes des couleurs d'un produit (`artwork.color_text_1`, `_2`, `_3`, écrits en français par le ticket 25) sont traduits la nuit avec le reste de la fiche, en anglais, espagnol, allemand et néerlandais (et dans la variante `en-UK` si elle traduit les mêmes champs).

Aujourd'hui, la traduction de nuit des produits (`TranslateProduct`, 03 h 30) ne couvre qu'une liste fermée de champs. Le seul métachamp traduit est `title.short` : s'en servir comme modèle (lecture du champ et test « à traduire ? », clé dans le schéma demandé à l'IA, envoi de la traduction).

Règles pour la traduction :
- Garder la forme : une première phrase « couleur : effet. », puis une ou deux phrases courtes.
- Le nom de la couleur reste un nom simple dans chaque langue.
- `artwork.colors` ne se traduit pas : c'est une liste de références, et les libellés des couleurs sont déjà traduits ailleurs.

**Blocked by:** 25

**Status:** done, en service le 20/11/2026 à 15 h 31 (dépôt du backend : `0bfa2ec` les tests de la nuit des produits, `7a96c89` la traduction des textes). À contrôler après la première nuit.

**Vérifié le 20/11 sur le serveur, en lecture seule (`traductions-perimees`, passe `product-de`) :** la requête des produits passe (coût 200 à 222 points par page), et la nuit prendra les deux Superman avec leurs trois textes, chacun avec l'empreinte de Shopify : Shopify les tient donc pour traduisibles. Métachamps : toile `Metafield/73194557210971`, `73194557243739`, `73194557276507` ; poster `Metafield/73194561306971`, `73194561339739`, `73194561372507`.

**À contrôler :**
- après 03 h 30 : `traductions-relire` avec ces six identifiants dans « passes » : les textes en quatre langues, `outdated` à `false`, et leur forme (« couleur : effet. » puis une ou deux phrases) ;
- le lendemain : `traductions-perimees product-de` sans `colorTexts`, et `journaux-openai` sans renvoi.

**Choix du sous-agent, gardés :** seul un texte rendu en français par l'IA est retenu dans le cache (comme les cinq autres tâches de nuit) ; une réponse vide ou un refus de Shopify est réessayé la nuit suivante. Rien pour `en-UK` : ces textes n'ont que la traduction de base, comme le titre court.

**Vu en passant, pas corrigé :** trois produits repartent chaque nuit en allemand pour le seul nom d'option « Format » (identique dans les deux langues, donc jamais posé) : `Product/9257365963099`, `9404799779163`, `9738520854875`. De même, un titre court rendu identique par l'IA repart chaque nuit. Coût : quelques petits appels par nuit.

- [ ] Un produit dont les textes des couleurs sont nouveaux ou ont changé est repris par la traduction de nuit ; un produit déjà traduit ne l'est pas de nouveau (pas de boucle : voir la correction du 17/11 sur les collections retraduites chaque nuit).
- [ ] Les trois textes arrivent dans les quatre langues, avec leur forme.
- [x] Un produit sans textes de couleurs se traduit comme avant. (tests, et comparaison de l'ancien et du nouveau code sur cinq boutiques d'essai)
- [x] Les tests n'appellent ni l'IA ni Shopify pour de vrai.
