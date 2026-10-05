# Consignes pour Claude — thème MyselfMonArt

## Git : pousser directement sur `main`

- Les modifications du thème se committent et se poussent **directement sur `main`**, sans branche ni PR (décision de Walid, 05/10/2026 : « on simplifie le process »).
- Chaque push sur `main` déploie le thème en ligne via [`.github/workflows/deploy-shopify-theme.yml`](.github/workflows/deploy-shopify-theme.yml). Avant de pousser, le workflow importe les changements faits dans l'admin Shopify. Il s'arrête si un même fichier a été modifié des deux côtés : rien n'est écrasé.
- Avant de pousser : `git fetch origin main`, puis repartir de `origin/main`. Valider le JSON modifié (par exemple `config/settings_data.json`). Après le push, vérifier le rendu en ligne.

## Méga-menu

- Le menu du haut se règle dans `config/settings_data.json` → section `tw-header` (blocs « Ensemble de collection » = `set_of_collections`), et pas dans le menu Navigation de Shopify.
- Les titres de groupe se traduisent ensuite via Translate & Adapt, ressource `gid://shopify/OnlineStoreThemeSettingsDataSections/<id du thème>`, clés `section.tw-header.<id du bloc>.title`.
