# 📐 MÉTHODOLOGIE SEO/GEO MyselfMonArt — référentiel universel

> **Le mode d'emploi pour créer n'importe quelle page la plus optimisée possible** (home, collection, blog, produit, page éditoriale).
> Document **vivant** : on le retouche dès qu'on apprend mieux. Voir le [changelog](#-changelog) en bas.
> Pilotage des missions : [../ROADMAP.md](../ROADMAP.md). Faits marque : mémoire `project_myselfmonart_facts.md`.
>
> **Version 1.0** — issue de la mission Homepage (déployée 2026-05-28, SEO Lighthouse 100, CWV au vert).

---

## 0. Principe directeur

Objectif unique : **augmenter les ventes**. Chaque page optimisée est une brique d'autorité **SEO** (Google) **+ GEO** (citable par ChatGPT/Perplexity/AI Overviews). On avance **phase par phase, avec validation de Walid entre chaque**, et on **mesure l'impact réel via GSC** après déploiement (amélioration continue).

Règle d'or : **jamais de data hallucinée.** Pas de volume/position sans source réelle (GSC, SERP). Si on ne sait pas, on le dit.

---

## 1. Étape préalable — qualifier la page

Avant tout, identifier le **type de page** et son **intention dominante** : cela conditionne le keyword, le schema et le format. (Détail des variations en [§6](#6-déclinaison-par-type-de-page).)

| Type de page | Intention dominante | Keyword type | Schema clé |
|---|---|---|---|
| **Homepage** | Découverte + marque + autorité | générique large ("tableau décoration murale") | Organization + Store + ItemList + FAQPage |
| **Collection** | Commercial / transactionnel | catégorie ("tableau salon", "tableau zen") | CollectionPage + ItemList(produits) + FAQPage |
| **Produit** | Transactionnel (achat) | produit précis / longue traîne | Product + Offer + AggregateRating |
| **Blog / éditorial** | Informationnel (GEO++) | question ("comment choisir…", "quelle taille…") | Article/BlogPosting + FAQPage |
| **Page guide / À propos** | Confiance / E-E-A-T | marque / expertise | Organization / AboutPage |

---

## 2. Les 5 phases (process universel)

> Le squelette est le même pour toute page ; seul l'accent change selon le type (§6).

### Phase 1 — Validation keyword + baseline (data réelle)
- **Objectif** : choisir/confirmer le keyword cible sur la **vraie data**, pas des estimations.
- **Méthode** : skill `gsc-query` (siteUrl `sc-domain:myselfmonart.com`, country `fra`). Relever clics/impressions/position actuels de la page = **baseline** (à battre). Diagnostiquer la **cannibalisation** avec les autres pages (dimensions `query,page`).
- **Livrable** : keyword cible validé + baseline chiffrée + diagnostic cannibalisation.
- **Validation** : Walid confirme le keyword avant d'avancer.

### Phase 2 — Décodage de la SERP
- **Objectif** : comprendre ce que Google récompense **réellement** sur ce keyword en France.
- **Méthode** : WebSearch/WebFetch sur le top 10 google.fr. Identifier : format dominant (catégorie/éditorial/produit), longueur, structure Hn, rich snippets, People Also Ask, présence d'AI Overview.
- **Livrable** : "fiche d'identité de la SERP" = ce qu'il faut **absolument** avoir pour être jugé légitime.

### Phase 3 — Audit des 3 meilleurs concurrents directs
- **Objectif** : extraire le **template gagnant**, pas appliquer des best practices génériques.
- **Méthode** : WebFetch top 3 (ignorer marketplaces type Amazon/Etsy). Pour chacun : structure Hn, champ sémantique (entités, co-occurrences), schema.org, USPs, longueur, maillage interne, E-E-A-T, FAQ.
- **Livrable** : tableau comparatif + "template gagnant" + **"angles différenciants disponibles"** (vides concurrentiels à occuper).

### Phase 4 — Production du contenu
- **Objectif** : produire le contenu prêt à intégrer.
- **Livrables** :
  - **Title** ≤ 60 car (keyword + différenciant + marque) — *home : dans Shopify Préférences ; autres : champ SEO de la collection/page/article*
  - **Meta description** ≤ 155 car (keyword + USP + preuve)
  - **H1 unique** contenant le keyword, + structure **Hn** complète (cf. §5)
  - **Copy** en **voix Hayate** (cf. §4), longueur calée sur la SERP (Phase 2)
  - **Schema JSON-LD** selon le type (§6) — toujours valider la syntaxe
  - **FAQ** (questions = People Also Ask de Phase 2) → **schema FAQPage** (différenciateur, cf. §4)
  - **Maillage interne** (cf. §5)
  - **Specs images** : alt text descriptif, dimensions, format, lazy-load
  - **Plan de redirection 301** si une URL est fusionnée/supprimée
- **Validation** : Walid valide la structure puis la copy (bloc par bloc si gros).

### Phase 5 — Audit technique + déploiement + suivi
- **5A statique (code)** : schema présent + valide, title/meta/H1, alt text, maillage, conformité aux specs.
- **5B dynamique (staging)** : Lighthouse (SEO=100 visé, Accessibilité ≥90), Core Web Vitals (LCP <2,5s, CLS <0,1), rendu, responsive mobile, liens (pas de 404), erreurs console.
- **Déploiement** : push `staging` → preview → **validation visuelle Walid** → merge `main` = live.
- **Post-live** : soumettre l'URL à **Search Console** (action Walid) + créer le `FOLLOWUP.md` de la mission.
- **Suivi** : check GSC **J+14 et J+30** → consigner dans `FOLLOWUP.md` → mettre à jour `ROADMAP.md`.

---

## 3. Outils

| Besoin | Outil |
|---|---|
| Data GSC réelle | skill `gsc-query` (local) — `sc-domain:myselfmonart.com`, `fra` |
| SERP / concurrents | WebSearch + WebFetch (WebSearch est US-only → résultats FR par défaut sur keyword FR) |
| Lighthouse / CWV / responsive | MCP `chrome-devtools` (fermer Chrome si "browser already running") |
| Validation schema | Google Rich Results Test + validator.schema.org + parse JSON local |
| Shopify (produits, thèmes) | MCP Shopify (souvent instable en local → fallback repo/curl) |
| Faits marque | mémoire `project_myselfmonart_facts.md` |

---

## 4. Voix de marque & GEO (invariants de contenu)

- **Vouvoiement**, ton **premium-émotionnel-cocon** ("the calm after the noise", "your home is more than décor"). Premium **sans pédanterie**.
- **Signature** en fin de page : *« Avec soin, — Hayate / Team MyselfMonArt »*.
- **GEO (citabilité IA)** :
  - Réponses **citation-worthy** de **50-90 mots**, factuelles, autonomes (dans la FAQ surtout).
  - **Récit de marque identifiable** (studio, fondateur, mission) → les IA citent les marques qui ont une identité claire.
  - **Entités & co-occurrences** riches (matériaux, styles, pièces, artistes).
  - **FAQPage schema** = quasi personne ne l'a chez les concurrents → différenciateur fort, gagne featured snippets + AIO.

---

## 5. Invariants techniques (toute page)

- **1 seul `<h1>`** contenant le keyword principal, en tête.
- **Hiérarchie Hn logique** : 10-14 H2 pour une grande page, sous-H3 thématiques. Pas de saut de niveau.
- **Title 50-60 car** (au-delà = tronqué), **meta ≤ 155 car**, **canonical** propre.
- **Maillage interne dense** : 30-50 liens pertinents (vers collections / produits / blogs / pages services).
- **Images** : alt descriptif (jamais vide pour une image informative, jamais de keyword stuffing), dimensions explicites, WebP auto Shopify, `loading="lazy"` partout **sauf** le hero (`eager` + `fetchpriority="high"` pour le LCP).
- **Schema JSON-LD** : 1 seul nœud par entité (attention aux doublons `@id` qui entrent en conflit), syntaxe validée.
- **Core Web Vitals** : LCP < 2,5s, CLS < 0,1, INP < 200ms. **Mobile-first** (Google indexe le mobile).
- **Conventions Shopify** : Tailwind only, variables globales fonts/couleurs, sections admin-configurables.

---

## 6. Déclinaison par type de page

> Ce qui **change** selon le type (le reste = invariants §4-5).

### 🏠 Homepage
- Keyword **générique large** ; rôle = autorité topique + hub de maillage (pas conversion directe).
- Schema : **Organization + Store + BreadcrumbList + ItemList(collections) + FAQPage**.
- Title/Meta : **Shopify Admin → Préférences** (PAS dans le theme).
- Sections : par pièce + par style + studio + UGC + FAQ.

### 🗂️ Collection
- Keyword **catégorie** (pièce ou style) ; intention **commerciale**.
- Schema : **CollectionPage + ItemList(produits) + BreadcrumbList + FAQPage**.
- Title/Meta : champ SEO **de la collection** dans l'admin Shopify.
- Contenu éditorial **en haut ou bas** de la grille produits ; **se différencier de la home** (anti-cannibalisation) et des collections sœurs.
- Maillage : vers produits phares + collections connexes + blog pertinent.

### 🛍️ Produit
- Keyword **produit / longue traîne** ; intention **transactionnelle**.
- Schema : **Product + Offer + AggregateRating + BreadcrumbList** (Shopify en génère déjà une base — enrichir, ne pas dupliquer).
- Soigner : titre produit, description (voix Hayate + specs matières chiffrées), avis, photos + alt, cross-sell.

### ✍️ Blog / éditorial
- Keyword **informationnel** (question : "comment choisir…", "quelle taille…", "quel tableau pour…").
- Schema : **Article/BlogPosting + FAQPage + BreadcrumbList**. Auteur nommé + date (E-E-A-T).
- **Cocon de contenu** : maillage fort **vers les collections** commerciales (l'article informe, la collection convertit).
- Cible **featured snippets + AI Overview** (forte proba sur l'informationnel) → réponses structurées, listes, tableaux, FAQ.

### 📄 Page guide / À propos
- Rôle **E-E-A-T / confiance** : studio, fondateur, savoir-faire, engagements.
- Schema : Organization / AboutPage. Renforce la citabilité IA de toute la marque.

---

## 7. Garde-fous business & légaux (NON négociables)

- ❌ **Jamais "Made in France" / "Fabriqué en France"** (impression en Allemagne → illégal DGCCRF, art. L121-2). ✅ Dire "Conçu en France / Studio créatif français / Imprimé en Europe".
- ❌ **Jamais de chiffres gonflés** (ventes, avis) → publicité mensongère + perte de citabilité IA. Rester factuel.
- **Trustpilot 4.1/80** : ne pas afficher la note en gros (comparaison déloyale) → mettre en avant **volume + photos UGC**. La note reste dans le schema (honnêteté pour Google/IA).
- **Anti-cannibalisation** : vérifier en Phase 1 que la nouvelle page ne marche pas sur les plates-bandes d'une page existante. Différencier sémantiquement (home = générique, collection = pièce/style, blog = question).

---

## 8. ✅ Definition of Done (checklist finale avant live)

```
SEO on-page
[ ] 1 seul H1, contient le keyword
[ ] Title ≤60c (keyword + marque) configuré au bon endroit
[ ] Meta ≤155c (keyword + USP)
[ ] Canonical correct
[ ] Hn logique (pas de saut de niveau)
[ ] Maillage interne 30-50 liens, pas de 404
[ ] Images : alt descriptif partout, dimensions, lazy (sauf hero)

Schema
[ ] Schemas du type de page présents (§6)
[ ] Syntaxe JSON-LD valide (0 erreur)
[ ] FAQPage présent (si pertinent) — questions = PAA de la SERP
[ ] Pas de doublon d'entité (@id cohérents)

Contenu
[ ] Voix Hayate (vouvoiement, cocon) + signature
[ ] Longueur calée sur la SERP (Phase 2)
[ ] Réponses FAQ citation-worthy (50-90 mots)
[ ] Garde-fous légaux respectés (§7)

Technique
[ ] Lighthouse SEO = 100, Accessibilité ≥90
[ ] LCP <2,5s, CLS <0,1
[ ] Responsive mobile OK
[ ] 0 erreur console bloquante

Déploiement & suivi
[ ] Validé visuellement par Walid sur staging
[ ] Mergé main = live
[ ] URL soumise à Search Console
[ ] FOLLOWUP.md créé + ROADMAP.md à jour
[ ] Check GSC J+14 / J+30 planifié
```

---

## 9. Suivi & itération

Après live : check **J+14** puis **J+30** via `gsc-query`. Comparer à la **baseline** (Phase 1). Mesurer : position/clics/impressions sur le keyword, apparition des rich snippets, absence de cannibalisation. Consigner dans le `FOLLOWUP.md` de la mission, mettre à jour `ROADMAP.md`. Si sous-performance → diagnostiquer (intention mal lue ? concurrence ? technique ?) et itérer.

---

## 🔄 Changelog

> On fait évoluer cette méthodologie ici. Chaque amélioration = une ligne.

| Date | Version | Évolution |
|---|---|---|
| 2026-05-28 | 1.0 | Version initiale, distillée de la mission Homepage (5 phases, voix Hayate, schema FAQPage différenciateur, garde-fous Made in France / Trustpilot / cannibalisation, CWV). |
