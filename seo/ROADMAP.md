# 🗼 ROADMAP — Pilotage SEO MyselfMonArt (sous-chantier)

> ⚠️ **Le point d'entrée du pilotage business reste [growth/PLAN.md](../growth/PLAN.md)** (plan de croissance du 2026-06-10). Cette roadmap est la référence du **sous-chantier SEO** : missions, chantiers, suivis GSC.
> **Cadrage du plan global :** SEO en **maintenance, cappé 4-6 h/semaine**. Le gel de 12 semaines du chantier i18n Phase 2 (décidé le 10/06 sur la base « 91 % des ventes en France ») est **arrivé à échéance le 2 septembre**, et sa prémisse ne tient plus : **49 % des commandes de juillet-septembre sont livrées hors de France**. Décision à prendre, cf. § Décisions ouvertes.
> Dernière révision : **2026-10-04** (bilan complet GSC + Merchant Center + GA4 + Shopify ; 2 correctifs thème déployés et vérifiés en ligne ; refus de livraison Merchant Center corrigés).

---

## 🎯 Objectif business global

**Augmenter les ventes de MyselfMonArt** (tableaux décoration murale premium) en construisant une **autorité SEO + GEO progressive**, page stratégique par page stratégique.

Logique d'**amélioration continue** : pour chaque page/cluster important → on optimise (mission dédiée) → on déploie → on **suit via Google Search Console** → on mesure l'impact réel → on itère. Chaque mission s'appuie sur l'autorité construite par les précédentes.

---

## 📈 Bilan au 2026-10-04

Rapport complet avec graphiques : [Bilan SEO MyselfMonArt](https://claude.ai/artifact/XjCFUvmodS7k5Bbsy6CSdf) (artifact privé).

**Verdict : le creux est passé.** Fond touché fin juin, juste après la core update du 21/05 au 02/06. Reprise chaque semaine depuis la mi-juillet, **sans aucune core update depuis le 2 juin** (seulement des mises à jour anti-spam : 24-26/06, 18-21/08, à partir du 24/09). La reprise vient donc du travail livré, aidée par la rentrée. **Point faible : le web France reste à −49 % sur un an.**

| Indicateur | Juin 2026 | Sept. 2026 | Sept. 2025 |
|---|---|---|---|
| Clics Google tous pays (web + images + fiches Shopping) | 1 466 | **3 057** | 3 685 |
| Clics web, France | 705 | 1 087 | 2 146 |
| Clics web, hors France | 352 | 808 | 461 |
| Clics Google Images, tous pays | 409 | 700 | 1 073 |
| Clics fiches Shopping gratuites (Merchant Center) | 0 | 462 | 5 |
| Commandes Shopify | 6 | **20** | 11 |
| Part des commandes livrées hors de France | 0 % | 40 % | 0 % |

- **Hebdomadaire** : web France à **92 %** de son niveau d'avant mai (254 contre 275 clics/semaine) ; web + images tous pays à **121 %** (596 contre 492).
- **Juillet-septembre** : **47 commandes contre 38** (+24 %), **4 729 € contre 4 354 €** TTC (+9 %). France 24 contre 34 (−29 %), étranger 23 contre 4. Premier trimestre de 2026 au-dessus de l'an dernier.
- **Attribution** (achats suivis par GA4) : en septembre, 14 des 17 achats suivis viennent de Google en recherche naturelle (Shopify : 20 commandes). Sur le T3, 9 des 20 achats issus de Google ont démarré sur une page anglaise ou allemande.
- **Assistants IA** : ChatGPT 99 visites (juillet) → 317 (septembre), encore presque sans vente.
- ⚠️ **Mesure GA4** : ~94 % des sessions de septembre sont des robots (75 020 sessions « directes » de 4 s depuis Singapour, d'autres depuis les États-Unis, la Suède, l'Irlande, et `trafficheap.cc`). Le canal Organic Search est propre ; les totaux et taux de conversion GA4 sont faux. Juger les ventes sur Shopify.
- ⚠️ **Mesure GSC** : Search Console ne détaille par page ou par requête qu'environ 45 % des clics de cette propriété. Les tableaux par page se lisent en tendance.

---

## 📊 Tableau de bord des missions

| # | Mission | Keyword cible | Statut | Déployé le | Dernière lecture | Prochain check | Dossier |
|---|---|---|---|---|---|---|---|
| 1 | **Homepage** | tableau décoration murale | 📈 En suivi, **objectif non atteint** | 2026-05-28 | J+129 (04/10) : toujours **0 impression** sur le head term ; 47 clics/90 j, dont 46 sur « myselfmonart » | Dernier contrôle **mi-novembre**, puis clôture | [missions/homepage/](missions/homepage/) |
| 2 | **Collection Salon** | tableau salon (+ chic/déco/moderne) | 📈 En suivi | 2026-05-29 | J+128 (04/10) : « tableau salon » **pos 11,3 (mai) → 6,1 (sept.)** ; page à 127 clics/28 j (75 au creux) ; variantes « mural / déco salon » en recul | ~2026-11-01 (effet du correctif pagination) | [missions/collection-salon/](missions/collection-salon/) |
| 3 | **Accessibilité thème** (transverse) | — (cible Lighthouse a11y 95+) | 🔜 À démarrer | — | Lighthouse mobile 04/10 : a11y **90** (salon), **97** (fiche produit) | — | [missions/a11y-theme/](missions/a11y-theme/) |
| 4 | **Refonte fiche produit `painting`** (transverse) | — (template socle de tous les tableaux) | 📈 En suivi | 2026-05-31 | J+126 (04/10) : fiches produit FR 11 → 22 clics/28 j ; extraits produit (tous pays) 448 → 928 clics/28 j | Novembre | [missions/product-painting/](missions/product-painting/) |

Légende statut : 🔜 à démarrer · 🟡 en cours · ✅ déployée · 📈 en suivi · 🏁 clôturée (suivi terminé)

---

## 🧱 Chantiers SEO livrés depuis juin (hors missions)

| Chantier | Livré le | Résultat au 2026-10-04 | Suivi |
|---|---|---|---|
| Éditorial E-E-A-T de **46 collections** (intro / guide / FAQ par métachamps) | 2026-06-05 | Clics par 28 j : **409** avant la core update → **239** au creux (J53) → **324** (J118). Reprise réelle, encore −21 % sous le niveau d'avant mai. `tableau-couleur` 21 → 57 ; `tableau-japonais` pos 10,3 → 7,8 | [suivi-collections-tracking.md](suivi-collections-tracking.md) |
| Image brute `media[1]` réintroduite (Google Images) | 2026-06-03 | Images FR : 234 clics (juin) → 376 (sept.), encore −46 % sur un an | GSC `type=image` |
| Collections **posters / affiches** + cocon poster sur la home | juillet 2026 | 33 collections avec impressions (2 698 sur 28 j) pour 4 clics : trop jeunes (positions 10 à 40). Les posters se vendent par les fiches et Shopping (10 commandes sur 20 en septembre) | GSC |
| **Nettoyage marchés × langues** (5 947 URLs retirées, hreflang 58 → 32) | 2026-07-30 | ✅ **Pari gagné** : `/de-de/` ×6 et `/es-es/` ×5 en impressions/jour ; versions génériques et pays gardées ×3,5 à ×12 ; anglais +23 % au total | [i18n-markets-cleanup-plan.md](i18n-markets-cleanup-plan.md) |
| **Fiches Shopping gratuites** (autofeed Merchant Center) | 2026-08-05 | Canal mort depuis juillet 2025 (≤ 5 clics/mois) → **462 clics en septembre** ; 11 484 produits approuvés sur 12 671 ; 293 refusés, dont 280 pour la livraison (corrigés le 2026-10-04, cf. point 3 ci-dessous) | Merchant API v1, rapport de performance |
| **Correctifs pagination + images des vignettes** | 2026-10-04 (`e2049eb`, `a0dbb5c`) | ✅ Déployés et vérifiés en ligne (détail ci-dessous). Effet GSC à lire début novembre | Échéancier |

### Correctifs du 2026-10-04 (appliqués et vérifiés)

1. **Éditorial dupliqué sur la pagination.** L'intro, le guide, le cocon et la FAQ (avec son JSON-LD FAQPage) s'affichaient sur chaque `?page=N`, qui devenait une quasi-copie de la page 1. Constat GSC : sur « tableau cuisine », Google classait `tableau-cuisine?page=4` en position 11,5 (343 impressions sur 28 j) et la vraie page vers la 30ᵉ place ; la part des `?page=N` dans les impressions des collections est passée de 3 % à 7 % depuis l'ajout de l'éditorial. **Correctif** : ces blocs ne sont rendus que sur la page 1 (`current_page`) ; le H1 reste sur toutes les pages. Fichiers : `snippets/collection-editorial-auto.liquid`, `sections/collection-editorial.liquid`, `sections/main-collection-banner.liquid` (description des collections sans guide), `sections/collapsible-content.liquid` (FAQ du salon ; sans effet hors collections). Le défilement infini n'est pas concerné : il ne récupère que la grille.
2. **Vignettes produit téléchargées en pleine résolution.** `sizes` utilisait des `%` (invalides) et le `srcset` sautait de 500 px à l'original : sur mobile, chaque vignette chargeait l'image complète. **Correctif** dans `snippets/card-product.liquid` : `sizes="(min-width: 1280px) 312px, (min-width: 1024px) 33vw, 50vw"` + paliers 600 / 800 / 1000 px. Mesuré dans un navigateur sur une vraie image : mobile **322 Ko → 31 Ko** par vignette ; écran Retina : l'original laisse place au 800 px ; ordinateur standard : 300 → 400 px (+12 Ko) pour rester net sur les grilles sans filtres.

Vérifications avant déploiement : rendu des 5 fichiers avec un moteur Liquid (page 1 complète, page 3 réduite au H1, FAQ inchangée sur les fiches produit et la home, JSON-LD valide) ; choix d'image mesuré dans Chrome en mobile et en ordinateur.

Vérifications en ligne après déploiement (run GitHub Actions vert, « Aucun fichier refusé par Shopify », réponses fraîches `cf-cache-status: DYNAMIC`, URLs jamais visitées) : `tableau-bleue` page 1 complète (H1, guide, FAQ, JSON-LD) ; pages 2 de `tableau-bleue`, `tableau-salon`, `tableau-japonais` et `posters-affiches-zen` réduites au H1, sans guide ni FAQ ; FAQ toujours présente sur une fiche produit et sur la home anglaise ; nouveau `sizes` sur toutes les vignettes. Aucune collection en ligne n'affiche aujourd'hui la description de la bannière (toutes ont un éditorial) : ce volet est préventif.

3. **Refus de livraison dans Merchant Center (280 produits).** L'autofeed récupère parfois un produit sur une page dont la devise n'est pas celle du pays visé : page anglaise `/en/` en euros pour les USA (92), le Canada (26) et le Royaume-Uni (2) ; page suisse `/fr-ch/` en CHF (96) et `/fr-ca/` en CAD (4) pour la France. La livraison n'étant réglée que dans la devise locale de chaque pays, ces fiches étaient refusées. S'y ajoutaient 59 produits pour l'Irlande, sans aucun service de livraison, alors que Shopify la livre (zone UE). Pour 234 de ces produits, c'était la seule fiche. **Cause** : les services de livraison de Merchant Center avaient été créés par l'app Google & YouTube, qui n'est plus installée sur Shopify ; ils sont figés depuis. **Correctif appliqué** via l'API Merchant v1 : 6 services de livraison offerte ajoutés, avec les délais déjà réglés pour chaque pays (Irlande EUR, USA EUR, Canada EUR, Royaume-Uni EUR, France CHF, France CAD). Les 13 services d'origine sont inchangés (relecture comparée à la sauvegarde). Conséquence assumée : les 100 fiches françaises en CHF/CAD mènent vers la page suisse ou canadienne, prix affiché dans cette devise. Laissés de côté : 1 produit vu en couronnes danoises pour la Belgique (artefact) et 13 produits sans prix (hors livraison). Constat annexe, corrigé dans la foulée (`36ec5bc`, déployé le 2026-10-04) : hors du français, le JSON-LD produit annonçait `addressCountry` et `applicableCountry` « France », « Frankreich », « Francia » ou « Frankrijk » au lieu de « FR ». Le réglage de section `ships_country` était un champ texte, donc traduit avec la boutique ; il devient une liste, dont la valeur n'est jamais traduite.

---

## 📅 Échéancier de suivi

| Date | Action | Concerne | Fait ? |
|---|---|---|---|
| ~~2026-06-11~~ | ~~Check GSC J+14~~ | Homepage | ⊘ sauté (pivot growth-plan du 10/06) |
| 2026-06-27 | Check GSC J+30 | Homepage | ☑ Fait, cf [FOLLOWUP](missions/homepage/FOLLOWUP.md) |
| ~~2026-06-12 et 06-28~~ | ~~Checks GSC J+14 et J+30~~ | Collection Salon | ⊘ sautés (en plein core update, lecture faussée) → remplacés par la lecture J+128 |
| ~~2026-06-14 et 06-30~~ | ~~Checks GSC J+14 et J+30~~ | Fiche painting | ⊘ sautés → remplacés par la lecture J+126 |
| 2026-07-28 | Reconstruction des snapshots collections (J0 → J53) | 46 collections | ☑ Fait |
| fin août | Verdict du nettoyage marchés × langues | i18n | ☑ Fait le 2026-10-04 : gagné |
| **2026-10-04** | **Bilan complet + lectures J+126 / J+128 / J+129 + snapshot J118** | Tout | ☑ Fait |
| 2026-10-04 | Déployer les 2 correctifs, puis vérifier en live : `?page=2` sans éditorial, page 1 intacte, nouveau `sizes` sur les vignettes | Correctifs | ☑ Fait (cf. détail plus haut) |
| ~2026-10-07 | Merchant Center : vérifier que les 280 refus de livraison sont levés (statuts produits, Merchant API v1) | Fiches Shopping | ☐ |
| **~2026-11-01** | Check GSC : « tableau cuisine » doit revenir sur la page 1 ; part des `?page=N` dans les impressions des collections sous 3 % | Correctifs | ☐ |
| ~2026-10-30 | Snapshot collections **J146** : `suivi-collections-snapshot.ps1 -Label J146` | 46 collections | ☐ |
| mi-novembre | Dernier contrôle du head term « tableau décoration murale » sur la home, puis clôture de la mission 1 | Homepage | ☐ |
| novembre-décembre | Surveiller le [tableau de bord Google](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history) : une core update de fin d'année est probable. **Aucun changement d'URLs, de marchés ou de templates collection pendant la saison cadeaux**, pour pouvoir lire son effet | Tout | ☐ |

> ⚠️ Les rappels email automatiques sont désactivés (Walid relance manuellement). Quand il dit « lance le suivi SEO », exécuter le check via le skill `gsc-query`, consigner le résultat dans le `FOLLOWUP.md` de la mission et cocher ci-dessus.
> ⚠️ **Toujours vérifier le calendrier des core updates avant de lire un suivi**, et comparer des fenêtres de 28 jours aux mêmes jours de semaine.

---

## ❓ Décisions ouvertes (Walid)

1. **International.** Le gel i18n reposait sur « 91 % des ventes en France ». Sur juillet-septembre, c'est 51 %. Faut-il traiter l'anglais et l'allemand comme des marchés à part entière pour le Q4 (fiches, alt, prix, livraison) ?
2. ~~**Merchant Center.** Corriger les ~280 refus de livraison.~~ ☑ **Fait le 2026-10-04**, cf. § Correctifs du 2026-10-04.
3. **Collection salon.** Reprendre nommément « tableau mural salon », « tableau déco salon » et « tableaux modernes pour salon » dans les intertitres et l'intro : ils faisaient le volume en 2025 et ont glissé.
4. **GA4.** Filtrer le trafic robot (Singapour, Chine, `trafficheap.cc`) ou s'en tenir aux commandes Shopify pour juger les ventes.

---

## 🧭 Comment naviguer cette architecture

```
seo/
├── ROADMAP.md                         ← CE doc : état global, missions, chantiers, échéances
├── shared/
│   └── METHODOLOGY.md                 ← méthodo réutilisable (5 phases) + voix + conventions
├── missions/
│   ├── homepage/                      ← Mission 1 (STRATEGY, PHASE-1..5, FOLLOWUP)
│   ├── collection-salon/              ← Mission 2 (README, STRATEGY, PHASES, FOLLOWUP)
│   ├── a11y-theme/                    ← Mission 3 (README = brief + backlog)
│   └── product-painting/              ← Mission 4 (README, FOLLOWUP)
├── suivi-collections-README.md        ← runbook du suivi des 46 collections (+ pièges de mesure)
├── suivi-collections-snapshot.ps1     ← script de snapshot GSC + GA4 (fenêtres de 28 j)
├── suivi-collections-tracking.md      ← tableau de suivi régénéré à chaque snapshot
├── i18n-markets-cleanup-plan.md       ← nettoyage marchés × langues (plan, journal, verdict)
└── poster-collections/                ← briefs et audit anti-cannibalisation des collections posters
```

**Réflexe pour tout agent / toute session** :
1. Lire **ROADMAP.md** (ici) → état global et priorités
2. Lire **shared/METHODOLOGY.md** → méthodo + voix de marque
3. Aller dans **missions/<mission active>/** → contexte détaillé

---

## 📌 Règles de tenue à jour (IMPORTANT)

- **À chaque jalon** (déploiement, check GSC, démarrage ou clôture de mission) → mettre à jour CE doc (tableau de bord + échéancier).
- Chaque mission a son **`FOLLOWUP.md`** où sont consignés les résultats GSC dans le temps.
- Chaque nouvelle mission = nouveau dossier `missions/<nom>/` + suit `shared/METHODOLOGY.md`.
- Ne jamais laisser ce doc diverger de la réalité : c'est la source de vérité du pilotage SEO.
- Les **faits structurels** de l'entreprise (Paris/Toulouse/Allemagne, Trustpilot, etc.) sont en mémoire Claude (`project_myselfmonart_facts.md`), pas ici.

---

## 🔗 Références transverses

- **Search Console** : skill `gsc-query` (local), siteUrl `sc-domain:myselfmonart.com`, country `fra`.
- **GA4** : `~/.claude/scripts/gsc/ga4.mjs`, propriété `374096343` (toujours passer `--limit 20000`).
- **Merchant Center** : compte `763175982`, API **Merchant v1 en REST** (l'API Content est arrêtée depuis le 2026-08-18, `merchant.mjs` ne fonctionne plus). Performance des fiches gratuites : `reports:search` sur `product_performance_view`. **Livraison** : réglée directement dans Merchant Center (`accounts/v1/accounts/763175982/shippingSettings`). L'app Google & YouTube n'est plus installée sur Shopify : une modification des zones de livraison Shopify ne se propage plus, il faut la reporter à la main.
- **Déploiement** : push `main` → thème live New MyselfMonArt (#167301710171) via GitHub Actions. Plus de branche staging depuis le 2026-05-31.
- **Faits structurels marque** : mémoire `project_myselfmonart_facts.md`.
- **Différenciation sémantique inter-pages** (anti-cannibalisation) : la home vise le générique « tableau décoration murale » ; les collections visent pièce/style (ex : salon = « tableau salon » + chic/moderne/déco). À respecter dans chaque nouvelle mission.
