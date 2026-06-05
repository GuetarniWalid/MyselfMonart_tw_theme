# PLAN — Récupération SEO des collections (post Google Core Update déc. 2025)

> **Document de passation.** Rédigé par l'agent « diagnostic » pour un **autre agent exécutant** (afin de ne pas surcharger le contexte du diagnostic). Tout le contexte nécessaire est ici ou pointé en mémoire. **Langue : FR. Voix éditoriale : Hayate.**

---

## 0. TL;DR (pour l'exécutant)

- **Quoi** : enrichir chaque page collection d'un **éditorial unique, E-E-A-T, ciblé mots-clés** (accroche `intro` + guide profond `guide`), pour récupérer le trafic perdu suite au **Google December 2025 Core Update** (qui a rétrogradé les pages commerciales ; le blog éditorial, lui, a tenu).
- **Comment** : la section `sections/collection-editorial.liquid` existe déjà et est **metafield-first**. Le travail par collection = **générer le contenu et l'écrire dans `collection.metafields.custom.intro` + `custom.guide`**. La section affiche le reste automatiquement.
- **Automatisation** : **1 Workflow = 1 collection** (recherche → rédaction → vérif anti-hallucination → **application**), **piloté par une boucle `/loop`** qui enchaîne toutes les collections de la worklist. **Application directe, SANS validation humaine préalable** (décision Walid 2026-06-05) : le workflow génère **ET applique** (écrit les metafields + déploie) collection par collection, bout-en-bout. Walid vérifie **a posteriori** ; petites erreurs tolérées (corrigées ensuite). La **vérif anti-hallucination reste automatisée** (phase Vérif du workflow).
- **NE PAS** : inventer des faits (avis, chiffres, « Made in France ») ; toucher au style/couleurs/largeurs non demandés ; réécrire `collection.description` (on la préserve).

---

## 1. Contexte & objectif (pourquoi ce plan)

**Diagnostic établi (triangulé GSC + GA4 + code + calendrier Google), voir mémoire `[[project-web-collections-regression-jan2026]]`** :
- Le trafic **Organic Search a chuté ~−43 % en janvier 2026** (GA4 : ≈4000→2300 sessions/mois, soutenu), **spécifiquement** (le Direct n'a pas baissé) → c'est un problème SEO, pas un bug ni le site.
- Cause = **Google December 2025 Core Update** (rollout 11→29 déc. 2025, confirmé). Pattern classique : **pages commerciales (collections/produits) ⬇, blog/contenu ⬆**. Têtes commerciales rétrogradées page 1 → page 2 (« tableau salon » pos 4,5→13,9).
- **L'on-page des collections est SAIN** (Lighthouse SEO 100/100 ; H1/title/canonical/maillage OK). Donc la récup ne passe **pas** par un patch technique mais par **la qualité de contenu / E-E-A-T** — exactement ce qu'un core update récompense.

**Objectif** : rendre chaque page collection **utile, experte et unique** (helpful content + E-E-A-T) pour regagner les positions, à l'échelle du catalogue, **automatiquement**.

**Preuve par l'expérience déjà en place** : `tableau-salon` a été refondu le 29/05 (pilote éditorial). À surveiller en juin : si salon remonte et pas `tableau-cuisine` (non traité), le modèle est validé. (Un core update de mai 2026 est aussi en cours → fenêtre d'observation favorable.)

---

## 2. Modèle de référence : le pilote `tableau-salon`

**À ÉTUDIER EN PREMIER** (ne pas réinventer) :
- `sections/collection-editorial.liquid` — section générique **metafield-first** :
  - `source: 'intro'` → `collection.metafields.custom.intro` (fallback setting `intro_text`). Rendu : eyebrow + **H1** (`show_title: true`) + accroche. Texte via `newline_to_br` → **metafield multi-ligne**.
  - `source: 'guide'` → `collection.metafields.custom.guide` (fallback `collection.description`). Rendu : `<details>` repliable « Lire le guide complet », contenu en **HTML brut** (`{{ content }}`) → **metafield rich_text/HTML**.
  - Conventions déjà respectées : Tailwind only, classe `.collection-description` (typo h2/h3/p/liens), `enabled_on: collection`, a11y `<details>` natif + focus-visible + motion-reduce.
- `templates/collection.tableau-salon.json` — structure cible d'une page collection enrichie :
  `breadcrumb → main-collection-product-grid → collection-editorial (intro, H1) → collection-editorial (guide, replié) → collapsible-content (FAQ) → cards-carousel → custom-liquid → signature`.
  (Grille produits **en premier**, éditorial **sous la grille** — cf. mémoire `[[feedback-collection-layout]]`.)

**Étape 0 de l'exécutant** : ouvrir `tableau-salon` (template + section + **metafields réels** via Shopify) pour confirmer :
1. les **types exacts** des metafields `custom.intro` et `custom.guide` (probablement `multi_line_text_field` et `rich_text_field`/HTML) ;
2. comment la FAQ (`collapsible-content`) est alimentée (settings ou metafield) ;
3. reproduire **ce mécanisme** pour les autres collections (metafields = source de vérité, template = structure réutilisable).

---

## 3. Architecture : Workflow (1 collection) × Boucle `/loop` (toutes)

```
/loop  ─────────────────────────────────────────────────────────────┐
  │  à chaque itération : prend la prochaine collection "pending"     │
  │  de la worklist, lance le Workflow pour ELLE, marque "drafted"    │
  ▼                                                                   │
Workflow "collection-editorial" (args = {handle, title, suffix})     │
  Phase 1 RECHERCHE   → brief de contenu (mots-clés GSC, produits,    │
  Phase 2 RÉDACTION   →   intro + guide + FAQ + maillage)             │
  Phase 3 VÉRIF       → anti-hallucination + SEO + a11y (adversarial) │
  Phase 4 APPLICATION → écrit metafields (Shopify setMetafield) + assure le template
  └──────────────────────────────────────────────────────────────────┘
        ⇒ APPLIQUE directement (live), puis QA, puis collection suivante.
Walid vérifie a posteriori (pas de gate). Garder un log/commit par collection pour rollback facile.
```

- **Le Workflow** (outil `Workflow`) = orchestration déterministe multi-agents **pour UNE collection**.
- **La boucle `/loop`** = enchaîne le Workflow **collection par collection** sans intervention, en s'appuyant sur une **worklist** qui suit l'état (pending → done).
- **Bout-en-bout automatique** : génère → vérifie (anti-hallucination) → **applique (live)** → QA → collection suivante. **Pas de gate humain** ; Walid vérifie après coup.

> **Note d'implémentation (IMPORTANT — lire avant de coder)** :
> - Le plus simple et robuste = **UN SEUL Workflow** (outil `Workflow`) qui **`pipeline()` sur toute la worklist** → toutes les collections en un run, par lots concurrents (cap ~16). **Le skill `/loop` n'est PAS nécessaire** : la « boucle par collection » est gérée *à l'intérieur* du Workflow (pipeline/loop sur la liste), pas par une commande utilisateur. N'utiliser `/loop` que si on veut volontairement étaler dans le temps / reprendre sur plusieurs sessions.
> - **Robustesse MCP Shopify** : si les sous-agents du Workflow n'atteignent PAS le MCP Shopify (cas headless), faire écrire les metafields par l'**agent principal** après le run (le Workflow retourne le contenu généré+vérifié, l'agent principal applique via `setMetafield`). En desktop interactif, le MCP Shopify est normalement disponible pour les sous-agents.

---

## 4. Le Workflow détaillé (squelette à fournir à l'outil `Workflow`)

> L'exécutant lance ceci **via l'outil `Workflow`**, avec `args = { handle, title, suffix }` injecté par la boucle. Les sous-agents peuvent : exécuter `node ~/.claude/scripts/gsc/gsc.mjs …` (GSC), `node ~/.claude/scripts/gsc/ga4.mjs …` (GA4), et atteindre le MCP **Shopify** via ToolSearch.

```js
export const meta = {
  name: 'collection-editorial',
  description: 'Génère intro+guide+FAQ E-E-A-T pour UNE collection (brouillon local, pas de live)',
  phases: [
    { title: 'Recherche', detail: 'mots-clés GSC + produits + intention' },
    { title: 'Rédaction', detail: 'intro / guide / FAQ / maillage (voix Hayate)' },
    { title: 'Vérif',     detail: 'anti-hallucination + SEO + a11y (adversarial)' },
    { title: 'Assemblage', detail: 'brouillon local JSON' },
  ],
}
const { handle, title } = args

// ── Phase 1 : Recherche ─────────────────────────────────────────────
phase('Recherche')
const brief = await agent(
  `Collection « ${title} » (handle ${handle}). Construis un BRIEF de contenu, DATA-FIRST :
   1) Mots-clés : exécute le skill GSC pour CETTE collection —
      node ~/.claude/scripts/gsc/gsc.mjs query --site sc-domain:myselfmonart.com --type web \
        --dimensions query --country fra --page ${handle} --page-operator contains \
        --start-date 2025-08-01 --end-date 2026-05-31 --row-limit 1000 --format csv
      → top requêtes (têtes commerciales + longue traîne), intention.
   2) Produits : via Shopify (listProducts query par collection / getCollection), liste les œuvres,
      thèmes, styles, pièces ciblées (salon/chambre…), gammes de prix RÉELLES.
   3) Metafield custom.type_of_collection + description actuelle (à préserver).
   4) Collections liées (même type_of_collection) pour le maillage.
   Rends un JSON: { primary_kw, secondary_kw[], intent, products_summary, price_range, related_collections[], angle_editorial }`,
  { phase: 'Recherche', schema: BRIEF_SCHEMA }
)

// ── Phase 2 : Rédaction (parallèle par bloc) ────────────────────────
phase('Rédaction')
const [intro, guide, faq] = await parallel([
  () => agent(`Rédige l'INTRO (accroche 2–3 phrases, sous le H1) pour « ${title} ».
     Voix Hayate, FR, naturelle. Place ${brief.primary_kw} sans bourrage. Multi-ligne (sera rendu newline_to_br).
     ZÉRO fait inventé (cf. brief). Pas de « Made in France ».`, { phase: 'Rédaction', schema: TEXT_SCHEMA }),
  () => agent(`Rédige le GUIDE complet en HTML (h2/h3/p/ul + liens) pour « ${title} », à partir du brief.
     Structure utile/E-E-A-T : comment choisir, styles & ambiances, conseils de placement, formats/finitions,
     entretien, pourquoi MyselfMonArt (expertise atelier, satisfaction). Maillage : liens <a> RÉELS vers
     ${brief.related_collections} et 2–3 produits phares. Classes typo de .collection-description.
     Hn : commencer en h2 (le H1 = titre collection). 350–600 mots. Aucun fait inventé.`, { phase: 'Rédaction', schema: HTML_SCHEMA }),
  () => agent(`Rédige une FAQ (4–6 Q/R) ciblée requêtes du brief, format compatible collapsible-content.
     Réponses concrètes, honnêtes, sans promesse fausse.`, { phase: 'Rédaction', schema: FAQ_SCHEMA }),
])

// ── Phase 3 : Vérification adversariale ─────────────────────────────
phase('Vérif')
const verdict = await agent(
  `Vérifie le contenu généré pour « ${title} » contre le brief (données réelles). REFUSE par défaut si doute.
   Checks : (a) aucun fait/chiffre inventé (avis, ventes, origine — pas de « Made in France ») ;
   (b) liens internes valides (collections/produits existants) ; (c) mots-clés du brief présents sans bourrage ;
   (d) hiérarchie Hn correcte (un seul H1 = titre ; guide en h2/h3) ; (e) voix Hayate ; (f) a11y/longueur.
   Rends { ok:boolean, issues[], corrected_intro, corrected_guide, corrected_faq }`,
  { phase: 'Vérif', schema: VERDICT_SCHEMA }
)

// ── Phase 4 : Application directe (live) ────────────────────────────
phase('Application')
const intro_text = verdict.corrected_intro ?? intro.text
const guide_html = verdict.corrected_guide ?? guide.html
const applied = await agent(
  `Applique le contenu de « ${title} » (handle ${handle}) en LIVE via le MCP Shopify :
   1) setMetafield ownerId=<collection gid> namespace=custom key=intro type=<confirmé étape 0> value=${JSON.stringify(intro_text)}
   2) setMetafield ... key=guide type=<rich_text/HTML> value=${JSON.stringify(guide_html)}
   3) FAQ : ${JSON.stringify(verdict.corrected_faq ?? faq)} → selon le mécanisme de collapsible-content (metafield/settings, cf. étape 0).
   4) Vérifie que la collection rend bien les sections collection-editorial (sinon, signale needs_template=true).
   Rends { ok, metafields_written[], needs_template, notes }`,
  { phase: 'Application', schema: APPLY_SCHEMA }
)
return { handle, title, applied, qa: verdict }
```

**Note d'exécution** : la **phase Application écrit en live** (metafields Shopify). La boucle se contente d'avancer à la collection suivante et de **logguer** ce qui a été appliqué (pour révision/rollback). Les changements de **template** (ajout des sections) qui touchent le code thème suivent le workflow de déploiement (commit → push `main` = live).

---

## 5. Spécification de contenu & SEO (non négociable)

- **Voix** : Hayate (cf. `[[feedback-collaboration-walid]]`). FR naturel, premium, jamais creux.
- **Anti-hallucination** : tout fait vient des données réelles (produits Shopify, GSC). **Aucun chiffre inventé.** Faits autorisés : Paris/Toulouse/Allemagne, fondé 2022, Trustpilot 4.1/80 avis, ~1015 ventes, mascotte. **Interdits** : « Made in France », faux avis, fausses garanties. (cf. `[[project-myselfmonart-facts]]`, `[[feedback-verify-content-assumptions]]`.)
- **Mots-clés** : la requête de tête réelle de la collection (ex. « tableau salon », « tableau japonais ») dans H1/intro/guide, naturellement. Pas de bourrage.
- **Structure Hn** : 1 seul **H1** (titre collection, via `collection-editorial` intro `show_title`). Guide en **h2/h3**. Ne jamais créer de 2ᵉ H1.
- **Maillage interne** : liens RÉELS vers collections sœurs (même `type_of_collection`) + 2–3 produits phares. Renforce le cocon.
- **Schema** : la FAQ → `FAQPage` JSON-LD si `collapsible-content` ne le pose pas déjà (à vérifier). Collection → vérifier `json-ld-collection.liquid` existant (ne pas dupliquer).
- **A11y/WCAG AA** : `<details>` natifs, focus visible, contraste, motion-reduce (déjà gérés par la section — ne pas casser).
- **Conventions thème** : réutiliser l'existant (skill `shopify-section-dev` : `<collapsible-tab>`/`collapsible-content`, `cards-carousel`, `.collection-description`, `.title-highlight`). **Tailwind only**, vars globales. Ne créer aucun composant si un existe.
- **Préserver** : ne **jamais** réécrire `collection.description` (foyer de texte/liens historique). On AJOUTE via metafields.

---

## 6. Worklist priorisée (par valeur SEO réelle, source GSC)

Ordre = clics web FR « avant » (nov–déc 2025). **`tableau-salon` = déjà fait (modèle)**.

| Prio | Collection (handle) | Clics web/avant |
|---|---|---|
| 1 | tableau-africain | 215 |
| 2 | tableau-couleur | 112 |
| 3 | tableau-japonais | 106 |
| 4 | tableau-chambre-ado | 106 |
| 5 | tableaux-frida-kahlo | 99 |
| 6 | tableau-bureau | 43 |
| 7 | tableau-chambre-garcon | 36 |
| 8 | tableau-bleue | 29 |
| 9 | tableau-zen | 28 |
| 10 | tableau-cuisine | 25 |
| 11 | tableau-plexiglass | 19 |
| 12 | tableau-animaux | 16 |
| 13 | tableaux-chambre-bebe | 14 |
| 14 | tableau-paysage | 14 |
| … | (reste du catalogue) | via `listCollections` Shopify |

**Étape de l'exécutant** : générer `seo/collections-worklist.json` = liste complète des collections (via Shopify `listCollections`, en incluant `handle`, `title`, `template_suffix`), triée par cette priorité, avec un champ `status: "pending"`.

---

## 7. Garde-fous (CRITIQUE)

- **Application directe autorisée, sans gate de validation** (décision Walid 2026-06-05) : le workflow écrit les metafields (live immédiat) et déploie. **Walid vérifie a posteriori** ; petites erreurs tolérées. La qualité est assurée par la **phase Vérif automatisée** (anti-hallucination, SEO, a11y) AVANT chaque écriture. **Logguer chaque collection traitée** (handle + contenu appliqué) dans `seo/collections-applied-log.md` pour révision/rollback faciles.
- **Ne modifier QUE l'éditorial** (intro/guide/FAQ via metafields + structure de template). Ne pas toucher couleurs, largeurs, styles, produits, prix, autres sections (cf. `[[feedback-no-unrequested-initiatives]]`).
- **Pas de co-auteur Claude** dans les commits (cf. `[[feedback-no-coauthor-trailer]]`).
- **Idempotence** : ne pas retraiter une collection déjà `done` dans la worklist.

---

## 8. Déploiement (automatique, dans la boucle — pas de validation préalable)

Pour chaque collection traitée (automatiquement) :
1. **Template** : s'assurer que la collection rend les sections `collection-editorial` (intro + guide) + `collapsible-content` (FAQ), sur le modèle salon.
   - Idéal scalable : **ajouter ces sections au template par défaut `collection.json`** (et harmoniser les templates par suffixe) pour que TOUTE collection en hérite — au lieu d'un template par collection. ⚠️ **éviter le double-H1** : si `collection-editorial` (intro, `show_title:true`) porte le H1, alors **désactiver le H1 du `main-collection-banner`** sur ce template (ou inversement). Un seul H1.
2. **Contenu** : écrire les metafields via Shopify **`setMetafield`** :
   - `namespace=custom, key=intro, type=<confirmé étape 0>` (multi_line)
   - `namespace=custom, key=guide, type=<confirmé étape 0>` (rich_text/HTML)
   - FAQ : selon le mécanisme de `collapsible-content` (settings ou metafield — confirmer étape 0).
3. **QA post-déploiement** : Lighthouse (SEO ≥ 95, pas de régression CLS), vérifier 1 seul H1, liens internes 200, JSON-LD valide.
4. Marquer la collection `applied` dans la worklist.

---

## 9. Mesure & suivi (boucler la boucle)

- **GSC hebdo** par collection : `node ~/.claude/scripts/gsc/gsc.mjs query --type web --page <handle> --page-operator contains --dimensions date …` → la **position** doit remonter sous 2–6 semaines (et surtout au prochain core update).
- **GA4** : `node ~/.claude/scripts/gsc/ga4.mjs report --property 374096343 --dimensions yearMonth --metrics sessions --start … ` (Organic Search) pour la tendance sessions. ⚠️ CA/conversions GA4 non fiables (tracking dégradé ~13 jan) — utiliser les **sessions** + Shopify pour le CA.
- **Expérience témoin** : comparer la remontée de `tableau-salon` (traité) vs `tableau-cuisine` (à traiter tard) → preuve d'efficacité.

---

## 10. Definition of Done

**Par collection** : contenu généré et **vérifié (phase Vérif auto)** → metafields `custom.intro`+`custom.guide` écrits (live) → template rend l'éditorial → 1 seul H1 → liens internes valides → Lighthouse SEO ≥ 95, CLS non dégradé → `status: done` + ligne dans `seo/collections-applied-log.md`.

**Global** : toutes les collections de la worklist `applied` ; suivi GSC/GA4 en place ; rapport de remontée à J+30.

---

## 11. Ressources

- **Mémoire** (lire avant de démarrer) : `[[project-web-collections-regression-jan2026]]`, `[[feedback-collection-layout]]`, `[[feedback-collaboration-walid]]`, `[[feedback-deploy-workflow]]`, `[[feedback-no-unrequested-initiatives]]`, `[[project-painting-titles]]`, `[[project-myselfmonart-facts]]`, `[[reference-gsc-skill]]` (inclut GA4).
- **Skills** : `shopify-section-dev` (obligatoire dès qu'on touche Liquid/template), `gsc-query`.
- **Outils data** : GSC `~/.claude/scripts/gsc/gsc.mjs` ; GA4 `~/.claude/scripts/gsc/ga4.mjs` (propriété `374096343`, auth team@kindopia.com) ; MCP **Shopify** (`listCollections`, `getCollection`, `getProduct`, `setMetafield`).
- **Fichiers modèle** : `sections/collection-editorial.liquid`, `templates/collection.tableau-salon.json`.
- **Déploiement** : tout en local → validation Walid → push direct `main` (= live).
```
