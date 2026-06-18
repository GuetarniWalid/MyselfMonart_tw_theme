# Inventaire i18n MyselfMonArt — 2026-06-18

**Méthode** : crawl live (diff FR↔cible) de 24 pages × 5 langues + attribution multi-agents par couche + audit conventions + revue du back-end AdonisJS. Outil : `growth/i18n-audit/audit.mjs` (ne flague que les chaînes **identiques** FR↔cible sur champs traduisibles → exclut nativement les faux positifs cognats). Inventaire **lecture seule** — rien corrigé/déployé.

## Verdict global

**Le socle structurel tient.** Accueil, fiches produit standard, pages légales (CGV, mentions, confidentialité), contact, à-propos, blog, panier, recherche, guide des tailles, méga-menu = **0 fuite** sur EN/ES/DE/NL. Les chantiers passés (SEO home, menus, og:locale, alt méga-menu, formats, couleurs) n'ont pas régressé.

**Les fuites sont concentrées sur 3 zones** : (1) les produits **perso** (foot + bébé/horoscope), (2) quelques **trous de périmètre back-end** (meta de page, cocon collection, alt de fichiers), (3) du **backlog de cron** (template neuf + alt produit pas encore rattrapés).

### Matrice de couverture (fuites FR réelles, hors avis UGC)

| zone | en | es | de | nl | classe |
|---|---|---|---|---|---|
| PDP bébé/horoscope (`personalized-baby`, ~12 produits) | 87 | 87 | 87 | 87 | backlog cron (TranslateModel) |
| PDP foot perso (×3) | 9–18 | 14–16 | ⏭ | 14–16 | thème studio + backlog alt |
| page `papier-peint` | ✅ | 7 | 7 | 7 | backlog TranslatePage |
| `politique-remboursement` | 3 | 3 | 3 | 3 | TROU back-end (meta page) |
| facettes collections | 2–6 | 1–3 | 2–4 | 1–3 | backlog + cocon (TROU) |
| page `faq` | ✅ | 2 | 2 | 2 | backlog TranslatePage |
| home, PDP std, pages légales, blog, panier, recherche | ✅ | ✅ | ✅ | ✅ | propre |

---

## A. Couche THÈME — corrigeable en local, sûr & réversible

| # | Trou | Preuve / source | Action | Sév |
|---|---|---|---|---|
| A1 | Studio : `Votre poster est prêt !` (reveal) FR sur 4 langues | `sections/tw-custom-art-studio.liquid:420` rend `section.settings.reveal_title` laissé au DÉFAUT schema → Shopify n'expose pas un défaut comme translatableContent | Router sur clé thème `t` (ou map config studio). Texte générique « Votre tableau est prêt ! » (couvre foot+bébé) | 🔴 high |
| A2 | Studio : bouton **Ajouter au panier** FR sur 4 langues | bouton d'achat injecte `section.settings.text` (défaut FR) ; la clé thème traduite `sections.custom_art_studio.add_to_cart` n'alimente QUE le bouton « suivant » | Pointer le libellé du bouton d'achat sur la clé thème déjà localisée | 🔴 high |
| A3 | Studio : témoignages eyebrow `Ils nous font confiance` + lead | `sections/testimonials-carousel.liquid:183/206` au DÉFAUT (templates ne posent que `title`) | Poser eyebrow+lead dans les 2 templates perso **ou** router sur clé `t` | 🟠 med |
| A4 | **Bug inverse** : `Until the 31st of July` (anglais) sur la page **FR** foot génératif | défaut schema EN `main-product.liquid:1195` + `product.personalized.json` omet `promotion_date` ET `promotion_discount` (défaut 15>0 force l'affichage). Touche aussi product.json/gourde/tapestry | Poser `promotion_date` FR + `promotion_discount:0` dans le template ; corriger le défaut EN du schema en FR | 🔴 high |
| A5 | `Imprimer une facture` codé en dur FR | `templates/customers/order.liquid:246` | Clé `t` | 🟡 low |
| A6 | Note Trustpilot `4.1` (point) sur FR/ES/DE/NL (attendu `4,1`) | `divided_by` → flottant anglo-saxon, aucune localisation | Clé `t` par langue (virgule fr/de/nl/es, point en) ; **ne pas** toucher le `ratingValue` JSON-LD | 🟠 med |

## B. Couche CONVENTIONS (dates / nombres / unités)

| # | Sujet | Constat | Action | Sév |
|---|---|---|---|---|
| B1 | **Date de naissance studio** (le « mois/jour inversé ») | `<input type="date">` natif (`component-custom-art-studio.js:1313`) affiche selon le **navigateur**, pas `request.locale` → incohérence FR↔EN réelle. Valeur soumise = ISO `YYYY-MM-DD` (bon). Pas de cartProperty date aujourd'hui (n'apparaît pas au panier) | **Décision Walid acquise** : sélecteur localisé (DD/MM FR·ES·DE·NL, MM/DD EN) ; garder ISO pour le payload ; si un jour exposé au panier, dériver un affichage localisé | 🟠 med |
| B2 | **Mesures bébé cm/kg vs EN impérial** | EN variantes = **pouces** (vérifié live : `11.8x15.7 in`, conversion au niveau Translate&Adapt Shopify, PAS dans le thème) MAIS studio hardcode `Height in cm` / `Weight in kg` → incohérent pour l'acheteur EN | Décision produit : convertir taille/poids bébé en in/lb pour EN, ou assumer le métrique (cf. décisions) | 🟡 low |
| B3 | `date_formats` absent des locales | dates blog/compte via `time_tag` (bon mécanisme, locale-aware) mais aucun `date_formats` défini → repli Shopify par langue | Vérifier le rendu live d'une date d'article /fr vs /en vs /de ; si non conforme, ajouter `date_formats` par locale | 🟡 low |
| — | Prix, heure, payload nombres | OK (Shopify Money ; input time natif locale-stable ; nombres studio = entiers) | RAS | — |

> ⚠️ **Correction mémoire** : `project_painting_variant_i18n` dit « tailles converties en pouces pour EN » → **VRAI** (vérifié live), mais la conversion est au **niveau traduction de variante Shopify**, pas dans le code thème (d'où l'absence au grep). À noter pour ne pas chercher du code de conversion inexistant.

## C. Couche CONTENU SHOPIFY — BACKLOG (mécanisme OK, faire tourner les crons)

| # | Trou | Cron porteur | Action | Sév |
|---|---|---|---|---|
| C1 | Template bébé/horoscope ~87 réglages FR (×~12 produits, template partagé) | **TranslateModel** (04:15, scanne `templates/*.json`) — PAS TranslateStaticSection | 1 run TranslateModel couvre les 12 signes (template unique) + TranslateProduct pour titre/desc/SEO par signe | 🔴 high |
| C2 | Alt galerie produit foot (6 visuels Nano Banana) FR es/de/nl | AlignProductAltImageWithMetaObject (02:20) → TranslateProduct (03:30) | Resync foot du 17/06 = backlog ; laisser tourner ou forcer | 🟠 med |
| C3 | Alt corps HTML pages `papier-peint` + `faq` FR es/de/nl (EN OK) | TranslatePage (04:00) | Backlog es/de/nl (NL réactivé récemment) — laisser tourner | 🟡 low |
| C4 | Facettes thème/art-movement (Tropical/Vintage/Illustration…) | TranslateMetaobjects (04:00) | Dans l'allow-list ; cognats = value-echo légitime (fallback correct). Vérifier 1 label non-cognat (Fleur, Nature morte…) après un cycle | 🟡 low |

> Pré-requis : confirmer que `node ace scheduler:run` tourne en prod **et** que es/de/nl/en sont activées dans Shopify Admin > Languages (sinon les tâches bail sans rien traduire).

## D. Couche BACK-END — TROUS STRUCTURELS (code → deploy prod, confirmation par correctif)

| # | Trou (fuite y compris sur EN = structurel) | Fix | Sév |
|---|---|---|---|
| D1 | **Meta description de page CMS** jamais traduite (4 langues) | `PageTranslator/PullDataModeler.ts` n'extrait pas `seo{description}`/`meta_title` → l'ajouter (comme Product/Collection le font), puis TranslatePage | 🔴 high |
| D2 | **Liens cocon collection** (`custom.cocon_links` labels) jamais traduits | `CollectionTranslator` ne pull pas ce metafield → l'ajouter (vérifier format `list.link` avant) | 🟠 med |
| D3 | **Alt des Fichiers Shopify** en setting d'image de section (bandeaux foot émotion/matière/finitions, fuite même sur EN) | aucune tâche ne traduit `MediaImage.alt` autonome (TranslateModel saute les médias) → nouvelle tâche TranslateFileAlt **ou** rendre l'alt configurable via réglage de section traduisible | 🟠 med |
| D4 | Readback partiel | n'asserte pas `translationsRegister.translations[]` non vide post-push → centraliser dans `updateTranslation` (index.ts) | 🟡 low |
| D5 | `ShopifyTranslatePaintingOptions.ts:27/31` hardcode `'en'` (vestige) | supprimer (supplanté par TranslateMetaobjects nightly) ou migrer sur `localePassesFor('metaobject')` | 🟡 low |

## E. AUTOMATISATION — état des 5 faiblesses historiques

| # | Faiblesse | Statut |
|---|---|---|
| W1 | StaticSection 'en'-only | ✅ CLOS (dérive de `localePassesFor`) |
| W2 | Pas de source unique des locales | ✅ CLOS (`i18n/index.ts` ACTIVE_LOCALES, 9/10 tâches + helper menu) |
| W3 | Menus non traduits | ✅ CLOS (TranslateMenu, 4 locales) |
| W4 | **Aucun filet de complétude** | ❌ OUVERT = livrable F |
| W5 | Skip-cache empoisonnable | ✅ CLOS (3 fichiers : ne cache que l'echo) |

Crons (heure) : AlignProductAlt 02:20 · TranslateProduct 03:30 · TranslatePage 04:00 · TranslateMetaobjects 04:00 · TranslateModel 04:15 · TranslateStaticSection 04:30 · TranslateThemeLocale 04:45. (Collision bénigne 04:00.)

## F. FILET ANTI-RÉGRESSION (livrable D du brief)

Promouvoir `growth/i18n-audit/audit.mjs` en **gate de surveillance** : ajouter un `process.exit(1)` si fuites > seuil (avec allowlist des invariants connus = signatures d'avis `— Patricia G.`), brancher en GitHub Actions cron quotidien post-traduction (~05:00). **Ne pas** partir sur une introspection `translatableResources` Admin : elle raterait ~405/597 fuites (texte visible/alt/heading rendus, hors product/metaobject).

## HORS PÉRIMÈTRE (signalé, non traité)

- **Avis clients UGC** (signatures « — Patricia G. » etc.) — carrousel, géré par Walid.
- **Couleur `Beige / Crème`** FR sur es/de/nl — saga couleur déjà tranchée (limite plateforme / value-echo), non rouverte.
- Facettes **cognates** (Tropical/Vintage…) = value-echo = fallback correct, pas de vraie fuite.

---

## Plan de correction proposé (par lots)

1. **LOT 1 — Thème sûr** (A1·A2·A3·A4·A5·A6) : push main = live mais 100% thème, vérifiable par langue. Faible risque.
2. **LOT 2 — Sélecteur de date studio localisé** (B1) : thème, principe validé, revue visuelle avant push.
3. **LOT 3 — Faire tourner les crons** (C1·C2·C3·C4) : couvert par le GO global back-end, **coût GPT annoncé par lot**. Débloque le plus gros (template ×12).
4. **LOT 4 — Code back-end** (D1·D2·D3·D4·D5) : deploy prod, confirmation par correctif.
5. **LOT 5 — Filet CI** (F) : non-régression.

## Décisions attendues de Walid

1. Par quel lot démarrer (reco : **LOT 1** puis **LOT 3**).
2. Mesures bébé EN : **convertir en in/lb** ou **garder cm/kg** (B2).
3. Traduire les **verbatims d'avis** du template bébé (le cron le fera par défaut) ou les garder FR authentiques.
4. Texte reveal studio : « Votre tableau est prêt ! » générique OK ?
