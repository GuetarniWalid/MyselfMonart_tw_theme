# BON DE 15 € — OUVERTURE USA / CANADA · NOTE DE DÉCISION

**2026-08-06 · Walid / MyselfMonArt**

---

## 1. RÉPONSE DIRECTE

**Oui, on peut ouvrir — mais pas en retirant le verrou EUR : le dispositif doit changer de forme (pourcentage au lieu de montant fixe) et l'encart doit être mis en conformité canadienne AVANT le premier envoi. Coût : ~1 jour de thème, ~2 jours de back-end, zéro abonnement, zéro app payante.**

Ce qu'il ne faut surtout pas faire : décocher `is_eur` dans `snippets/promo-popup.liquid:87` et regarder ce qui se passe. Ça ne casserait rien visuellement — et c'est exactement le problème.

**Les 3 obstacles, par gravité :**

**#1 — CASL Canada : l'encart tel quel produit un consentement NUL.** Ce n'est pas le débat opt-in simple / double opt-in (voir §4 : l'opt-in simple est valide, point tranché). C'est que le Règlement DORS/2012-36 **art. 4** impose, **dans la demande de consentement elle-même**, l'adresse postale de l'entreprise + une mention indiquant que la personne peut retirer son consentement. Les deux sont absentes de l'encart. Et l'échappatoire « information derrière un lien » n'existe **que pour les messages** (art. 2(2)), **pas pour les demandes de consentement** : aucune disposition équivalente à l'art. 4. Résultat : consentement inopposable → 3 e-mails envoyés sans consentement valable → plafond **10 000 000 CAD par violation** pour une personne morale (LCAP art. 20(4)). Le correctif tient en deux lignes de texte × 5 locales. L'omettre, non.

**#2 — CAN-SPAM USA : la décision « pas d'adresse postale dans les e-mails » tombe.** Elle était juste pour la zone euro (LCEN art. 20 exige l'identifiabilité, pas une adresse). Elle devient une infraction dès le premier destinataire américain : 15 U.S.C. 7704(a)(5)(A)(iii) fait de l'adresse postale une **condition de licéité du message**, sanctionnée **par e-mail** à hauteur de 53 088 USD. Bonne nouvelle : « 60 rue François 1er, 75008 Paris » suffit — 16 CFR 316.2(p) branche 1, « the sender's current street address », sans qualificatif géographique (les deux autres branches, elles, sont expressément rattachées à l'USPS). Aucune adresse américaine à louer. Une boîte postale française, en revanche, ne cocherait aucune des trois branches.

**#3 — Le montant : « 15 € » est écrit en dur, et vaut 26,6 % de moins là-bas.** Détail en §2. Double faute : un texte faux affiché à un client facturé en dollars, et une valeur réelle du cadeau divisée par 1,266 à cause de l'uplift.

**Hors périmètre du bon mais bloquant commercialement** (remonté par la contre-expertise, à traiter en parallèle) : la franchise douanière américaine de 800 USD est suspendue depuis le 29/08/2025 et codifiée le 24/06/2026 — **100 % des colis US et CA sont désormais taxés à la frontière**, la politique d'expédition de la boutique est littéralement vide, et le tarif annoncé dit « livraison offerte, 5 à 8 jours ouvrables ». Voir §5 bloc C et §6 point 3.

---

## 2. LE MONTANT DU BON

### Ce que verrait un Américain aujourd'hui si on retire le verrou

1. **Un texte faux.** `locales/fr.default.json` porte « 15 € » (`title_amount`), « Votre bon de 15 € » (`badge`), « Dès 80 € d'achat » (`cond_1_lead`) et l'objet de repli `mail_subject`. Ce sont des chaînes figées. Un client facturé en USD lirait « 15 € » pour un bon qu'il ne pourra jamais utiliser en euros.
2. **Un montant sale au checkout, qui bouge tout seul.** Le code fonctionne — Shopify convertit le montant fixe dans la devise de présentation au moment où la remise s'applique. Mais 15 € donne un 17,4x USD / 24,1x CAD à deux décimales, différent d'un jour à l'autre. La documentation Shopify assume elle-même la dérive avec son exemple 2 USD → 1,74 € puis 1,76 €.
3. **Un cadeau amputé de 21 %.** L'uplift +26,6 % porte sur les **prix**, pas sur la remise. Le bon s'applique à des prix gonflés : sur la toile 60×80 (94 € en France, 119 €-équivalent là-bas), le taux de remise effectif passe de 16 % à 12,6 %.
4. **Une porte trop facile.** Le seuil de 80 € est lui aussi converti : il ne représente plus que ~63 € de valeur catalogue de base. On donne moins, pour moins d'achat.
5. **Deux devises, pas une.** La price list partagée est en USD, mais le marché Canada paie en **CAD** : la conversion se fait vers CAD. Deux montants sales à gérer, pas un.

### La solution retenue : **un code en POURCENTAGE, ciblé par marché**

Le pourcentage est le seul mécanisme nativement neutre en devise : « 12 % » est vrai en USD, en CAD, en GBP, en CHF, sans conversion, sans dérive, sans texte à recalculer. Il annule d'un coup les problèmes 1, 2 et 3.

| Groupe de marchés | Remise | Seuil (posé sur le code, en EUR) | Texte affiché |
|---|---|---|---|
| France, europ, Allemagne, Espagne (EUR) | **15 € fixes** — inchangé | 80 € | « 15 € offerts » / « Dès 80 € d'achat » |
| **USA + Canada** (uplift +26,6 %) | **12 %** | **101 €** (= 80 × 1,266) | « 12 % offerts » / « Dès 125 $ d'achat » |
| angleterre (GBP), Suisse (CHF) — sans uplift | **15 %** | 80 € | « 15 % offerts » / seuil arrondi vers le haut en £/CHF |

**Pourquoi 12 % et pas 15 %.** Sur le panier moyen de 100 €, la France donne 15 €. Le même panier est facturé 126,6 €-équivalent aux USA : 12 % y rend **15,2 €** de valeur réelle. Même cadeau, même marge. À 15 % on donnerait 19 € — 27 % de générosité gratuite sur la zone la plus chère à servir.

**Le seuil : on annonce toujours au-dessus du seuil réel.** Le minimum reste un Decimal nu en EUR sur le code (`DiscountMinimumSubtotalInput` n'a pas plus de champ devise que `DiscountAmountInput`), converti au checkout. 101 € ≈ 118 USD selon le jour → on **annonce 125 $**. Le client ne peut jamais être refusé sur la promesse ; au pire il a une bonne surprise à 120 $. C'est une sur-contrainte annoncée, jamais une sous-promesse — la seule formulation défendable face à 15 U.S.C. 7704(a)(2) et à l'art. 224 c) LPC québécois.

### Ce que ça change côté back-end

- **Migrer sur l'API Admin 2026-07.** C'est la version qui expose `context.markets` sur `DiscountCodeBasicInput` (changelog du 08/05/2026). Les versions antérieures **filtrent purement et simplement** les remises portant une éligibilité marché — elles deviennent invisibles en lecture.
- **Le front doit transmettre le marché** (ou le pays/devise de localisation) à `/api/newsletter/subscribe`. Le back-end choisit alors la forme du code : montant fixe 15 € sans `context` pour l'euro, `percentage: 0.12` + `context.markets.add: [gid USA, gid Canada]` pour l'Amérique du Nord, `percentage: 0.15` + markets UK/CH sinon.
- **Le piège d'exclusivité ne mord pas — à condition de ne pas y toucher.** Vérification en direct sur la boutique : le code nominatif actuel (`BON15-1` / `MERCI-D827GH`) porte `customerSelection: DiscountCustomerAll`. « Nominatif » = chaîne aléatoire + `usageLimit 1` + `appliesOncePerCustomer`, pas un rattachement à une fiche client. `context.markets` est donc combinable en l'état. **Si un jour le back-end rattache le code à un client (`context.customers`), le ciblage marché devient impossible** — les types d'éligibilité s'excluent mutuellement. À inscrire comme interdit dans le code back-end, pas seulement dans une note.
- **Effet de bord assumé** : un code créé depuis les USA ne fonctionnera pas si la personne achète depuis la France. C'est marginal, et c'est le prix de la propreté. Le texte de l'e-mail doit le dire en une ligne.

### Ce qu'on écarte, et pourquoi

- **Taux de change manuel** (pour obtenir un 18,00 $ pile) : **rejeté**. Vendu « gratuit » par l'étude, il ne l'est pas. Le taux manuel gouverne **tous** les prix du marché, pas la seule remise : il casse la calibration du +26,6 % (réglée pour que la toile à 94 € prenne exactement +25 €), et surtout les frais de conversion 1,5–2 % basculent du prix client vers **votre versement** — soit 1,5 à 2 € prélevés sur **chaque commande nord-américaine, à vie**, pour rendre rond un bon ponctuel. Plus la maintenance manuelle du taux. Payer un pourcentage du CA nord-américain pour de la cosmétique.
- **App tierce type Pixoo** (15,99 à 79 $/mois) : rejetée. Le pourcentage règle le problème pour 0 €, et 10 avis ne suffisent pas à confier la mécanique de remise à un tiers.
- **Shopify Functions maison** : impossible en plan Basic (apps personnalisées à Functions = Plus uniquement).
- **Shopify Scripts** : mort le 30/06/2026. La page d'aide Shopify qui le recommande encore est un résidu obsolète — utile à savoir, parce que c'est cette même page qui documente la conversion des remises : elle est juste, mais elle n'est plus maintenue.

---

## 3. L'ÉCHÉANCE

**Règle retenue : le bon dure 8 jours et expire à 23:59:59 UTC−12, c'est-à-dire à la fin de la journée annoncée partout sur Terre.**

Concrètement : `endsAt` = (date annoncée + 1 jour) à **11:59:59 UTC**. C'est la convention « Anywhere on Earth », celle des dates limites internationales. Elle garantit que « valable jusqu'au 13 août inclus » est vrai à Helsinki (le bon y survit jusqu'au 14 à 14:59 locale — sur-promesse inoffensive) comme à Hawaï (jusqu'au 13 à 01:59 locale le 14, donc toute la journée du 13). Personne n'est lésé, personne ne peut invoquer une échéance trompeuse. Le coût : quelques heures de vie en plus côté euro. C'est tout.

Ce que ça règle : un bon calé à 23:59:59 Europe/Paris expire pour un client de Los Angeles à **14:59 la veille au soir**. Sur un e-mail « dernière chance », c'est exactement le terrain de 15 U.S.C. 7704(a)(2) et de la section 5 du FTC Act.

**Et le texte reste sans heure**, comme déjà tranché pour la zone euro. Généraliser, ne pas rouvrir.

**Corollaire non négociable : il faut UNE seule durée.** Aujourd'hui il y en a trois, vérifiées en direct :
- le brief dit **7 jours** ;
- `locales/fr.default.json` → `valid_duration` dit **« Valable 8 jours à compter de sa réception »** ;
- la base dit **14 jours** (`BON15-1`, `endsAt 2026-08-20T12:11:42Z`, soit 14 jours **et** à 14:11 Paris, pas minuit).

**Tranche : 8 jours.** C'est le seul chiffre déjà affiché au client, et c'est le seul qui rende la séquence crédible — le « dernière chance » de J+6 tombe 2 jours avant la fin. À 14 jours, ce mail ment. Corriger le back-end, pas le texte.

**Deuxième anomalie à corriger au passage** : le code `MERCI-SZGJJ` actif porte `usageLimit: null`. Il n'a **aucune limite d'utilisation**, seulement `appliesOncePerCustomer`. Remettre `usageLimit: 1`.

---

## 4. LE JURIDIQUE, PAYS PAR PAYS

### Canada — CASL. **L'opt-in simple est VALIDE. Le double opt-in n'est pas exigé.**

C'est le point le plus risqué de la mission, et il se referme proprement. Bulletin CRTC 2012-549 du 10 octobre 2012, § 5 et 7 : le consentement exprès exige « a positive or explicit indication of consent » ; il **ne peut pas** être obtenu par un mécanisme d'opt-out, il **peut** l'être par un mécanisme d'opt-in. La Figure 2 du bulletin — **une case vide que l'utilisateur coche lui-même** — est explicitement donnée comme acceptable ; la Figure 3 — saisie de l'adresse e-mail + envoi — aussi. La FAQ CRTC confirme : « The end user must take a positive action… this can be done by providing a blank box which a user can check off ». **Nulle part le double opt-in n'est requis.** Le refus catégorique du marchand n'est pas un obstacle de conformité.

Et l'encart est **déjà** conforme sur ce point précis : `snippets/promo-popup.liquid` ligne 276, `<input type="checkbox">` **sans attribut `checked`**, blocage `error_consent` si non cochée, libellé qui énonce l'objet. C'est littéralement la Figure 2. Ce qui est nul, c'est la case pré-cochée, le défaut, le silence — rien de tout ça ici.

**Mais deux choses manquent, et elles sont bloquantes :**

1. **Les deux mentions de l'art. 4 du Règlement, dans l'encart** (obstacle #1 de la §1) : adresse postale + « vous pouvez retirer votre consentement à tout moment ». Le lien « Politique de confidentialité » déjà présent ne vaut pas mention de retrait, et l'échappatoire par lien n'existe pas pour les demandes de consentement.
2. **Le fardeau de la preuve.** LCAP **art. 13** : « A person who alleges that they have consent… **has the onus of proving it**. » L'opt-in simple est valide en droit mais ne prouve rien par lui-même — rien n'atteste que le titulaire de l'adresse est celui qui a coché. Le double opt-in n'est pas une exigence légale : c'est la réponse **probatoire** standard. Puisqu'il est refusé, il faut le remplacer par un **journal de consentement** côté back-end : horodatage, IP, URL de la page, **libellé exact de la case affichée**, locale, version du texte. Sans ce journal, « on a un opt-in » est une affirmation invérifiable le jour d'une plainte. C'est le vrai substitut au double opt-in, et il est aujourd'hui absent.

Autres points CASL : **désabonnement valable 60 jours** (pas 30 — ne pas caler sur le CAN-SPAM) ; le consentement exprès **n'expire pas** (contrairement au tacite, 2 ans) ; les **trois** e-mails, J+0 compris, sont des messages commerciaux devant porter nom + adresse postale + mécanisme d'exclusion (art. 6(2)) — le J+0 porte une offre, ce n'est pas un simple message de confirmation exempté. Atténuation : le recours privé (art. 47-51) n'est pas en vigueur ; le risque est administratif (CRTC), pas une action collective.

### États-Unis — CAN-SPAM

Régime d'opt-out : aucun consentement préalable exigé. L'opt-in en place est donc plus que suffisant, et il procure même une dispense d'étiquette publicitaire (7704(a)(5)(B)). **Ne pas l'utiliser** : la France l'exige (LCEN art. 20), on garde la mention partout.

Ce qui doit changer dans les 3 e-mails :
- **Adresse postale physique** : « SAS KINDOPIA — 60 rue François 1er, 75008 Paris ». Obligation de texte, pas une bonne pratique.
- **Lien de désabonnement fonctionnel ≥ 30 jours après l'envoi** → on cale sur **60** pour couvrir le Canada d'un seul réglage.
- **Traitement ≤ 10 jours ouvrables**, gratuit, sans compte, sans formulaire de motif, **en une seule page**. Pas de tunnel.
- **Suppression permanente** : une demande d'opt-out n'expire jamais (la FTC a explicitement refusé de lui donner une durée).
- **En-têtes exacts** : From/Reply-To/domaine d'envoi identifiant MyselfMonArt / SAS KINDOPIA, sans nom d'emprunt. Vaut aussi pour les e-mails transactionnels.
- **Objet non trompeur** : ni montant faux, ni échéance fausse. C'est pour ça que §2 et §3 ne sont pas de la cosmétique.

Sanction : **53 088 USD par e-mail** (montant 2025, non réévalué en 2026, mémorandum OMB M-26-11). Une séquence de 3 mails vers 100 destinataires = 300 infractions potentielles. Et la responsabilité **n'est pas délégable** : sous-traiter à Amazon SES ne transfère rien.

### France / zone euro — inchangé

Opt-in préalable obligatoire (L34-5 CPCE), étiquette publicitaire (LCEN art. 20), pas d'adresse postale requise. Ajouter l'adresse ne casse rien côté euro — **un seul gabarit d'e-mail, conforme aux trois régimes**, c'est la seule architecture tenable. Le verrou sur la devise ne peut de toute façon pas servir de stratégie de conformité : un Américain peut naviguer en EUR, un Français en USD, et CAN-SPAM comme CASL se déclenchent sur le **destinataire**, pas sur la devise.

### Québec — deux dettes spécifiques

- **Art. 224 c) LPC** : le prix annoncé doit comprendre la totalité des sommes à débourser ; seules TPS et TVQ peuvent être exclues. Droits de douane et frais de courtage annoncés « à la livraison » = non conforme. Les **frais de courtage du transporteur** ne sont couverts par aucune exception (celle de la Loi sur la concurrence ne vise que les frais imposés par un gouvernement).
- **Art. 3117 / 3149 C.c.Q.** : la clause « droit français » des CGV ne prive pas le consommateur québécois des dispositions impératives de sa résidence, et sa renonciation au for québécois est sans effet.

### Le correctif juridique qui tue le bon, et que personne n'avait vu

La politique de remboursement en ligne (dernière modification **20 octobre 2022**) dit : *« Notre politique dure 10 jours ouvrables »* et *« Seuls les articles à prix normal sont remboursables. Malheureusement, les articles soldés ou en promotion ne le sont pas. »*

Les CGV disent l'inverse (14 jours, sans restriction). Le JSON-LD produit (`sections/main-product.liquid:626`) dit encore autre chose (14 jours, `applicableCountry: 'FR'`).

**Toute commande payée avec le bon devient, à la lettre, un « article en promotion » non remboursable.** C'est le dispositif qu'on s'apprête à ouvrir aux USA et au Canada. Pratique trompeuse au sens de la section 5 du FTC Act, représentation fausse sur les droits du consommateur au Québec, et clause déjà illégale côté UE. **Supprimer la phrase, aligner sur 14 jours calendaires, mettre le JSON-LD en cohérence.** C'est 20 minutes et ça vaut plus cher que le reste de la note.

---

## 5. LE PLAN

### Phase 0 — bloquants juridiques (avant tout envoi hors zone euro)

**Thème** — `snippets/promo-popup.liquid` + les 5 locales :
1. Ajouter dans le bloc consentement de l'encart : « SAS KINDOPIA, 60 rue François 1er, 75008 Paris » + « Vous pouvez retirer votre consentement à tout moment. » (5 locales, sous la case, pas derrière un lien).

**Admin Shopify** :
2. Réécrire la politique de remboursement (supprimer la clause « articles en promotion », 14 jours calendaires).
3. Écrire la politique d'expédition — elle est **vide** (`bodyLength: 0`).

**Back-end** :
4. Brancher le journal de consentement (horodatage, IP, URL, libellé exact, locale, version).
5. Refondre le pied des 3 e-mails : adresse postale, lien de désabonnement 60 jours, traitement ≤ 10 jours ouvrables, suppression permanente, mention publicitaire conservée.

### Phase 1 — mécanique de la remise

**Back-end** :
6. Migrer sur l'API Admin **2026-07**.
7. Recevoir le marché/pays depuis le front ; créer le code selon le tableau §2 (montant fixe EUR sans contexte / pourcentage + `context.markets` ailleurs). **Interdire `context.customers`** dans le code, avec commentaire expliquant pourquoi.
8. Durée **8 jours**, `endsAt` = jour+1 à **11:59:59 UTC** (AoE), `usageLimit: 1` restauré.

**Thème** :
9. Remplacer le gate `is_eur` (ligne 87) par un routage à 3 branches sur le marché, avec un second jeu de clés locales (`title_percent`, `cond_1_lead_intl`, `badge_percent`, `mail_subject_intl`) — pas de calcul JS, du texte traduit.
10. Seuils annoncés en devise locale, **arrondis vers le haut** (125 $ / 175 CAD / etc.), pilotables depuis le schema.
11. Généraliser la date sans heure.

### Phase 2 — vérifications avant ouverture (marchand + moi)

12. **Panier test réel en USD puis en CAD** avec un code de test : le pourcentage s'applique-t-il bien, le seuil converti se comporte-t-il comme prévu, la remise embarque-t-elle les frais de conversion. Gratuit, lève trois incertitudes d'un coup.
13. Vérifier dans l'admin que la restriction par marché est bien exposée en plan **Basic** (rien ne l'interdit dans la doc, mais une absence de mention n'est pas une confirmation).
14. Relecture des 3 e-mails et de l'encart dans les 5 langues.

### Phase 3 — douane (parallèle, ne bloque pas le bon mais bloque le CA)

15. Codes SH + pays d'origine sur les produits, poids vérifiés.
16. Décision DDP (§6 point 3). Si DDP Canada : déposer le **BSF900** dans le portail CARM avant de basculer, sinon les envois sont retenus à la frontière.
17. Reformuler le délai US/CA : « 5 à 8 jours ouvrables » n'a plus de base raisonnable avec entrée douanière obligatoire — c'est une infraction en soi à la FTC Mail Order Rule (16 CFR 435.2), indépendamment de l'arrivée effective du colis. Passer à « 8 à 15 jours ouvrables, dédouanement inclus ».

---

## 6. CE QUI RESTE À TRANCHER

**1. Le pourcentage hors zone euro : 12 % (ma reco) ou 15 % ?**
12 % rend exactement la même valeur qu'aujourd'hui en France une fois l'uplift de 26,6 % pris en compte. 15 % coûte 27 % de marge en plus sur la zone la plus chère à servir, pour un gain de conversion non démontré. **Reco : 12 %, avec seuil annoncé 125 $.** Si l'objectif est d'amorcer le marché coûte que coûte, 15 % se défend — mais alors comme une décision d'acquisition assumée, pas comme un alignement.

**2. Ouvre-t-on aussi l'Angleterre et la Suisse, ou seulement USA + Canada ?**
Le verrou EUR n'exclut pas deux marchés, il en exclut **quatre** : la boutique a 8 marchés actifs et 5 devises (EUR, GBP, CHF, USD, CAD). Le chantier technique est identique — une branche de plus dans le routage, un `context.markets` de plus. **Reco : ouvrir les quatre d'un coup**, à 15 % pour UK/CH (pas d'uplift chez eux). Ne pas le faire, c'est repayer le même chantier dans trois mois. Note : le Royaume-Uni relève du PECR/UK GDPR — opt-in préalable, comme la France ; rien de neuf à construire.

**3. Douane : DDP au checkout tout de suite, ou mention explicite d'abord ?**
Le calcul des droits et taxes à l'import au checkout est disponible **sur tous les forfaits depuis le 05/02/2025**, à 0,85 % de la commande (Shopify Payments). C'est la seule réponse propre à l'art. 224 c) québécois et au *drip pricing* fédéral canadien. Mais il exige codes SH, pays d'origine, transporteur DDP, et — côté Canada — le dossier CARM/BSF900. **Reco en deux temps : (a) immédiatement, mention en évidence sur la fiche produit et au panier — « Prix hors droits de douane et frais de dédouanement, à régler au transporteur à la livraison » — gratuit et déployable ce soir ; (b) DDP dès que les codes SH et le BSF900 sont prêts.** Rester en (a) durablement reste attaquable au Québec ; y rester par ignorance serait pire.

---

**Note annexe, hors périmètre mais de la même famille** : `snippets/promo-popup.liquid` ligne 25 documente déjà un écart connu — le droit allemand attend un double opt-in et l'encart est en opt-in simple, en production. Le réglage Shopify « confirmation d'inscription » le résoudrait, mais il vaudrait alors pour **toutes** les langues, y compris celles où le marchand a refusé le double opt-in. À arbitrer séparément.

**Fichiers concernés** : `C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\snippets\promo-popup.liquid` (lignes 58-61, 87, 276) · `C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\locales\fr.default.json` (bloc `sections.promo_popup`, lignes 638-677) + les 4 autres locales · `C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\sections\main-product.liquid:626`.