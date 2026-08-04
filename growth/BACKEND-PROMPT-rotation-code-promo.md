# Brief back-end — rotation automatique du code promo, à vie, sans intervention

**Destinataire : l'agent back-end (AdonisJS, `backend.myselfmonart.com`).**
**Date : 2026-08-04.** Boutique : MyselfMonArt (`gid://shopify/Shop/62323884287`), plan **Basic**, Checkout Extensibility, fuseau **Europe/Paris**.

> **L'exigence du marchand, mot pour mot :** « je veux tout set une fois et que plus jamais j'aie à y toucher ».
> Tout ce document en découle. Chaque décision est arbitrée pour le **fonctionnement non surveillé sur plusieurs années**, pas pour l'élégance.

---

## 1. Ce qui existe déjà, et ne doit pas être touché

Un encart promotionnel est **déployé en production** sur les fiches produit : `snippets/promo-popup.liquid` + `assets/promo-popup.js`. Il échange un e-mail contre un code de réduction de 15 €, affiché à l'écran et envoyé par e-mail.

Il est aujourd'hui piloté par deux réglages de thème, saisis à la main. **C'est exactement ce qu'il faut supprimer.**

Le snippet a déjà été modifié pour lire les **métachamps de boutique** en priorité, avec repli sur les réglages. **Le travail côté thème est fait : ne touche à aucun fichier du thème.**

---

## 2. Architecture retenue : métachamps de boutique

### Ce que tu dois faire

Un cron écrit **trois métachamps de boutique**. Le thème les lit. Le thème n'est jamais modifié.

### ⛔ Ce que tu ne dois surtout pas faire : réécrire `config/settings_data.json`

C'était l'autre voie possible. Elle est **écartée formellement**, pour quatre raisons vérifiées :

1. **Shopify le déconseille explicitement** — « In most cases, you shouldn't use the Asset resource ». L'API REST Admin est *legacy* depuis 2024-10-01.
2. **`themeFilesUpsert` exige une dérogation Shopify** (« an exemption from Shopify to modify theme files »), cadrée pour les apps de l'App Store ; le cas des apps personnalisées n'est documenté nulle part. Un automatisme censé tourner à vie ne peut pas reposer là-dessus.
3. **`settings_data.json` n'offre aucun compare-and-set.** Un read-modify-write entrerait en course avec l'éditeur de thème du marchand **et** avec les étapes « Pull current Shopify theme » puis « Auto-sync Shopify admin changes » du pipeline GitHub Actions. Perte silencieuse de réglages, ou déploiement en échec.
4. **Le scope `themes` est disproportionné** : droit d'écriture sur tout le thème pour changer dix caractères.

À l'inverse, les métachamps sont **toujours lisibles en Liquid** quelles que soient les autorisations (« metafields are always accessible in Liquid regardless of this setting » — le réglage `PUBLIC_READ` ne concerne que la Storefront API), `metafieldsSet` est un **upsert atomique**, et le thème reste hors du chemin.

---

## 3. Le contrat — trois métachamps, un usage chacun

Owner : `gid://shopify/Shop/62323884287`. Namespace : **`promo`** (namespace marchand, surtout pas `$app` ni `app--<id>--…`).

| Clé | Type | Contenu | Lu par |
|---|---|---|---|
| `code` | `single_line_text_field` | Le code, ex. `MERCI-K7QXR` | Liquid, affichage + lien `/discount/` |
| `ends_at` | `single_line_text_field` | **ISO 8601 avec décalage**, ex. `2026-09-30T23:59:59+02:00` | Liquid, **affichage** de la date |
| `ends_ts` | `number_integer` | **Le même instant en secondes epoch**, ex. `1790812799` | Liquid, **comparaison** d'extinction |

**Pourquoi deux champs pour la même date :** l'un sert à afficher, l'autre à comparer. Une date nue est interprétée à minuit UTC par Liquid, ce qui décalait l'extinction d'une à deux heures selon l'heure d'été. Séparer les deux usages supprime l'ambiguïté. **Les deux doivent décrire exactement le même instant** — calcule-les une seule fois et dérive l'un de l'autre.

⚠️ Ne nomme jamais une clé `size`, `first` ou `last` : Liquid appliquerait le filtre du même nom au lieu de rendre le métachamp.

### Amorçage — une seule fois, idempotent

Crée les trois **définitions** (`metafieldDefinitionCreate`, `ownerType: SHOP`) au démarrage du service. Traite l'erreur « existe déjà » comme un succès.

La documentation ne dit pas qu'une définition soit *obligatoire* pour lire en Liquid, et ne dit pas l'inverse non plus. On la crée quand même : coût nul, et ça rend la valeur visible et corrigeable à la main par le marchand dans l'admin.

N'ajoute **pas** `access: {storefront: PUBLIC_READ}` — inutile en Liquid, et c'est un réglage de plus à maintenir.

> ⚠️ L'admin ne liste pas toujours les métachamps d'owner `SHOP`. Ne conclus jamais « la définition n'existe pas » parce que tu ne la vois pas : vérifie par `metafieldDefinitions(ownerType: SHOP, first: 50)`.

---

## 4. Le rythme : rotation 7 jours, validité 14 jours

**C'est la décision la plus importante du document, et elle n'est pas négociable.**

| | Valeur |
|---|---|
| Rotation (fenêtre d'**affichage**) | **7 jours** |
| Validité du code (`endsAt` Shopify) | **14 jours** |
| Recouvrement | **7 jours** |

**Pourquoi la validité doit dépasser la fenêtre d'affichage.** Les pages de la boutique sont mises en cache et **Shopify ne documente aucun TTL ni aucune API de purge**. Les mises à jour de métachamps se propagent en général en 5 à 10 secondes, mais des épisodes de cache de **plusieurs heures** sont rapportés par les développeurs et n'ont jamais été résolus par Shopify — un membre du staff a répondu « I haven't been able to replicate this myself ».

Conséquence : un visiteur peut recevoir une page en cache portant le code de la semaine précédente. Avec 7 jours de recouvrement, **ce code fonctionne encore au checkout**. Le pire cas devient « le client a un code un peu ancien mais valide » au lieu de « code refusé » — c'est-à-dire une vente perdue et une confiance abîmée.

Ce recouvrement est ce qui rend le système sûr **quelle que soit** l'architecture. Il n'est pas optionnel.

**Corollaire absolu : ne désactive JAMAIS le code de la semaine précédente au moment de publier le nouveau.** Laisse-le expirer tout seul.

---

## 5. La séquence du cron — dans cet ordre exact

```
1. Verrou            → un seul lancement à la fois
2. Code déterministe → dérivé de la semaine ISO, jamais aléatoire
3. Garde en base     → INSERT ... UNIQUE(iso_week), si conflit : sortir
4. Lookup            → codeDiscountNodeByCode(code) : s'il existe et est ACTIVE, sauter la création
5. Création          → discountCodeBasicCreate (payload §7)
6. RELECTURE         → codeDiscountNodeByCode, quoi qu'il arrive
7. Publication       → metafieldsSet, UNIQUEMENT si la relecture confirme
```

### ⛔ L'étape 6 n'est pas une précaution, c'est une obligation

**Shopify a un bug confirmé par son propre staff (oct. 2025) : `discountCodeBasicCreate` peut renvoyer une erreur ET créer quand même la remise.** Ne relance jamais en aveugle après une erreur — tu créerais un doublon. Relis toujours, et décide d'après ce que tu lis, pas d'après ce que la mutation a répondu.

### ⛔ L'ordre 5 → 6 → 7 ne s'inverse jamais

Publier le métachamp avant d'avoir confirmé la remise ferait pointer l'encart vers un code inexistant : le client verrait « votre code » et le checkout le refuserait.

### Le code déterministe — c'est ce qui rend le cron idempotent

```
code = "MERCI-" + base32(HMAC-SHA256(SECRET, isoWeek)).slice(0, 5)
alphabet = ABCDEFGHJKMNPQRSTUVWXYZ23456789   (ni I, L, O, 0, 1 — ambigus à la lecture)
isoWeek  = "2026-W32"
```

Jamais d'aléatoire : si le cron se relance, il recalcule **le même code** et l'étape 4 le détecte. C'est cette propriété qui rend l'opération rejouable sans dégât.

`SECRET` est une variable d'environnement, jamais commitée. Le code reste imprévisible de l'extérieur : sans le secret, on ne peut pas deviner celui de la semaine suivante.

---

## 6. Fuseau horaire et heure d'été

`startsAt` et `endsAt` sont des **instants absolus** ISO 8601. Le fuseau de la boutique ne joue qu'à l'affichage dans l'admin. **Envoyer `23:59:59Z` pour une boutique parisienne fait expirer la remise une à deux heures trop tard**, et l'écart change deux fois par an.

Lis le fuseau depuis la boutique (`shop { ianaTimezone }`) plutôt que de le coder en dur, et calcule l'instant UTC correspondant à 23:59:59 heure locale :

```js
/**
 * Instant UTC de 23:59:59 heure locale, pour un jour donné, robuste au changement d'heure.
 * Deux passes : la première estime le décalage, la seconde le corrige si l'estimation
 * tombait du mauvais côté d'une bascule DST.
 */
function endOfDayUtc(y, m, d, tz = 'Europe/Paris') {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  // Décalage du fuseau (en ms) à un instant donné.
  const offsetAt = (date) => {
    const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return asUtc - date.getTime();
  };
  const naive = Date.UTC(y, m - 1, d, 23, 59, 59);
  let inst = new Date(naive - offsetAt(new Date(naive)));
  inst = new Date(naive - offsetAt(inst)); // seconde passe : convergence DST
  return inst;
}
```

⛔ **N'utilise pas `Temporal`** : il n'est pas activé par défaut avant Node 26. Pas de dépendance lourde non plus — `Intl` suffit et ne se périme pas.

Les trois valeurs publiées dérivent toutes de cet instant unique :

```js
const end = endOfDayUtc(y, m, d);            // Date
metafields.ends_at = end.toISOString();       // …ou avec décalage local pour l'affichage
metafields.ends_ts = Math.floor(end.getTime() / 1000);
```

---

## 7. Le payload de création — exact

```graphql
mutation { discountCodeBasicCreate(basicCodeDiscount: {
  title: "Encart promo — semaine 2026-W32",
  code: "MERCI-K7QXR",
  startsAt: "2026-08-04T00:00:00+02:00",
  endsAt:   "2026-08-17T23:59:59+02:00",
  customerSelection: { all: true },
  customerGets: {
    items: { all: true },
    value: { discountAmount: { amount: "15.0", appliesOnEachItem: false } }
  },
  minimumRequirement: { subtotal: { greaterThanOrEqualToSubtotal: "80.0" } },
  appliesOncePerCustomer: true,
  combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false }
}) { codeDiscountNode { id } userErrors { field code message } } }
```

**Les deux points sur lesquels tu ne peux pas te tromper :**

⛔ **`combinesWith` : les trois à `false`.** C'est ce réglage qui fait que Shopify applique automatiquement **la meilleure des deux remises** face à la promotion automatique déjà en place. Une seule case à `true` et les remises **s'additionnent** — le marchand le découvrirait sur sa facture. La promotion existante est de classe **PRODUCT**, ce code sera de classe **ORDER** : le risque d'empilement est **Product ↔ Order**, et il est ouvert sur cette boutique (Checkout Extensibility).

⛔ **Pas d'`usageLimit` global.** Un quota épuisé créerait un trou invisible : l'encart continuerait d'afficher un code que le checkout refuse. Le garde-fou, c'est `appliesOncePerCustomer: true` combiné au minimum de 80 €.

---

## 8. Résilience — le mode de défaillance visé est *fail-stale*

**En cas de panne, ne touche à rien.** L'ancien code reste publié et reste valide. C'est tout.

| Situation | Comportement attendu |
|---|---|
| API Shopify indisponible | Ne rien publier. Réessayer avec backoff exponentiel. L'ancien code continue de fonctionner |
| Création en erreur | Relire (étape 6). Si la remise existe : publier. Sinon : ne rien publier, réessayer au prochain tour |
| Cron non exécuté pendant des semaines | L'ancien code expire, `ends_ts` devient passé, **le snippet éteint l'encart tout seul**. L'offre disparaît — elle ne ment jamais |
| Double lancement | Le code déterministe + la contrainte `UNIQUE(iso_week)` rendent l'opération sans effet |

⛔ **Aucun nettoyage dans un `catch`.** Ne supprime jamais une remise en réaction à une erreur : le bug Shopify de l'étape 6 signifie qu'elle a peut-être été créée correctement.

**Le pire cas acceptable est que l'offre disparaisse. Le pire cas inacceptable est qu'elle affiche un code mort.** Toute décision de conception se tranche avec cette phrase.

### Ménage

52 codes par an. Rien d'urgent, mais garde l'admin lisible : une fois par mois, `discountCodeDeactivate` sur les remises du namespace dont `endsAt` est passé **de plus de 30 jours**. Jamais avant. Aucun effet sur les commandes déjà passées.

---

## 9. Surveillance — le marchand ne surveille rien

C'est le point de la demande : il ne veut plus rien regarder. Donc **le système doit l'alerter, pas l'inverse.**

- **Deux échecs consécutifs** → un e-mail via le hub existant (`team@myselfmonart.com`), objet explicite : « Rotation du code promo en échec depuis X jours ».
- **Un journal** de chaque exécution : semaine ISO, code, instant de fin, résultat.
- **Une route de santé** `GET /promo/status` renvoyant le code courant, sa date de fin, et le nombre de jours restants. C'est ce qu'on interrogera pour vérifier sans ouvrir l'admin Shopify.

---

## 10. Recette — comment on saura que ça marche

1. `metafieldDefinitions(ownerType: SHOP)` renvoie les trois définitions.
2. Après un premier tour : `shop.metafields.promo.code` est renseigné, et **le même code existe dans Réductions**, ACTIVE, 15 €, minimum 80 €, combinaisons toutes décochées.
3. `ends_at` et `ends_ts` décrivent **le même instant** (à la seconde).
4. Ouvrir une fiche produit : l'encart affiche le code du métachamp et la bonne date.
5. Relancer le cron immédiatement : **aucun nouveau code créé**, aucun métachamp modifié.
6. Avancer l'horloge de 7 jours : un nouveau code apparaît, le métachamp bascule dessus, **et l'ancien code fonctionne toujours au checkout**.
7. Vider les trois métachamps : l'encart **disparaît** (il ne retombe pas sur un état incohérent).

---

## 11. Ce qui reste à la charge du marchand — une seule fois

Créer la **première** remise n'est pas nécessaire : le cron s'en charge dès son premier tour. Il lui reste seulement à **activer l'encart** dans le thème (Personnaliser → Paramètres → « Encart promo »), et à laisser les deux champs code/date **vides** pour que les métachamps prennent la main.

Ensuite, plus rien. Jamais.
