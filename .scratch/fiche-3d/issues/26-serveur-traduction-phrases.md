# 26 : Serveur — les phrases des couleurs traduites la nuit

**Dépôt :** `MyselfMonArt_Backend` (pas le thème).

**What to build:** les textes des couleurs d'un produit (`artwork.color_text_1`, `_2`, `_3`, écrits en français par le ticket 25) sont traduits la nuit avec le reste de la fiche, en anglais, espagnol, allemand et néerlandais (et dans la variante `en-UK` si elle traduit les mêmes champs).

Aujourd'hui, la traduction de nuit des produits (`TranslateProduct`, 03 h 30) ne couvre qu'une liste fermée de champs. Le seul métachamp traduit est `title.short` : s'en servir comme modèle (lecture du champ et test « à traduire ? », clé dans le schéma demandé à l'IA, envoi de la traduction).

Règles pour la traduction :
- Garder la forme : une première phrase « couleur : effet. », puis une ou deux phrases courtes.
- Le nom de la couleur reste un nom simple dans chaque langue.
- `artwork.colors` ne se traduit pas : c'est une liste de références, et les libellés des couleurs sont déjà traduits ailleurs.

**Blocked by:** 25

**Status:** ready-for-agent

- [ ] Un produit dont les textes des couleurs sont nouveaux ou ont changé est repris par la traduction de nuit ; un produit déjà traduit ne l'est pas de nouveau (pas de boucle : voir la correction du 17/11 sur les collections retraduites chaque nuit).
- [ ] Les trois textes arrivent dans les quatre langues, avec leur forme.
- [ ] Un produit sans textes de couleurs se traduit comme avant.
- [ ] Les tests n'appellent ni l'IA ni Shopify pour de vrai.
