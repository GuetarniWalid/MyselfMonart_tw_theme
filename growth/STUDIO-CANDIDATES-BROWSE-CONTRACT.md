# STUDIO — Contrat back-end : parcourir les candidats d'un lot (compteur « 1/N » + génération payante seulement au bout)

> **À l'attention de l'agent back-end** (dépôt API custom-art, AdonisJS). Ce document vient du **front** (thème Shopify, web-component `<custom-art-studio>`). Tu es un nouvel agent : **tout le contexte nécessaire est ci-dessous**, ne suppose rien d'autre. À la fin, il y a **4 questions** auxquelles tu dois répondre, en plus d'implémenter le contrat.

---

## 0. C'est quoi ce produit
MyselfMonArt vend des tableaux/posters déco. Le **studio de personnalisation** (produit « poster perso foot ») laisse le client : envoyer une photo de son enfant, saisir prénom + numéro + couleurs d'équipe, puis **générer un poster IA** où l'enfant devient un joueur de légende.

Point clé : **quand l'IA génère, elle produit PLUSIEURS candidats d'un coup** (un « lot »). Aujourd'hui le front n'en montre qu'un et révèle les autres un par un — et c'est précisément ce qu'on veut corriger.

## 1. Flux actuel (ce que le front fait aujourd'hui)

Base API : `https://backend.myselfmonart.com/api/custom-art`

1. **`POST /jobs`** → crée le job. Réponse : `{ status, jobId|uuid, estimatedMs, token|sessionToken }`. Le front mémorise le `token` (en-tête `x-custom-art-session` + cookie de session sur les appels suivants).
2. **`GET /jobs/:id`** (polling toutes les quelques secondes) → quand `status: 'ready'`, réponse :
   ```json
   { "status": "ready", "preview": "https://.../preview/0", "mockups": [ ... ], "estimatedMs": 38000 }
   ```
   - `preview` = URL string de l'image (proxifiée, en-tête ACAO pour la texture WebGL). Sert le **meilleur** candidat (le `/preview/0`).
3. **`POST /jobs/:id/reveal-next`** → révèle la suite :
   - **un candidat suivant du lot est dispo** → HTTP 200, `{ "preview": "https://.../preview/1", "mockups": [...] }` (puis `/preview/2`, etc.). Le front comprend « runner-up déjà prêt » et l'affiche.
   - **lot épuisé** → `{ "status": "generating"|"pending"|"judging", "jobId": "<NOUVEAU>" }` → le front bascule en attente + repolling (= **nouvelle génération**).
   - **caps anti-abus** → `403`/`429` (`email_required`, `rate_limited`).
4. **Panier** : le front dérive le **rang 1-based** de la version depuis l'URL `/preview/N` (rang = N + 1) et l'envoie sur la ligne panier en `_version_rank` (à côté de `_job_id`). Tu imprimes **par rang** (contrat précédent déjà livré : migration `candidate_rank`, sélection par rank dans `PrintFileService`).

**Champs que le front lit aujourd'hui :** `status`, `preview` (ou `previewUrl`, ou `preview.url`), `mockups`, `estimatedMs`, `jobId`, `token`.
**Il n'a AUCUNE information sur le nombre total de candidats du lot.**

## 2. Le problème (pourquoi on change)
Le front révèle les candidats **un par un** et **ne connaît pas leur nombre**. Conséquences :
1. À la première image, il n'a qu'**une** entrée en mémoire → **impossible d'afficher un compteur « 1/N » ni des flèches** de navigation. L'utilisateur ne voit donc jamais qu'il y a d'autres candidats déjà prêts.
2. Le bouton actuel « Générer une nouvelle version » **mélange deux actions très différentes** : (a) voir un candidat **déjà fait = gratuit**, et (b) lancer une **génération = payante** — sans que l'utilisateur (ni le front) sache laquelle il déclenche.

## 3. UX cible (ce qu'on veut)
1. À `ready` : montrer le meilleur candidat **et afficher « 1 / N » tout de suite**.
2. Flèches ‹ › pour **parcourir les N candidats déjà générés** du lot → **gratuit** (aucune nouvelle génération).
3. **Seulement après le dernier candidat (N/N)** : afficher « Générer une nouvelle version » = la **seule action payante**, désormais explicite.

## 4. Demande de contrat back-end
Renvoyer le **total de candidats** + la **position courante** partout où une image de lot est servie.

### 4.1 `GET /jobs/:id` quand `status: 'ready'`
Ajouter un bloc `candidate` :
```json
{
  "status": "ready",
  "preview": "https://.../preview/0",
  "mockups": [ ... ],
  "estimatedMs": 38000,
  "candidate": { "rank": 1, "total": 4, "hasMore": true }
}
```
- `candidate.total` → nombre **total** de candidats du lot (= le « N » du compteur).
- `candidate.rank` → rang **1-based** du candidat servi ici (le meilleur = `1`).
- `candidate.hasMore` → reste-t-il des candidats non encore servis ? (`true` si `rank < total`).

### 4.2 `POST /jobs/:id/reveal-next` (réponse runner-up, HTTP 200)
**Même bloc `candidate`** dans la réponse, pour que le front affiche « 2 / 4 », « 3 / 4 »… et sache, via `hasMore: false`, qu'il est sur le **dernier** candidat → il bascule alors le libellé vers « Générer une nouvelle version ».
```json
{ "preview": "https://.../preview/1", "mockups": [...], "candidate": { "rank": 2, "total": 4, "hasMore": true } }
```

### 4.3 Comportement reveal-next (inchangé sur le fond)
- Tant qu'il reste des candidats → reveal-next sert le suivant (gratuit), avec `candidate.hasMore: true` (puis `false` sur le dernier).
- Quand l'utilisateur est sur le **dernier candidat** (`hasMore: false`) et clique « Générer une nouvelle version » → reveal-next déclenche la **nouvelle génération** (réponse `status: 'generating'` + nouveau `jobId`), exactement comme aujourd'hui. → C'est le **seul appel payant**, et il est maintenant **explicite** côté UX.

### 4.4 Rétro-compatibilité
Le front **tolère l'absence** du bloc `candidate` (repli sur le comportement actuel). Tu peux donc livrer sans rien casser : le nouveau front s'activera dès que le champ est présent.

## 5. Questions auxquelles tu dois répondre (en plus d'implémenter)
1. **Combien de candidats l'IA produit-elle par lot ?** Fixe (ex. 4) ou variable (selon le type de produit / la décision du juge) ?
2. **Sont-ils TOUS rendus/prêts au moment où `status: 'ready'` ?** Le front suppose que les runner-ups sont « déjà prêts côté serveur ». Si certains sont rendus **à la volée** au moment du reveal-next, dis-le : ça change la latence perçue du « parcours gratuit » (il faudrait peut-être un petit indicateur d'attente).
3. **Le `total` peut-il évoluer après coup** (ex. un candidat rejeté par le juge disparaît du lot) ? Si oui, comment le front doit-il le refléter ?
4. Quelle **forme JSON** préfères-tu : bloc `candidate` imbriqué (ci-dessus) **ou** champs plats `candidateRank` / `candidateTotal` / `candidateHasMore` ? (Le front s'adaptera à ton choix — dis juste lequel.)

---

**Merci !** Réponds aux 4 questions + confirme les champs exacts (noms + forme) que tu ajoutes à `GET /jobs/:id` (ready) et à `reveal-next`. Je branche le front dès que j'ai ta réponse.

_Fichiers back probablement concernés (repère, contrat précédent) : `CustomArtController.ts` (endpoints jobs / reveal-next), `CustomArtJob.ts` (modèle, nb de candidats), éventuellement `Worker.ts` / le service de génération-juge (d'où vient le `total`)._
