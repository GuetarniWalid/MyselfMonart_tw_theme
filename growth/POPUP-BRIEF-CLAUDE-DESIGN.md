# Brief design — Popup « bon de 15 € » sur la fiche produit

**Destinataire : Claude Design.** Cahier des charges. Tout ce qui est marqué ⛔ est non négociable.
**Version 2 — 2026-08-03.** Corrigée après relecture contre le code réel du thème (4 erreurs bloquantes en v1).
Boutique : MyselfMonArt (Shopify, thème custom Tailwind).

> ⚠️ **Avant d'écrire la moindre ligne de code, invoque la skill `shopify-section-dev`.** Sa règle n°1 — réutiliser ce qui existe avant d'inventer — s'applique intégralement.

---

## 1. Ce qu'il faut concevoir

**Une seule popup**, sur les fiches produit, qui échange un e-mail contre un bon de réduction.

**Deux écrans :**

| | Contenu |
|---|---|
| **Écran 1 — l'offre** | Titre, offre, champ e-mail, case de consentement, bouton |
| **Écran 2 — le succès** | Le code en clair + la date d'échéance + bouton « Appliquer ma remise » |

⛔ **L'écran 2 affiche le code immédiatement.** Le client n'ouvre pas sa boîte mail pour acheter. L'e-mail part quand même (Shopify Messaging, déjà installé) et sert aux relances.

**Aucune app à installer.**

---

## 2. L'offre — texte imposé, mot pour mot

⛔ **À afficher intégralement dans l'écran 1 ET dans l'écran 2**, en corps de texte lisible — jamais en gris pâle ni sous 12 px :

> « **15 € de remise à partir de 80 € d'achat**, calculés sur le montant des produits, **hors frais de livraison**. Valable sur tout le site, **une seule fois, par client**, jusqu'au **[DATE] à 23 h 59 (heure de Paris)**. Offre **non cumulable** avec la promotion en cours ni avec un autre code : la réduction la plus avantageuse pour vous est appliquée automatiquement. »

Chaque élément est une **condition substantielle** (art. L.121-3) — ne rien retirer :

| Mention | Pourquoi |
|---|---|
| « hors frais de livraison » | Shopify applique le minimum au sous-total produits |
| « une seule fois, par client » | C'est le réglage §10, jamais devinable |
| « heure de Paris » | 33 % du trafic est international |
| « non cumulable » | Une promotion automatique tourne en parallèle |

⛔ **Ne jamais écrire « 48 h » ni « expire dans X heures ».** L'échéance est une date commune, pas un compte à rebours individuel. Écrire la date en toutes lettres. *(Omission trompeuse, art. L.121-2.)*

⛔ **Pas de compte à rebours visuel, pas de faux stock, pas de confirmshaming.** Le bouton de refus est neutre : « Plus tard », jamais « Non merci, je préfère payer plein tarif ».

### 2 bis. Copie imposée des deux écrans

**Écran 1**
- Titre (H2, ≤ 45 caractères) : « 15 € offerts sur votre première œuvre »
- Sous-titre (≤ 90 caractères) : « Dès 80 € d'achat. Votre code s'affiche tout de suite, ici. »
- Label du champ (`<label>` réel et visible) : « Votre adresse e-mail »
- Bouton principal : « Recevoir mon bon »
- Bouton secondaire : « Plus tard »

**Écran 2**
- Titre : « Voici votre bon »
- Le code, en gros, sélectionnable, avec un bouton « Copier »
- « Valable jusqu'au [DATE] à 23 h 59 »
- Bouton principal : « Appliquer ma remise »
- ⛔ Sous le code, même taille que le reste : « Sur un panier supérieur à 150 €, la promotion en cours est déjà plus avantageuse que ce bon : c'est elle qui s'appliquera, et c'est normal. »

⛔ **Toute chaîne passe par `locales/`.** Aucun texte en dur.

---

## 3. Déclenchement — les règles SEO sont non négociables

La boutique vit à **100 % du référencement Google**, **70,8 % du trafic est mobile**. Une popup à l'atterrissage tombe sous la doctrine Google des interstitiels intrusifs.

⛔ **Conditions cumulatives — TOUTES vraies :**

1. On est sur une **fiche produit**
2. C'est au moins la **2ᵉ page vue** de la session (compteur en `sessionStorage`)
3. **≥ 15 s d'engagement réel** (timer suspendu si l'onglet est inactif)
4. Le **bandeau cookies n'est plus visible à l'écran**
5. ⛔ **Marché France et devise euro uniquement en v1** :
   ```liquid
   {%- if localization.country.currency.iso_code == 'EUR' and request.locale.iso_code == 'fr' -%}
   ```
   *Raison : les prix Canada/USA portent un uplift de +26,6 % et sont facturés en CAD/USD — « 15 € dès 80 € » y serait faux (art. L.121-2). Et en Allemagne, le § 7 UWG fait du double opt-in la référence, incompatible avec un code affiché immédiatement.*

⛔ **Ne JAMAIS afficher si :** c'est la page d'entrée de la session · le **panier n'est pas vide** (on ne dérange pas quelqu'un qui achète) · le visiteur est déjà abonné ou a déjà vu la popup dans les 30 jours · on est sur `/cart` ou dans le tunnel.

> ⚠️ Le compteur de pages doit aussi s'incrémenter lors de la **bascule Poster/Toile** (`assets/product-twin-toggle.js`), qui remplace `#MainContent` sans rechargement.

---

## 4. Format et design

### ⛔ Deux collisions en bas d'écran — la seconde est prioritaire

| Élément | Position | z-index |
|---|---|---|
| Bandeau cookies (`snippets/cookie-banner.liquid:2`) | `fixed bottom-6 left-5 md:left-16 right-5 max-w-[550px]` → **pleine largeur sur mobile** | `z-50` |
| **Bouton d'achat flottant** (`sections/main-product.liquid:318-320`) | `fixed bottom-3 left-4 md:bottom-6 md:left-1/2 max-w-[70%]`, **apparaît au scroll sur la fiche produit** | `z-20` |

⛔ **La popup ne doit JAMAIS recouvrir le bouton d'achat flottant ni le rendre inatteignable.** On ne tue pas la conversion pour capturer un e-mail. Solutions admises : ancrer la popup au-dessus de lui (offset calculé sur sa hauteur réelle), ou masquer la popup tant qu'il est visible.

**Ordre d'empilement imposé :** cookies (`z-50`) > popup (`z-40`) > bouton d'achat (`z-20`).

### Mobile (maquetter 320 px ET 375 px)

- **Encart flottant en bas**, part minoritaire de l'écran, produit toujours visible
- ⛔ Pas d'overlay plein écran, pas de voile opaque

### Desktop

- **Carte en bas à droite** — le bandeau cookies passe à gauche (`md:left-16`)

### Fermeture

- ⛔ **Croix visible dès la première frame, pleine opacité.** Aucun délai
- Zone tactile **≥ 44 × 44 px** *(exigence de confort, pas une obligation : WCAG 2.5.8 AA impose 24 × 24 px ; 44 px relève du AAA)*
- Fermeture aussi au clic extérieur et à **Échap**

### Style

Variables globales (`tailwind.config.js`) : couleurs `main`, `secondary`, `accent`, `buy-button`, `like` et leurs opacités (`main-10`, `main-50`…) · polices `font-heading`, `font-roboto`, `font-limelight` · ombres `shadow-neu-sm/md/lg/xl`, `shadow-pill`, `shadow-3xl` · breakpoints `mobile`, `mobile-mini`, `2xs`, `2md`.

⛔ **Tailwind uniquement.** Pas de CSS custom, pas de style inline, pas de couleur en dur.

### 4 bis. États d'interface — tous à maquetter

| État | Déclencheur | Traitement |
|---|---|---|
| Repos | — | Bouton actif — « Recevoir mon bon » |
| Envoi en cours | Clic | Bouton désactivé + libellé « Envoi… », champ verrouillé, popup non fermable |
| E-mail invalide | Soumission | Message sous le champ, `aria-invalid`, focus rendu au champ |
| Consentement non coché | Soumission | Message sous la case, focus sur la case |
| **Déjà inscrit** | Réponse serveur | ⛔ **Écran 2 quand même, code affiché** — « Vous êtes déjà inscrit : voici votre bon. » |
| **Échec réseau / timeout 8 s** | Pas de réponse | ⛔ **Écran 2 quand même, code affiché** + bouton « Réessayer » discret |
| Retour du visiteur | Code déjà obtenu | Pastille de rappel (voir 4 ter) |

**Principe :** le code vient d'un réglage admin, il est connu côté client. **Il s'affiche toujours.** L'abonnement est secondaire, la vente est primaire.

### 4 ter. Retour du visiteur — obligatoire

- À l'affichage de l'écran 2, code + date écrits en **`localStorage`** (pas `sessionStorage`)
- Si un code valide est stocké : la popup ne se réaffiche **jamais**, mais une **pastille discrète** apparaît sur la fiche produit (hors de la zone du bouton d'achat flottant) : « Votre bon de 15 € » → au clic, rouvre l'écran 2
- La pastille disparaît après la date de fin et après une commande
- ⛔ **Limite à écrire dans l'interface** : le stockage est par navigateur. Un client qui change d'appareil perd son code — c'est pourquoi l'e-mail contenant le code n'est pas optionnel.

---

## 5. Accessibilité — WCAG 2.1 AA

⛔ **L'encart est NON MODAL** (il ne bloque pas la page). Donc :

- `role="dialog"` + `aria-labelledby` pointant sur le titre
- ⛔ **PAS de `aria-modal="true"`, PAS de piège de focus** — ce serait contradictoire avec un encart non bloquant
- À l'ouverture : déplacer le focus sur le titre de l'encart. À la fermeture : **restituer le focus** là où il était
- Échap ferme
- Focus visible partout · `prefers-reduced-motion` respecté · `<label>` réel sur le champ · erreurs annoncées en `aria-live="polite"`

---

## 6. Contraintes techniques du thème — vérifiées dans le code

### ⛔ Point de branchement — le piège n°1

Le thème a **7 layouts** qui dupliquent chacun le bloc de fin de `<body>`. **Les fiches produit rendent `layout/product.liquid`, PAS `layout/theme.liquid`.**

Ligne du bloc `enable_cookie` dans chacun : `theme:56` · **`product:60`** · `collection:66` · `cart:55` · `page:56` · `article:49` · `search:59`.

Ajouter **dans `layout/product.liquid`**, juste avant ce bloc :

```liquid
{%- if settings.enable_promo_popup -%}
  {% render 'promo-popup' %}
{%- endif -%}
```

### ⛔ Réglages admin — un snippet ne peut pas porter de `{% schema %}`

Puisqu'on branche par `{% render %}` + `settings.*`, les réglages sont **globaux**, comme le bandeau cookies :

- groupe dans `config/settings_schema.json` (modèle : `t:settings_schema.cookie_banner.name`, l. 10-20)
- libellés dans **`locales/fr.default.schema.json` ET `locales/en.schema.json`** — convention `settings_schema.promo_popup.settings.<id>.label`
- valeurs par défaut dans `config/settings_data.json`

⛔ **Jamais de `"type": "text"` avec `"default": ""`** — rejeté silencieusement au déploiement.

### ⛔ Focus : ce que le thème expose vraiment

- `trapFocus` existe (`assets/tw-global.js:54`) mais c'est un **handler keydown** : `trapFocus(event, first, last)`, à câbler soi-même sur un `addEventListener('keydown', …)`
- ⛔ **`removeTrapFocus` n'existe pas** — appelé dans `details-modal.js:48` et `pickup-availability.js:95`, jamais défini (ces appels sont buggés). **Ne pas l'invoquer.**
- Pattern d'ouverture/fermeture/restitution à reprendre : `assets/cart-drawer.js:43-84`

### ⛔ Formulaire — deux différences avec le pied de page

Le footer (`sections/tw-footer.liquid:53-55`) ne poste que `contact[email]` + `contact[tags]` : **il ne crée pas de consentement marketing**.

```liquid
{%- form 'customer', id: 'PromoPopupForm' -%}
  <input type="hidden" name="contact[tags]" value="promo-popup">
  <input type="email" name="contact[email]" required>
  <input type="checkbox" name="contact[accepts_marketing]" value="true"> {# NON pré-cochée #}
{%- endform -%}
```

⛔ **Soumettre en AJAX** (`fetch` sur l'`action` du form, `FormData`) — un POST natif redirige et **détruirait l'écran 2**. Précédent dans le thème : `assets/component-custom-art-studio.js:3372-3379`.

Structure de champ à réutiliser (label flottant, états erreur/succès) : `sections/tw-footer.liquid:54-94`.

### ⛔ Autres pièges

- **`*:empty`** (`input.css:4-21`) masque tout élément vide non whitelisté. Tout conteneur rempli par JS doit porter **`data-allow-empty`**
- **`tw-global.js` est chargé deux fois** sur certaines pages → tout JS doit être **idempotent**
- ⛔ **Ne PAS réutiliser `assets/details-modal.js`** : couplé au header (`this.closest('.header__icons')`, lignes 42 et 52)
- ⛔ **Build CSS obligatoire** : le CSS servi est `assets/output.css` (`snippets/head-base.liquid:67`), compilé depuis `input.css`. Toute classe nouvelle n'existe pas tant que le build n'a pas tourné :
  ```
  npx tailwindcss -i ./input.css -o ./assets/output.css --minify
  ```
  **`assets/output.css` régénéré fait partie des livrables.** Toute classe construite dynamiquement en JS doit aller dans le `safelist` (`tailwind.config.js:144-173`), sinon elle est purgée.
- ⛔ **Aucun chemin d'URL en dur** : les liens passent par l'objet Liquid (`.url`) — les handles sont traduits

---

## 7. RGPD — écran 1

- Case **dédiée, NON pré-cochée**, avec `<label for>` réel
- ⛔ **Une case = une finalité.** Interdit de la fusionner avec les CGV, le consentement cookies ou un opt-in SMS
- ⛔ **Un seul champ : l'e-mail.** Pas de prénom, pas de téléphone, même facultatifs (minimisation, art. 5.1 c)
- Mentions **visibles avant validation, au premier niveau**

**Libellé de la case (imposé) :**
> J'accepte de recevoir par e-mail les offres et nouveautés de MyselfMonArt. Sans cette case, nous ne pouvons pas vous envoyer votre code.

**Bloc sous la case (imposé) :** responsable **SAS KINDOPIA** · finalité prospection commerciale · base légale **consentement** · destinataires (dont Shopify) · transferts hors UE · conservation **3 ans après le dernier contact** · droits d'accès, rectification, effacement, opposition, portabilité · **retrait du consentement à tout moment** · **réclamation auprès de la CNIL** · lien vers la politique de confidentialité.

### 7 bis. Stockage local — art. 82 loi Informatique et Libertés

Le compteur de pages et le drapeau « déjà vu » relèvent de l'art. 82 **au même titre qu'un cookie** (le texte est neutre technologiquement). On les maintient **sans consentement** au titre de l'exemption « strictement nécessaire », **à quatre conditions cumulatives** :

1. **Aucune donnée personnelle, aucun identifiant** — un entier et un horodatage, rien d'autre. Pas d'e-mail, pas de hash, pas d'UUID
2. **Jamais transmis** — aucune de ces valeurs ne part vers un serveur
3. **Durée limitée** au strict nécessaire (30 jours)
4. **Listés dans la politique de confidentialité** au titre des traceurs exemptés

> ⚠️ La condition de déclenchement n°4 (« bandeau cookies plus visible ») est une contrainte **visuelle**, pas juridique : `snippets/cookie-banner.liquid:207-213` auto-consent à tout dès la première visite.

---

## 8. À livrer

1. `snippets/promo-popup.liquid` — les deux écrans
2. `assets/promo-popup.js` — custom element idempotent : déclenchement, capping, focus, soumission AJAX
3. Les clés dans les **5 locales de contenu** (`fr.default`, `en`, `de`, `es`, `nl`) — convention `sections.promo_popup.<clé>`. ⚠️ ces fichiers commencent par un bloc `/* … */` avant le JSON : le conserver
4. Les clés dans les **2 locales de schema** (`fr.default.schema.json`, `en.schema.json`)
5. Le groupe de réglages dans `config/settings_schema.json` + défauts dans `config/settings_data.json`
6. Le branchement dans **`layout/product.liquid`**
7. **`assets/output.css` régénéré**
8. ⛔ Mise à jour de la **politique de confidentialité** (et ses 4 traductions) : traitement « prospection par e-mail » + liste des traceurs exemptés
9. **Captures** : mobile 320 px, mobile 375 px, desktop — écran 1 et écran 2, avec le bouton d'achat flottant visible

---

## 9. Ce qu'il ne faut pas faire

| ⛔ | Pourquoi |
|---|---|
| Overlay plein écran sur mobile | Pénalité Google — c'est 100 % du chiffre d'affaires |
| Popup à l'atterrissage | Idem, la règle la plus grave |
| Recouvrir le bouton d'achat flottant | On tuerait la conversion pour un e-mail |
| Brancher dans `layout/theme.liquid` | La popup ne s'afficherait jamais sur les fiches produit |
| Croix retardée ou masquée | Dark pattern |
| Compte à rebours ou « 48 h » | Promesse fausse pour la moitié des inscrits |
| `{% schema %}` dans un snippet | Impossible — réglages introuvables en admin |
| POST natif du formulaire | Recharge la page, détruit l'écran 2 |
| Appeler `removeTrapFocus` | La fonction n'existe pas dans le thème |
| Prévoir un A/B test | 8 commandes/mois : aucun test ne sera jamais significatif |

---

## 10. Réglages Shopify (hors design)

Admin → Réductions → Créer → **Montant de réduction sur les commandes** :

| Champ | Valeur |
|---|---|
| Méthode | Code de réduction |
| Code | non devinable (ex. `MERCI-K7QX`), jamais `BIENVENUE15` |
| Valeur | 15,00 € fixe |
| Minimum d'achat | **80,00 €** |
| Utilisations | cocher « une utilisation par client », **pas** de plafond total |
| Dates actives | début + **date ET heure de fin** (fuseau de l'admin, Europe/Paris) |
| **Combinaisons** | ⛔ **TOUT DÉCOCHÉ** — c'est ce réglage qui fait appliquer par Shopify la plus avantageuse des deux remises. La promotion en cours est de classe **PRODUCT**, ce code sera de classe **ORDER** : le risque d'empilement est Product ↔ Order |

**Bouton « Appliquer ma remise »** → `/discount/{{ code }}?redirect={{ product.url }}` — ⛔ toujours construit depuis l'objet Liquid, et **retour sur la fiche produit consultée**, jamais vers une collection : on ne sort pas le client de l'œuvre qu'il regardait.

### ⛔ Test obligatoire avant de figer la copie

Créer le code, remplir un panier à **200 €**, appliquer le code, constater **laquelle des deux remises Shopify retient**.

- Si Shopify retient la plus avantageuse → la mention du §2 est valide
- Si Shopify retient le code (15 € au lieu de 20 €) → la mention devient **fausse** et doit être remplacée par : « Ce bon remplace la promotion en cours. Au-delà de 150 € d'achat, la promotion actuelle est plus avantageuse : n'utilisez pas le bon. »

Tester aussi un panier à **85 €** ramené à 76,50 € par la promotion : le minimum de 80 € passe-t-il ou échoue-t-il ? *(Non documenté chez Shopify.)*
