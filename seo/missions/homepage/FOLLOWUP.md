# FOLLOWUP — Mission Homepage

> Journal de suivi GSC de la homepage. Mis à jour à chaque check.
> Voir [ROADMAP](../../ROADMAP.md) pour le pilotage global, [STRATEGY](STRATEGY.md) pour les décisions.

## Repères

- **Déployée en live** : 2026-05-28
- **Keyword cible** : tableau décoration murale (stratégie multi-keyword)
- **Search Console soumise** : 2026-05-28 (URL home demandée en indexation)

## Baseline (Phase 1, avant refonte — 90 j FR)

| Métrique | Valeur de départ |
|---|---|
| Home `/` — clics | 8 (dont 7 brand "myselfmonart") |
| Home `/` — impressions | ~410 |
| Home `/` — position moyenne | 17.36 |
| "tableau décoration murale" (exact) | **0 impression** |
| "tableau décoration" (exact) | 58 imp, 0 clic, pos 48 |

## Journal des checks

| Date | Jalon | Home clics / imp / pos | "tableau décoration murale" imp/pos | Cannibalisation home vs /collections/tableau-salon ? | Rich snippets FAQ ? | Notes |
|---|---|---|---|---|---|---|
| 2026-06-11 | J+14 | ⊘ **non effectué** | ⊘ | ⊘ | ⊘ | Check sauté lors du pivot growth-plan (2026-06-10). Pas de datapoint mi-parcours. |
| 2026-06-27 | J+30 | **23 / 84 / 5,77** (POST 30j) | **0 imp** (exact) — home toujours absente | Non sur le head term (home absente du terme → design *non testé*) ; cannib. intra-collections réelle (catégories) | Schema FAQPage **présent + valide** en live ✓ ; snippet visible peu probable (dépréciation FAQ Google 2023) | Clics home **100 % brand**. Baisse site-wide = **core update** (algo), pas la home. Pas de relaunch. Détail ↓ |

> Repères de comparaison home : baseline Phase-1 **90 j = 8 clics / ~410 imp / pos 17,36** · contrôle 30 j PRE-deploy (28/04→27/05) = **6 / 125 / 13,90** · POST 30 j (28/05→26/06) = **23 / 84 / 5,77**. Échantillon home minuscule (84 imp) → lire en **tendance**, pas au chiffre près (GSC lag : POST s'arrête ~25/06).

## Lecture J+30 (2026-06-27) — vérifiée (data GSC réelle + vérif adversariale 3 lentilles)

> Méthode : 2 fenêtres glissantes de 30 j (POST 28/05→26/06 vs contrôle PRE 28/04→27/05) + baseline Phase-1 90 j. Toutes les conclusions causales ont été passées au crible (refus/confirmation). Échantillon home très faible → précision faible, à lire en tendance.

**A. Home « brand » consolidée — mais ce n'est PAS le SEO on-page de la refonte qui l'explique.**
Clics home 6 (PRE 30j) / 8 (baseline 90j) → **23** (POST) ; CTR **4,8 % → 27,4 %** (intervalles de confiance Wilson non chevauchants). MAIS : **100 % des clics home sont la requête de marque « myselfmonart »** (PRE 6/6, POST 23/23). Le site était **déjà n°1 en brand avant** la refonte (pos 1,00) et a même légèrement reculé (pos **1,91**). Le gain de clics vient de **plus d'impressions brand** (23 → 45) = plus de gens qui cherchent la marque = **demande de marque** (email, lancements poster/foot, social de juin), pas du SEO de la home. Et les **impressions home ont baissé** (125 → 84) : le gain est un effet CTR / nettoyage-SERP sur une base brand qui rétrécit, pas de la portée nouvelle.

**B. Le « bond » de position 13,90 → 5,77 n'est PAS un vrai gain de ranking.**
C'est une lecture **mixte et peu précise** : mélange d'un **changement de mix de requêtes** (part brand des impressions home 18 % → 54 %) et d'un mouvement intra-segment, sur 84 impressions (±~1 position de bruit). Le terme brand lui-même a **empiré** (1,00 → 1,91). → Ne pas lire cette moyenne comme « la home se classe mieux ».

**C. Objectif cœur PAS ENCORE atteint — et non attendu à J+30 (sur les rails, non prouvé).**
« tableau décoration murale » (exact) = **0 impression sur la home**, PRE et POST. Aucune variante suffixée n'est servie par la home (collections/blogs les portent). 30 jours, c'est **bien trop court** pour qu'une page neuve gagne un head term commercial concurrentiel — la stratégie verrouillée (décision 2) n'a jamais parié sur un combat frontal rapide. En plus, le cluster « tableau décoration* » est en **déclin d'impressions** sur la fenêtre (~50-75/j début mai → ~23-30/j fin juin) : le terme est devenu **plus dur**, pour des raisons exogènes à la page. Verdict : **« pas encore, et pas attendu »**, pas « échec » (ne déclenche pas un relaunch).

**D. Pas de cannibalisation home ↔ collections sur le head term — mais le design n'est pas encore *testé*.**
La home n'apparaît sur **aucune** variante « tableau décoration murale* » → 0 chevauchement. Mais c'est parce que la home a **0 impression** sur le terme (= même fait que C : on ne cannibalise pas ce sur quoi on ne se classe pas). Donc le design anti-cannibalisation est **« pas encore éprouvé »**, pas « validé ». À logger (hors périmètre home) : cannibalisation **intra-collections réelle** sur des termes catégorie (tableau cuisine sur 4 pages, zen↔japonais, africain↔ethnique) + brand éparpillé sur 14 pages.

**E. La baisse site-wide FR est exogène à la home — cause documentée = ALGORITHMIQUE, pas « saisonnalité ».**
Pages FR en baisse POST vs PRE : salon **179 → 109** clics (−39 %, imp 11 527 → 8 524), frida **43 → 15** (−65 %), africain **72 → 41** — mais **inégal** (couleur +5 %, africain pos stable) → incompatible avec un seul facteur saisonnier uniforme. La home (84 imp) ne sert pas ces termes → **non attribuable à la refonte**. Cause documentée (mémoire `project_web_collections_regression_jan2026`, **validée GA4 le 2026-06-05**) = **Google December 2025 Core Update** (spécifique à l'organique) + **core update mai-2026 en cours** chevauchant cette fenêtre → **re-rating algorithmique = hypothèse dominante**. La saisonnalité estivale est un facteur de compoundage **possible**, pas la cause principale. Tests pour trancher (hors périmètre J+30 home) : YoY juin-2025 + cross-check GA4 organique vs tous canaux. ⚠️ **Mission 2 (Collection Salon) J+30 tombe demain (2026-06-28)** sur cette même page salon en forte baisse → **ne pas pré-juger « saisonnier »**, lecture dédiée demain.

**F. Action (plan growth : maintenance 4-6h/sem, cible Q4) — garder en suivi, PAS de relaunch + 3 quick-wins gratuits.**
Mission 1 reste en 📈 **suivi**. Pas de mission lourde (cohérent avec le plan). Re-check du head term à une **fenêtre Q4** (retour de la demande saisonnière) ; le head term a besoin de **renforcement topique/éditorial dans le temps**, pas d'un relaunch. *Robustesse :* même en softant B et E, l'action ne change pas — une preuve faible de gain de ranking **renforce** « attendre ». Quick-wins sanctionnés par le plan (positions title/meta) :
1. ✅ **Meta description home = LIVE & conforme** (vérifié 2026-06-27 ; décision 20). Title document à reconfirmer proprement (le `<title>France</title>` capté = artefact SVG drapeau), mais la config Admin est manifestement déployée → action « Title+Meta » de STRATEGY = **faite**.
2. ✅ **FAQPage schema présent + valide** en live (+ Organization, Store, BreadcrumbList, ItemList, AggregateRating, Review…). Mais **rich snippet FAQ visible peu probable** : Google a restreint les FAQ rich results aux sites autoritaires (santé/gov) depuis 2023 → bénéfice réel = **complétude schema + citabilité GEO/IA**, pas un snippet SERP visible.
3. **Discipline cadence** : J+14 sauté (logué) → ne pas laisser Q4 être le 1er datapoint depuis J+30 ; tenir un **check léger mensuel** home + head term.

## Comment lancer le check (procédure)

Via le skill **`gsc-query`** (local). Requêtes utiles :

1. **Home sur N jours** : `query --dimensions query --page https://www.myselfmonart.com/ --page-operator equals --country fra` (period adaptée)
2. **Keyword cible** : `query --dimensions query,page --query "tableau décoration murale" --query-operator contains --country fra`
3. **Cannibalisation** : `query --dimensions query,page --query "tableau" --query-operator contains --country fra` → vérifier si home ET /collections/tableau-salon sortent sur les mêmes requêtes
4. **Rich snippets FAQ** : non visible dans GSC directement → vérifier via Google Rich Results Test sur l'URL home, ou recherche manuelle des questions FAQ dans la SERP

Après chaque check : remplir la ligne du journal + mettre à jour le tableau de bord et cocher l'échéance dans [ROADMAP](../../ROADMAP.md).

## Améliorations mineures en attente (non bloquantes, cf. PHASE-5)

- A11y : contraste sur 1 élément, liens icônes / SVG drapeaux (sélecteur pays) sans nom accessible
- Fix de fond n8n email-hub : ajouter un node "Respond to Webhook" (erreur "did not return a response")
