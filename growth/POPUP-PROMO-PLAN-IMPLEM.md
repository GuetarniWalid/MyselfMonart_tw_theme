# Plan d'implémentation — dispositif promotionnel MyselfMonArt

**Destinataire : Claude Design.** Document de cadrage à respecter avant toute maquette.
**Date : 2026-08-03.** Rédigé à partir de 146 recherches web (2024-2026), d'un audit du thème, d'un audit du site live et des données réelles de la boutique.

---

## 0. Verdict en une page

La demande initiale était : « une popup de promo qui apparaît au moment opportun pour augmenter les ventes et le panier moyen ».

**Cette formulation confond trois chantiers distincts.** Les traiter avec un seul overlay est précisément ce qui ferait échouer le projet :

| Chantier | Où il se joue réellement |
|---|---|
| Augmenter le **panier moyen** | Dans le tiroir panier, au moment de l'ajout — pas dans un overlay de site |
| Augmenter les **ventes** | Pas via une remise supplémentaire : une remise permanente est déjà affichée |
| Capter des **e-mails** | ⚠️ **CORRIGÉ le 2026-08-03 : la boutique a DÉJÀ 756 abonnés marketing.** Le levier n'est pas d'en capter 15-30 de plus par mois, c'est d'activer les 756 existants. Voir §1.5 |

**Ce qu'il faut concevoir, dans l'ordre :**

1. **P0 — Assainir la surface promotionnelle** (5 correctifs, ~0 € de design, bloquants). §2
2. **P1 — Livrable design principal : le panneau « 2ᵉ œuvre » dans le tiroir panier.** §4
3. **P2 — Optionnel et conditionnel : la feuille basse de capture e-mail.** §5

**Deux vérifications doivent être faites avant d'écrire la moindre ligne de copy** (§2.5) : la valeur réelle de la promo « Vacance d'été », et l'existence d'un flow de bienvenue e-mail. Sans la seconde, le volet capture d'e-mail a une espérance de gain de **zéro**.

---

## 1. Les données qui commandent le design

Toutes mesurées, aucune estimation. Elles ne sont pas décoratives : chacune interdit ou impose quelque chose.

### 1.1 Trafic (Google Search Console, 90 j)

| | Valeur | Ce que ça impose |
|---|---|---|
| Clics organiques | **~1 300 / mois** | L'ordre de grandeur du gain est en dizaines d'euros, pas en milliers |
| **Mobile** | **70,8 %** | Mobile-first obligatoire. Maquetter en 375 px D'ABORD |
| Desktop | 25,1 % | Le modal centré, s'il existe, est réservé au desktop |
| France | 67 % | 1/3 du trafic est international → i18n obligatoire (FR/EN/DE/ES/NL) |

Le business vit **à 100 % du SEO organique**. C'est l'actif qui paie les factures.

### 1.2 Commandes (Shopify, 49 commandes payées sur 6 mois)

| | Valeur | Ce que ça impose |
|---|---|---|
| Volume | **~8 commandes / mois** | **Aucun A/B test n'est possible.** Une seule version, bien conçue |
| Panier **médian** | **126,50 €** | Piloter sur la médiane, jamais sur la moyenne |
| Panier moyen | 163,53 € | Trompeur : une seule journée (22/05) pèse 34 % du trimestre |
| p25 / p75 | 93,58 € / 195,25 € | Un seuil à 160 € est atteignable ; à 200 €, il ne l'est plus pour 78 % des clients |
| **Commandes mono-article** | **63 %** (31/49) | **C'est LE gisement.** Le levier est le passage de 1 à 2 articles |
| Commandes à 2 œuvres ou + | **10 %** seulement | 90 % des clients ne font pas le geste qu'on veut déclencher |
| **Kit de fixation (~6 €)** | **35 % d'attachement** (17/49) | **Le seul levier prouvé sur cette boutique.** À cloner, pas à réinventer |
| Taux de conversion estimé | **0,45 – 0,6 %** | Contre ~1,4 % de référence déco. Un overlay ne corrigera pas cet écart |

### 1.3 Prix constatés en live

- **Toile** : entrée 59,50 € en carte collection ; sur une fiche, 190 variantes de **62,50 € à 207,00 €**. Le cadre ajoute 40 à 50 € dès le plus petit format.
- **Poster** : **24,90 €** en prix d'appel.
- **Écart d'entrée toile/poster : 24,90 € vs 59,50 €, rapport 2,4.**

> **Conséquence majeure.** Sur un panier médian de 126,50 €, ajouter un poster à 24,90 € fait **+19,7 % de panier, sans céder un centime de marge**. La boutique possède déjà l'objet de cross-sell parfait — le **poster jumeau** de chaque toile — et ne l'exploite pas dans le panier.

### 1.4 Contraintes commerciales déjà en place

- ⚠️ La **livraison est déjà gratuite pour tout le monde** (sauf Suisse, +9,99 €). → La mécanique n°1 du marché, « livraison offerte dès X € », est **mécaniquement indisponible**.
- ⚠️ La barre d'annonce affiche **en permanence** : « -10% sur tout les tableaux et Livraison OFFERTE ». → Empiler une remise de plus n'ajoute rien et cannibalise (20-60 % pour les coupons publics larges).
- ⚠️ Une promo automatique « Vacance d'été » court jusqu'au **30/08/2026**. → Ne rien mettre en ligne côté promotionnel avant cette date, pour ne pas mélanger les effets.

---

### 1.5 ⭐ La base client — mesurée le 2026-08-03 (corrige une erreur du plan initial)

`listCustomerSegments` (MCP complété le 2026-08-03) donne les chiffres réels :

| Segment | Requête | Membres |
|---|---|---|
| **Abonnés à la liste de diffusion** | `email_subscription_status = 'SUBSCRIBED'` | **756** |
| Clients ayant acheté au moins une fois | `number_of_orders >= 1` | 750 |
| **Clients n'ayant jamais acheté** | `number_of_orders = 0` | **175** |
| Clients récurrents | `number_of_orders > 1` | **44** (5,9 %) |
| Paniers abandonnés (30 j) | `abandoned_checkout_date >= -30d` | **1** |
| Base totale | `companies IS NULL` | 925 |

> ⛔ **Le plan initial affirmait que le volet e-mail « partait de zéro ». C'EST FAUX.** Il y a 756 abonnés marketing.
>
> **Conséquence stratégique majeure :** la popup rapportera 15-30 adresses/mois ; il y en a **756 qui dorment**. À 8 commandes/mois, **une seule campagne vers cette base peut produire davantage que la popup en un an**, et elle ne demande aucun design. C'est le levier le plus rentable identifié dans tout ce dossier.
>
> ⚠️ **Précaution de délivrabilité, non négociable.** Liste accumulée depuis 2022 et jamais sollicitée = risque de griller la réputation d'expéditeur. **Authentifier le domaine (DKIM/SPF/DMARC) AVANT le premier envoi**, puis commencer par les contacts les plus récents. Rappel du calcul : 1 plainte pour 30 envois = 3,3 %, soit **11× la limite Gmail/Yahoo (0,3 %)**.
>
> **Le segment que la popup alimente vraiment**, ce sont les prospects non-acheteurs : ils sont déjà 175.
>
> Et **1 seul panier abandonné sur 30 jours** → une relance de panier abandonné n'est pas un levier ici.

### 1.6 ⚠️ Nature exacte du « -10 % » — vérifiée par `getDiscount` le 2026-08-03

```
« Vacance d'été ☀️ » — DiscountAutomaticBasic
  10 % · discountClasses: ["PRODUCT"] · summary: "10% off 89 collections"
  combinesWith: { orderDiscounts: false, productDiscounts: false, shippingDiscounts: false }
  minimumRequirement: null · asyncUsageCount: 18 · endsAt: 2026-08-30T22:00:59Z
```

**Ce n'est PAS une remise de panier sur tout le catalogue : c'est une remise de classe PRODUCT sur 89 collections.** Deux conséquences qui corrigent le plan :

1. **Le point de bascule à 150 € est optimiste pour le -10 %.** Il suppose que le -10 % porte sur 100 % du panier. Si une partie des articles n'est pas dans les 89 collections, le -10 % vaut moins → **le bon de 15 € l'emporte plus souvent que les 65 % calculés**.
2. **L'avertissement « ne cocher aucune combinaison Order » était mal ciblé.** Le code de 15 € serait de classe **Order** ; la remise en place est de classe **Product**. Le risque d'empilement est donc **Product ↔ Order** — combinaison ouverte aux marchands en Checkout Extensibility, ce qui est le cas ici. **Les deux côtés sont décochés aujourd'hui : cela doit le rester.**

**❓ Resté ouvert** : `getDiscount` ne renvoie que 10 des 89 collections (troncature de l'outil). **Impossible de confirmer si les collections POSTER sont couvertes.** Enjeu réel : sur un panier poster, le bon de 15 € n'aurait aucune remise concurrente. La barre annonce « sur tout les **tableaux** », ce qui suggère que les posters sont exclus — **à vérifier dans l'admin avant d'écrire la copy**.

---

## 2. P0 — Les cinq correctifs préalables

**Aucun ne relève du design. Tous sont bloquants.** On ne construit pas un dispositif promotionnel au-dessus d'une annonce promotionnelle non conforme.

### 2.1 🔴 Le « -10 % » est réel, mais invisible — et il meurt le 30/08/2026

**Correction du 2026-08-03 :** la remise **s'applique bien**, au niveau du panier. Elle est simplement invisible avant celui-ci.

Vérifié à trois niveaux sur le site live :

| Vérification | Résultat |
|---|---|
| Fiche produit (maternité africaine) | 62,50 €. **Aucun prix barré**, aucun badge |
| JSON variantes de cette fiche | **190 variantes, `compare_at_price` = `null` sur 100 %** |
| Collection `tableau-salon` (24 cartes) | Aucun `<del>`, aucun prix comparé |

Le client lit « -10 % » puis voit un prix plein non barré. **La promesse n'est matérialisée à aucun moment avant le panier** — c'est-à-dire jamais là où la décision se prend. C'est un levier de conversion déjà payé et jamais encaissé.

**⏱️ Et surtout : cette remise n'est pas permanente.** Vérifié via `listDiscounts status:active` — la boutique n'a que **trois remises actives**, et **une seule automatique** :

| Remise | Type | Statut |
|---|---|---|
| **`Vacance d'été ☀️`** | **automatique — c'est le -10 %** | actif **jusqu'au 2026-08-30** |
| `ARTnDECO10` | code, -10 € fixe | actif depuis 2023, **sans date de fin**, 15 usages |
| `XG66M23RNX1R` | code, -15 € fixe | actif depuis le 11/07/2025, **sans date de fin**, **0 usage** |

→ **Au 31/08/2026, il n'y a plus aucune remise automatique.** Toute architecture « meilleure des deux » s'évapore ce jour-là. Voir §8, qui en fait le pivot du calendrier.
→ Les deux codes sans date de fin sont **des fuites ouvertes** : à désactiver avant tout lancement.

**Risque juridique (art. L.112-1-1 du Code de la consommation, en vigueur depuis le 28/05/2022 ; CJUE C-330/23 du 26/09/2024) :** le prix de référence d'une annonce de réduction est le prix le plus bas pratiqué sur les 30 derniers jours. Une remise permanente n'est pas une remise — l'annoncer est une pratique commerciale trompeuse (jusqu'à 300 000 € d'amende).

**À trancher :**
- **Option A** — matérialiser réellement la remise en `compare_at_price`, ce qui exige au préalable **30 jours pleins au prix haut**.
- **Option B** — retirer la mention chiffrée de la barre d'annonce (`config/settings_data.json`, section `tw-announcement-bar`) et la remplacer par un avantage non chiffré.

**Prévoir aussi le 31/08/2026** : la promo « Vacance d'été » meurt ce jour-là, et la barre continuera d'annoncer « -10 % ».

**Au passage** : corriger la faute « sur tout les tableaux » (→ « tous »), visible sur 100 % des pages.

### 2.2 🔴 Le bandeau cookies consent automatiquement à tout

Découvert incidemment, et **plus grave que le sujet popup lui-même**. Le bandeau est maison (pas de CMP tiers). Dans `snippets/cookie-banner.liquid` :

```js
const shouldShowBanner = window.Shopify.customerPrivacy.shouldShowBanner();
if (shouldShowBanner) {
  window.Shopify.customerPrivacy.setTrackingConsent(true, function () { … });
}
```

Quand Shopify signale qu'il faut demander le consentement, **le thème consent à la place de l'utilisateur** sur les 4 finalités (analytics, marketing, préférences, revente). `showBanner()` existe mais n'est jamais appelée ; le `<div>` reste en `class="hidden"`.

C'est un manquement à l'article 82 de la loi Informatique et Libertés, **indépendant du sujet popup**. Correctif : supprimer le bloc d'auto-consentement, appeler `showBanner()`. ~30 min.

*Effet collatéral favorable pour ce projet : aucun bandeau cookies ne viendra rivaliser avec la popup — le champ est libre. Mais il faudra le réparer avant d'ajouter toute capture d'e-mail.*

### 2.3 🔴 L'information livraison est vide ou contradictoire

`/policies/shipping-policy` renvoie une **page vide** (HTTP 200, `<h1>` présent, corps littéralement vide). Et trois versions cohabitent :

| Source | Fabrication | Livraison | Gratuité |
|---|---|---|---|
| Onglet PDP | 3 à 4 j | 3 à 5 j ouvrés | « partout, **aucun minimum** » (faux : Suisse) |
| FAQ | **5 à 8 j ouvrés** | 2 à 4 j | « sauf Suisse, +9,99 € » |
| CGV | 3 à 7 j ouvrés (jusqu'à 30 j peint main) | non chiffré | non traitée |

Le délai de rétractation diverge aussi (14 j en FAQ, non chiffré en CGV pour les imprimés standards).

C'est le **premier frein documenté à la conversion** — Baymard mesure 39 % d'abandons sur les frais/délais surprise — il est gratuit à corriger, et il conditionne toute promesse qu'une popup pourrait porter. Avec 33 % de trafic international, l'exception Suisse doit figurer partout.

### 2.4 🟠 Le formulaire newsletter du footer : il fonctionne, mais il est incomplet

**Correction du 2026-08-03.** Le formulaire n'est **pas** cassé. `sections/tw-footer.liquid:53` contient `{%- form 'customer', id: 'ContactFooter' -%}` avec `contact[email]` et `contact[tags]=newsletter` : c'est le **formulaire d'inscription natif Shopify**, qui crée bien un abonné marketing. L'`action="/contact"` visible dans le HTML est l'endpoint historique de `form_type=customer` — à ne pas confondre avec `{% form 'contact' %}`. **Le déclencheur d'automatisation « inscription à la newsletter » partira donc correctement. Ne pas dépenser un sprint à réparer ce qui marche.**

Confirmé côté données : des clients tagués `newsletter` existent, dont plusieurs à **0 commande** — donc des inscrits purs, pas seulement des acheteurs.

Ce qui manque réellement :

- **Aucune contrepartie annoncée** (pas de code, pas de cadeau) — la seule promesse est « offres exclusives », non quantifiée.
- **Aucune case de consentement**, aucune finalité affichée, aucun lien vers la politique de confidentialité au point de collecte. La CNIL l'exige en B2C.
- Le bouton `id="Subscribe"` est **sans texte visible — juste une flèche SVG** (`:79`). Faible en conversion comme en lisibilité ; l'`aria-label` sauve les lecteurs d'écran, pas l'œil.
- C'est le **seul point de capture e-mail du site**, et il est enterré en bas de page.

**Seule vérification restante** : ouvrir Clients > segment *Email subscribers* et confirmer qu'une inscription de test s'y range bien.

### 2.5 🔴 Les deux vérifications qui décident du reste

| À vérifier | Pourquoi c'est bloquant | Comment |
|---|---|---|
| **Valeur et périmètre réels de « Vacance d'été »** | L'API ne rend que titre/statut/dates pour les nœuds automatiques. Impossible d'affirmer que c'est bien -10 %, ni si les posters sont couverts (le bandeau ne parle que de « tableaux ») | Admin Shopify, puis ajouter un article au panier en live |
| **Existence d'un flow de bienvenue e-mail** | **Aucun ESP n'est détecté dans le HTML** (ni Klaviyo, ni Omnisend, ni Privy). Si rien ne part derrière, capter des e-mails ne produit **rien** | Vérifier côté Shopify Email / Klaviyo |

> **Si aucun flow n'existe : le construire est un meilleur investissement que la popup.** C'est lui qui porte la valeur, pas l'overlay. Tant que la réponse est inconnue, ne pas écrire une ligne du volet e-mail (§5).

---

## 3. Contraintes non négociables

À appliquer sans exception à tout composant de ce plan.

### 3.1 SEO — la contrainte n°1

Google pénalise les « intrusive interstitials » sur mobile depuis le 10/01/2017, critère intégré à Page Experience. John Mueller (20/08/2021) : la cible est **« that moment when a user comes to your website »** depuis les résultats de recherche ; les popups plus tard dans le parcours sont « perfectly fine ». Sont exemptés : les obligations légales et les *« easily dismissible banners occupying minimal space »*.

| Règle | Détail |
|---|---|
| **C-1** | **Jamais d'affichage sur la 1ʳᵉ page vue d'une session.** Compteur en `sessionStorage`, blocage tant que `pagesVues < 2`. Aucune exception mobile, **aucun override par un réglage admin** |
| **C-2** | Sur mobile, **aucun modal centré couvrant**. Uniquement un bandeau laissant le contenu lisible et scrollable derrière |
| **C-3** | Hauteur mobile **≤ 25 % du viewport**. Google ne chiffre pas « reasonable » : rester volontairement bas plutôt que tester la limite |
| **C-4** | **Jamais `overflow:hidden` sur `<body>` en mobile.** La page doit rester scrollable derrière |
| **C-5** | Aucune redirection vers une page dédiée (Google : *« Don't redirect the user to a separate page for their consent or input »*) |

**Ordre de grandeur du risque :** une perte de 10 % des clics organiques coûte 115 à 130 €/mois, de façon permanente — soit **plus que le meilleur cas espéré du dispositif**. C'est pour cette raison que C-1 à C-5 ne se négocient pas.

### 3.2 Juridique (France / UE)

| Règle | Détail |
|---|---|
| **C-6** | **Aucun signe %** dans le composant. Aucun prix barré, aucun « au lieu de », aucune « valeur X € », aucun badge comparatif. Le composant **ne doit exposer aucun champ Liquid de prix comparé** |
| **C-7** | **Interdiction du mot « soldes »** (et soldé / prix soldés) dans le copy ET dans tout champ de schema éditable. Hors période légale, c'est interdit (art. L.310-3 c. com.). Mettre un commentaire dans le Liquid, sinon le mot reviendra par l'admin |
| **C-8** | **Zéro compte à rebours**, zéro « plus que X en stock », zéro compteur de visiteurs. Dark patterns listés par la DGCCRF (fiche du 12/12/2025), priorité de contrôle 2025-2028. Le catalogue est imprimé à la demande : toute allégation de rareté serait invérifiable |
| **C-9** | Si une notion de temps est exigée : **une date de fin réelle en clair**, stockée côté Liquid, non réinitialisable par session ou rechargement, et le composant **s'auto-désactive** après cette date |
| **C-10** | Mécanique **conditionnelle**, pas de code promo public à recopier, pas de champ « code promo » visible (Baymard : tous ceux qui n'ont pas de coupon se sentent en train de surpayer) |
| **C-11** | **Jamais d'add-to-cart silencieux.** Le clic sur le CTA mène à un choix explicite. La mécanique opt-in du tiroir panier est conservée strictement (conformité conso FR) |
| **C-12** | Écrire **« Livraison offerte (hors Suisse) »**, ou masquer la mention quand le marché est CHF. Une promesse absolue fausse sur un marché est le point le plus facilement sanctionnable du dispositif |

**Si un champ e-mail est présent (§5 uniquement) :**

| Règle | Détail |
|---|---|
| **C-13** | Case à cocher **non pré-cochée**, bouton d'envoi désactivé tant qu'elle ne l'est pas. Interdiction absolue du pattern « en saisissant votre e-mail vous acceptez… » |
| **C-14** | Mention obligatoire sous le formulaire (composant fixe, **pas une option de schema**), 12 px min, contraste AA : *« SAS KINDOPIA – MyselfMonArt utilise votre e-mail pour vous envoyer ses offres. Conservation 3 ans. Désinscription en 1 clic dans chaque e-mail. Vos droits : [lien Politique de confidentialité]. »* |
| **C-15** | **Un seul pipeline de collecte** : brancher sur le même endpoint et le même flux de consentement que la section newsletter du footer. Une seule source de vérité du consentement et de la désinscription |

**Capping :** une seule clé `localStorage` first-party, **sans identifiant unique**, sans horodatage exploitable pour du profilage, sans appel réseau, sans donnée personnelle (ex. `mma_promo_seen = "1"` + date en clair). À documenter dans la politique de confidentialité comme « mémorisation du choix d'affichage ». **Ne pas la brancher sur la CMP** — sinon un refus cookies rendrait le composant ré-affichable en boucle.

### 3.3 Accessibilité

| Règle | Détail |
|---|---|
| **C-16** | Croix de fermeture **visible dès la première frame, à pleine opacité**. **Interdiction absolue d'un délai d'apparition de la croix** |
| **C-17** | Cible tactile **≥ 44 × 44 px** (70,8 % mobile). Contraste du X et de l'anneau de focus ≥ 3:1 sur le fond |
| **C-18** | Fermeture par **croix + touche Échap + clic hors du composant**. Focus rendu à l'élément déclencheur |
| **C-19** | Bandeau non modal → **pas** d'`aria-modal`, **pas** de focus trap ; mais Échap ferme quand même. Modal desktop → `role="dialog"` + `aria-modal="true"` + focus trap + restitution du focus, sans exception |
| **C-20** | **Aucun confirmshaming.** « Non merci » de poids typographique égal au CTA. Formellement interdit : « Non, je préfère un mur vide » et équivalents |
| **C-21** | Vérifier au clavier que le bandeau ne recouvre pas les boutons « Ajouter au panier » ni les champs du footer quand ils reçoivent le focus |
| **C-22** | `prefers-reduced-motion` respecté |

### 3.4 Performance

| Règle | Détail |
|---|---|
| **C-23** | `position: fixed` + `transform`/`opacity` uniquement pour l'animation. **Jamais** de `height`/`margin` animés (CLS) |
| **C-24** | Injection **après l'événement LCP** ou après le premier geste utilisateur. Le composant ne doit jamais devenir l'élément LCP |
| **C-25** | Aucune image lourde. CSS `contain`. CLS mesuré à zéro avant déploiement |

### 3.5 Techniques, propres à CE thème

Vérifiées dans le code, elles ont chacune déjà causé un bug en production.

| Règle | Détail |
|---|---|
| **C-26** | ⛔ **`assets/details-modal.js` est du code mort et buggé — ne pas le réutiliser.** `trapFocus` y est appelé avec la mauvaise signature (`tw-global.js:54` attend `(event, first, last)`, style handler de keydown ; `details-modal.js:44` l'appelle façon Dawn) → **aucun focus trap ne fonctionne**. Et `details-modal.js:42,52` fait `this.closest('.header__icons').nextElementSibling` sans garde sur le `.closest()` → `TypeError` hors header. `product-modal.js` et `quick-add.js` sont morts aussi (`extends ModalDialog`, classe inexistante) |
| **C-27** | ✅ **Le pattern à copier est celui du studio** : markup `role="dialog" aria-modal="true"` (`sections/tw-custom-art-studio.liquid:76-77`), backdrop (`:83`), mémorisation du déclencheur (`component-custom-art-studio.js:601`), focus trap avec repli (`:932-943`, **bonne signature**). Le tiroir panier est le second bon exemple (`cart-drawer.js:19-21`) |
| **C-28** | ⚠️ **Règle globale `*:empty`** (`input.css:4-22`) : tout élément **vide** non whitelisté est masqué en `display:none`. Concerne le **backdrop** et surtout le **remplissage de la barre de progression** (`<span>` à 0 %). → **`data-allow-empty` obligatoire** (convention du thème ; cf. `data-cp-line-fill` et `data-studio-backdrop` déjà whitelistés). Une utility Tailwind ne suffit pas : la règle est déclarée avant `@tailwind` |
| **C-29** | ⚠️ **Idempotence obligatoire.** Garder tout `customElements.define` derrière une garde (`if (!customElements.get(...))`) — `details-modal.js:55` et `cart-drawer.js:93,303,313,410` ne le font pas et jetteraient `NotSupportedError`. Toute mutation DOM run-once doit être auto-neutralisante (lire l'attribut, `return` s'il est consommé, `removeAttribute`) : c'est le pattern `tw-global.js:167-174`, écrit après le bug de production de juin 2026 |
| **C-30** | ⛔ **Aucun événement panier n'existe aujourd'hui.** Ni `cart:updated`, ni `cart:added`. Les trois chemins de mutation (`cart-drawer.js:170-190`, `:192-229`, `:325-352`) finissent tous en `renderNewSections`. → **Ajouter une ligne** `document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }))` à la fin des **deux** `renderNewSections` (`cart-drawer.js:231-258` et `:375-402`), où `cart` est déjà disponible. C'est le changement le plus propre — pas de `MutationObserver`, pas de polling |
| **C-31** | ⚠️ Le spinner du sous-total (`cart-drawer.js:266-278`) dépend de l'**ordre exact des nœuds frères**. Ne rien insérer entre `<p id="total-price">` et le `<span class="hidden">` qui le suit |
| **C-32** | ⚠️ Si le composant est une **section séparée** devant se rafraîchir, l'ajouter à la liste `sections:` des POST (`cart-drawer.js:180`, `:219`, `:327`) |
| **C-33** | **Couleurs** : la doc du skill est **périmée**. `settings.buy_button_color` et `settings.accent_color` existent encore mais **ne sont plus lus par le CSS**. Seul `settings.brand_color` pilote la gamme chaude (`snippets/fonts-and-colors.liquid:9-15,32-37`). Source de vérité des classes = `tailwind.config.js:52-105`. Ombres : `shadow-neu-{xs..xl}`, `shadow-button`, `shadow-pill` |
| **C-34** | **Polices : exactement trois** — `font-roboto`, `font-heading`, `font-limelight` (`tailwind.config.js:106-110`). Aucune autre |
| **C-35** | **Tailwind only.** Tout nouveau nom de classe exige un rebuild d'`output.css`. Une `safelist` existe pour les classes construites dynamiquement (`tailwind.config.js:144-173`) |
| **C-36** | **L'i18n est un gate de commit**, pas une bonne pratique. Toutes les clés dans les 5 locales. Tout lien collection/produit via l'objet Liquid (`.url`), **jamais un chemin en dur** (les handles sont traduits) |

---

## 4. P1 — LIVRABLE PRINCIPAL : le panneau « 2ᵉ œuvre » dans le tiroir panier

**C'est le cœur du projet.** C'est le seul composant qui attaque réellement le panier moyen, le seul mesurable, et le seul qui soit hors de portée de tous les risques listés en §3.1 et §3.2.

### 4.1 Pourquoi là, et pas ailleurs

| Argument | Détail |
|---|---|
| **Le bon moment** | L'ajout au panier est le seul instant simultanément **hors du champ de la pénalité Google** (page interne + action utilisateur délibérée) et validé par Baymard comme overlay légitime |
| **La preuve interne** | Le kit de fixation obtient **35 % d'attachement** exactement à cet endroit. On clone un pattern qui convertit déjà, on n'invente pas un canal |
| **Le vrai gisement** | 63 % de commandes mono-article, 10 % à 2 œuvres. Le levier n'est pas la remise, c'est le passage de 1 à 2 |
| **L'objet parfait existe déjà** | Le **poster jumeau** à 24,90 € face à une toile à 62,50-207 €. **+19,7 % de panier médian, zéro marge cédée** |
| **C'est mesurable** | Le taux d'attachement se lit sur les **lignes de commande** (dénominateur = 8 commandes/mois), pas sur des sessions. C'est le seul indicateur du projet qui produira un chiffre lisible en 8-12 semaines |

### 4.2 Spécification fonctionnelle

**Emplacement.** Dans `sections/tw-cart-drawer.liquid`, au même endroit et avec **exactement le même pattern visuel** que le bloc kit de fixation existant (`snippets/cart-bundle.liquid:116-118`, servi par `QuickAddToCart` `cart-drawer.js:315-410`).

**Déclenchement.** À l'ouverture du tiroir après un ajout — via le nouvel événement `cart:updated` (C-30). Aucun timer, aucun affichage au load, aucune détection de sortie.

**Contenu.** Une à deux suggestions, **calculées sur le contenu réel du panier** — jamais des best-sellers génériques.

> ⚠️ **Baymard : une seule suggestion douteuse fait ignorer toutes les autres.** La pertinence prime sur le nombre.

Ordre de priorité des suggestions :
1. **Le poster jumeau** de l'œuvre ajoutée (métafield `link.poster`, déjà utilisé par la recherche scopée et le toggle PDP).
2. À défaut, une œuvre du **même thème / même tag**.
3. À défaut : **ne rien afficher**. Un panneau vide vaut mieux qu'une suggestion hors sujet.

**Vérification préalable :** confirmer si `bundle.paintings` est réellement peuplé. ⚠️ `getProduct` (MCP) tronque aux 20 premiers métafields — « absent » ne prouve rien. Vérifier via le **rendu live** d'un panier.

**Mécanique d'incitation.** Une **offre conditionnelle combinée**, qui sort du champ de L.112-1-1 :

> **« 2 œuvres = le kit d'accrochage offert »**

C'est la seule mécanique promotionnelle **légalement propre** disponible ici : 6 € de COGS, désirabilité déjà prouvée à 35 %, et ce n'est pas une annonce de réduction.

**Barre de progression (optionnelle, phase 2 du panneau).**
- Seuil : **160 €** (médiane 126,50 € + 26 %). **Plafond absolu 177 €.** Ne **pas** caler sur la moyenne 163,53 € — elle est tirée par les gros paniers.
- Créditer une **avance dans la jauge dès la première œuvre** (effet de gradient de but — Kivetz, Urminsky & Zheng 2006 : la carte à 12 cases dont 2 pré-tamponnées se complète plus vite que celle à 10).
- Afficher 1 à 2 œuvres suggérées quand il manque **moins de 60 €**.
- ⚠️ Piège : le `<span>` de remplissage sera **masqué à 0 %** par `*:empty` → `data-allow-empty` obligatoire (C-28).

**Règles d'interaction.**

| | |
|---|---|
| Opt-in strict | Jamais ajouté d'office (conformité conso FR, C-11) |
| « Passer commande » | **Toujours visible et actif**, à côté. Aucune étape bloquante entre le tiroir et le paiement |
| Refus | Persisté ; pas de reproposition dans la même session, quel que soit le nombre d'ajouts |
| Fermeture | Croix ≥ 44 px + Échap + clic hors zone (C-16 à C-18) |

### 4.3 Copy à maquetter (FR)

**Vouvoiement**, ton sobre et descriptif. Aucun signe %, aucun prix barré, aucun mot « soldes ».

| Élément | Texte |
|---|---|
| **Titre** (≤ 12 mots) | « Un mur, deux œuvres » |
| **Sous-titre** | « Ajoutez le poster de cette œuvre et recevez le kit d'accrochage offert. » |
| **CTA primaire** | « J'ajoute ma 2ᵉ œuvre » — *ou* « Je reçois mon kit offert » |
| **Refus** | « Non merci » — poids typographique **égal** au CTA (C-20) |
| **Micro-ligne sous le CTA** (12-13 px, gris) | « Livraison offerte (hors Suisse) · Fabrication 5-8 j + livraison 2-4 j · Retour 14 jours » |

> ⚠️ Cette micro-ligne n'est publiable **qu'après** le correctif §2.3 : aujourd'hui trois versions contradictoires des délais coexistent sur le site. Ne pas inscrire des délais qui contredisent la FAQ.

**Formulations interdites :** tout « -X % », tout `<s>149 €</s>`, « soldes », « déstockage », « dernière chance », « plus que X en stock », « prix conseillé ». Si un chiffre doit dominer visuellement, que ce soit un **montant en euros**, jamais un pourcentage.

### 4.4 Ce qu'il faut maquetter

1. **375 px d'abord** — une seule action au pouce, CTA pleine largeur.
2. État **avec poster jumeau disponible** (cas nominal).
3. État **sans jumeau, avec suggestion de même thème**.
4. État **sans suggestion pertinente** (le panneau ne s'affiche pas).
5. État **barre de progression** : seuil non atteint / atteint.
6. État **refusé** (le panneau disparaît, « Passer commande » reste intact).
7. Desktop.

---

## 5. P2 — Optionnel et conditionnel : la feuille basse

**À ne concevoir que si les deux réponses de §2.5 sont favorables**, et à mettre en ligne **après le 30/08/2026**.

Si aucun flow de bienvenue n'existe, l'espérance de gain de ce volet est **exactement 0 €** — et le construire d'abord serait une erreur d'ordonnancement.

### 5.1 Ordre de grandeur honnête

À annoncer sans enjoliver, parce qu'il conditionne l'arbitrage :

| Étape | Calcul | Résultat |
|---|---|---|
| Sessions/mois | ~1 500 à 2 000 | |
| − règle « jamais la 1ʳᵉ page vue » | élimine 55-65 % des sessions à 0,5 % de conversion | ~630 |
| − suppressions obligatoires (§5.3) | −15 à 25 % | **~500 affichages/mois** |
| × taux d'opt-in défendable | 2,1 % (Omnisend, 1,24 Md d'affichages, seule méthodologie publiée) à 5 % (Wisepops, vendeur) | **10 à 25 e-mails/mois** |
| × valeur par destinataire | Klaviyo : 2,65 $ en moyenne, 3,34 $ pour les paniers 100-200 $ | **30 à 75 €/mois de CA brut** |

> **Ne jamais utiliser le chiffre OptiMonk de 11,09 %** : publié sans taille d'échantillon ni définition de « conversion ».
> **Ne jamais promettre de lift de CA.** À 8 commandes/mois, il ne sera jamais calculable.

### 5.2 Format

| | |
|---|---|
| Mobile (71 %) | **Bandeau bas non modal**, ≤ 25 % du viewport, page scrollable derrière. **Jamais de plein écran** |
| Desktop (25 %) | Modal centré autorisé, **uniquement après action utilisateur** |
| Largeur | ~380 px max sur mobile. Aucune image héro pleine largeur |

### 5.3 Déclenchement et capping

| Règle | Valeur |
|---|---|
| **Déclencheur primaire** | **2ᵉ page vue de la session** (`sessionStorage`) — c'est le déclencheur, pas seulement un garde-fou |
| **Déclencheur secondaire** | ≥ 10-15 s d'**engagement réel** sur cette 2ᵉ page (timer suspendu en onglet inactif) |
| **Jamais** | Sur la page d'entrée. À 0-1 s (fenêtre la moins performante de toutes les mesures : 1,9 %). Au-delà de 20 s |
| **Exit-intent** | ⛔ **Aucun code mobile** — Chrome Android exige une interaction préalable, il ne se déclenchera pas sur le rebond SEO : code mort pour 71 % du trafic. Desktop seulement, en repli de dernier recours, jamais le cœur du système |
| **Suppressions** | Templates `cart` et `checkout` ; tiroir panier ouvert ; panier non vide ; `customer.orders_count > 0` ; visiteur ayant déjà refusé ou converti |
| **Capping** | 1 affichage / 7 jours ; jamais après conversion ou 2 fermetures |
| **Gate CMP** | Rien ne s'affiche tant que le consentement cookies n'est pas résolu, + 3 s de tampon. **Jamais deux couches simultanées** |

> ⚠️ Ne céder à aucune demande d'augmenter la fréquence « pour voir plus de conversions » : le gain de +20 % de conversions s'accompagne de −13 % de panier moyen, soit **−21 € par commande** à ce niveau de panier — plus que le gain marginal espéré.

### 5.4 Contenu

Un champ e-mail, une case non pré-cochée, un bouton, un « Non merci » de poids égal. **Pas de prénom, pas de téléphone, pas de case de préférence** (Omnisend : 4 champs ou plus font tomber à 1,4 % contre ~2,1 % à 1-3 champs).

Contrepartie : **jamais un pourcentage**. Un bénéfice non chiffré et non comparatif, ou une contrepartie conditionnelle. C-6, C-13, C-14, C-15 s'appliquent intégralement.

---

## 6. Mesure — critères de retrait, pas de victoire

**Aucun A/B test.** À 8 commandes/mois contre un seuil de ~1 000 conversions par bras, un test de conversion à l'achat demanderait **plus de dix ans**. Livrer **une seule version**, bien conçue.

**Instrumenter 4 événements, pas plus :** `panel_affiché`, `panel_fermé`, `panel_cta_cliqué`, `ajout_au_panier_post_panel` (fenêtre 30 min).

Ajouter un **cart attribute** enregistrant si le panneau a été vu et si l'add-on a été pris → lisible directement dans les commandes, sans app tierce.

**Piloter sur :**

| Indicateur | Base de départ |
|---|---|
| Panier **médian** | 126,50 € |
| % de commandes à 2 articles ou + | 10 % |
| Taux d'attachement du panneau | à comparer aux **35 %** du kit |

> ⛔ **Retirer l'AOV moyen des tableaux de bord.** Une commande à 800 € le déplace de 20 %. Une seule journée (22/05/2026) pèse 34 % du CA du trimestre.

**Kill-switch en schema**, activable sans déploiement.

---

## 7. Refusé explicitement, quelle que soit l'insistance

| | |
|---|---|
| ⛔ | Test A/B sur la conversion commande |
| ⛔ | Exit-intent mobile (code mort à 71 %), et exit-intent comme mécanisme principal |
| ⛔ | Roue de la fortune |
| ⛔ | Compte à rebours — sauf date de fin réelle, en clair, non réinitialisable |
| ⛔ | « Plus que X en stock », compteur de visiteurs, toute allégation de rareté (impression à la demande = invérifiable) |
| ⛔ | Code promo public à recopier, ou champ « code promo » visible |
| ⛔ | Un pourcentage de plus empilé sur le -10 % permanent |
| ⛔ | Popup plein écran sur mobile |
| ⛔ | Croix retardée, ou croix masquée au premier rendu |
| ⛔ | Réaffichage à un visiteur ayant refusé, ayant commandé, ou ayant un panier en cours |
| ⛔ | Confirmshaming sur le bouton de refus |
| ⛔ | Bandeau large en bas collidant avec le CMP |
| ⛔ | Installation d'une app popup tierce sur ce thème custom |
| ⛔ | Réutilisation de `details-modal.js`, `product-modal.js` ou `quick-add.js` (code mort, C-26) |

---

## 8. MÉCANIQUE RETENUE — bon de 15 € contre e-mail, sur la fiche produit

*Ajouté le 2026-08-03 après arbitrage de Walid. Cette section prime sur les §4 et §5 pour la V1.*

### 8.1 La décision de calendrier, qui commande tout le reste

**Lancement au 31/08/2026**, quand « Vacance d'été » s'éteint — **en remplacement du -10 %, jamais en surcouche**.

Le raisonnement, en trois chiffres :

| | Avant le 30/08 (superposition) | À partir du 31/08 (remplacement) |
|---|---|---|
| Ce que vaut le bon pour le client | **+2,35 €** sur le panier médian ; **0 €** au-dessus de 150 € | **15 € pleins**, sur tous les paniers |
| Bénéficiaires | tout le monde reçoit -10 %, qu'il donne son e-mail ou non | seuls les inscrits |
| Coût mensuel | ~101 €/mois donnés sans contrepartie (12,65 € × 8 commandes) | **15 à 30 €/mois** (1 à 2 commandes) |
| Problèmes induits | croisement à 150 €, tickets SAV « mon code ne marche pas », réductions successives | **aucun** |

Autrement dit : la même dépense, mieux ciblée, et **elle construit la liste e-mail qui n'existe pas**. Tous les problèmes d'arbitrage, de non-cumulabilité et de superposition juridique disparaissent d'eux-mêmes.

**Prérequis avant lancement** : désactiver `ARTnDECO10` et `XG66M23RNX1R`, tous deux actifs sans date de fin (§2.1).

### 8.2 Faisabilité native — ce qui marche et ce qui ne marche pas

| Besoin | Natif ? | Détail |
|---|---|---|
| **La meilleure des deux remises s'applique** | ✅ **OUI, par défaut** | Doc Shopify : *« the best discount for the customer's cart is always applied »*. Il suffit de **ne rien cocher** dans « Combinaisons ». Aucune app, aucun code, aucun Plus |
| Réglage de priorité « la promo générale prime » | ❌ NON | N'existe pas chez Shopify. C'est « la meilleure des deux » ou rien |
| **Durée limitée sur la promo (date + HEURE de fin)** | ✅ **OUI** | Section « Dates actives » : date + heure de début, case « Définir une date de fin » → date + **heure** de fin. Fuseau = celui de l'admin (Europe/Paris). API : `startsAt`/`endsAt` sont des `DateTime` ISO 8601. **Toute affirmation du type « aucune limite de temps n'est possible » est fausse** |
| **Expiration 48 h glissante par personne** | ⚠️ **Pas depuis l'admin seul — mais PAS impossible** | `endsAt` appartient à l'**objet remise**, pas au code ni au client : `DiscountRedeemCode` n'a que `asyncUsageCount/code/createdBy/id`. **MAIS** une remise peut être restreinte à un client via `customerSelection` → **« une date de fin par personne » = « un objet remise par personne »**. Faisable dès qu'un outil crée les remises par API. Voir §8.8 |
| Code unique par abonné | ❌ Pas depuis l'admin | Pas d'import CSV (l'export existe, l'import est interdit). `discountRedeemCodeBulkAdd` génère bien des codes uniques mais **ils héritent tous des dates du parent** (max 250/appel, asynchrone). API seulement |
| Minimum d'achat, date+heure de fin, 1 usage/client, ciblage marché | ✅ OUI | Écran de création de la remise |
| Popup sur fiche produit | ✅ OUI, sans app | Le thème sait déjà le faire |
| **Envoi automatique de l'e-mail** | ⚠️ Pas sans app | Shopify Email est une **app** — first-party, gratuite, 10 000 e-mails/mois inclus (~50 envoyés ici). « Zéro app tierce, zéro abonnement » est atteignable ; « zéro app » au sens strict, non |

### 8.3 Le parcours retenu : 2 étapes, pas 4

Le parcours initial (saisir → quitter le site → ouvrir sa boîte → revenir) perd du monde à chaque marche, et la bascule vers l'appli mail est le point de fuite classique sur les 70,8 % de mobile.

**Retenu :** le code s'affiche **directement à l'écran** après la saisie de l'e-mail, avec un bouton **« Appliquer ma remise »** pointant vers `/discount/CODE?redirect=…` — lien natif Shopify qui pose la remise sur le panier sans que le client tape quoi que ce soit. **L'e-mail devient un rappel, pas un péage.** Et la V1 tourne sans installer une seule app.

### 8.4 Réglages exacts de la remise

| Champ | Valeur | Pourquoi |
|---|---|---|
| Type | **Montant de réduction sur les commandes** | Classe Order |
| Méthode | **Code de réduction** | Nécessaire à l'arbitrage |
| Code | **non devinable** — ex. `MERCI-K7QX`, jamais `BIENVENUE15` | Ralentit la fuite vers Dealabs / Honey |
| Valeur | **15,00 €** | |
| **Minimum d'achat** | **80,00 €** (Walid a demandé 70 € — voir l'arbitrage ci-dessous) | ⚠️ **Obligatoire.** Sans lui, -15 € sur un poster à 24,90 € = **-60 %** |
| Utilisations | **« Limiter à une utilisation par client »** ; **pas** de plafond total | Un plafond total tuerait le code au 2ᵉ abonné |
| **Combinaisons** | **TOUT DÉCOCHÉ** — en particulier `productDiscounts` **et** `orderDiscounts` | C'est ce réglage qui produit « la meilleure des deux ». ⚠️ La remise en place est de classe **PRODUCT**, ce code sera de classe **ORDER** : le vrai risque d'empilement est **Product ↔ Order**, combinaison ouverte aux marchands en Checkout Extensibility — ce qui est le cas ici (cf. §1.6) |
| Dates | Début + **date ET heure de fin** | ⚠️ Fuseau = celui de **l'admin** (Paris), pas du client. 33 % d'international |

**⚖️ Arbitrage du seuil : 70 € ou 80 € ?** Il existe un **trou dans la distribution réelle entre 68,34 € et 84,60 €** — aucune commande. Conséquence directe :

| Seuil | Commandes éligibles | Remise max en % du panier |
|---|---|---|
| 70 € | **40/49 (82 %)** | **21,4 %** |
| **80 €** | **40/49 (82 %)** | **18,8 %** |
| 90 € | 38/49 (78 %) | 16,7 % |

→ **80 € domine strictement 70 €** : couverture identique, 2,6 points de marge de risque en moins. Gratuit.
→ À 70 €, une toile d'entrée (62,50 €) + le kit (6 €) = 68,50 € **rate le seuil de 1,50 €** — générateur de tickets SAV.
→ Ce qui reste exclu dans les deux cas : 1 poster (24,90 €), 2 posters (49,80 €), 1 toile d'entrée seule (62,50 €). C'est voulu : le seuil crée une traction vers le haut sur les petits paniers.

**Validité : 7 jours.** Pas 24 h, pas 48 h. *(Sur la faisabilité d'une expiration individuelle, voir §8.8.)*

| Preuve | Ce qu'elle dit |
|---|---|
| Mukherjee, Lee & Gershoff (*J. of Business Research*, 2025) | Offre 1 h = **-68,3 %** de dépense ; 1 jour = +56,6 %. L'effet **s'inverse** quand la flexibilité de timing du client est faible |
| Shu & Gneezy (*JMR*, 2010) | Le seul « court bat long » démontré oppose **3 semaines à 2 mois** (31 % vs 6 %) — jamais 24 h à 7 j |
| Krishna & Zhang (*Management Science*, 1999) | Les durées courtes avantagent les **gros** acteurs ; les petits gagnent avec des durées longues |
| Provoke Insights (n = 1 501, 2024) | L'achat déco est **social** : 36 % achètent avec famille/amis. La validation du conjoint ne se fait pas en une soirée |
| Inman & McAlister (*JMR*, 1994) | Le pic de rachat se produit **juste avant l'expiration** — d'où le rappel à J+6 |

Plancher absolu si urgence exigée : **72 h**. ⚠️ **Ne jamais écrire « expire dans 48 h »** — écrire la date en clair (« valable jusqu'au dimanche 16 août, 23 h 59 »), sinon le compte à rebours ment par rapport au code réel (risque L.121-2).

### 8.5 Séquence e-mail : 3 messages

| | Moment | Contenu |
|---|---|---|
| **E1** | **T+0** | Le code + **la date d'expiration en toutes lettres** + le contenu qui débloque la décision : comment mesurer son mur, les formats réels, le rendu encadré, la livraison |
| **E2** | **J+3** | Réassurance pure, **zéro remise** : avis, matière, finitions, guide des formats. C'est la fenêtre où le client en parle à son conjoint |
| **E3** | **J+6**, ~24 h avant l'échéance, **conditionné à « n'a pas acheté »** | Rappel cadré sur le **regret**, pas sur la pression |

**Un seul rappel, pas deux** (Seguno, 65 055 newsletters Shopify, mai 2024→mai 2025 : +25,4 % de revenu au 1ᵉʳ renvoi, chute nette au 3ᵉ).

> **Honnêteté méthodologique : l'espacement optimal entre e-mails n'est documenté nulle part par de la donnée réelle.** Tout ce qui circule est de l'opinion recopiée. Ne pas chercher à l'optimiser — à 15-30 inscrits/mois, aucun test ne sera jamais significatif.

⚠️ **Délivrabilité** : authentifier le domaine (**CNAME DKIM/SPF + DMARC dans Cloudflare**) **AVANT le premier envoi**, sinon Shopify réécrit l'expéditeur en `store+123@shopifyemail.com`. À ce volume, 1 plainte sur 30 envois = 3,3 %, soit **11× la limite Gmail/Yahoo**. Le faible volume n'amortit rien.

### 8.6 Pièges spécifiques à cette mécanique

1. ⚠️ **Effet de bord UX** : quand la remise automatique est la plus avantageuse, le client saisit son code et **ne voit rien changer**. Il conclut « votre code est cassé ». **Le message Shopify n'est pas personnalisable.** Disparaît après le 31/08 si on suit §9.1 — c'est une raison de plus de ne pas superposer.
2. ⚠️ **Tester avant d'annoncer** : la doc écrit *« in some cases »*. Passer **3 paniers réels à 93 €, 126 € et 195 €** en conditions live.
3. ⚠️ **NON VÉRIFIÉ** : le minimum d'achat s'évalue-t-il **avant ou après** la remise automatique ? Tester avec un panier à 105 € brut (94,50 € après -10 %) contre un minimum à 99 €.
4. ⚠️ **Le code sera partagé** — il finira sur les agrégateurs. Parades : nom non devinable, expiration courte, 1 usage/client, minimum d'achat.
5. ⚠️ **Ne cocher AUCUNE combinaison Order** sur le code, sinon Shopify empile légalement -10 % **et** -15 € — et on le découvre sur la facture.
6. ⚠️ **Mention obligatoire, lisible sur mobile** — pas en astérisque gris 9 px. La non-cumulabilité et le seuil sont des **conditions substantielles** (art. L.121-2 et L.121-3 ; sanctions aggravées en ligne, art. L.132-2) :
   > « 15 € de remise dès 90 € d'achat — offre non cumulable avec la remise en cours ; la réduction la plus avantageuse pour vous est appliquée automatiquement. Valable jusqu'au [date], 23 h 59. »
7. ⚠️ **L'e-mail de double opt-in ne doit contenir aucun contenu marketing** (doc Shopify) — **ne pas y glisser le code**.
8. ⚠️ **Une seule automatisation welcome active** à la fois : les doublons produisent un double envoi sans avertissement.
9. ⚠️ **Pas de compte à rebours visuel** : 1,9 % avec contre 2,1 % sans (Omnisend, 1,24 Md d'affichages).
10. ⚠️ **33 % de trafic international, 5 langues** : popup + e-mails + libellé du code à traduire, **ou** restreindre la remise au marché France (natif). Un « -15 € » sur un catalogue affiché en CAD avec uplift +26,6 % crée une incohérence.

### 8.7 Ce qu'il faut attendre, chiffré

- ~1 300 clics organiques → **15 à 30 contacts/mois** (2,1-2,4 % de conversion popup, Omnisend 2025, 1,24 Md d'affichages)
- **0,3 à 1,5 commande/mois**, soit **40 à 190 € de CA/mois**, dont une part non incrémentale
- Coût d'envoi : **0 €**
- Surcoût du bon : **~15 à 30 €/mois** après le 31/08

> **Ce n'est pas un levier de croissance. C'est un actif d'audience pour Q4.** À piloter comme un **coût d'acquisition de contact** : mesurer le taux de capture (dénominateur large), jamais le CA (dénominateur à 8/mois).

### 8.8 Expiration du bon — ce qui est possible, et à quel prix

*Section ajoutée le 2026-08-03 en réponse à la question de Walid. Elle CORRIGE une réponse antérieure trop catégorique.*

**⚠️ Fait vérifié qui conditionne les options : le plan de la boutique est `Basic`** (`getShopInfo` → `plan.displayName: "Basic"`, relevé le 2026-08-03). L'action Shopify Flow « Send HTTP request » est réservée aux plans **Grow / Advanced / Plus** — la moitié des tutoriels publiés sur ce sujet reposent dessus et sont donc **hors sujet ici**.

**Distinguer deux choses qui avaient été confondues :**

| | Verdict |
|---|---|
| **(a) Une durée limitée sur la promo** | ✅ **NATIF, à l'heure près.** Voir §8.2 |
| **(b) Un compte à rebours qui démarre à l'inscription de CHAQUE personne** | ⚠️ Pas depuis l'écran Réductions — **mais réalisable** dès qu'un outil crée les remises par API |

**Les voies possibles pour (b), de la moins chère à la plus chère :**

| Voie | Coût | Précision | Réserves |
|---|---|---|---|
| **Rotation de codes tous les 3 j** | 0 €, 0 app, ~3 min | ~60 % — chacun a 0 à 72 h | Code **partagé** → finit indexé sur les sites de coupons. Celui qui s'inscrit 2 h avant l'échéance rate son bon |
| **Shopify Flow** (app first-party **gratuite**) | 0 €, 1-3 h de paramétrage | **100 % si ça passe** | Déclencheur « Customer subscribed to email marketing » → action **« Send Admin API request »** → `discountCodeBasicCreate` (code nominatif, 15 €, min. 80 €, `usageLimit:1`, `customerSelection` = ce client, `endsAt = {{ "now" \| date_plus: "48 hours" }}`) → **« Add customer tags »** avec le code → l'e-mail le relit en Liquid via `customer.tags`. ⚠️ **3 inconnues non documentées** (cf. ci-dessous) |
| **Klaviyo, plan gratuit** | 0 € jusqu'à ~250 profils (≈ 9-17 mois), puis ~20 $/mois | 100 %, opérationnel en 2 h | Fonction « expiration variable » native. ⚠️ **Klaviyo ajoute +24 h de marge → régler 24 h pour obtenir 48 h réelles.** Branding non retirable en gratuit |
| **Omnisend, plan gratuit** | 0 € puis ~11 $/mois | ~85 % — granularité au **jour** (23 h 59) | Code non personnalisable (pas de préfixe `MMA`) |
| ⭐ **Back-end maison** (`backend.myselfmonart.com` + hub n8n) | 0 € d'abonnement, 1-2 j de dev | **100 %, et le meilleur pour la conversion** | Le popup poste l'e-mail → le back-end crée la remise nominative (`endsAt = now + 48 h`) → **il renvoie le code au popup, qui l'affiche avec un compte à rebours en direct**. Supprime entièrement le problème d'injection du code dans un e-mail, et **converge avec le parcours 2 étapes de §8.3**. À protéger : rate-limit + anti-bot sur l'endpoint |

**Les 3 inconnues de la voie Flow** — à lever par test réel (2 h, gratuit), pas par confiance : l'action « Send Admin API request » est-elle accessible en plan **Basic** ? `discountCodeBasicCreate` est-elle acceptée (la doc exclut « certaines mutations de remise » sans les nommer) ? Le champ tag accepte-t-il une variable Liquid ?

**❌ Voies écartées, à ne pas reproposer :** les codes uniques prégénérés en lot (ils héritent tous de la même date de fin) ; les Shopify Functions (les apps custom qui en contiennent sont réservées au plan Plus) ; la carte-cadeau (aucun minimum d'achat possible, et l'expiration d'un avoir monétaire est juridiquement sensible en France).

**Est-ce que le « 48 h par personne » vaut le combat ? Non, pas à cette échelle.** Sur 15-30 inscrits/mois, l'écart entre 48 h glissantes et une échéance commune se joue sur une fraction de 2 à 4 commandes mensuelles — de l'ordre d'**une commande par trimestre**. Ce qui crée réellement le pic d'utilisation, c'est la **date écrite noir sur blanc** et la **relance**, pas la mécanique sous-jacente.

> ⛔ **RÈGLE NON NÉGOCIABLE : si l'expiration n'est pas individuelle, ne JAMAIS écrire « 48 h ».** Écrire « valable jusqu'au 16 août, 23 h 59 ». Sinon la promesse est fausse pour la moitié des inscrits — omission trompeuse (art. L.121-2), et dégât de marque sur un positionnement premium.

**Ordre de marche recommandé :** (1) lancer la version simple — code à date de fin réelle, message avec la date, rotation tous les 3 jours ; (2) **2 h de test Flow** — si ça passe, le vrai 48 h par personne est gratuit et sans app ; (3) ne déclencher le développement back-end que si le volume d'inscrits le justifie, et n'installer Klaviyo que le jour où l'e-mail marketing devient un vrai canal, pas pour ce seul coupon.

### 8.9 Deux fausses pistes à ne pas suivre

- ❌ **« Remplacer le bon par la livraison offerte »** — recommandation issue de la recherche, **inapplicable ici** : la livraison est **déjà gratuite pour tous** (sauf Suisse). Il n'y a rien à offrir de ce côté.
- ⚠️ **« Le code -15 € existant à 0 usage prouve que les montants fixes ne marchent pas »** — **à ne pas sur-interpréter.** `XG66M23RNX1R` est une chaîne aléatoire qui n'a très probablement jamais été diffusée. À l'inverse, `ARTnDECO10` (-10 € **fixe**) a servi 15 fois. Le signal n'est pas concluant, et **aucune donnée fiable € vs %** n'existe : tout ce qui circule vient de blogs d'éditeurs d'apps sans échantillon ni protocole.

---

## 9. Cadrage à retenir

Ce chantier **ne corrigera pas** l'écart de conversion (0,45-0,6 % contre ~1,4 % de référence déco). Cet écart est structurel et ne se traite pas avec un overlay.

Ce qui est atteignable, honnêtement : **un point d'attachement supplémentaire sur le panier** (le vrai livrable, §4), et **quelques dizaines d'e-mails par mois** si et seulement si un flow existe derrière (§5).

Le meilleur rapport effort/résultat du dossier n'est ni glamour ni un overlay : ce sont les **cinq correctifs P0 du §2**, qui coûtent presque rien en design et retirent le risque le plus grave.
