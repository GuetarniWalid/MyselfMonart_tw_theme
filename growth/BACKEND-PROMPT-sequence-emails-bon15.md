# Brief back-end — séquence e-mail du bon de 15 €, à vie, sans surveillance

**Destinataire : l'agent back-end (AdonisJS, `backend.myselfmonart.com`).**
**Date : 2026-08-05.** Boutique : MyselfMonArt (`gid://shopify/Shop/62323884287`), plan **Basic**, fuseau **Europe/Paris**.

> **L'exigence du marchand, mot pour mot :** « je veux tout régler une fois et ne plus jamais y toucher ».
> Et sa raison de venir ici : « ça fait trop de contraintes et de contournements, je sens le tout fragile et je n'aime pas l'impression de non maîtrise ».
> Chaque décision de ce document est arbitrée pour le **fonctionnement non surveillé sur plusieurs années**, jamais pour l'élégance.

---

## 0. À lire avant d'écrire une ligne — les trois choses qui peuvent tout casser

1. **Le compte d'envoi peut être fermé sans préavis.** Resend impose contractuellement **moins de 0,08 % de plaintes** et moins de 4 % de rebonds. Au volume visé (~120 envois/semaine), **une seule plainte = 0,83 %, soit dix fois le seuil**. La sanction n'est pas « tomber en indésirables », c'est « plus rien ne part, et les séquences en cours meurent en silence ». Tout ce qui suit sur le désabonnement en découle.
2. **L'accès aux données client est en tolérance héritée.** Voir §2. Il fonctionne, il est vérifié, il n'est pas contractuel.
3. **Ne jamais transmettre `consentUpdatedAt`** en créant un client (§5.3). Ce champ **déclenche les automatisations natives Shopify**. Shopify Flow est installée sur cette boutique : un client recevrait deux e-mails de bienvenue et deux offres.

---

## 1. Ce qui existe déjà

| Élément | État |
|---|---|
| Encart promo sur fiche produit (`snippets/promo-popup.liquid` + `assets/promo-popup.js`) | **En production.** Va être modifié pour poster ici (§8). |
| Cron hebdomadaire créant un code de remise + écrivant `shop.metafields.promo.{code,ends_at,ends_ts}` | **En production.** Voir §7 : son rôle change. |
| Webhooks `PRODUCTS_*` et `ORDERS_PAID` vers `/api/webhooks` | **En production.** |
| App personnalisée « Product Creator » (`gid://shopify/App/80406872065`) | Scopes `read_customers`, `write_customers`, `write_discounts` déjà accordés. |
| Klaviyo | **Désinstallé le 2026-08-05.** Aucun outil d'e-mailing sur la boutique. |

---

## 2. Accès aux données client — tolérance héritée, à documenter comme telle

**Constat vérifié le 2026-08-05** avec le jeton de cette app, sur cette boutique en plan Basic : lecture en clair de `email`, `firstName`, `lastName`, `phone`, `defaultAddress` et `emailMarketingConsent` d'un client réel. Aucun champ à `null`, aucun `errors`.

**Mais la restriction documentaire est réelle.** `help.shopify.com/.../custom-apps#custom-level2-pii-app` : « To access Custom Level 2 PII apps, your store must be on the Grow plan or higher », et `shopify.dev/docs/apps/launch/protected-customer-data` y renvoie explicitement pour la case « Admin created custom app × Level 2 ». L'e-mail est bien du niveau 2.

Ce qui nous sauve est la **formulation événementielle** : « **If you sign up for or downgrade your plan to** either the Basic plan or the Starter plan ». La boutique est sur Basic en continu et le jeton précède la mise en application.

**À écrire dans la documentation du service, sans l'adoucir :** *accès en tolérance héritée, hors doctrine publiée, révocable sans préavis.*

**Deux interdits absolus :**
- **Ne jamais désinstaller ni recréer « Product Creator ».** La création d'apps depuis l'admin est fermée depuis le 2026-01-01. Sauvegarder le jeton hors du serveur.
- **Jamais d'aller-retour de plan.**

**Filet si l'accès tombe :** recréer l'app en distribution « custom » depuis le Partner/Dev Dashboard — niveau 2 « Always available », **sans condition de plan**. L'architecture ne dépend donc jamais d'un passage au plan Grow.

### ⛔ Test de fumée n°1 — à exécuter AVANT tout développement

L'accès en **lecture** est prouvé. L'accès en **écriture** ne l'est pas.

```graphql
mutation {
  customerSet(input: {
    email: "smoke-test-a-supprimer@example.com"
    emailMarketingConsent: { marketingState: SUBSCRIBED, marketingOptInLevel: SINGLE_OPT_IN }
  }) { customer { id } userErrors { field message } }
}
```

- Utiliser **`customerSet`** (upsert), **jamais `customerCreate`** : l'e-mail est unique chez Shopify, `customerCreate` échoue sur doublon.
- **Ne pas envoyer `addresses` ni `tags`** : sur les champs listes, « all existing entries not included will be deleted ».
- **Vérifier le hash `errors` de la réponse, pas seulement le code HTTP.** Quand l'accès manque, Shopify renvoie **HTTP 200** avec les champs à `null` et un message dans `errors`. Un échec d'accès est invisible pour qui ne regarde que le statut.
- Supprimer le client de test ensuite.

**Si ce test échoue : arrêter et remonter au marchand.** Toute l'architecture en dépend.

---

## 3. Répartition des vérités — la règle structurante

Le marchand a demandé que **Shopify soit la source de vérité du consentement**. C'est retenu, avec une frontière précise.

| Shopify détient | Le back-end détient |
|---|---|
| `marketingState` : `SUBSCRIBED` / `UNSUBSCRIBED` / `PENDING` | **La preuve** : IP, page d'origine, libellé du consentement, version des mentions, horodatage **immuable** |
| `marketingOptInLevel` | **La finalité** : à quelle séquence la personne a consenti |
| L'identité, l'e-mail, la `locale` | **La joignabilité** : rebond dur, adresse morte |
| — | **L'état de séquence** : prochain e-mail, code émis, code consommé |
| — | **Le jeton de désabonnement** (HMAC) |
| — | **La liste repoussoir hachée**, 3 ans |

**Pourquoi la preuve ne peut pas vivre dans Shopify :** `consentUpdatedAt` est un champ **unique et écrasé** — « the latest date the customer consented **or objected** ». Un désabonnement puis réabonnement détruit la preuve d'origine, exigée par l'art. 7(1) RGPD.

**Pourquoi la finalité est vitale :** les **~750 abonnés dormants** de la boutique sont marqués `SUBSCRIBED` dans Shopify. Une règle « Shopify dit oui, j'envoie » les réveillerait tous — scénario type de destruction d'un domaine d'envoi neuf. **Seul le marqueur de finalité les protège.** On ne les contacte pas.

**Pourquoi un rebond ne s'écrit pas dans Shopify :** `customerEmailMarketingConsentUpdate` n'accepte que trois valeurs (« NOT_SUBSCRIBED, REDACTED, and INVALID cannot be set via this mutation »), et `UNSUBSCRIBED` signifie « s'était abonné puis s'est retiré ». Écrire ça sur un rebond **falsifierait le registre de consentement** et empêcherait la réactivation si la personne corrige son adresse. **Un rebond arrête l'envoi, il ne touche jamais au consentement.**

**Exception :** une **plainte pour spam** s'écrit bien `UNSUBSCRIBED` dans Shopify. C'est ce que Shopify fait nativement (« removed… when they click Unsubscribe, **mark an email as spam**, or opt out »).

### ⛔ Règle d'or

**Ne jamais mettre `marketingState` en cache. Le relire avant chaque envoi.** Shopify n'est pas seul écrivain (page de désabonnement, admin, compte client, thème) et les webhooks sont livrés « au moins une fois », **sans garantie d'ordre**. Tout cache serait faux tôt ou tard. Coût : 1 à 2 points par lecture, quota Basic 100 points/s — négligeable.

---

## 4. Le code nominatif — décision structurante

**Chaque inscrit reçoit SON code, créé à l'inscription. On n'envoie jamais le code public hebdomadaire.**

Le code de `shop.metafields.promo.code` est affiché sur le site, donc lisible par tous. L'envoyer en disant « votre bon » crée quatre problèmes :

1. **Directive Omnibus.** Shopify le documente : « if you offer a discount code with a message that states 'a special discount just for you' that can be used by any customer, then the PID likely applies » → obligation d'afficher le prix le plus bas des 30 derniers jours.
2. **Deux codes pour un seul bon.** Rotation à 7 jours contre séquence J0→J+7 : E1 et E3 tombent de part et d'autre d'une rotation pour une partie des inscrits.
3. **« Une fois par client » se contourne** avec une deuxième adresse, le code circulant publiquement.
4. **Si le cron rate une semaine**, l'e-mail sert un code mort (« Unable to find a valid discount matching the code entered »).

### Le contrat du code nominatif

`discountCodeBasicCreate`, à la création de l'inscrit :

| Paramètre | Valeur |
|---|---|
| Valeur | **15 € fixe** |
| Minimum d'achat | **80 €**, sous-total hors livraison |
| `usageLimit` | **1** (usage total, pas « un par client ») |
| `appliesOncePerCustomer` | `true` |
| `startsAt` | maintenant |
| `endsAt` | **maintenant + 8 jours**, à 23 h 59 heure de Paris |
| `combinesWith` | **tout à `false`** — Shopify ne combine rien par défaut, mais le poser explicitement |
| Marché | France / EUR |
| Titre interne | `BON15-<id inscrit>` pour le retrouver |

**Format du code :** `MERCI-` + 6 caractères d'un alphabet sans ambiguïté (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — ni `I`, ni `O`, ni `0`, ni `1`). Le code sera lu à voix haute et recopié à la main.

**Ce que ça résout d'un coup :** sortie de l'Omnibus (réduction réellement individualisée), un seul code dans les trois e-mails avec une date d'expiration vraie, « une fois » infalsifiable, et surtout — **l'usage du code devient le signal de conversion**. Si le code est consommé, on arrête la séquence, même si la personne a payé en invité avec une autre adresse, ce que `ORDERS_PAID` ne verrait pas.

---

## 4 bis. Le bon à l'international — un montant rond par devise

**Décision du marchand, 2026-08-06 : le dispositif s'ouvre à TOUS les marchés**, pas seulement la zone euro. Et il veut **un chiffre rond dans chaque devise**, quitte à donner un peu moins de valeur qu'en France.

### Le problème, en une ligne

Un code à montant fixe est **toujours** libellé dans la devise de la boutique — `DiscountAmountInput` n'a aucun champ de devise. Un code de 15 € vu par un Américain donne « −17,43 $ » au paiement, et le montant **change d'un jour à l'autre**.

### La solution : calibrer le montant en euros à l'émission

On ne pose pas 15 € pour tout le monde. **Au moment de créer le code, on calcule le montant en euros qui tombera sur la cible ronde de la devise du visiteur**, taux du jour à l'appui, avec une **marge de sécurité de 2 %**.

| Devise | L'e-mail et l'encart promettent | Seuil annoncé | Marchés Shopify visés |
|---|---|---|---|
| **EUR** | **15 €** | 80 € | France · europ · Allemagne · Espagne |
| **USD** | **15 $** | 90 $ | USA |
| **CAD** | **20 $ CA** | 130 $ CA | Canada |
| **CHF** | **14 CHF** | 75 CHF | Suisse |
| **GBP** | **13 £** | 70 £ | angleterre |

**La marge de 2 % arrondit toujours VERS LE HAUT.** Un client qui reçoit 15,31 $ au lieu de 15 $ ne se plaint jamais ; un client qui reçoit 14,96 $ écrit au service client. Entre l'émission et l'utilisation il s'écoule jusqu'à 7 jours, et le taux bouge — c'est cette marge qui garantit qu'on ne descend jamais sous le chiffre promis.

Même logique sur le **seuil** : on l'annonce arrondi vers le haut, et on pose en euros une valeur juste en dessous, pour que le client ne soit jamais refusé sur la promesse.

**Source des taux :** l'API de la Banque centrale européenne, gratuite et sans clé. Rafraîchie une fois par jour, mise en cache. En cas d'indisponibilité, garder le dernier taux connu — jamais bloquer une inscription pour ça.

### ⛔ Le ciblage par marché — obligatoire, et il a une condition de version

Chaque code doit être restreint aux marchés de sa devise, via **`context.markets`** sur `discountCodeBasicCreate`. Sans ça, un Américain pourrait utiliser le code calibré pour l'euro, et inversement.

- **Version d'API Admin `2026-07` minimum, impérativement.** En dessous, les codes portant une éligibilité marché deviennent **invisibles en lecture** : impossible de les vérifier ou de les supprimer ensuite.
- Viser **tous les marchés de la devise**, en construisant la liste **dynamiquement** depuis l'API. Une liste codée en dur ferait sortir du dispositif, en silence, tout marché créé plus tard.
- **⛔ Ne jamais utiliser `context.customers`.** Les types d'éligibilité s'excluent mutuellement : rattacher le code à une fiche client rendrait le ciblage par marché impossible. Le caractère « nominatif » vient de la chaîne aléatoire + `usageLimit: 1`, pas d'un rattachement client.

### ⛔ Le trou à combler d'abord

Le formulaire d'inscription n'envoie aujourd'hui que **la langue**. C'est insuffisant : un inscrit **allemand ou espagnol paie en euros** mais n'est pas sur le marché France. Un code verrouillé sur la France lui serait **inutilisable**.

Le thème transmettra donc aussi le **pays** et la **devise** de localisation. C'est la devise qui décide de la ligne du tableau ; le pays sert de repli.

### Ce qu'on écarte, et pourquoi

**Le taux de change manuel** est la seule voie qui donnerait « −15,00 $ » pile. Elle est rejetée :

- elle ne toucherait **pas que la remise**. La price list est un **ajustement en pourcentage**, pas des prix fixes : le taux s'applique **avant** l'ajustement (`prix = base × taux × 1,266`), donc figer le taux déplace **tout le catalogue** du marché ;
- la Suisse et l'Angleterre n'ont **aucune** grille dédiée : 100 % de leurs prix viennent de cette conversion ;
- elle transfère les **frais de conversion du client vers la marge** du marchand ;
- les remboursements resteraient au taux réel alors que les ventes seraient au taux gelé — l'écart est toujours défavorable.

Coût estimé : 150 à 185 €/an, plus une gestion de change permanente, pour gagner trente centimes d'affichage. Non.

---

## 5. Le parcours, étape par étape

### 5.1 — L'encart poste ici

`POST https://backend.myselfmonart.com/api/newsletter/subscribe`

```jsonc
// Requête
{
  "email": "prenom@exemple.fr",
  "locale": "fr",              // fr | en | de | es | nl — pilote la LANGUE des e-mails
  "currency": "EUR",           // EUR | USD | CAD | CHF | GBP — pilote le MONTANT du bon (§4 bis)
  "country": "FR",             // repli si la devise manque
  "source_url": "https://www.myselfmonart.com/products/...",
  "consent": true,
  "consent_label": "J'accepte de recevoir…",  // le libellé RÉELLEMENT affiché
  "hp": ""                     // pot de miel : non vide = on répond 200 et on jette
}
```

⚠️ **`locale` et `currency` sont deux choses différentes et ne se déduisent pas l'une de l'autre.** Un Allemand lit en allemand et paie en euros ; un Suisse peut lire en français et payer en francs ; un Américain lit en anglais et paie en dollars. La langue choisit le gabarit d'e-mail, la devise choisit le montant du bon et les marchés visés.

```jsonc
// 200 — succès
{ "ok": true, "state": "subscribed", "code": "MERCI-A7F3K2", "expires_at": "2026-08-19T23:59:59+02:00" }
// 200 — déjà inscrit, code encore valide : on RENVOIE le même code, on ne recrée rien
{ "ok": true, "state": "already",   "code": "MERCI-A7F3K2", "expires_at": "…" }
// 400
{ "ok": false, "error": "invalid_email" | "consent_required" }
// 429
{ "ok": false, "error": "rate_limited" }
```

**Exigences :**
- **CORS** : autoriser `https://www.myselfmonart.com` et `https://myselfmonart.com`. Rien d'autre.
- **Limitation de débit** : par IP (10/heure) **et** par e-mail (3/jour). Répondre 429, jamais 500.
- **Idempotence** : deux soumissions de la même adresse ne créent qu'un inscrit et qu'un code.
- **Pot de miel** : champ `hp` invisible côté thème. Non vide → répondre 200 sans rien faire.
- **Réponse en moins de 2 s.** L'encart affiche l'écran du code sur cette réponse. Si la création du code ou l'envoi doivent prendre du temps, répondre d'abord et faire le reste en file — **sauf le code, qui doit être dans la réponse**.
- **Journal de preuve écrit AVANT l'appel Shopify**, en append-only.

### 5.2 — Ordre des opérations à l'inscription

1. Valider, limiter le débit, pot de miel.
2. **Écrire le journal de preuve** (immuable).
3. Créer le **code nominatif** (§4).
4. `customerSet` vers Shopify (§5.3).
5. Répondre au thème avec le code.
6. Mettre **E1 en file, immédiat**.

Si l'étape 4 échoue, **on répond quand même** avec le code et on rejoue l'écriture Shopify en file. Le client ne doit jamais payer une panne d'API.

### 5.3 — L'écriture Shopify

```graphql
customerSet(input: {
  email: $email
  locale: $locale
  emailMarketingConsent: { marketingState: SUBSCRIBED, marketingOptInLevel: SINGLE_OPT_IN }
})
```

- **Upsert par e-mail** — jamais `customerCreate`.
- **Ne pas envoyer `tags` ni `addresses`** (les listes sont remplacées, pas fusionnées).
- **⛔ NE PAS envoyer `consentUpdatedAt`.** Le fournir déclenche les automatisations natives Shopify. Flow est installée : risque de double e-mail de bienvenue et de double offre. Au seuil de 0,08 % de plaintes, c'est un risque de fermeture de compte créé par une ligne anodine.
- Stocker le `customerId` retourné : les vérifications ultérieures se feront **par identifiant**, pas par recherche sur l'e-mail.

**Action manuelle demandée au marchand avant le lancement :** vérifier qu'aucune automatisation « Customer subscribed to email marketing » n'est active dans Shopify Messaging / Flow.

### 5.4 — Avant CHAQUE envoi, dans cet ordre

1. **Filtre local** — la séquence est-elle encore active ? Code non consommé, aucune commande payée, aucun rebond dur, aucune plainte, aucune désinscription, **et marqueur de finalité « séquence bon 15 € » postérieur au lancement**.
2. **Filtre Shopify** — `customer(id) { defaultEmailAddress { emailAddress marketingState } }`. **Envoyer si et seulement si `marketingState === "SUBSCRIBED"`.** Ne pas raisonner par la négative.
3. **Vérifier le hash `errors`.** Un e-mail à `null` accompagné d'`errors` est une **alarme**, jamais « client sans e-mail ». Le client Shopify actuel du projet ne remonte pas les `errors` d'une réponse 200 partielle : **à corriger avant le lancement**.
4. Si l'API Shopify est indisponible ou limitée : **reporter, jamais envoyer**. Réessayer avec recul exponentiel, alerter au bout de 6 h.

### 5.5 — Le calendrier

| E-mail | Délai | Annulé si |
|---|---|---|
| **E1** | immédiat | — |
| **E2** | **J+3** | code consommé · commande payée · désabonnement · rebond dur · plainte |
| **E3** | **J+7** | idem |

Un cron toutes les 15 minutes suffit à ce volume. Pas de file distribuée.

---

## 6. Le désabonnement — traiter comme une fonctionnalité de premier plan

C'est ce qui protège le compte d'envoi. Ce n'est pas une mention légale.

### En-têtes de chaque e-mail

```
List-Unsubscribe: <https://backend.myselfmonart.com/u/{jeton}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

L'URI doit être **HTTPS** et la **signature DKIM doit couvrir ces deux en-têtes**, sans quoi les fournisseurs « SHOULD NOT offer a one-click unsubscribe ».

⚠️ Resend ne pose ces en-têtes automatiquement que sur ses *Broadcasts*. Sur l'API d'envoi utilisée ici, **c'est à toi de les poser.**

### Les deux routes

| Méthode | Comportement |
|---|---|
| `GET /u/:jeton` | Page de confirmation lisible, **dans la langue du contact**. Ne désabonne pas. |
| `POST /u/:jeton` | Désabonne. Corps `List-Unsubscribe=One-Click`. Répond **200, page blanche**. Idempotent. |

**Pourquoi le GET ne doit rien faire :** RFC 8058 — « anti-spam software often fetches all resources in mail header fields automatically, without any action by the user ». Un GET actif produirait des désabonnements fantômes.

**Le jeton** : HMAC-SHA256 (identifiant interne + clé serveur), opaque, durée illimitée. **Jamais l'e-mail en clair, jamais le `customerId` nu** — l'URL est publiquement atteignable, un identifiant devinable permettrait de désabonner des tiers en masse.

**⚠️ AdonisJS** : `@adonisjs/shield` protège les POST par CSRF. Le POST vient de Google ou Yahoo, sans cookie ni jeton. **Sans `csrf.exceptRoutes`, le désabonnement un clic renverra 403** — techniquement présent, fonctionnellement mort. Même exception pour les webhooks Shopify et Resend.

### ⛔ Écriture en avance locale — le point critique

À réception d'un désabonnement :

1. **Bloquer d'abord en base locale, en synchrone.**
2. Répondre 200.
3. **Puis** propager vers Shopify (`customerEmailMarketingConsentUpdate` → `UNSUBSCRIBED`) via une file avec rejeu.
4. Alerter si non réconcilié sous 24 h.

**Sans cette écriture en avance, une indisponibilité de Shopify perd la désinscription** — et le back-end, qui relit Shopify, continuerait d'envoyer en toute bonne foi. **C'est le seul endroit où « Shopify seule vérité » est strictement moins sûr qu'un registre local.**

### Dans le corps de l'e-mail

Lien de désabonnement **visible en clair dans le pied de page**, pas seulement en en-tête, avec l'adresse postale de la **SAS KINDOPIA** et le rappel du contexte de collecte (« vous avez demandé votre bon de 15 € sur myselfmonart.com le JJ/MM »).

---

## 7. Le cron hebdomadaire existant — ce qui change

Le code public rotatif **n'est plus envoyé par e-mail**. Son rôle se réduit :

- `promo.ends_at` / `promo.ends_ts` continuent de piloter **l'extinction automatique de l'encart** sur le site. **Ne pas y toucher.**
- `promo.code` n'est plus lu par l'encart pour affichage (§8). Le conserver : il reste le code du bandeau et un repli.
- **Le passage à 21 jours évoqué précédemment est ABANDONNÉ**, et les 14 jours aussi. Les deux venaient d'une marge de sécurité de l'ancienne architecture : le code était public et tournait chaque semaine, il devait donc survivre à une rotation tombant au milieu de la séquence. Avec un code nominatif créé à l'inscription, cette contrainte n'existe plus.

### ⛔ La validité est de 8 jours, et ce chiffre n'est pas arbitraire

**8 jours = la cadence des e-mails (J+7) + 1.** C'est ce qui rend l'urgence du 3ᵉ e-mail **vraie** : il part à J+7, le code expire à J+8, et « vos 15 € s'arrêtent demain » est exact.

Ne pas rallonger cette durée sans décaler l'envoi du 3ᵉ e-mail en conséquence. Un e-mail qui annonce une échéance fausse est précisément ce qui fait cliquer sur « signaler comme spam » — et au seuil de 0,08 % de plaintes du §0, c'est le seul évènement qui peut fermer le compte d'envoi.

**Garde-fou :** refuser un envoi si le code de l'inscrit est **déjà expiré** ; journaliser et alerter. *(Le seuil de 72 h évoqué précédemment n'a plus lieu d'être : avec 8 jours de validité, le 3ᵉ e-mail tombe volontairement à moins de 24 h de l'échéance. Un garde-fou à 72 h le bloquerait systématiquement.)*

---

## 8. Contrat avec le thème — ce que je modifie de mon côté

Je m'en charge, mais tu dois connaître le contrat :

1. L'encart **poste en `fetch` vers `/api/newsletter/subscribe`** au lieu du formulaire client Shopify. Disparaissent : le jeton hCaptcha, le rechargement de page, le badge hCaptcha, le verdict serveur bricolé.
2. **Le code n'est plus rendu côté serveur.** L'écran 2 affiche le code **retourné par ta réponse**. Il n'y a donc plus de code promo dans le HTML public.
3. L'encart envoie la **langue affichée** et le **libellé de consentement réellement montré**.
4. En cas d'échec (`ok: false` ou réseau), l'encart affiche un message honnête et **n'annonce aucun bon**.

**Je ne déploierai le thème qu'une fois ton point de terminaison en ligne et testé.** D'ici là, l'encart actuel reste en production.

---

## 9. Prérequis DNS — ✅ FAIT ET VÉRIFIÉ LE 2026-08-05/06

**Tout ce qui suit est en place et contrôlé sur deux résolveurs indépendants. Rien à refaire.**

| | État |
|---|---|
| SPF racine | `v=spf1 include:_spf.google.com ~all` ✅ |
| DKIM Google Workspace | `google._domainkey`, RSA 2048 ✅ |
| DMARC | `p=none`, rapports vers Cloudflare DMARC Management ✅ |
| Authentification Shopify | 6 CNAME, 4 sélecteurs DKIM servant de vraies clés ✅ |
| SES : DKIM | 3 CNAME, identité **Verified** ✅ |
| SES : MAIL FROM | MX + SPF sur `bounce.mail.myselfmonart.com` ✅ |

**Deux points à connaître :**
- Le DMARC du sous-domaine `mail.myselfmonart.com` n'a **volontairement pas** été créé : en son absence, DMARC remonte au domaine parent, qui porte déjà `p=none` **et** l'adresse de collecte Cloudflare. Créer celui que suggérait AWS aurait supprimé les rapports sur le canal marketing.
- `aspf=s` est **absent** du DMARC, et doit le rester : il casserait l'alignement SPF de SES, qui envoie depuis un sous-domaine.

**On restera en `p=none` plusieurs semaines.** Ne pas durcir vers `quarantine` ou `reject` sans avoir lu les rapports et confirmé que Google Workspace, Shopify et SES passent tous les trois.

<details>
<summary>Historique — le diagnostic d'origine (conservé pour mémoire)</summary>


**Le SPF du domaine est cassé aujourd'hui**, et pas seulement pour ce projet :

```
v=spf1 include:dc-aa8e722993._spfm.myselfmonart.com ~all
```

`dc-aa8e722993._spfm.myselfmonart.com` renvoie **NXDOMAIN** (vérifié le 2026-08-05). Un `include:` vers un domaine inexistant met le SPF en erreur permanente — **aucun e-mail du domaine n'est authentifié**, y compris ceux de Google Workspace.

À faire, dans cet ordre :

| # | Action |
|---|---|
| 1 | Remplacer le TXT racine par `v=spf1 include:_spf.google.com ~all` |
| 2 | Activer le DKIM Google Workspace en **2048 bits** |
| 3 | Authentifier l'expéditeur Shopify (Paramètres → Notifications → authentification du domaine) |
| 4 | Poser les 3 enregistrements Resend sur **`mail.myselfmonart.com`**, région **Irlande** |
| 5 | Poser `_dmarc` : `v=DMARC1; p=none; rua=mailto:dmarc@myselfmonart.com; fo=1` — **sans `aspf=s`**, qui casserait l'alignement de Resend |

⛔ **Ne pas acheter de domaine cousin** type `myselfmonart-news.com` : c'est le motif que recherchent les filtres antiphishing. Un sous-domaine du domaine réel, point.

**Pourquoi c'est non négociable :** Orange, SFR, Free et laposte.net exigent SPF + DKIM + DMARC **tous les trois**, sans seuil de volume, dès le premier e-mail. Ils représentent une part majeure des clients B2C français et sont invisibles dans les outils Google.

**`Reply-To: team@myselfmonart.com` sur chaque envoi** — impératif : `mail.myselfmonart.com` n'aura aucune boîte de réception, sans Reply-To toute réponse client tombe dans le vide.

</details>

---

## 10. Webhooks

| Webhook | Traitement |
|---|---|
| `ORDERS_PAID` (existant) | Déclencher sur l'**ID de commande**, puis **rappeler l'API Admin** pour l'e-mail. **Ne pas lire l'e-mail dans la charge utile** : les payloads sont filtrés indépendamment du niveau approuvé. |
| `customers/email_marketing_consent/update` | À souscrire. **Simple déclencheur de relecture**, jamais un état. |
| `customers/data_request`, `customers/redact`, `shop/redact` | **Obligatoires.** Répondre 200, agir sous 30 jours. Sur `redact` : annuler la séquence, purger les journaux d'envoi, **conserver l'empreinte hachée en liste repoussoir**. |
| Resend : `email.bounced` | Rebond **dur** → arrêt de séquence + liste locale d'adresses mortes. **Ne rien écrire dans Shopify.** |
| Resend : `email.complained` | **Écrire `UNSUBSCRIBED` dans Shopify** + arrêt de séquence. |

### ⛔ Réconciliation des abonnements webhook

Shopify **supprime définitivement** un abonnement après **8 échecs consécutifs en 4 heures**. Une indisponibilité de 4 h détruit `ORDERS_PAID` — le service revient, tout paraît normal, et **E2/E3 partent désormais à des gens qui viennent d'acheter**. Panne silencieuse, et exactement le message qui déclenche des plaintes.

**Parade en trois couches :**
1. Au démarrage **et** par cron quotidien : lister `webhookSubscriptions` et recréer celles qui manquent (idempotent).
2. **Ne jamais faire dépendre une décision d'envoi d'un seul webhook** — avant E2/E3, interroger l'API (commande payée ? code consommé ?). Le webhook est une optimisation, pas la vérité.
3. Surveiller l'adresse développeur d'urgence de l'app : c'est là qu'arrive l'avertissement.

---

## 11. Transport d'envoi — Amazon SES, déjà en place

**⚠️ Cette section a été réécrite le 2026-08-06 : le prestataire retenu n'est PAS Resend.**

Resend a été écarté pour une raison structurelle : **ses seuils de plainte s'appliquent au COMPTE, pas au domaine** (« Your complaint rate must be lower than 0.08% […] your account may be shutdown without warning »). Or le compte Resend existant sert déjà les e-mails **transactionnels du studio** de personnalisation, sur `send.myselfmonart.com`. Une plainte sur la séquence promo aurait pu suspendre l'envoi des liens de reprise de création. Et ouvrir un second compte gratuit tombe sous leur clause anti-contournement de quota.

### Ce qui est déjà configuré et vérifié

| | |
|---|---|
| Prestataire | **Amazon SES** |
| Région | **eu-west-1 (Irlande)** — définitif, les enregistrements y sont liés |
| Domaine d'envoi | **`mail.myselfmonart.com`** — statut **Verified** |
| Identité ARN | `arn:aws:ses:eu-west-1:691667571330:identity/mail.myselfmonart.com` |
| MAIL FROM personnalisé | `bounce.mail.myselfmonart.com` (MX + SPF posés) |
| DKIM | Easy DKIM RSA_2048, 3 CNAME posés, identité validée |
| Hôte SMTP | `email-smtp.eu-west-1.amazonaws.com` |
| Port | `587` (STARTTLS) |
| Identifiants | utilisateur IAM `backend-ses-sender-smtp`, transmis hors de ce document |
| Coût | 0,10 $ les 1 000 e-mails, sans abonnement (~0,05 $/mois au volume prévu) |

### ⛔ Envoi en RAW obligatoire

La politique IAM de cet utilisateur n'autorise qu'une seule action : **`ses:SendRawEmail`**.

Ce n'est pas une limitation subie, c'est le besoin : les en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` du §6 ne peuvent être posés que dans un message construit en brut. Construis le MIME toi-même (nodemailer convient très bien en mode SMTP).

Si un jour un appel échoue en « Access Denied » parce que le code est passé en contenu simple, la correction est d'ajouter `ses:SendEmail` à la politique — pas de contourner le format brut.

### Sortie du bac à sable

Demandée le 2026-08-05. **Tant qu'elle n'est pas accordée, SES n'accepte d'envoyer qu'à des adresses vérifiées une par une.** Vérifier l'état dans Account dashboard avant le premier test réel.

### Second transport, toujours recommandé

Garder l'envoi derrière une interface `MailTransport`. Le SMTP rend la bascule triviale : trois variables d'environnement. Second candidat : **SMTP2GO** (gratuit, 1 000/mois, aucun logo) ou **Brevo**.

**⛔ Écarté formellement : Scaleway Transactional Email**, dont les conditions interdisent le marketing mot pour mot (« You cannot use Transactional Email to send marketing emails »).

**⛔ Ne pas toucher au compte Resend ni à `send.myselfmonart.com`** : c'est le canal du studio, il fonctionne, il reste isolé de celui-ci.

---

## 12. Les 5 langues

`fr` (primaire), `en`, `de`, `es`, `nl` — **les cinq au lancement**, décision du marchand.

- La langue est un **attribut de l'inscrit**, capturée à l'inscription et stockée **localement** (c'est le local qui fait foi à l'envoi ; Shopify est modifiable par d'autres écrivains). Écrite aussi dans `Customer.locale` par cohérence.
- **Un seul gabarit par e-mail**, alimenté par cinq fichiers de traduction. Jamais quinze gabarits.
- **Les liens doivent porter le préfixe de langue** de la boutique (`/en/...`, `/de/...`). Un lien sans préfixe renvoie un Néerlandais sur une page française.
- Montants et dates formatés selon la langue.
- Repli sur le français si la langue est absente ou inconnue.

---

## 13. Définition du terminé

- [ ] Test de fumée n°1 (écriture Shopify) passé, client de test supprimé.
- [ ] Les 5 enregistrements DNS du §9 posés et vérifiés.
- [ ] `/api/newsletter/subscribe` répond en moins de 2 s, avec limitation de débit, pot de miel, idempotence, CORS restreint.
- [ ] Journal de preuve append-only, écrit avant l'appel Shopify.
- [ ] Code nominatif créé avec `usageLimit: 1` et `combinesWith` tout à `false` — **vérifié sur un vrai panier**.
- [ ] `GET /u/:jeton` n'agit pas ; `POST /u/:jeton` désabonne, idempotent, exclu du CSRF.
- [ ] Écriture en avance locale du désabonnement, puis propagation Shopify avec rejeu.
- [ ] Les 3 webhooks RGPD répondent 200.
- [ ] Réconciliation quotidienne des abonnements webhook.
- [ ] `errors` de l'API Shopify journalisés et traités comme alarme.
- [ ] Interface `MailTransport` à deux implémentations, secondaire testé au moins une fois.
- [ ] Envoi témoin vérifié à l'œil vers **Gmail, Orange et Outlook** — c'est la seule mesure disponible à ce volume, Google Postmaster Tools restera vide.
- [ ] Aucune automatisation « Customer subscribed to email marketing » active côté Shopify.

---

## 14. Ce qu'il ne faut surtout pas faire

| ⛔ | Pourquoi |
|---|---|
| Envoyer aux **~750 abonnés dormants** | Base non sollicitée depuis des mois → rebonds à deux chiffres sur un domaine neuf. Décision du marchand : **on n'y touche pas.** |
| Mettre `marketingState` en cache | Shopify n'est pas seul écrivain, webhooks sans garantie d'ordre. |
| Transmettre `consentUpdatedAt` | Déclenche les automatisations natives → double e-mail. |
| Écrire `UNSUBSCRIBED` sur un rebond | Falsifie le registre de consentement. |
| Lire l'e-mail dans une charge utile de webhook | Payloads filtrés indépendamment du niveau approuvé. |
| Utiliser `customerCreate` | Échoue sur doublon d'e-mail. Utiliser `customerSet`. |
| Envoyer `tags` ou `addresses` dans `customerSet` | Les listes sont remplacées, pas fusionnées. |
| Une salve de plus de 5 000 e-mails en un jour | Classe le domaine « expéditeur en volume » chez Google, **à vie**. |
| Un bouton « réessayer » qui boucle | Rapproche du blocage par IP au lieu de réparer. |
