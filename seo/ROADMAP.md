# 🗼 ROADMAP — Pilotage SEO/Croissance MyselfMonArt

> **CONTROL TOWER — point d'entrée unique.** Quand Walid demande « on en est où ? » ou « que doit-on faire ? », **la réponse est ici**.
> Dernière révision : 2026-05-28

---

## 🎯 Objectif business global

**Augmenter les ventes de MyselfMonArt** (tableaux décoration murale premium) en construisant une **autorité SEO + GEO progressive**, page stratégique par page stratégique.

Logique d'**amélioration continue** : pour chaque page/cluster important → on optimise (mission dédiée) → on déploie → on **suit via Google Search Console** à J+14 / J+30 → on mesure l'impact réel → on itère. Chaque mission s'appuie sur l'autorité construite par les précédentes.

---

## 📊 Tableau de bord des missions

| # | Mission | Keyword cible | Statut | Déployé le | Prochain check GSC | Dossier |
|---|---|---|---|---|---|---|
| 1 | **Homepage** | tableau décoration murale | ✅ **Déployée** | 2026-05-28 | J+14 : **2026-06-11** · J+30 : **2026-06-27** | [missions/homepage/](missions/homepage/) |
| 2 | **Collection Salon** | tableau salon (+ chic/déco/moderne) | 🔜 À démarrer | — | — | [missions/collection-salon/](missions/collection-salon/) |

Légende statut : 🔜 à démarrer · 🟡 en cours · ✅ déployée · 📈 en suivi · 🏁 clôturée (suivi terminé)

---

## 📅 Échéancier de suivi (toutes missions confondues)

| Date | Action | Mission | Fait ? |
|---|---|---|---|
| **2026-06-11** | Check GSC **J+14** | Homepage | ☐ |
| **2026-06-27** | Check GSC **J+30** | Homepage | ☐ |

> ⚠️ Les rappels email automatiques ont été désactivés (Walid relance manuellement). Quand il dit « lance le suivi SEO », exécuter le check de la mission concernée via le skill `gsc-query` et consigner le résultat dans le `FOLLOWUP.md` de la mission + cocher ci-dessus.

---

## 🧭 Comment naviguer cette architecture

```
seo/
├── ROADMAP.md                  ← CE doc : état global, missions, échéances
├── shared/
│   └── playbook.md             ← méthodo réutilisable (5 phases) + voix + conventions
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
2. Lire **shared/playbook.md** → méthodo + voix de marque
3. Aller dans **missions/<mission active>/** → contexte détaillé

---

## 📌 Règles de tenue à jour (IMPORTANT)

- **À chaque jalon** (déploiement, check GSC, démarrage/clôture de mission) → mettre à jour CE doc (tableau de bord + échéancier).
- Chaque mission a son **`FOLLOWUP.md`** où sont consignés les résultats GSC dans le temps.
- Chaque nouvelle mission = nouveau dossier `missions/<nom>/` + suit le `shared/playbook.md`.
- Ne jamais laisser ce doc diverger de la réalité : c'est la source de vérité du pilotage.
- Les **faits structurels** de l'entreprise (Paris/Toulouse/Allemagne, Trustpilot, etc.) sont en mémoire Claude (`project_myselfmonart_facts.md`), pas ici.

---

## 🔗 Références transverses

- **Skill de suivi** : `gsc-query` (local) — siteUrl `sc-domain:myselfmonart.com`, country `fra`
- **Déploiement** : push branche `staging` → thème staging ; push `main` → thème live (GitHub Actions). Workflow Walid : edit → staging → validation visuelle → merge main = live.
- **Faits structurels marque** : mémoire `project_myselfmonart_facts.md`
- **Différenciation sémantique inter-pages** (anti-cannibalisation) : la home vise le générique « tableau décoration murale » ; les collections visent pièce/style (ex : salon = « tableau salon » + chic/moderne/déco). À respecter dans chaque nouvelle mission.
