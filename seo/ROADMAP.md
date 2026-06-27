# 🗼 ROADMAP — Pilotage SEO MyselfMonArt (sous-chantier)

> ⚠️ **DEPUIS LE 2026-06-10, le point d'entrée unique du pilotage business est [growth/PLAN.md](../growth/PLAN.md)** (plan de croissance 12 semaines, prime sur toutes les décisions antérieures). Cette roadmap reste la référence du **sous-chantier SEO uniquement** (missions, suivis GSC).
> **Cadrage issu du plan global :** SEO en mode **maintenance, cappé 4-6h/semaine** (réindexation images, suivi GSC 30 min/sem, quick wins title/meta positions 4-12). **Chantier i18n Phase 2 (back-end) GELÉ 12 semaines** (91 % des ventes FR, risque hreflang en pleine récupération). Pas de nouvelle mission lourde avant lecture des suivis J+30.
> Dernière révision : 2026-06-27 (suivi GSC J+30 Homepage consigné)

---

## 🎯 Objectif business global

**Augmenter les ventes de MyselfMonArt** (tableaux décoration murale premium) en construisant une **autorité SEO + GEO progressive**, page stratégique par page stratégique.

Logique d'**amélioration continue** : pour chaque page/cluster important → on optimise (mission dédiée) → on déploie → on **suit via Google Search Console** à J+14 / J+30 → on mesure l'impact réel → on itère. Chaque mission s'appuie sur l'autorité construite par les précédentes.

---

## 📊 Tableau de bord des missions

| # | Mission | Keyword cible | Statut | Déployé le | Prochain check GSC | Dossier |
|---|---|---|---|---|---|---|
| 1 | **Homepage** | tableau décoration murale | 📈 **En suivi** | 2026-05-28 | J+30 ☑ (27/06) · prochain : **fenêtre Q4** | [missions/homepage/](missions/homepage/) |
| 2 | **Collection Salon** | tableau salon (+ chic/déco/moderne) | ✅ **Déployée** | 2026-05-29 | J+14 : **2026-06-12** · J+30 : **2026-06-28** | [missions/collection-salon/](missions/collection-salon/) |
| 3 | **Accessibilité thème** (transverse) | — (qualité/UX, cible Lighthouse a11y 95+) | 🔜 À démarrer | — | — | [missions/a11y-theme/](missions/a11y-theme/) |
| 4 | **Refonte fiche produit `painting`** (transverse) | — (template SOCLE de tous les tableaux : schema, Hn, a11y, LCP) | ✅ **Déployée** | 2026-05-31 | J+14 : **2026-06-14** · J+30 : **2026-06-30** | [missions/product-painting/](missions/product-painting/) |

Légende statut : 🔜 à démarrer · 🟡 en cours · ✅ déployée · 📈 en suivi · 🏁 clôturée (suivi terminé)

---

## 📅 Échéancier de suivi (toutes missions confondues)

| Date | Action | Mission | Fait ? |
|---|---|---|---|
| ~~2026-06-11~~ | ~~Check GSC **J+14**~~ | Homepage | ⊘ **sauté** (pivot growth-plan du 10/06) |
| **2026-06-27** | Check GSC **J+30** | Homepage | ☑ **Fait** — head term « tableau décoration murale » toujours **0 imp** sur la home ; gain home = **brand uniquement** ; baisse site-wide = **core update** (pas la home). Verdict : garder en suivi, pas de relaunch, re-check Q4. Cf [FOLLOWUP](missions/homepage/FOLLOWUP.md) |
| ~~2026-05-29~~ | ~~Déploiement live~~ | Collection Salon | ☑ (fichiers déployés ; reste : assigner template + title/meta en admin) |
| **2026-06-12** | Check GSC **J+14** | Collection Salon | ☐ |
| **2026-06-28** | Check GSC **J+30** | Collection Salon | ☐ |
| ~~2026-05-31~~ | ~~Déploiement live~~ | Refonte fiche painting | ☑ |
| **2026-06-14** | Check GSC **J+14** | Refonte fiche painting | ☐ |
| **2026-06-30** | Check GSC **J+30** | Refonte fiche painting | ☐ |

> ⚠️ Les rappels email automatiques ont été désactivés (Walid relance manuellement). Quand il dit « lance le suivi SEO », exécuter le check de la mission concernée via le skill `gsc-query` et consigner le résultat dans le `FOLLOWUP.md` de la mission + cocher ci-dessus.

---

## 🧭 Comment naviguer cette architecture

```
seo/
├── ROADMAP.md                  ← CE doc : état global, missions, échéances
├── shared/
│   └── METHODOLOGY.md             ← méthodo réutilisable (5 phases) + voix + conventions
└── missions/
    ├── homepage/               ← Mission 1 (déployée)
    │   ├── STRATEGY.md         ← décisions verrouillées de la mission
    │   ├── PHASE-1..5.md       ← livrables détaillés par phase
    │   └── FOLLOWUP.md         ← journal de suivi GSC (résultats J+14/J+30...)
    └── collection-salon/       ← Mission 2 (à venir)
        └── README.md           ← brief + baseline + instructions agent
```

**Réflexe pour tout agent / toute session** :
1. Lire **ROADMAP.md** (ici) → comprendre l'état global et les priorités
2. Lire **shared/METHODOLOGY.md** → méthodo + voix de marque
3. Aller dans **missions/<mission active>/** → contexte détaillé

---

## 📌 Règles de tenue à jour (IMPORTANT)

- **À chaque jalon** (déploiement, check GSC, démarrage/clôture de mission) → mettre à jour CE doc (tableau de bord + échéancier).
- Chaque mission a son **`FOLLOWUP.md`** où sont consignés les résultats GSC dans le temps.
- Chaque nouvelle mission = nouveau dossier `missions/<nom>/` + suit le `shared/METHODOLOGY.md`.
- Ne jamais laisser ce doc diverger de la réalité : c'est la source de vérité du pilotage.
- Les **faits structurels** de l'entreprise (Paris/Toulouse/Allemagne, Trustpilot, etc.) sont en mémoire Claude (`project_myselfmonart_facts.md`), pas ici.

---

## 🔗 Références transverses

- **Skill de suivi** : `gsc-query` (local) — siteUrl `sc-domain:myselfmonart.com`, country `fra`
- **Déploiement** : push `main` → thème live New MyselfMonArt (#167301710171) via GitHub Actions. La branche staging et le thème "GitHub Staging" ont été supprimés le 2026-05-31 (workflow simplifié main-only).
- **Faits structurels marque** : mémoire `project_myselfmonart_facts.md`
- **Différenciation sémantique inter-pages** (anti-cannibalisation) : la home vise le générique « tableau décoration murale » ; les collections visent pièce/style (ex : salon = « tableau salon » + chic/moderne/déco). À respecter dans chaque nouvelle mission.
