# Corrections à apporter aux 3 e-mails du bon de 15 €

**Destinataire : Claude Design** — projet `Popup bon 15 euros`, fichiers `emails/mail-1-votre-bon.html`, `emails/mail-2-choisir.html`, `emails/mail-3-derniere-chance.html`.
**Date : 2026-08-06.**

Le travail est solide : structure juste, code e-mail propre, ton fidèle à la marque. Les corrections ci-dessous portent sur des faits inexacts, un risque juridique, et un décalage avec l'architecture technique qui a été arrêtée après la rédaction.

**Deux corrections sont bloquantes** (§1 et §2). Les autres sont des ajustements.

---

## 1. ⛔ BLOQUANT — La note Trustpilot est inexacte

**Fichier :** `mail-2-choisir.html`, bloc de pied de carte.

**Actuellement :**
```
★★★★★
4,8 / 5 — 312 retours vérifiés sur Trustpilot
```

**Valeurs réelles**, lues dans le thème de la boutique (`sections/main-product.liquid`, `sections/trust-signals.liquid`, `sections/testimonials-carousel.liquid`, toutes trois cohérentes) :

```liquid
assign tp_score = settings.trustpilot_score_global | default: 42    → 4,2 / 5
assign tp_count = settings.trustpilot_review_count_global | default: 81   → 81 avis
```

**À remplacer par :**
```
4,2 / 5 — 81 retours vérifiés sur Trustpilot
```

Et **4 étoiles pleines**, pas 5, pour rester cohérent avec 4,2.

**Pourquoi c'est bloquant :** afficher une note supérieure à la réalité dans une communication commerciale relève de la pratique commerciale trompeuse (art. L.121-2 du code de la consommation), et les conditions d'utilisation de Trustpilot l'interdisent explicitement. 4,2 sur 81 avis reste un excellent signal — l'exactitude vaut mieux qu'un chiffre invérifiable.

**Mieux encore :** rendre ces deux valeurs variables (`{{ trustpilot_score }}`, `{{ trustpilot_count }}`), pour qu'elles ne se périment jamais.

---

## 2. ⛔ BLOQUANT — Supprimer tous les prix barrés

**Fichiers :** `mail-1-votre-bon.html` (bloc « Vous regardiez ») et `mail-3-derniere-chance.html` (bloc « L'œuvre que vous regardiez »).

**Actuellement :**
```html
<span style="text-decoration:line-through;">129 €</span>  <strong>114 €</strong> avec votre bon
```

**À remplacer par**, sans barré et sans mise en scène de réduction :
```html
129 € — soit 114 € avec votre bon
```

**Pourquoi c'est bloquant :** un prix barré à côté d'un prix inférieur constitue une **annonce de réduction de prix** au sens de la directive Omnibus. Elle impose alors d'afficher le prix le plus bas pratiqué au cours des 30 derniers jours, sur chaque produit concerné.

Toute l'architecture du bon a justement été conçue pour sortir de ce cadre : le code est **nominatif**, donc individualisé, donc hors du champ de la directive. Le prix barré l'y ferait rentrer par la fenêtre.

Même règle dans `mail-2-choisir.html` : « à partir de 89 € **— 74 € avec votre bon** » doit devenir « 89 € — soit 74 € avec votre bon », sans emphase de remise.

---

## 3. Le code n'est plus le même pour tout le monde

Les trois fichiers portent en commentaire :

> `MERCI-K7QX / 30 septembre 2026 → réglages admin promo_popup_code`

**Ce n'est plus l'architecture retenue.** Chaque inscrit reçoit désormais **son propre code**, créé au moment de son inscription, valable **8 jours à compter de ce moment-là**.

Conséquences à répercuter dans les trois fichiers :

- **La date d'échéance est une variable**, propre à chaque destinataire. Plus de « 30 septembre 2026 » figé.
- **Le code est une variable.** `MERCI-K7QX` n'est qu'un exemple de rendu.
- Le bloc « Une seule fois, par client » devient littéralement vrai : le code a une limite d'utilisation totale de 1. On peut l'écrire plus fermement : **« Utilisable une seule fois »**.

### Les variables que le back-end fournira

| Variable | Contenu | Exemple |
|---|---|---|
| `{{ code }}` | le code nominatif | `MERCI-A7F3K2` |
| `{{ expires_at }}` | échéance, déjà formatée dans la langue du destinataire | `19 août 2026` |
| `{{ apply_url }}` | lien qui applique la remise | `https://www.myselfmonart.com/discount/MERCI-A7F3K2?redirect=/collections/all` |
| `{{ unsubscribe_url }}` | désabonnement | — |
| `{{ signup_date }}` | date de l'inscription, pour la ligne de contexte | `6 août` |
| `{{ trustpilot_score }}` / `{{ trustpilot_count }}` | note et nombre d'avis | `4,2` / `81` |
| `{{ product.* }}` | `image_url`, `title`, `price`, `url` — bloc optionnel | — |

⚠️ **Le mois doit être écrit en toutes lettres et dans la langue du destinataire.** Ne pas générer la date côté modèle : le back-end la fournit déjà formatée.

---

## 4. Le mail 3 — l'urgence est désormais vraie, garde le texte

**Fichier :** `mail-3-derniere-chance.html`.

Le titre **« Vos 15 € s'arrêtent demain, 23 h 59 »** est **exact et doit être conservé tel quel.**

La validité du code a été calée sur la cadence : **8 jours**, alors que le 3ᵉ e-mail part à **J+7**. Le code expire donc bien le lendemain de sa réception. Ce n'est pas une coïncidence, c'est le réglage qui rend la promesse vérifiable.

Deux ajustements seulement dans ce fichier :

- **La date reste une variable.** « 30 septembre 2026 » n'est qu'un exemple : c'est `{{ expires_at }}`, propre à chaque destinataire.
- **Retirer du commentaire d'en-tête** la mention « Envoi : veille de l'échéance ». Écrire : *« Envoi : J+7 après l'inscription, 18 h 00 (heure de Paris) — le code expire à J+8, l'échéance annoncée est donc réelle. »*

⚠️ **Ne pas rallonger la validité du code sans décaler l'envoi de ce mail.** Les deux valeurs sont liées : c'est ce qui distingue une urgence honnête d'une urgence fabriquée. Une échéance fausse est précisément ce qui fait cliquer sur « signaler comme spam ».

Enfin, **supprimer du `mail-2` la mention « Sauté si l'échéance est à moins de 48 h »** : avec une durée fixe partant de l'inscription de chacun, ce cas ne peut plus se produire.

---

## 4 bis. ⛔ Retirer l'heure des échéances — elle n'est vraie qu'à Paris

**Fichiers :** les quatre.

Les e-mails affichent partout « 23 h 59 — heure de Paris ». L'encart est ouvert à **toute la zone euro**, qui s'étale de **UTC+0** (Irlande, Portugal) à **UTC+3** (Finlande).

Conséquences réelles :

- Un **Irlandais** qui essaie à 23 h 15 chez lui se fait refuser son bon, alors que l'e-mail lui promettait 23 h 59.
- Un **Finlandais** voit le même instant tomber après minuit : sa date locale est le lendemain de celle annoncée.

**À appliquer :** supprimer l'heure de tous les textes clients et borner à la journée.

| | Avant | Après |
|---|---|---|
| FR | Valable jusqu'au 13 août à 23 h 59 | Valable jusqu'au 13 août **inclus** |
| EN | Valid until 13 August at 11:59 pm | Valid **through** 13 August |
| DE | Gültig bis zum 13. August um 23:59 Uhr | Gültig bis **einschließlich** 13. August |
| ES | Válido hasta el 13 de agosto a las 23:59 | Válido hasta el 13 de agosto **incluido** |
| NL | Geldig tot 13 augustus om 23.59 uur | Geldig **tot en met** 13 augustus |

Cas particulier du **mail 3** : « Vos 15 € s'arrêtent demain, 23 h 59 » devient **« Vos 15 € s'arrêtent demain soir »**. L'urgence est intacte, la promesse redevient tenable partout.

Le thème a déjà été corrigé dans ce sens, et épingle en plus l'affichage de la date sur le fuseau de Paris — sans quoi un Finlandais lisait une date dans l'encart et une autre dans son e-mail, pour le même code.

*(L'instant réel d'expiration ne change pas : il reste 23:59:59 heure de Paris, un moment unique et absolu. Seul son affichage est corrigé.)*

---

## 5. Corrections factuelles

### Les cadres de la toile sont incomplets

**Fichier :** `mail-2-choisir.html`, question 2 « Quel cadre ? ».

**Actuellement :** « Blanc, noir mat, chêne clair, noyer — ou sans cadre. »

C'est exact **pour le poster**, mais incomplet **pour la toile**. Le thème (`locales/fr.default.json`) distingue les deux :

| | Finitions réelles |
|---|---|
| **Toile** | Caisse américaine blanc, noir mat, **argent ancien**, chêne clair ou noyer — ou sans cadre |
| **Poster** | Blanc, noir mat, chêne clair ou noyer — ou sans cadre |

Le paragraphe couvrant les deux supports, il faut soit mentionner l'argent ancien, soit distinguer explicitement les deux listes.

### « À partir de » rend l'exemple faux

**Fichier :** `mail-2-choisir.html`, blocs produits.

« À partir de 89 € » signifie que les formats d'entrée sont moins chers. Si le plus petit format descend sous **80 €**, le bon ne s'applique pas — alors que l'e-mail affirme le contraire juste à côté.

**À corriger :** afficher un **prix ferme** pour le format montré, ou retirer le calcul « — 74 € avec votre bon » de ces blocs.

### Le code ne s'applique pas toujours tout seul

**Fichier :** `mail-1-votre-bon.html`, sous le bouton.

**Actuellement :** « Le code s'applique tout seul : vous le retrouvez déjà inscrit à la caisse. »

Le lien `/discount/` dépose un cookie. Sur mobile, entre le navigateur intégré de l'application de messagerie et le navigateur du téléphone, ce cookie se perd fréquemment — et 70,8 % du trafic est mobile.

**À remplacer par :**

> Le code est normalement déjà inscrit à la caisse. S'il n'y est pas, saisissez-le : il est juste au-dessus.

---

## 6. Expéditeur et pied de page

**Fichiers :** les trois.

- L'expéditeur annoncé en commentaire (`bonjour@myselfmonart.com`) devient : envoi depuis **`mail.myselfmonart.com`**, avec **`Reply-To: team@myselfmonart.com`**. Ce dernier est impératif — le domaine d'envoi n'a aucune boîte de réception.

### ⛔ Pas d'adresse postale — décision ferme du marchand

**Supprimer le bloc `[ADRESSE POSTALE COMPLÈTE]` des trois fichiers.** Ne jamais le réintroduire, sous aucune forme, dans aucune version future.

Ce qui le remplace, et qui suffit à l'obligation d'identification :

```
MyselfMonArt — direction artistique à Paris, service client à Toulouse.
Mentions légales · Politique de confidentialité · Se désabonner
```

Les trois libellés sont des liens. « Mentions légales » pointe vers la page de la boutique, qui porte déjà l'identité complète de l'éditeur.

*Note juridique, pour que la décision soit tenue en connaissance de cause : le droit français (LCEN art. 20) exige que l'annonceur soit **clairement identifiable**, pas qu'une adresse postale figure dans le corps du message — contrairement à la loi américaine CAN-SPAM, qui l'impose et qui ne s'applique pas ici (l'encart est verrouillé sur la zone euro). Le nom de la marque plus un lien vers les mentions légales satisfont l'obligation.*

- Le **lien de désabonnement visible** dans le pied de page est **obligatoire et non négociable**, en plus des en-têtes techniques que pose le back-end. Il doit rester lisible : pas de gris trop clair sur fond crème. C'est ce qui transforme un « je me désabonne » en clic inoffensif plutôt qu'en signalement pour spam — le seul évènement réellement dangereux du dispositif.
- La ligne de contexte de collecte devient datée : « Vous recevez cet e-mail parce que vous avez demandé un bon de 15 € sur myselfmonart.com le {{ signup_date }}. »

---

## 7. Les 5 langues — la démonstration manque

Les fichiers sont en français dur (`lang="fr"`), avec des tailles de police fixes. La séquence part dans **5 langues dès le lancement** : français, anglais, allemand, espagnol, néerlandais.

L'allemand et le néerlandais sont en moyenne **30 % plus longs** que le français. Exemples réels tirés des traductions existantes :

| FR | DE |
|---|---|
| Recevoir mon bon | Gutschein erhalten |
| offerts sur votre première œuvre | geschenkt auf Ihr erstes Kunstwerk |
| Valable jusqu'au 16 août 2026 | Gültig bis zum 16. August 2026 |

**Ce que j'attends en retour :** la démonstration qu'un **titre passant sur deux lignes** et un **bouton au libellé allemand** ne cassent rien. Concrètement : aucune hauteur fixe, boutons à largeur libre, et le bloc de conditions capable de respirer sur trois lignes.

L'attribut `lang` devra devenir variable.

---

## 8. Ce qui est juste et qu'il ne faut pas toucher

- Le **« point d'honnêteté »** du mail 3 sur le seuil de 150 € : excellent, il désamorce l'objection au lieu de la subir.
- Le **code en texte vivant**, jamais en image, sélectionnable. C'est capital.
- Les **conditions du bon dans le corps** de l'e-mail, pas renvoyées à un lien.
- Les **affirmations matière** (« toile 285 g, encres archival 75 ans, cadre bois massif ») : **validées par le marchand le 2026-08-06**. Elles figurent déjà mot pour mot dans la description SEO de la page d'accueil, et sont donc cohérentes avec le reste de la boutique. À conserver telles quelles.
- L'**aperçu 3D**, le **contour blanc**, le **poster encadré sous verre** : tous vérifiés exacts dans les fichiers de traduction du thème.
- **Aucun pixel de suivi d'ouverture.** À maintenir : depuis la recommandation CNIL de mars 2026, il exigerait un consentement distinct que le formulaire ne recueille pas. On pilote au clic.
- Le **code technique** : tables, 600 px, repli Outlook, préheader masqué, `mso-line-height-rule`. Rien à redire.
