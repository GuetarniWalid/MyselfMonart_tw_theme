# Audit SEO — collections enrichies (post Core Update déc. 2025)

**Date** : 2026-06-05 · **Périmètre** : 44 collections publiées enrichies de l'éditorial metafield-first (intro + guide + FAQ + JSON-LD). Méthode : collecte de signaux live (44 pages) + vérif HTTP des 105 liens internes + Workflow d'audit adversarial 5 dimensions + synthèse.

## Verdict : ✅ SEO globalement SAIN — aucune régression généralisée

Toutes les régressions redoutées sont **réfutées** par les données + le live :
- **44/44 indexables** (`noindex=false`), **canonical** self-référent correct partout.
- **44/44 JSON-LD valide** (FAQPage + ItemList + BreadcrumbList présents et bien formés, vérifié en live).
- **44/44 `guide` rendu en HTML** (jamais échappé/affiché en texte brut) → le masquage de `collection.description` n'a cassé aucun rendu.
- **44/44 ont exactement 1 H1** pertinent (mot-clé), en tête de l'éditorial. *(salon inclus — voir faux positif ci-dessous.)*
- **Maillage 100% interne** (104/105 liens en 200), aucun lien externe ni `admin.shopify.com`.
- **Contenu anti-hallucination conforme** : 0 « Made in France » sur les guides échantillonnés (origine = « conçu en France / imprimé en Europe »), chiffres dans le set autorisé, guides **uniques** par collection (pas de copier-coller hormis la phrase matériaux + bloc « pourquoi nous », attendus).

## Points corrigés (causés par notre travail)
| # | Collection | Problème | Correctif | Statut |
|---|---|---|---|---|
| 1 | tableau-noir-et-blanc | lien `/collections/tableau-gris` (404 non publiée) dans le **guide** | href → `/collections/tableau-couleur` | ✅ corrigé |
| 2 | tableau-noir-et-blanc | même lien 404 dans une **réponse FAQ** | lien → `tableau coloré` /tableau-couleur | ✅ corrigé |
| 3 | tableau-mer-1 | question FAQ « Vos tableaux sont-ils **fabriqués en France** ? » (réponse déjà conforme) | question → « Où sont fabriqués vos tableaux ? » | ✅ corrigé |

→ Après correctifs : **0 lien cassé**, **0 occurrence de « fabriqués/made in France »** dans les questions/affirmations.

## Faux positifs / non-problèmes (vérifiés)
- **tableau-salon « sans H1 »** (signalé blocker par l'audit) = **FAUX POSITIF**. Vérif live multi-ligne : `<h1>Tableau Salon</h1>` bien présent. Cause du faux positif : glitch de fetch dans la collecte + H1 multi-ligne invisible à un regex mono-ligne + WebFetch non fiable sur les Hn. Salon est sain.
- **tableau-chambre « 2 H1 »** (préexistant) = **résolu** : le masquage de `collection.description` (qui contenait un `<h1>`) a ramené la page à 1 seul H1.
- **cocon sans lien blog** (ethnique, nature-sauvage) = **normal** : leurs anciennes descriptions n'avaient que des liens collections (pas d'article), c'est ce qui a été préservé.

## Recommandations (préexistant / champs admin — hors éditorial)
- **Meta descriptions absentes** : `tous-les-tableaux`, `bestsellers-1`, `tableau-street-art`, `tableau-islamique` → à renseigner dans l'admin Shopify (SEO). Préexistant.
- **Title `tableau-rouge`** = « ableau Rouge… » (T manquant) → corriger le title SEO dans l'admin. Préexistant.
- **Casse** : `tableaux-frida-kahlo` H1 « Tableau Frida kahlo » (→ « Kahlo ») ; `tableau-personnalise-famille` dit « Poster » là où la requête est « tableau ». Champs `collection.title` (admin).
- **Polish mineur** : guide de `tableau-noir-et-blanc` — l'ancre « tableaux gris » pointe désormais vers /tableau-couleur (lien **valide**, libellé à aligner si on veut « tableaux colorés »).
- **Robustesse (fragilité latente)** : dans `sections/collection-editorial.liquid` (utilisé par le template salon), le `<h1>` (mode intro `show_title`) est conditionné à `content != blank`. Si le `custom.intro` était vidé, salon perdrait son H1 silencieusement. Reco : émettre le H1 dès `show_title`, indépendamment du contenu d'accroche. (Non urgent — salon a son intro aujourd'hui.)

## Note cache
Après écriture d'un metafield, le `page_cache` Shopify de l'URL par défaut peut servir l'ancien rendu quelques minutes (TTL) ; les correctifs sont prouvés via rendus frais (cache-bust `?country=`). Convergence automatique.
