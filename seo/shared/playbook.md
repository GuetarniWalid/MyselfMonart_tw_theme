# Playbook SEO/GEO MyselfMonArt — méthodo réutilisable

> Process validé sur la mission Homepage (déployée 2026-05-28). À réutiliser pour chaque nouvelle page/cluster.
> Pilotage global : [../ROADMAP.md](../ROADMAP.md).

## Principe directeur

Objectif = **augmenter les ventes** via autorité SEO + GEO progressive. Une mission = une page/cluster stratégique. On avance **phase par phase, avec validation de Walid entre chaque**.

## Les 5 phases

1. **Validation keyword (data réelle)** — Interroger GSC (skill `gsc-query`) pour confirmer le keyword cible sur la data du site, pas des estimations. Établir la **baseline** (clics/imp/position avant optim). Diagnostiquer la cannibalisation éventuelle avec d'autres pages.
2. **Décodage SERP** — Analyser le top 10 google.fr du keyword (WebSearch/WebFetch) : format dominant, structure, rich snippets, AI Overview, People Also Ask. En tirer la "fiche d'identité SERP" (ce qu'il faut absolument avoir).
3. **Audit concurrents** — 3 meilleurs concurrents directs (pas les marketplaces) : structure Hn, champ sémantique, schema.org, USPs, maillage, E-E-A-T. En tirer le "template gagnant" + les "angles différenciants disponibles".
4. **Génération du contenu** — Title (≤60c) + meta (≤155c) + H1 + structure Hn + copy en voix Hayate + schema JSON-LD (Organization/Store/Breadcrumb/ItemList/FAQPage selon pertinence) + FAQ GEO + maillage interne + specs images/alt + plan 301 si besoin.
5. **Audit technique + déploiement** — Statique (code : schema, copy, Hn, alt) puis dynamique (Lighthouse, Core Web Vitals, rendu, responsive) sur staging. Puis déploiement live + soumission Search Console + suivi GSC J+14 / J+30.

## Voix de marque (NON négociable dans toute copy)

- **Vouvoiement**, ton **premium-émotionnel-cocon** ("the calm after the noise", "your home is more than décor").
- Premium **sans pédanterie**.
- Signature : **« Avec soin, — Hayate / Team MyselfMonArt »**.

## Conventions techniques (Shopify)

- **Tailwind only**, variables globales fonts/couleurs (`snippets/fonts-and-colors.liquid`).
- Sections **admin-configurables** strictes, SEO + a11y impeccables.
- Title/Meta de la **home** = Shopify Admin → Préférences (pas dans le theme). Title/Meta des **collections/pages** = champ SEO de la collection/page dans l'admin.
- Schema JSON-LD : 1 seul nœud par entité (attention aux doublons `@id`). FAQPage = différenciateur fort (rare chez les concurrents).
- **Anti-cannibalisation** : respecter la différenciation sémantique entre pages (home = générique ; collections = pièce/style). Vérifier en Phase 1.

## Garde-fous business/légaux

- **PAS de "Made in France" / "Fabriqué en France"** : impression réelle en Allemagne → illégal (DGCCRF). Dire "Conçu en France / Studio créatif français / Imprimé en Europe".
- **Pas de chiffres gonflés** (ventes, avis) : risque publicité mensongère + perte de citabilité IA. Rester factuel.
- **Trustpilot 4.1/80** : ne pas afficher la note en gros (comparaison déloyale) ; mettre en avant volume + photos UGC. La note reste dans le schema (honnêteté).

## Déploiement & suivi

- Workflow : push `staging` → thème staging (preview) → validation visuelle Walid → merge `main` → thème live.
- Après live : soumettre l'URL à Search Console (action Walid, interface GSC).
- Suivi GSC **J+14 et J+30** via `gsc-query` → consigner dans le `FOLLOWUP.md` de la mission → mettre à jour [../ROADMAP.md](../ROADMAP.md).

## Outils

- **gsc-query** (skill local) : data GSC réelle. siteUrl `sc-domain:myselfmonart.com`, country `fra`.
- **chrome-devtools** (MCP) : Lighthouse, CWV, screenshots responsive (fermer Chrome avant si "browser already running").
- **Shopify MCP** : souvent instable en local ("Server not initialized") — fallback sur l'inspection du repo / curl.
- **Faits structurels marque** : mémoire `project_myselfmonart_facts.md`.
