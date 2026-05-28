# STRATEGY — Mission SEO/GEO homepage MyselfMonArt

> **Doc maître**. Mis à jour à chaque décision verrouillée.
> Dernière révision : 2026-05-26
>
> ⚠️ **IMPORTANT** : ce dossier `seo/` doit être COMMITÉ dans git. Une première version (non commitée) a été effacée par un `git clean` lors de l'implémentation. Ne pas laisser ces docs non trackés.

---

## 🎯 Mission

Reconstruire la homepage FR de [myselfmonart.com](https://myselfmonart.com) pour qu'elle soit optimisée SEO **et** GEO (citable ChatGPT/Perplexity/AI Overviews) sur **"tableau décoration murale"** et son cluster sémantique.

**Contexte** : SAS KINDOPIA, fondateur Walid (signature publique = **Hayate**). Boutique Shopify de tableaux décoration murale premium. Production à la demande. Cible : femmes 35+, déco intérieure. Catalogue 700+ produits / ~50 collections. Univers premium-émotionnel-cocon.

---

## ✅ Décisions verrouillées

### Stratégie globale

1. **Mot-clé principal** = `tableau décoration murale` (seul terme couvrant tout le catalogue, money keyword).
2. **Pas de combat frontal** contre Maisons du Monde / Izoa / Desenio / La Redoute / IKEA / Posterlounge. Stratégie : home = **signal d'autorité topique** (richesse sémantique + schema + maillage 50 collections) + **citabilité IA** (premium-émotionnel-France-Hayate). Les **collections captent le long-tail**.
3. Skill `JeffLi1993/seo-audit-skill` finalement **non installé** — audit fait via outils standards (Lighthouse, Rich Results Test, Schema validator, gsc-query).

### Post-Phase 1 (data GSC réelle)

4. **Stratégie multi-keyword hiérarchisée** :
   - Niveau 1 (Title + H1) : `tableau décoration murale`
   - Niveau 2 (H2 + intro) : `tableau décoration`, `décoration murale`, `tableau mural`
   - Niveau 3 (sous-sections + maillage) : `tableau salon`, `tableau africain`, `tableau japonais`, `tableau frida kahlo`, `tableau bureau`, `tableau cuisine`, `tableau chambre`, `tableau zen`, `tableau coloré`
   - Niveau 4 (GEO) : `art mural`, `tableau premium`, "studio France", "encres archival", "Hayate"
5. **Pas de redirection 301** pour `/pages/tableau-decoration` : page supprimée (confirmé Admin). À vérifier en Phase 5 que Google a désindexé.
6. **Différenciation sémantique stricte** home vs `/collections/tableau-salon` :
   - Home → univers + marque (tableau décoration murale générique + studio + maillage)
   - `/collections/tableau-salon` → pièce + style

### Post-Phase 2 (SERP FR)

7. **Format** : structure hybride catégorie + magazine (grille collections + éditorial dense 2500-3500 mots).
8. **Template cible** : 10-14 H2 (intro/USPs, par pièce, par style, par format, qualité, conseils, FAQ).
9. **Schema minimum** : Organization + Store + BreadcrumbList + ItemList + **FAQPage** (différenciation, aucun concurrent top 10 ne l'a).
10. **FAQ structurée** : 6-7 questions PAA confirmées.
11. **USPs** : Studio France + encres archival 75 ans + toile 285g + cadre bois massif + signature Hayate.

### Internationalisation

12. **Mission actuelle = SEO FR uniquement**. Versions EN/DE = mission ultérieure (hreflang, canonical par locale).

### Post-Phase 3 (audit concurrents + faits structurels)

13. **Pivot positionnement géographique — CRITIQUE** : impression réellement en Allemagne → **abandon de "Made in France" / "Fabriqué en France"** (risque DGCCRF art. L121-2, amende jusqu'à 300k€, risque réputationnel + citabilité IA). À la place :
    - "Studio créatif français à Toulouse" (service client + DA)
    - "Siège social à Paris" (mentions légales)
    - "Conçu en France" / "Direction artistique française"
    - "Imprimé en Europe" (assumé, gage de qualité)
14. **Photos équipe** : Walid les affiche + logo/mascotte comme mark.
15. **Trustpilot 4.1/80** : afficher sans le chiffre en gros (comparaison déloyale vs Izoa 4.7 sur Avis Vérifiés). Header = badge sans chiffre ; section UGC = photos + volume "80 retours vérifiés" ; footer = badge complet. Note 4.1 reste dans le schema (honnêteté IA/Google). NE PAS argumenter publiquement "Trustpilot plus indépendant".
16. **Téléphone SAV affiché** : `09 60 44 61 50`.
17. **Œuvres** : "sélectionnées + retouchées à la main par le DA" (Walid, graphiste-illustrateur). Mention discrète "peinture à la main par artiste sur devis".
18. **Ancienneté 2022** mentionnée mais pas centrale. Pousser plutôt formation graphiste + "1 015 tableaux livrés".

### Post-Phase 4 (génération home)

19. **Title** (53 char) : `Tableau décoration murale — Studio Paris | MyselfMonArt`
20. **Meta description** (152 char) : `Tableaux décoration murale curés à la main par notre studio français à Paris. Toile 285g, encres archival 75 ans, cadre bois massif. ⭐ Trustpilot.`
21. **H1** (corrigé Phase 5A) : `Tableau décoration murale, l'art d'habiter vos murs` — keyword en tête. Eyebrow = "Studio créatif français · Paris".
22. **Copy** ~2 750 mots voix Hayate. Signature : "Avec soin, — Hayate / Team MyselfMonArt".
23. **5 schemas** : Organization + Store + BreadcrumbList + ItemList (statiques dans `snippets/json-ld-home.liquid`) + FAQPage (dynamique dans `sections/collapsible-content.liquid` via `emit_faq_jsonld`).
24. **Chiffre "1 015 tableaux"** affirmé positivement (Walid a préféré la version factuelle simple à la version défensive).
25. **Stratégie Trustpilot affichage** : photos UGC en hero, volume "80 retours vérifiés", note 4.1 uniquement dans schema.

---

## 📚 Faits structurels MyselfMonArt (référence permanente)

| Fait | Valeur |
|---|---|
| Création | 2022 |
| Société | SAS KINDOPIA |
| Siège social | Paris (mentions légales, domiciliation) |
| Studio créatif & SAV | Toulouse |
| Impression | Allemagne (UE — "imprimé en Europe") |
| Tableaux livrés depuis 2022 | ~1 015 |
| Catalogue | 700+ produits / ~50 collections |
| Cible | Femmes 35+, premium-conscient |
| Trustpilot | 4.1/5 sur 80 avis |
| UGC photos clients | ~20+ (23 témoignages intégrés) |
| Téléphone SAV | 09 60 44 61 50 |
| Fondateur / DA | Walid (signature publique "Hayate"), graphiste-illustrateur |
| Logo | Mascotte |
| Œuvres | Sélectionnées + retouchées à la main par le DA. Pas d'artistes nommés. |
| Service premium | Peinture à la main par artiste sur devis |
| Qualité matérielle | Toile 285g/m², encres archival 75 ans, cadre bois massif |
| Voix de marque | Premium-émotionnel-cocon, vouvoiement, "Hayate / Team MyselfMonArt" |

---

## 📊 État d'avancement

| Phase | Statut | Doc |
|---|---|---|
| Phase 1 — Validation keyword + cannibalisation | ✅ Validée | [PHASE-1-keyword-validation.md](PHASE-1-keyword-validation.md) |
| Phase 2 — Décodage SERP FR | ✅ Validée | [PHASE-2-serp-decoding.md](PHASE-2-serp-decoding.md) |
| Phase 3 — Audit 3 concurrents | ✅ Validée | [PHASE-3-competitive-audit.md](PHASE-3-competitive-audit.md) |
| Phase 4 — Génération homepage | ✅ Validée | [PHASE-4-homepage-deliverables.md](PHASE-4-homepage-deliverables.md) |
| Phase 5 — Audit technique + déploiement | ✅ **Déployée en LIVE le 2026-05-28** (SEO Lighthouse 100, LCP 561ms, CLS 0.00) | [PHASE-5-technical-audit.md](PHASE-5-technical-audit.md) |

**🚀 MISSION DÉPLOYÉE EN PRODUCTION le 2026-05-28.** Nouvelle home live sur myselfmonart.com (thème live). Ancienne `/pages/tableau-decoration` en 404 (OK). Erreur console `Shopify is not defined` corrigée.

**Actions post-déploiement restantes :**
- **Walid** : Search Console → soumettre `https://www.myselfmonart.com/` pour ré-indexation prioritaire (Claude ne peut pas le faire via l'interface GSC)
- **Suivi J+14 (2026-06-11)** et **J+30 (2026-06-27)** via skill `gsc-query` : impressions/clics/position sur "tableau décoration murale" + cluster vs baseline (home = 8 clics/90j en Phase 1), apparition rich snippets FAQ, absence de cannibalisation home vs /collections/tableau-salon
- **Améliorations a11y optionnelles** (non bloquantes) : contraste 1 élément, liens icônes/SVG drapeaux sans nom accessible (cf. PHASE-5 §5B)

**Implémentation** : faite sur la branche `seo-homepage-refonte` (42 commits). 16 sections dans index.json, nouvelles sections Liquid (hero-with-text, usps-bento, cards-carousel, cards-grid, prose, signature, testimonials-carousel, image-with-list), snippet json-ld-home.liquid, FAQPage dynamique. Double schema corrigé (commit 67af54e). H1 + signature corrigés en Phase 5A.

---

## 🚦 Points en attente

- **5B audit dynamique** : à lancer après push sur theme draft/preview Shopify
- **Walid** : configurer Title + Meta home dans Shopify Admin → Préférences (pas dans le theme)
- **Walid** : créer/remplacer les 16 visuels finaux (hero ×2, équipe ×1, 6 pièces, 8 styles) — placeholders ou réels à vérifier en 5B
- **Committer `seo/`** pour ne pas reperdre les docs
- Installer Serper MCP (optionnel) pour confirmer AI Overview
- Versions traduites EN/DE (mission ultérieure)

### Action de fond hors mission SEO

- **Volume avis Trustpilot** : ~20 avis/an. Viser 300-500 d'ici 12-18 mois via email auto J+30 post-livraison. CRO/marketing, mission distincte.

---

## 🗂️ Règles de fonctionnement (Walid)

1. Jamais halluciner de data → sinon demander ou proposer un MCP.
2. Avancer phase par phase, validation entre chaque.
3. Toujours expliquer le pourquoi.
4. Voix de marque : vouvoiement, premium-émotionnel, "Hayate / Team MyselfMonArt".
5. Workflow déploiement : **jamais push direct sur main** → edit → staging → validation visuelle Walid → merge main = live.
6. Conventions sections Shopify : Tailwind only, vars globales fonts/couleurs, admin-configurable, SEO + a11y impeccables.
7. Format : markdown clair, tableaux quand pertinent.

---

## 📎 Références

- GSC skill : `~/.claude/skills/gsc-query/SKILL.md` (siteUrl `sc-domain:myselfmonart.com`, country `fra`)
- Memory : `project_myselfmonart_facts.md`, `project_seo_homepage_fr.md`, `feedback_collaboration_walid.md`, `feedback_deploy_workflow.md`, `feedback_shopify_section_conventions.md`
