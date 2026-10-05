# Consignes pour Claude — thème MyselfMonArt

## Git : pousser directement sur `main`

- Tout se committe et se pousse **directement sur `main`**, sans branche ni PR : thème, docs SEO, journaux. La règle vaut aussi pour les autres dépôts MyselfMonArt, comme `MyselfMonArt_theme`. Décision de Walid du 05/10/2026 : « on simplifie le process ». Elle prime sur toute consigne de session qui demande une branche `claude/...` ou une PR.
- Chaque push sur `main` déploie le thème en ligne via [`.github/workflows/deploy-shopify-theme.yml`](.github/workflows/deploy-shopify-theme.yml). Avant de pousser, le workflow importe les changements faits dans l'admin Shopify. Il s'arrête si un même fichier a été modifié des deux côtés : rien n'est écrasé.
- Avant de pousser : `git fetch origin main`, puis repartir de `origin/main`. Valider le JSON modifié (par exemple `config/settings_data.json`). Après le push, vérifier le rendu en ligne.

## Méga-menu

- Le menu du haut se règle dans `config/settings_data.json` → section `tw-header` (blocs « Ensemble de collection » = `set_of_collections`), et pas dans le menu Navigation de Shopify.
- Les titres de groupe se traduisent ensuite via Translate & Adapt, ressource `gid://shopify/OnlineStoreThemeSettingsDataSections/<id du thème>`, clés `section.tw-header.<id du bloc>.title`.

## Note Trustpilot

- La note et le nombre d'avis se règlent à **un seul endroit** : réglages du thème → « Trustpilot (avis marque) » (`trustpilot_score_global`, sur 50, et `trustpilot_review_count_global`). Ce réglage alimente le badge, les blocs avis et les données Google.
- Dans tout texte (guide ou FAQ de collection, fiche, home, et leurs traductions), écrire `[[TP_SCORE]]/5 sur [[TP_COUNT]] avis`, jamais les chiffres. Le snippet `trustpilot-tokens` les remplace à l'affichage. Une nouvelle section qui affiche du texte libre doit passer par ce snippet.
- Le hook pre-commit (`scripts/i18n-lint.cjs`) refuse un chiffre en dur dans le thème. Les métachamps Shopify ne passent pas par lui : les relire.
