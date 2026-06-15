# Configs `studio.config` — Studio de personnalisation (Voie 2)

Ces fichiers sont la **source d'édition** du studio config-driven. Chacun est le contenu JSON
à coller dans le metafield produit **`studio.config`** (namespace `studio`, clé `config`, type `json`).

> **Voie 2 retenue (2026-06-15).** On édite **un seul champ JSON par fiche produit** (au lieu de
> métaobjets cliquables = Voie 1). Multilingue identique à la Voie 1 : les libellés sont des **maps
> i18n** `{ "fr": …, "en": …, "de": …, "nl": …, "es": … }` résolues par le moteur (`t()` → `map[locale] || map.fr`).

## Fichiers

| Fichier | Produit | Statut |
|---|---|---|
| [`foot.json`](foot.json) | Poster perso foot (gid 10528685621595) | ✅ **Prêt** — reproduit le studio actuel à l'identique (payload byte-identique). À poser au go-live (PHASE 1.4, après validation Walid). |
| [`prenom.json`](prenom.json) | Démo « prénom seul » (2 étapes) | 🔵 **Référence** — montre un studio à N variable. Front OK sur le moteur actuel. |
| [`horoscope.json`](horoscope.json) | Horoscope perso | 🔵 **Référence** — front OK, mais **go-live gaté back-end** (Livrable B : la table `custom_art_jobs` n'a pas de colonnes pour ces champs ; migration SQL + worker requis). |

## Valider avant de coller en prod

Shopify **ne valide PAS** le contenu métier d'un metafield `json`. Une virgule oubliée = studio mort
en prod, sans message. **Toujours** passer le JSON au validateur local (zéro dépendance) :

```bash
node dev-harness/validate-studio-config.mjs            # valide tous les *.json de ce dossier
node dev-harness/validate-studio-config.mjs chemin.json # valide un fichier précis
```

Le validateur encode le **contrat RÉEL** du moteur (`assets/component-custom-art-studio.js`) :
noms uniques, types valides, maps i18n avec clé `fr`, et surtout les **rôles `format`** (voir piège ci-dessous).

## ⚠️ Piège à connaître : forme `resolve` vs `payloadValue`

Le **moteur actuel** lit, pour chaque rôle d'un step `format` :

```json
{ "role": "size", "payloadKey": "format", "resolve": "dimensions" }
{ "role": "frame", "payloadKey": "frame", "resolve": "slug" }
```

- `resolve` = `"dimensions"` (→ `30x40`) ou `"slug"` (→ `cadre-noyer`). **C'est ce que lit `buildPayload()`.**
- `payloadKey` = la clé back-end (`format`, `frame`). **Sans elle, la clé retombe sur le nom de rôle** (`size`) → mauvais payload.

Le plan `growth/STUDIO-CONFIG-DRIVEN-PLAN.md` §4 décrit une forme **plus riche** (`payloadValue`,
`webglValue`, `optionName`, `renderKeyAttr`) destinée au **moteur refactoré** (robustesse hors-FR,
WebGL 3 axes). Elle **n'est pas encore implémentée** : coller cette forme **casserait le payload foot**.
Le validateur **refuse** un rôle `format` qui a `payloadValue`/`webglValue` sans `resolve`.

→ Tant que le refactor moteur n'est pas livré, **rester sur la forme `resolve`/`payloadKey`** (celle des 3 fichiers ici).

## Champs lus par le moteur actuel (le reste est ignoré sans danger)

- **Racine** : `version` (int), `steps[]`, `payload.extra` (map `clé:"valeur"` jointe au FormData).
- **Step commun** : `name` (unique, `^[a-z][a-zA-Z0-9_]*$`), `type`, `title` (titre d'en-tête), `checkpointLabel` (pastille), `required`, `payloadKey`.
- **photo** : `consent.required`.
- **text** : `minLength`, `maxLength`, `transform` (`uppercase`), `charset` (`letters`), `label`/`placeholder`/`help`.
- **number** : `min`, `max`, `integer`, `label`/`help`.
- **date** : `mode` (`date`/`time`/`datetime`), `label`/`help`.
- **format** : `roles[] { role, payloadKey, resolve }`.
- **group** : `children[]` (steps non-imbriqués) — 1 group = 1 pastille, validité = ET des enfants.
- **choice** : `payloadKey`, `source` (`endpoint` pour le foot). ⚠️ Le rendu **inline** d'une `choice`
  (options cliquables) n'est **pas encore** générique → réservé au foot (endpoint + fixture) tant que le refactor n'est pas livré.

Les blocs `generation`, `screens`, `examples`, `consent.label`, options `choice` inline, `preview`
décrits dans le plan §3-4 sont **réservés au moteur refactoré** : on peut les ajouter sans risque
(ignorés aujourd'hui), mais ils ne pilotent encore rien.

## ⚠️ Deux limites à connaître (le validateur les signale)

1. **Noms réservés `photo` / `team` / `name` / `format`.** La section foot embarque des panneaux
   dédiés portant ces noms. Un step de 1er niveau qui réutilise un de ces noms **avec un autre type**
   détourne le panneau foot (ex : un step `name` de type `text` afficherait l'écran maillot
   prénom+numéro). → Nomme tes steps autrement (`firstName`, etc.) et garde `payloadKey` pour le
   back-end. Le validateur **bloque** ce cas.

2. **Enfants de `group` génériques.** Seul le group maillot foot (`playerName`/`playerNumber`) a un
   panneau d'input. Un autre enfant de group (`text`/`number`/`date`) **ne s'afficherait pas** tant
   que le moteur n'est pas refactoré → ne pas mettre de step composite hors foot pour l'instant.
   Le validateur **avertit**.

## Go-live foot (PHASE 1.4 — sur GO Walid)

1. Définir le metafield `studio.config` (type json) dans l'admin : **Paramètres → Données personnalisées → Produits → Ajouter une définition** (namespace `studio`, clé `config`, type JSON). (Déjà déclaré dans `.shopify/metafields.json`.)
2. Coller le contenu de `foot.json` dans ce metafield sur le produit foot.
3. Déployer le thème (section + moteur). Le studio bascule alors sur la config ; le repli foot hard-codé reste filet de sécurité (supprimer le metafield = retour immédiat au repli).
