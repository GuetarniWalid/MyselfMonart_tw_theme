# Contrat — Juge photo studio (`POST /api/custom-art/photo-check`)

> Source de vérité du contrat entre le **thème** (front studio) et le **juge photo back-end** (AdonisJS).
> Confirmé et déployé côté back-end le **2026-06-22** (commit back `55a7efb`). Côté thème : `faceAngle` envoyé verbatim depuis `studio.config`.

## 1. Rôle
À l'upload d'une photo dans le studio (`<custom-art-studio>`), avant toute génération payante, le front interroge le juge pour valider la qualité **et** l'angle du visage, et bloquer « Continuer » si la photo est mauvaise — avec un retour clair à l'utilisateur.

## 2. Requête (front → back)
- `multipart/form-data`
- Champs :
  - `photo` — JPEG downscalé ~768px (réduit côté client).
  - `faceAngle` — la pose attendue par l'œuvre (voir enum §3). **Envoyée verbatim**, sans normalisation côté front (`assets/component-custom-art-studio.js:1361`). Vient de `studio.config` (étape photo).
  - `hash` — SHA-256 de la photo (dédup).
  - `productType` — ex. `foot`.

Anti-tokens côté front : **dédup par hash** (même photo = verdict mémorisé, 0 re-jugement) ; **fail-open** sur erreur HTTP (réponse non-2xx / plantage → `photoOk=true`, la vente n'est jamais bloquée par une panne).

## 3. Enum `faceAngle` (canonique)
```
front | three-quarter | profile | back
```
- ⛔ **`three-quarter` avec un TIRET** (jamais underscore). Le JS branche sur `=== 'three-quarter'` (`component-custom-art-studio.js:1454` + `:1482`) ; les **clés i18n** sont en underscore (`photo_caption_three_quarter`) — ne pas confondre clé i18n et valeur config.
- Back-end : `normalizeFaceAngle()` met en minuscule + trim + **mappe défensivement `three_quarter` → `three-quarter`** (si la config envoie l'underscore par erreur, la contrainte d'angle s'applique quand même).
- `none` n'est **pas** un cran requêtable — valeur interne au LLM (« aucun visage »), jamais envoyée par le thème.

## 4. Tolérance d'angle (±1 cran, permissive)
Le front envoie une **catégorie** (pas des degrés). Le LLM classe la photo sur la même échelle, puis comparaison avec tolérance d'un cran. Calibré pour que **jamais un faux rejet ne bloque une vente**.

| `faceAngle` attendu | Photo **acceptée** | **Refusée** → `angle_mismatch` |
|---|---|---|
| `front` (0–25°) | front, three-quarter | profile, back, aucun visage |
| `three-quarter` (25–65°) | front, three-quarter, profile | back, aucun visage |
| `profile` (65–110°) | three-quarter, profile | front, back, aucun visage |
| `back` | back (exact) | — (le visage n'a pas à être lisible) |

→ `three-quarter` est volontairement **large** (accepte face ET profil). Le prompt LLM est calibré « en cas d'hésitation, choisis `three-quarter` ». Le produit foot « légende » (≈45°) est sur ce cran.

## 5. Valeur inconnue (hors enum)
Si `faceAngle` n'est pas reconnu (nouveau cran, faute non rattrapable…) :
- **PAS** de fallback silencieux sur `front`.
- La **contrainte d'angle est ignorée** (on laisse passer côté angle)…
- …mais **tous les autres contrôles restent actifs** : `no_face`, `multiple_faces`, `too_dark`, `blurry`, `face_too_small`, `obstructed`, `low_quality`, `nsfw`.
- ⭐ Le validator back est passé d'**enum → string libre**, ce qui **corrige un ancien bug** : avant, un `three_quarter`/cran inconnu déclenchait un `422` → fail-open front → **aucun contrôle** (on perdait nsfw, flou, etc.). Désormais la requête passe et le check tourne pleinement, seul l'angle est ignoré.

## 6. Réponse (back → front)
- **Cas normaux** : `200 { ok, issues[], faceAngleDetected?, cached }`.
- **Mauvais angle** : code d'issue exactement **`angle_mismatch`** (le front affiche le message adapté au cran demandé via `photo_issue_angle_{front|three_quarter|profile|back}`).
- **Vraie panne** (LLM down…) : **`503`**, jamais un faux verdict mis en cache → le front fail-open.
- **Cache par hash seul** : la même photo soumise avec un autre `faceAngle` reste un hit, verdict d'angle recalculé en code.

### Codes d'issue gérés par le front
`no_face` · `multiple_faces` · `too_dark` · `blurry` · `face_too_small` · `obstructed` · `angle_mismatch` · `low_quality` · `nsfw` · `generic`
(mappés en i18n `sections.custom_art_studio.photo_issue_*` ; `angle_mismatch` → message selon `faceAngle`).

## 7. Modèle & coût
Juge = **Gemini Flash** (cheap). Claude réservé au juge des candidats générés (aval). Cascade : pré-filtres gratuits → Gemini Flash structuré → cache hash serveur (TTL).

## 8. Calibrage en prod (non bloquant)
Le biais « 3/4 en cas de doute » + tolérance ±1 ne se valident qu'avec de **vraies photos**. Si rejets/acceptations limites observés en prod → envoyer 2-3 cas (cran demandé + photo) au back pour ajuster les fourchettes.

## Liens
- Front : `assets/component-custom-art-studio.js` (`_checkPhoto`/`_hashFile`/`_downscalePhoto`/`_renderPhotoVerdict`/`_photoIssueMessages`/`_applyPhotoCaption`).
- Config produit : `growth/studio-configs/foot.json` (étape photo : `faceAngle`, `photoCheck`).
- Flag : `photoCheck:true` (étape photo) active le juge ; `false` = dormant (rollback instantané via le metafield `studio.config`).

---

## 9. POLITIQUE PHOTO PAR PRODUIT (`photoPolicy`)

> **Statut : ✅ VALIDÉ PAR WALID le 2026-07-03 — GO implémentation back (l'Aja) puis front.**
> Décisions : **D-1** famille, photo de face = `warn` (acceptée + pédagogie). **D-2** corps
> coupés (`not_full_body`) = **`reject`** (c'est la cause n°1 du mauvais rendu : les tailles
> relatives se dérivent de la photo). **D-3** GO.
> Déclencheur : le produit FAMILLE. Le juge actuel est **mono-visage** (`multiple_faces` rejette
> TOUJOURS), son échelle d'angles juge un VISAGE, sa table de tolérance (§4) et le mapping
> vert/ambre du front sont FIGÉS dans le code. Or la famille exige l'inverse : plusieurs
> personnes, **de dos = parfait**, et **en pied** (corps entiers — les tailles relatives des
> enfants se dérivent de la photo ; un cadrage buste fausse le dessin). Le mode « groupe »
> dormant (recipe-contract §8) est insuffisant : il IGNORE l'angle au lieu de le juger.

### 9.1 Le principe
La fiche produit déclare une **politique** ; le juge **décrit** la photo (inchangé : « le modèle
décrit, le code conclut ») ; la **dérivation du verdict applique la politique** au lieu de la
table figée. Le front ne calcule plus rien : il **affiche le grade renvoyé**.

### 9.2 Schéma — bloc `photoPolicy` sur l'étape photo de `studio.config`
```jsonc
"photoCheck": true,
"photoPolicy": {
  "subject": "group",                 // "person" (défaut, = comportement actuel) | "group"
  "framing": "full-body",             // "face" (défaut) | "full-body" (corps ENTIERS tête-pieds)
  "people": { "min": 1, "max": 6 },   // subject:"group" seulement
  "angles": {                          // mapping angle-DÉTECTÉ -> grade. Le cœur de la demande.
    "back": "perfect",                //   perfect = 🟢 vert « Photo parfaite »
    "front": "warn",                  //   warn    = 🟡 accepté avec mise en garde (ne bloque pas)
    "three-quarter": "warn",          //   reject  = 🔴 refusé (bloque « Continuer »)
    "profile": "warn"
  },
  "messages": {                        // OPTIONNEL : surcharges i18n par produit des textes 🟡/🔴
    "warn_angle": { "fr": "Photo acceptée — pour un dessin fidèle des tailles, préférez une photo de dos, en pied." },
    "reject_framing": { "fr": "On ne voit pas tout le monde en entier : prenez une photo des pieds à la tête." }
  }
}
```
**Règles de robustesse** (philosophie « jamais un faux rejet ne bloque une vente ») :
- Angle **absent du mapping** → `warn` (jamais bloquant par surprise).
- `photoPolicy` absent → **shim de compatibilité** : `faceAngle` actuel est traduit en interne
  vers une policy équivalente à la table §4 (`three-quarter` → `{three-quarter:perfect,
  front:warn, profile:warn, back:reject}` etc.) → **foot inchangé au pixel, zéro migration**.
- `subject:"group"` remplace la convention dormante `faceAngle:"group"` (recipe-contract §8) —
  mais contrairement à elle, l'angle **reste jugé** (dominante du groupe).

### 9.3 Requête (ajout, rétro-compatible)
- Nouveau champ multipart `policy` = JSON de `photoPolicy` (verbatim). `faceAngle` reste envoyé
  (anciens back). Un back sans support ignore `policy` → comportement actuel.

### 9.4 Détection (juge Gemini Flash, prompt étendu) & nouveaux codes
Le juge détecte en plus : `peopleCount` (int), `bodiesFullyVisible` (bool, tête-pieds pour
CHAQUE personne), `dominantAngle` (orientation majoritaire du groupe, même échelle §3).
Contrôles conditionnés par la policy :
- `subject:"person"` → `multiple_faces` actif (comme aujourd'hui). `subject:"group"` →
  `multiple_faces` DÉSACTIVÉ ; à la place `too_many_people` (> max) / `no_person` (0).
- `framing:"face"` → `face_too_small` actif. `framing:"full-body"` → `face_too_small` désactivé,
  **`not_full_body`** actif (des corps coupés = refus… ou warn, cf. D-2).
- Qualité inchangée quel que soit le mode : `too_dark`, `blurry`, `obstructed`, `low_quality`, `nsfw`.

### 9.5 Réponse (ajout) & front
```
200 { ok, grade: "perfect"|"warn", issues[], faceAngleDetected?, peopleCount?, cached }
```
- **`grade` calculé CÔTÉ BACK** en appliquant la policy (une seule source de vérité).
- Front : 🟢 si `ok && grade==="perfect"` ; 🟡 si `ok && grade==="warn"` ; 🔴 si `!ok`.
  (Supprime le calcul local `detected === faceAngle` de `_applyPhotoVerdict`.)
- Sans `grade` dans la réponse (back pas encore déployé) → front retombe sur le calcul actuel.
- Cache : reste **par hash seul** ; le grade est recalculé en code à chaque hit (policy dans la
  requête, pas dans le cache) — même mécanique que l'angle aujourd'hui (§6).
- i18n : nouveaux codes `photo_issue_not_full_body`, `photo_issue_too_many_people`,
  `photo_issue_no_person` (5 langues) + surcharges `photoPolicy.messages` prioritaires.

### 9.6 Policies cibles des produits actuels
- **Foot légende** : rien à faire (shim `faceAngle:"three-quarter"`). S'il veut du sur-mesure :
  `{subject:"person", framing:"face", angles:{"three-quarter":"perfect","front":"warn","profile":"warn","back":"reject"}}`.
- **Famille line-art** : `{subject:"group", framing:"full-body", people:{min:1,max:6},
  angles:{"back":"perfect","front":"warn","three-quarter":"warn","profile":"warn"}}` + messages sur-mesure
  (le 🟡 explique POURQUOI le dos en pied donne un meilleur dessin). `photoCheck:true` à l'activation.

### 9.7 Décisions — ✅ TRANCHÉES par Walid le 2026-07-03
- **D-1** : famille, photo de FACE = **`warn`** (acceptée + pédagogie ; ne bloque jamais une vente).
- **D-2** : `not_full_body` (corps coupés) = **`reject`**.
- **D-3** : **GO** (coût inchangé, même Gemini Flash).

### 9.8 Enrichissements issus de l'audit multi-agents 2026-07-03 (à intégrer à l'implémentation)
1. **`people.max` aligné sur la recette** : pour la famille, `max: 6` = le `inputs.tokens.max` de
   `studio.recipe` → le juge pré-rejette AVANT paiement une photo qui ne pourra jamais matcher
   les prénoms. (Aligner à la main dans les 2 metafields ; à terme le back peut le vérifier.)
2. **⛔ Règle de SÉQUENCEMENT** : ne JAMAIS poser `photoCheck:true` sur la famille avant que le
   back supporte la policy — sinon le chemin actuel single-face rejette 100 % des photos de
   famille (`multiple_faces`), et le fail-open ne protège pas (réponse 200 valide). Ordre figé :
   back livré → vérifié par un POST de test → flag config ensuite.
3. **Cache d'évaluation intrinsèque VERSIONNÉ** : figer au contrat le schéma caché
   `{faceCount, angleClass, framing, qualityFlags, nsfw, evalVersion}` ; un hit d'une
   `evalVersion` antérieure (jugé « façon foot », sans comptage ni cadrage) est re-jugé UNE fois
   puis réécrit. Sinon une photo déjà vue servirait un verdict groupe/en-pied faux depuis le cache.
4. **Prompt de classification POLICY-AGNOSTIC** : le LLM CLASSE (angle, cadrage, nb de personnes),
   il ne juge pas ; tout biais de départage (« en cas de doute, 3/4 ») doit rester neutre vis-à-vis
   du mapping. La dérivation en code porte seule la politique (déjà la philosophie actuelle).
5. **Fallback contractualisé** : code d'issue inconnu côté front → message `generic` (le JS le
   fait déjà, on le grave au contrat) → le back peut ajouter des codes sans déploiement thème.
6. **i18n thème (côté front, moi)** : nouvelles clés `photo_issue_not_full_body`,
   `photo_issue_too_many_people`, `photo_issue_no_person` en 5 langues + support des overrides
   `photoPolicy.messages` ; à livrer avec le rendu du `grade`.
