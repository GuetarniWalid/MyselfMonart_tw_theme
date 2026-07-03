# Contrat back-end — « Mon dernier job » (chantier A2 du studio poster perso)

> **⚠️ ADDENDUM 2026-07-03 — SCOPING PRODUIT (bug réel).** Ce contrat date de l'ère mono-produit
> (foot). Depuis le studio multi-produits (famille…), la session est PARTAGÉE entre toutes les
> fiches → le « dernier job » foot se faisait reprendre SUR LA FICHE FAMILLE (constaté par Walid
> le 2026-07-02). **Correctifs :**
> - **FRONT (déployé)** : `resumeLastJob()` appelle désormais `GET /jobs/last?productType=<type>`
>   et n'applique la réponse que si `data.productType === productType de la fiche` ; un job SANS
>   `productType` est traité comme `foot` (seul produit antérieur au champ) → il ne reprend QUE sur
>   les fiches foot.
> - **BACK (demandé)** : (1) exposer `productType` dans la réponse de `/jobs/last` ; (2) honorer le
>   query param `?productType=` = renvoyer le dernier job DE CE TYPE de la session (204 sinon) —
>   ainsi une fiche famille reprend le dernier job FAMILLE même si un foot est plus récent.
> Tant que le back n'expose pas le champ, la reprise `/jobs/last` est de fait DÉSACTIVÉE sur les
> produits non-foot (repli sûr voulu ; la reprise locale `localStorage`, déjà scopée par produit,
> continue de fonctionner partout).

> **Statut : PROPOSITION — à faire confirmer/implémenter côté back-end AdonisJS (autre repo)
> AVANT de brancher le front.** Le thème ne consommera cet endpoint qu'une fois le contrat validé.
> Rédigé le 2026-06-20. Réf. : `growth/STUDIO-LIVE-IMAGE-HANDOFF.md` § 3.A2.

## 1. Pourquoi

Le **paradoxe** (handoff § 2) : un visiteur revenant dont les essais du jour sont épuisés clique
« Créer mon tableau » et tombe sur le **cap « Débloquez un nouvel essai »** au lieu de **revoir son
dernier tableau**. Le compteur d'essais vit côté back-end (donc « se souvient »), mais le pointeur
vers la dernière image vit en `localStorage` (donc **absent** si cache vidé / autre appareil / > 3 j).

- **A1 (déjà fait, front seul)** récupère le dernier tableau quand l'utilisateur arrive via le **lien
  e-mail `?ca_job=<uuid>`** (job précis, public).
- **A2 (cet endpoint)** couvre le cas où il **n'y a NI `localStorage` NI lien `?ca_job`** (autre
  appareil, cache vidé) **mais que le back-end connaît encore la session** (puisqu'il compte les
  essais). Le back-end doit alors pouvoir répondre « voici ton dernier job prêt » → le front
  ré-affiche le reveal au lieu de pousser vers une (re)génération facturée.

## 2. Endpoint demandé

```
GET /api/custom-art/jobs/last
```

- **Auth** : session courante du studio — même mécanisme que les autres appels
  (`credentials: 'include'` + en-tête `x-custom-art-session: <token>` si le front en a un).
  L'endpoint est **scopé à la session/IP qui sert déjà à compter les essais du jour** : il renvoie
  le dernier job rattaché à CETTE session. (Voir § 5 pour l'option e-mail.)
- **Effet de bord : AUCUN.** Lecture seule. **Ne décompte PAS d'essai, ne déclenche AUCUN cap**
  (jamais de 429/403 `email_required` ici — sinon on recrée le paradoxe). Si la session est inconnue,
  répondre « pas de job » (204/200 vide), pas une erreur de cap.
- **Idempotent**, cache HTTP : `Cache-Control: private, no-store` (réponse propre à la session).

### 2.1 Réponse — un dernier job exploitable existe

`200 OK` (enveloppe habituelle `{ success, data }`, déballée par `api()` côté thème) :

```json
{
  "success": true,
  "data": {
    "uuid": "f3a1c0de-...",            // identifiant public du job (= ?ca_job)
    "status": "ready",                  // voir § 3 (statuts acceptés)
    "preview": "https://cdn.../preview.jpg",  // URL CORS-ok (ACAO) — texture WebGL + <img> repli
    "createdAt": "2026-06-18T20:14:00Z",
    "expiresAt": "2026-07-18T20:14:00Z",      // optionnel mais souhaité (cf. § 4)
    "meta": {                            // OPTIONNEL — best-effort pour l'affichage panier
      "playerName": "LÉo",
      "playerNumber": 10,
      "teamName": "France",
      "email": "client@exemple.fr"       // si déjà rattaché (sert à pré-remplir, jamais affiché)
    }
  }
}
```

- `preview` est une **CHAÎNE** (cohérent avec `previewFrom()` du thème, qui tolère aussi
  `previewUrl` / `preview.url`). **Doit être servie avec l'en-tête CORS `Access-Control-Allow-Origin`**
  (réutilise le proxy d'image déjà en place pour le reveal).
- `meta` est facultatif : sans lui, le front retombe sur `_job_id` (déjà transmis au panier) comme
  source de vérité pour la production. Avec lui, le panier affiche prénom/numéro/équipe.

### 2.2 Réponse — aucun dernier job

Aucun job exploitable pour cette session (jamais généré, ou tous expirés) :

```
204 No Content
```

(ou `200 OK` avec `{ "success": true, "data": null }` — préciser lequel ; le front gèrera les deux.)

### 2.3 Réponse — session inconnue / non authentifiée

Pas de session reconnaissable → **traiter comme « aucun job »** (204 / `data:null`), **PAS** un 401/403.
Le but est de ne jamais bloquer ni afficher de cap : juste « rien à reprendre » → parcours normal.

## 3. Statuts renvoyés

Le « dernier job » pertinent est le plus récent dont le statut est exploitable côté client :

| `status`        | Front fait quoi                                                            |
|-----------------|---------------------------------------------------------------------------|
| `ready`         | Ré-affiche le reveal (image `preview`) — **cas principal**.                |
| `manual_review` / `failed` | Écran « artiste » en mode « déjà pris en charge » (aperçu sous 24 h). |
| (autres / aucun)| Considéré comme « pas de dernier job » → parcours normal.                  |

> Préférence : renvoyer en priorité le dernier `ready`. Si le dernier job est `pending`/`generating`
> (génération encore en cours sur un autre onglet), renvoyer plutôt « aucun job » (le front ne sait
> pas reprendre un polling cross-session de façon fiable). À trancher avec le back-end.

## 4. Expiration / fraîcheur

- Ne renvoyer un job que s'il est **encore productible** (image CDN encore servie, job non purgé).
- Si un `expiresAt` est exposé, le front pourra masquer un reveal périmé proprement.
- Aligner avec la purge serveur. Côté thème, la garde locale `RESUME_TTL_MS = 3 jours` ne s'applique
  qu'au `localStorage` ; cet endpoint, lui, fait foi (il connaît l'état réel du job).

## 5. Scoping : session vs e-mail (à trancher avec le back-end)

Deux portées possibles, par ordre de préférence :

1. **Session/IP** (par défaut ci-dessus) : couvre « même appareil, cache vidé » + « essais épuisés ».
   Simple, pas de PII en plus. **Recommandé pour la v1.**
2. **E-mail** (cross-device) : si l'utilisateur a sauvegardé par e-mail, un `GET
   /api/custom-art/jobs/last?email=<…>` (ou via un cookie de reprise signé) renverrait son dernier job
   sur n'importe quel appareil. Plus puissant mais soulève vérif e-mail + RGPD → **v2**, le lien
   `?ca_job` (A1) couvre déjà le cross-device par e-mail entre-temps.

→ **Décision attendue de Walid + back-end :** se limite-t-on à la **session** (v1) ?

## 6. Consommation prévue côté thème (une fois le contrat confirmé)

À l'ouverture du studio, AVANT de laisser l'utilisateur partir vers une génération, SI :
`!_pendingCaJob` (pas de lien e-mail) **ET** pas de reveal local exploitable en `localStorage` :

```
open()
  └─ pas de ?ca_job, pas de reveal local prêt
       └─ GET /api/custom-art/jobs/last
            ├─ 200 + ready    → showStep(format) + showReveal(preview, false)   (comme A1)
            ├─ 200 + manual_review/failed → showArtist() « déjà pris en charge »
            └─ 204 / null / session inconnue → parcours normal (showStep)
```

- **Garde-fou anti-paradoxe (A3) :** cet appel est un **GET sans effet de bord** ; il ne doit
  **jamais** déclencher le cap « e-mail requis ». Le cap reste réservé à une **régénération active**
  (`startGeneration` / « Une autre version »).
- Le front ajoutera un petit délai/skeleton « Nous retrouvons votre création… » (clé i18n
  `resume_loading` déjà posée en 5 langues) pendant l'appel, puis route selon la réponse.
- Mode « invité par lien »/reprise : actions verrouillées sans session (reveal-next/save) si la
  reprise se fait hors session — même logique que A1 (`guestLink`).

## 7. Récapitulatif des décisions à confirmer

1. **Existe-t-il déjà** un moyen d'obtenir le dernier job d'une session ? Sinon, OK pour créer
   `GET /api/custom-art/jobs/last` ?
2. **Scoping v1 = session/IP** (recommandé) ou e-mail d'emblée ?
3. Forme du « vide » : `204 No Content` ou `200 { data: null }` ?
4. `preview` bien servie **CORS-ok** (ACAO) comme pour le reveal ?
5. Statuts renvoyés : se limiter à `ready` (+ `manual_review`/`failed`) ; exclure `pending`/`generating` ?
6. Champ `meta` (prénom/numéro/équipe/email) exposable, ou on s'en tient à `_job_id` ?

> Dès que ces points sont tranchés et l'endpoint live en staging back-end, je branche le front
> (méthode `resumeLastJob()` symétrique de `resumeFromJob()`), je teste en harness (mock) puis en
> live, et je fais valider avant push.
