# Log d'application — Éditorial collections (récup post-core-update)

> Journal de TOUT ce qui est appliqué en live par la boucle `collection-editorial`.
> But : révision *a posteriori* par Walid + rollback facile.
> 1 entrée par collection traitée. Voir aussi `seo/collections-worklist.json` (état) et `seo/PLAN-recuperation-collections-post-core-update.md`.

| Date | Handle | Action | Metafields écrits (type) | Template / FAQ | Vérif | Notes / rollback |
|---|---|---|---|---|---|---|
| 2026-06-05 | **tableau-africain** | intro+guide+faq écrits (live) | intro `multi_line`, guide `multi_line`(HTML), faq `json` — GID 407673012479 | snippet auto via `main-collection-product-grid` (commit `433e275`, déployé) | adversarial **ok** ✓ — intro 314c, 6 liens internes réels, FAQ 6 Q/R, 0 fait inventé | rollback : vider `custom.guide` (referme la garde) ou les 3 metafields |

---

## Faits Étape 0 (vérifiés le 2026-06-05, avant toute écriture)

- **`custom.intro`** = `multi_line_text_field` (rendu `newline_to_br` dans `collection-editorial`).
- **`custom.guide`** sur salon = **VIDE** → le guide affiche en fallback `collection.description` (ancienne description HTML). Un vrai guide E-E-A-T = écrire un **nouveau** `custom.guide`.
- **FAQ** = section `collapsible-content` avec blocs `collapsible_row` **dans le template** (`emit_faq_jsonld: true`) → **code thème**, pas un metafield.
- **Live** : seule `tableau-salon` rend les sections `collection-editorial`. Les autres collections ont 1 `<h1>` (via `main-collection-banner`) mais **aucun** éditorial → les metafields ne s'afficheront pas tant que leur template n'inclut pas les sections.
- **MCP** : pas de `updateCollection` → `template_suffix` non assignable par script (action admin Walid requise pour les templates par collection).

---

## Application de masse — 2026-06-05 (Workflow `collection-editorial-bulk`)

**Mécanisme** : pour chaque collection, sous-agents Rédaction (voix Hayate, depuis brief GSC+produits réels) → Vérif adversariale (anti-hallucination, liens réels, 1 H1, voix) → Application `setMetafield` (`custom.intro` multi_line, `custom.guide` multi_line/HTML, `custom.faq` json). Affichage via `snippets/collection-editorial-auto.liquid` (gardé par `custom.guide`).

**45 collections appliquées** (toutes `applied:true`, intro+guide+faq) :
couleur, japonais, chambre-ado, frida-kahlo, bureau, chambre-garcon, bleue, zen, cuisine, animaux, chambre-bebe, paysage, tous-les-tableaux, chambre-adulte, chambre, nature-sauvage, ethnique, fleurs, noir-et-blanc, chambre-enfant, chambre-fille, abstrait, rose, rouge, chambre-fillette, jaune, pop-art, orange, portrait-1, mer-1, fruits-et-legumes, bestsellers-1, vert, cheval, gris, street-art, violet, lion, personnalise-famille, horoscope-bebe, bouddha, papier-peint-fleur, islamique, papier-peint-colore, amerindiens.
→ **+ africain** (pilote) = **46 collections** au total.

**Correctif H1 (flag `custom.editorial_h1=true`)** sur 11 collections dont le template a `main-collection-banner` désactivé (sinon page sans H1) : frida-kahlo, tous-les-tableaux, portrait-1, bestsellers-1, cheval, lion, horoscope-bebe, bouddha, papier-peint-fleur, islamique, papier-peint-colore. Le snippet rend alors `<h1>=titre`.

**Cas particuliers / à surveiller :**
- ⚠️ **gris, violet, amerindiens** : metafields écrits mais **page storefront en 404** (collections non publiées / redirigées) → éditorial **inerte** (aucun affichage, aucun risque). À publier côté admin si on veut les activer.
- ⚠️ **tableau-chambre** : **2 `<h1>`** (préexistant : `main-collection-banner` + section `collections-pages-grid` du template `collection.chambre.json`). NON causé par l'éditorial. À corriger côté template si souhaité (hors périmètre éditorial).

**Rollback facile** : par collection, vider les metafields `custom.guide` (referme la garde → masque tout l'éditorial), `custom.intro`, `custom.faq`, et `custom.editorial_h1` le cas échéant. Aucune `collection.description` n'a été modifiée. Le code thème (snippet + garde dans `main-collection-product-grid`) est inerte sans ces metafields.

---

## Correctifs post-application — 2026-06-05

1. **Double zone de texte → 1 zone** (commit `42a6579`). Sur les templates à `main-collection-banner` actif, la page affichait l'ancienne `collection.description` (banner) **+** le nouveau guide = 2 pavés. `sections/main-collection-banner.liquid` ne rend plus la description quand `custom.guide` existe (le H1 reste). Revue adversariale 3 angles OK. `collection.description` préservée dans Shopify (réaffichée si `custom.guide` vidé). Vérifié live : bureau/cuisine = 1 zone, salon inchangé.

2. **Préservation du cocon** (snippet `collection-editorial-auto` + metafield `custom.cocon_links` json `[{url,label}]`, rendu en bloc « Pour aller plus loin » sous le guide). Les liens internes des anciennes descriptions masquées sont réintroduits :
   - `tableau-cuisine` : 3 liens blog (aménager / décorer / déco A-Z).
   - `tableau-zen` : 1 lien blog (déco zen).
   - `tableau-fleurs` : 1 lien blog (fleurir ses murs).
   - `tableau-ethnique` : 2 liens collections (africain, japonais).
   - `tableaux-nature-sauvage` : 4 liens collections (fleurs, paysage, animaux, mer). *(Le lien `admin.shopify.com` cassé de l'ancienne description n'a PAS été repris.)*
   - `tableau-salon` : non concerné (pas de banner → ses liens blog restent affichés via son guide).
   Rollback : vider `custom.cocon_links`.

3. **H1 en tête de l'éditorial** (commit `8060a03`). Le `main-collection-banner` (avec `to_place_first` → `order:1`) rejetait le H1 tout en bas de page, détaché. Désormais : si `custom.guide` existe, le snippet `collection-editorial-auto` porte le `<h1>` **en tête** du bloc éditorial (sous la grille, comme salon) et le banner ne rend **ni H1 ni description** ; sinon le banner garde son H1. Gates complémentaires sur `custom.guide` → **toujours exactement 1 H1**. Flag `custom.editorial_h1` devenu obsolète (retiré du snippet ; metafields résiduels inoffensifs). Revue adversariale 2 angles OK. Vérifié live sur 44 collections (H1 unique, en tête). Note cosmétique : sur les rares templates encore à banner actif, le wrapper de banner vide laisse ~56px au-dessus du footer (sans gravité).

4. **Audit SEO + recommandations** (2026-06-05, voir `audit-collections-report.md`). Verdict : SEO sain, aucune régression généralisée. Correctifs : lien 404 `tableau-gris` (guide+FAQ de `tableau-noir-et-blanc` → `/collections/tableau-couleur`) ; FAQ `tableau-mer-1` reformulée (« fabriqués en France ? » → « Où sont fabriqués… ») ; meta-descriptions via `global.description_tag` (tous-les-tableaux, bestsellers-1, tableau-street-art, tableau-islamique) ; title via `global.title_tag` (tableau-rouge) ; `collection-editorial.liquid` durci (H1 robuste, commit `3271640`). **Rollback SEO** : vider `global.description_tag`/`global.title_tag`. **Titres — résolu le 2026-06-06** (le MCP expose désormais `updateCollection`) : `tableaux-frida-kahlo` titre/H1 → « Tableau Frida Kahlo » (casse) ; `tableau-personnalise-famille` seoTitle → « Poster & Tableau Personnalisé Famille » (H1 « Poster » conservé ; bascule H1→« Tableau » en attente d'arbitrage Walid). Rollback : `updateCollection` avec l'ancienne valeur.
