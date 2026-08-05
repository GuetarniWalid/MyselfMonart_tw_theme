# Textes des 3 e-mails — bon de 15 €

**Date : 2026-08-05.** Rédigés dans la voix de la marque, conditions légales incluses.

> ⚠️ **Adaptation faite après l'arbitrage back-end.** Ces textes avaient été écrits pour la voie Shopify,
> où le code ne pouvait pas figurer dans l'e-mail. Ce n'est plus le cas : le back-end émet un **code
> nominatif** par inscrit et l'insère directement. Les variables `{{ code }}` et `{{ date_fin }}` sont
> donc bien disponibles, et le code doit être **affiché en clair**, en gros, sélectionnable.

> ⚠️ Toute affirmation matière, délai, garantie ou note d'avis est à **confirmer avant envoi**
> (voir §7 de `BRIEF-DESIGN-EMAILS-BON15.md`). Aucune mention « Made in France ».

---

## E1 — immédiat · « Voici votre bon »

**Objets proposés :**

1. Votre bon de 15 € est prêt
2. Votre bon de 15 €, dès 80 € d'achat
3. 15 € offerts sur votre œuvre

**Préheader :** Code {{ code_promo }} — dès 80 € d'achat, jusqu'au {{ date_echeance }}.

**Appel à l'action :** Appliquer ma remise → https://www.myselfmonart.com/discount/{{ code_promo }}?redirect={{ url_produit_consulte }} (bouton unique, pleine largeur mobile, min 52 px de haut ; secours texte sous le bouton : « saisissez le code {{ code_promo }} à l'étape du panier »)

### Corps

════════════════════════════════════════════
E-MAIL 1 — « Votre bon de 15 € »
Déclencheur : immédiat, dès la création du client avec le tag promo-popup
et emailMarketingConsent = SUBSCRIBED.
════════════════════════════════════════════

────────────────────────────────
SECTION 0 · EN-TÊTE
────────────────────────────────
[Mise en page] Logo MyselfMonArt seul, centré, hauteur 32-40 px, sur le fond crème
de la marque. Pas de menu de navigation : un seul écran, une seule décision.
Texte alternatif du logo : « MyselfMonArt ».


────────────────────────────────
SECTION 1 · LE BON (au-dessus de la ligne de flottaison — obligatoire)
────────────────────────────────

Voici votre bon de 15 €

Merci. Il est à vous, et il est déjà prêt à l'emploi.

Votre code

{{ code_promo }}

15 € de remise dès 80 € d'achat.
Valable jusqu'au {{ date_echeance }} à 23 h 59.

[Mise en page] Le code en TEXTE VIVANT, jamais en image : cadre à bordure tiretée
(reprise exacte de l'encart du site), police d'affichage, ~28 px, lettres espacées,
sélectionnable d'un appui long. Le titre, le montant, le seuil et la date doivent
tenir dans le premier écran d'un iPhone, bouton compris.


────────────────────────────────
SECTION 2 · L'ACTION (bouton unique)
────────────────────────────────

[ Appliquer ma remise ]

Le code s'applique tout seul. Vous n'avez rien à recopier.

[Mise en page] Un seul bouton dans tout l'e-mail. Pleine largeur sur mobile,
hauteur minimum 52 px, fond sombre de la marque, texte crème, coins arrondis.
Lien : https://www.myselfmonart.com/discount/{{ code_promo }}?redirect={{ url_produit_consulte }}
Sous le bouton, en tout petit, un secours texte pour les clients qui n'affichent pas
les boutons stylés : « Si le bouton ne fonctionne pas, saisissez le code
{{ code_promo }} à l'étape du panier. »


────────────────────────────────
SECTION 3 · LA MARQUE (deux phrases, pas trois)
────────────────────────────────

Un mur nu, c'est une pièce qui attend.
Prenez le temps de choisir : celle qui vous arrête est presque toujours la bonne.

[Mise en page] Texte seul, centré, respiration généreuse au-dessus et en dessous.
Si une image est ajoutée ici, elle est décorative et l'e-mail doit rester
parfaitement lisible sans elle.


────────────────────────────────
SECTION 4 · LES CONDITIONS (obligation légale — jamais derrière un lien)
────────────────────────────────

Les conditions, en clair

• Dès 80 € d'achat, hors frais de livraison
• Une seule fois par client
• Non cumulable avec la promotion en cours
• Valable jusqu'au {{ date_echeance }} à 23 h 59

[Mise en page] Quatre puces d'une ligne, corps 14-15 px, contraste réel (pas de gris
clair sur crème). C'est le seul bloc de l'e-mail qui ne peut pas être raccourci.


────────────────────────────────
SECTION 5 · LEVER L'OBJECTION DE NON-CUMUL
────────────────────────────────

Et la promotion en cours ?

Une remise automatique de −10 % tourne en ce moment sur la boutique. Les deux ne se
cumulent pas. Jusqu'à 150 € de panier, votre bon de 15 € est la plus avantageuse des
deux : c'est celle que nous vous conseillons. Au-delà, le −10 % reprend la main —
et c'est normal.

[Mise en page] Bloc discret, fond légèrement teinté, corps 14 px. Ce n'est pas une
promesse commerciale, c'est un conseil : ton posé, aucune urgence ajoutée.


────────────────────────────────
SECTION 6 · LA PORTE OUVERTE
────────────────────────────────

Une question sur un format, un cadre, une pièce en particulier ?
Écrivez-nous à team@myselfmonart.com.

Hayate
Fondateur de MyselfMonArt

[Mise en page] Signature en texte, sans photo ni fioriture. L'adresse e-mail est un
lien mailto:.


────────────────────────────────
SECTION 7 · PIED DE PAGE (mentions obligatoires)
────────────────────────────────

Vous recevez cet e-mail parce que vous avez demandé ce bon sur www.myselfmonart.com
et coché la case d'accord marketing.

Ne plus recevoir nos e-mails : {{ lien_desinscription }}
Politique de confidentialité : https://www.myselfmonart.com/policies/privacy-policy

MyselfMonArt — SAS KINDOPIA
SIREN 915 182 737 — RCS [A CONFIRMER : ville du greffe d'immatriculation,
a priori Paris — à relever sur l'extrait Kbis]
60 Rue François 1er, 75008 Paris, France
team@myselfmonart.com

[Mise en page] Corps 12 px, contraste suffisant pour rester lisible en mode sombre.
Le lien de désabonnement doit être un vrai lien cliquable, pas une consigne du type
« répondez STOP ».


════════════════════════════════════════════
VARIABLES À BRANCHER
════════════════════════════════════════════
{{ code_promo }}            shop.metafields.promo.code           ex. MERCI-SZGJJ
{{ date_echeance }}         shop.metafields.promo.ends_at, rendu en français
                            (« 12 août 2026 ») — ⛔ ne jamais laisser le filtre date
                            de Shopify produire « August », le piège est déjà
                            documenté dans le thème
{{ url_produit_consulte }}  [A CONFIRMER : cette URL est-elle transmise au moment de
                            l'envoi ? L'encart la connaît (data-product-url) mais la
                            fiche client ne la porte pas. Si elle n'est pas
                            disponible, replier sur
                            https://www.myselfmonart.com/collections/all — jamais sur
                            une page vide]
{{ lien_desinscription }}   lien de désabonnement natif de l'outil d'envoi

⛔ Pas de {{ prénom }} : l'encart ne collecte QUE l'adresse e-mail (confirmé par
   snippets/promo-popup.liquid et par le bloc A de la politique de confidentialité).
   Aucun champ de personnalisation n'existe. N'écrivez pas « Bonjour {{ prénom }} »
   avec un repli « Bonjour », ça se voit.


════════════════════════════════════════════
VERSION TEXTE BRUT (à fournir avec le HTML)
════════════════════════════════════════════
Voici votre bon de 15 €

Merci. Il est à vous, et il est déjà prêt à l'emploi.

Votre code : {{ code_promo }}
15 € de remise dès 80 € d'achat.
Valable jusqu'au {{ date_echeance }} à 23 h 59.

Appliquer ma remise :
https://www.myselfmonart.com/discount/{{ code_promo }}?redirect={{ url_produit_consulte }}

Un mur nu, c'est une pièce qui attend. Prenez le temps de choisir : celle qui vous
arrête est presque toujours la bonne.

Les conditions, en clair :
- Dès 80 € d'achat, hors frais de livraison
- Une seule fois par client
- Non cumulable avec la promotion en cours
- Valable jusqu'au {{ date_echeance }} à 23 h 59

Une remise automatique de −10 % tourne en ce moment. Les deux ne se cumulent pas.
Jusqu'à 150 € de panier, votre bon de 15 € est la plus avantageuse des deux.

Une question ? team@myselfmonart.com
Hayate, fondateur de MyselfMonArt

Vous recevez cet e-mail parce que vous avez demandé ce bon sur www.myselfmonart.com
et coché la case d'accord marketing.
Ne plus recevoir nos e-mails : {{ lien_desinscription }}
MyselfMonArt — SAS KINDOPIA, SIREN 915 182 737, RCS [A CONFIRMER],
60 Rue François 1er, 75008 Paris, France.


════════════════════════════════════════════
CONSIGNES TECHNIQUES POUR LE DESIGNER
════════════════════════════════════════════
1. Une seule colonne, largeur maximale 600 px. 70,8 % du trafic de la boutique est
   mobile : on dessine pour le pouce.
2. Aucun e-mail tout-image. Le code, le montant, le seuil et la date sont du texte.
   Les images sont bloquées par défaut chez une partie des destinataires.
3. Tester en clair ET en sombre sur Apple Mail et Gmail : ces deux clients pèsent
   environ 89 % des ouvertures. Ne pas se fier à une seule capture.
4. Polices système ou fallback robuste. Pas de police web exotique.
5. Un seul bouton. Les autres liens sont du texte discret.
6. ⛔ Pas de pixel de suivi d'ouverture à finalité marketing tant que l'encart ne
   recueille pas un second consentement distinct (recommandation CNIL du
   12 mars 2026). On pilote au clic et à l'utilisation du code.
7. Pas de compte à rebours animé, pas de majuscules criardes, pas d'émoji dans
   l'objet ni dans le préheader.

### Pourquoi ces choix

POSITIONNEMENT DE CET E-MAIL. Ce n'est pas une livraison, c'est un rappel. Le visiteur a déjà vu son code à l'écran, a pu le copier et disposait d'un lien qui pré-applique la remise : la population la plus chaude a déjà converti sur site. J'ai donc écrit « Il est à vous, et il est déjà prêt à l'emploi » plutôt qu'un « voici votre cadeau » qui sonnerait faux pour quelqu'un qui a le code sous les yeux depuis dix minutes. Corollaire : ne pas attendre les 2,11 % de conversion du benchmark Omnisend sur cet envoi — le vrai KPI est le CA incrémental sur les non-convertisseurs.

OBJETS. Les trois font 26, 35 et 29 caractères : la fourchette 25-35 est celle qui maximise la conversion (Attentive, 91+ milliards d'objets). Aucun émoji — les objets sans émoji surperforment systématiquement dans cette même source. Le montant est en euros, pas en pourcentage, également documenté par Attentive. L'objet n° 2 (« Votre bon de 15 €, dès 80 € d'achat ») est le plus solide juridiquement : l'article L.122-8 du code de la consommation impose que l'offre promotionnelle soit identifiable « de manière claire et non équivoque dès sa réception », donc dans l'objet, pas seulement dans le corps. Il satisfait aussi l'exigence de l'article L.34-5 CPCE interdisant un objet sans rapport avec la prestation proposée. Aucune personnalisation par le prénom : l'encart ne collecte que l'adresse e-mail (vérifié dans snippets/promo-popup.liquid, un seul champ contact[email], et confirmé par le bloc A de la politique de confidentialité). La donnée Attentive dit que la personnalisation paie sur les e-mails déclenchés — mais on ne peut pas personnaliser ce qu'on n'a pas, et un « Bonjour » de repli se repère à l'œil nu.

PRÉHEADER. Il porte le code et les deux conditions cardinales (seuil, échéance) au lieu de répéter l'objet. C'est encore L.122-8 : l'offre et ses limites doivent être perceptibles avant même l'ouverture.

MISE EN PAGE. Le code, le montant, le seuil et la date sont en texte vivant et jamais en image. Apple pèse 64,66 % des ouvertures et Gmail 24,11 % (Litmus, mai 2026) ; les images sont bloquées par défaut chez une partie des clients et le mode sombre altère le rendu de façon incohérente. Une seule colonne, 600 px, premier écran mobile occupé par titre + code + date + bouton : la boutique fait 70,8 % de son trafic sur mobile — c'est cette donnée-là qui justifie le mobile-first, pas les fourchettes « 55-60 % d'ouvertures mobiles » qui ne sont plus rattachables à une mesure fraîche.

UN SEUL BOUTON. Pour une raison d'ergonomie tactile — une cible, une décision par écran — et non au nom du « +1 617 % de conversion » de WordStream 2014, chiffre sans échantillon ni protocole qui circule en versions contradictoires. Je l'ai écarté volontairement.

LE CODE UNIQUE EST UN ATOUT RARE. Sur 65 055 newsletters de marques Shopify, seules 4,2 % portent un code unique, et ce sont celles qui obtiennent le meilleur taux de clic et le meilleur panier (Seguno, mai 2024 - mai 2025). L'architecture cron + métachamps de boutique déjà en place met MyselfMonArt dans ce quartile sans effort récurrent — cohérent avec l'exigence « je règle une fois et je n'y touche plus ».

ÉCHÉANCE EN DATE, PAS EN COMPTE À REBOURS. Seguno confirme le bénéfice de l'urgence mais ne le chiffre pas ; les chiffres spectaculaires qui circulent sur les comptes à rebours sont des cas clients sans protocole. Une date en clair est robuste dans tous les clients de messagerie, et elle est déjà disponible côté serveur (shop.metafields.promo.ends_at). J'ai repris le libellé exact du site — « Valable jusqu'au {{ date }} à 23 h 59 » — pour que l'écran et la boîte mail racontent la même chose. Alerte technique reportée dans le livrable : le filtre date de Shopify rend les mois en anglais tant qu'aucun date_formats n'existe, piège déjà rencontré et documenté dans le thème.

CONDITIONS DANS LE CORPS. Les quatre conditions substantielles figurent en clair, pas derrière un lien vers les CGV : l'article L.122-9 exige qu'elles soient « clairement précisées et aisément accessibles », et une omission substantielle relève de la pratique commerciale trompeuse par omission. J'ai repris mot pour mot les libellés de locales/fr.default.json (« Dès 80 € d'achat, hors frais de livraison », « Une seule fois par client », « Non cumulable avec la promotion en cours ») : continuité écran → e-mail, et zéro risque de divergence juridique entre deux formulations.

LE VERDICT DES 150 € EST DIT, PAS SOUS-ENTENDU. 15 € = 10 % × 150 € : le point d'équivalence est exact. Sur un panier moyen d'environ 100 €, le bon rapporte 15 € contre 10 € pour la promotion automatique. Formuler ce verdict lève l'objection de non-cumulabilité au lieu de la subir et évite que le client la découvre seul dans le tiroir panier. C'est un raisonnement arithmétique, pas une donnée mesurée — je le signale.

PIED DE PAGE. L'article R.123-237 du code de commerce s'applique aux documents publicitaires et à toute correspondance : SIREN, mention « RCS » suivie de la ville du greffe, et lieu du siège social. J'ai pris l'identité déjà arrêtée en interne (SAS KINDOPIA, SIREN 915 182 737, 60 Rue François 1er, 75008 Paris) et laissé la ville du greffe en [A CONFIRMER] plutôt que de la déduire du siège. Lien de désabonnement cliquable dans l'e-mail lui-même : exigé par l'article L.34-5 CPCE (coordonnées valables pour faire cesser les envois), par l'article 21.2 LSSI en Espagne, et l'ACM néerlandaise juge insuffisant de ne le mentionner que dans les CGV. Rappel de l'origine du consentement, qui sert autant au destinataire qu'à la preuve exigée par l'article 7.1 du RGPD.

PAS DE PIXEL DE SUIVI. Depuis le 14 avril 2026, les pixels d'e-mail relèvent de l'article 82 de la loi Informatique et Libertés et exigent un consentement DISTINCT de celui donné pour recevoir l'e-mail (délibération CNIL n° 2026-042 du 12 mars 2026). L'encart n'en recueille qu'un seul. Consigne posée : pas de suivi d'ouverture à finalité marketing, pilotage au clic et au taux d'utilisation du code — qui est de toute façon la seule métrique fiable depuis Apple Mail Privacy Protection.

CE QUE J'AI VOLONTAIREMENT LAISSÉ DEHORS.
— La preuve sociale Trustpilot : elle appartient à l'e-mail 2. Deux raisons. D'abord, l'étude Spiegel/Northwestern mesure une page produit, pas un e-mail — le « +270 % » ne se transpose pas. Ensuite, il y a un conflit de source à trancher avant tout affichage : le brief et la mémoire projet disent 4,2/5 sur 81 avis, growth/BUSINESS.md dit 4,5/5 sur 81 avis. [A CONFIRMER : la note réelle] — on n'affiche rien tant que ce n'est pas arbitré.
— Tout délai de livraison, toute garantie, toute mention de livraison offerte : rien de tout cela n'est établi de façon non ambiguë (la condition « hors frais de livraison » et la décision interne « livraison offerte » se contredisent en l'état). Je n'ai donc rien inventé et j'ai conservé le libellé légal tel qu'il est déjà en production.
— La règle « 50-125 mots » : elle vient d'une étude Boomerang sur des e-mails de prospection B2B mesurant le taux de réponse. Sans rapport. La vraie contrainte que j'ai appliquée est structurelle : code, montant, seuil et date au-dessus de la ligne de flottaison mobile.
— La date de fin du −10 % (30/08/2026) : je l'ai omise du corps pour ne pas empiler deux échéances dans le même e-mail. À rajouter si le marchand la juge nécessaire.

DEUX RÉSERVES À REMONTER AVANT L'ENVOI.
1. Délivrabilité. Sans ESP, la séquence partira sur un domaine dont l'historique d'envoi marketing est neuf. Un e-mail non délivré convertit à 0 % : SPF, DKIM et DMARC conditionnent tous les chiffres ci-dessus. C'est un préalable, pas une optimisation.
2. Le seuil de 80 € est inférieur au panier moyen (~100 €). Le bon ne fera donc pas levier sur le panier — il sera consommé sur des commandes qui auraient eu lieu de toute façon. C'est un arbitrage assumable (friction nulle, conversion maximale) mais il doit être conscient. Une variante à 10 € dès 80 € préserverait plus de marge pour un effet probablement voisin sur la valeur vie client — piste de test, sur source directionnelle seulement.

---

## E2 — J+3 · la relance par le désir

**Objets proposés :**

1. Ce que ça change, sur un mur
2. Votre bon de 15 € vous attend
3. Toile ou affiche, la même œuvre

**Préheader :** Toile ou affiche, 15 € offerts dès 80 € — jusqu'au {{ date_fin }}.

**Appel à l'action :** Bouton unique, répété à l'identique en haut et en bas : « Revoir l'œuvre » (variante sans œuvre consultée : « Choisir mon œuvre »). Destination : https://www.myselfmonart.com/discount/{{ code }}?redirect={{ url_oeuvre }} — le lien pré-applique la remise, exactement comme le bouton « Appliquer ma remise » de l'encart. Aucun autre lien d'action dans l'e-mail ; l'image de l'œuvre pointe vers la même URL.

### Corps

E-MAIL 2 — RELANCE MI-PARCOURS (J+2 / J+3 après l'inscription, envoyé uniquement à qui n'a pas commandé)
Français. Une seule colonne, texte vivant (jamais d'image pour le code, le montant, le seuil ou la date). Un seul bouton.

────────────────────────────────
BLOC 1 — ACCROCHE (doit tenir dans le premier écran mobile)
────────────────────────────────

Titre (H1) :
Il y a un mur, chez vous, qui attend.

Texte (2 lignes max) :
Vous avez regardé cette œuvre il y a quelques jours. Elle n'a pas bougé.
Votre bon de 15 € non plus : il court jusqu'au {{ date_fin }}.

[Visuel : l'œuvre consultée, en grand, cliquable vers la même destination que le bouton. Alt = titre de l'œuvre.]

[Bouton — le seul de l'e-mail]
Revoir l'œuvre

— Variante si l'œuvre consultée n'est pas disponible à l'envoi (cas Shopify Email) —
Titre : Il y a un mur, chez vous, qui attend.
Texte : Vous êtes passé nous voir il y a quelques jours. Votre bon de 15 € est toujours actif, jusqu'au {{ date_fin }}.
[Visuel : trois œuvres, une seule rangée, la même destination pour les trois.]
Bouton : Choisir mon œuvre

────────────────────────────────
BLOC 2 — CE QUE ÇA CHANGE
────────────────────────────────

Titre :
Une œuvre ne décore pas un mur. Elle donne le ton à la pièce.

Texte :
Au-dessus du canapé, elle rassemble. Dans une entrée, elle accueille. Dans une chambre, elle apaise.
C'est la première chose qu'on voit en entrant, et la dernière dont on se lasse.

────────────────────────────────
BLOC 3 — DEUX FAÇONS DE L'ACCROCHER
────────────────────────────────

Titre :
La même image, deux matières.

Sur toile.
Toile polyester 285 g/m² tendue sur châssis en bois, 3 cm de profondeur. Encres haute pigmentation, couleurs garanties 75 ans sans altération. Elle arrive montée : vous déballez, vous accrochez.

En affiche.
Tirage photo haute définition sur vrai papier photo, imprimé bord à bord, sans bordure. Léger, à encadrer soi-même ou à composer en mur-galerie. Du 30 × 40 au 90 × 120 cm.

Conçue en France, fabriquée à la demande en Europe.

────────────────────────────────
BLOC 4 — RIEN À RISQUER
────────────────────────────────

14 jours pour changer d'avis, même après réception.
Chaque œuvre part protégée : coins renforcés, carton renforcé, calage anti-choc. Si elle arrive abîmée, une photo suffit — nous vous en renvoyons une, sans frais.
Paiement en 3 fois sans frais avec Klarna dès 50 €.
[À CONFIRMER : ajouter « Livraison offerte, sans minimum » ? La fiche produit l'annonce, avec un supplément en Suisse — confirmer que c'est vrai pour tous les pays servis en euros avant de l'écrire ici.]

4,2/5 sur 81 avis Trustpilot.

────────────────────────────────
BLOC 5 — VOTRE BON, EN RAPPEL
────────────────────────────────

Titre :
Votre bon est toujours là.

Code : {{ code }}
15 € offerts dès 80 € d'achat, hors frais de livraison.
Valable jusqu'au {{ date_fin }} à 23 h 59.
Une seule fois par client. Non cumulable avec la promotion en cours.

Texte :
Au-delà de 150 € de panier, la promotion en cours devient plus avantageuse que ce bon : c'est elle qui s'appliquera, et c'est très bien ainsi. En dessous, c'est votre bon qui gagne.

────────────────────────────────
BLOC 6 — RAPPEL DU BOUTON
────────────────────────────────

[Même bouton, même destination qu'en haut. Aucun autre lien d'action dans l'e-mail.]
Revoir l'œuvre

P.S. Chaque œuvre existe en toile et en affiche. Même image, deux budgets — à vous de voir ce que ce mur mérite.

────────────────────────────────
PIED DE PAGE (obligatoire, ne pas alléger)
────────────────────────────────

MyselfMonArt — SAS KINDOPIA, SIREN [À CONFIRMER : numéro SIREN], RCS [À CONFIRMER : ville du greffe], siège social : [À CONFIRMER : adresse complète du siège].

Vous recevez cet e-mail parce que vous avez demandé votre bon de 15 € sur myselfmonart.com et coché la case de consentement le {{ date_inscription }}.

Se désinscrire en un clic : {{ lien_desinscription }}
Une question ? Répondez à cet e-mail ou écrivez-nous à team@myselfmonart.com.

────────────────────────────────
VARIABLES À BRANCHER
────────────────────────────────
{{ code }} = shop.metafields.promo.code
{{ date_fin }} = shop.metafields.promo.ends_at, formaté en français (jour, mois en toutes lettres, année) — même règle que l'encart : ne jamais utiliser %B, le mois sortirait en anglais.
{{ url_oeuvre }} = URL de la fiche consultée ; à défaut, page d'accueil.
{{ date_inscription }} = horodatage du consentement (preuve art. 7.1 RGPD).
{{ lien_desinscription }} = lien de désinscription en un clic, obligatoire dans chaque envoi.

### Pourquoi ces choix

RECOMMANDATION D'OBJET. Je recommande l'objet 1 (« Ce que ça change, sur un mur », 28 caractères) parce que E2 est l'e-mail du désir et que le préheader porte déjà l'offre. Les trois options tiennent dans la fenêtre 25-35 caractères qui maximise la conversion (Attentive, 91 Md d'objets), aucune ne contient d'émoji (les objets sans émoji surperforment, même source), et l'option 2 place le montant en euros, format qui bat le pourcentage. Aucun objet ne promet autre chose que ce que contient l'e-mail : l'art. L.34-5 CPCE interdit un objet sans rapport avec la prestation.

PAS DE PERSONNALISATION PAR LE PRÉNOM. L'encart ne collecte que l'e-mail (`contact[email]` + case de consentement dans snippets/promo-popup.liquid) : il n'y a pas de prénom en base. La recherche recommande de personnaliser les e-mails déclenchés, mais un « Bonjour {{ prénom }} » vide ou faux coûterait plus qu'il ne rapporte. Si vous voulez ce levier, il faut ajouter un champ prénom à l'encart — décision à prendre à part.

TIMING J+2 / J+3. La distribution des délais d'achat (BS&Co, 159 229 abonnés) montre que, hors achat immédiat, la fenêtre utile se joue en heures et en jours. E2 arrive donc pendant que le souvenir de la visite tient encore, pas une semaine plus tard. Réserve honnête : cet échantillon est dominé par des inscriptions au checkout, la direction (comprimer) tient, pas les pourcentages.

ANGLE DÉSIR, PAS REMISE — ET POURQUOI CE N'EST PAS UN CAPRICE DE TON. L'encart a déjà donné le code à l'écran, avec bouton copier et lien qui pré-applique la remise : les visiteurs les plus chauds ont déjà converti sur le site. E2 ne s'adresse qu'aux autres, pour qui la remise n'a pas suffi — donc répéter la remise ne servirait à rien. D'où l'ordre des blocs : l'œuvre, l'usage, la matière, la tranquillité, et le bon seulement en bloc 5.

CE QUI EST DIT DANS LE BLOC MATIÈRE EST VÉRIFIÉ, PAS INVENTÉ. Toile polyester 285 g/m², encres haute pigmentation, couleurs garanties 75 ans, châssis bois 3 cm, livrée montée, emballage renforcé et réexpédition sans frais, 14 jours pour changer d'avis, Klarna 3 fois sans frais dès 50 €, conçue en France / fabriquée à la demande en Europe : tout cela est repris mot pour mot du contenu déjà publié sur les fiches (C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\templates\product.painting.json). Les faits affiche (vrai papier photo, tirage HD, impression bord à bord sans bordure, du 30 × 40 au 90 × 120) viennent de C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\templates\product.poster.json.

CE QUE JE N'AI PAS ÉCRIT, EXPRÈS. Aucun délai de livraison : les fiches en annoncent deux versions contradictoires (« 3 à 4 jours de fabrication puis 3 à 5 jours ouvrés » d'un côté, « 5 à 8 jours ouvrés + 2 à 4 jours » de l'autre). Tant que ce n'est pas tranché, un délai dans un e-mail promotionnel est une promesse opposable. Même prudence pour « livraison offerte », laissé en crochets. Les mentions SIREN / RCS / siège sont en crochets : elles sont obligatoires (art. R.123-237 code de commerce, applicable aux documents publicitaires et à toute correspondance) et je ne les invente pas.

TRUSTPILOT AFFICHÉ TEL QUEL. « 4,2/5 sur 81 avis », sans arrondi ni embellissement : la probabilité d'achat culmine entre 4,0 et 4,7 étoiles puis décroît en approchant de 5,0 (Spiegel / Northwestern). Le 4,2 est un atout. En revanche je n'ai pas construit de bloc avis démesuré : le fameux « +270 % » de cette étude mesure une page produit, pas un e-mail, et ne se transpose pas.

LE BON EN RAPPEL, ET LE VERDICT DONNÉ AU CLIENT. Le bloc 5 énonce les quatre conditions (seuil 80 € hors livraison, une seule fois par client, non cumulable, date d'échéance) dans l'e-mail lui-même : l'art. L.122-8 du code de la consommation impose que l'offre soit identifiable dès la réception — d'où le préheader — et l'art. L.122-9 que ses conditions soient clairement précisées et aisément accessibles. Un lien vers des CGV ne suffirait pas. Et au lieu de laisser le client se débrouiller avec la non-cumulabilité, on lui donne le verdict : le point d'équivalence est mathématiquement exact (15 € = 10 % de 150 €), donc sous 150 € de panier — c'est-à-dire la très grande majorité des paniers, l'AOV étant à ~100 € — le bon gagne. On lève l'objection au lieu de la subir.

ÉCHÉANCE : UNE DATE, PAS UN COMPTE À REBOURS. Le rendu dynamique est fragile en e-mail, et la date est déjà disponible côté serveur via shop.metafields.promo.ends_at. La formulation « il court jusqu'au {{ date_fin }} » installe l'urgence sans crier, ce qui est la seule forme d'urgence compatible avec un positionnement art mural premium.

TEXTE VIVANT, JAMAIS D'IMAGE POUR L'INFORMATION. Le code, le montant, le seuil et la date sont en HTML texte. Les images sont bloquées par défaut chez une partie des clients de messagerie et le mode sombre altère le rendu de façon incohérente (Litmus). Avec Apple à 64,66 % et Gmail à 24,11 % des ouvertures, on conçoit pour ces deux-là : une colonne, contraste testé en clair et en sombre, aucun e-mail tout-image.

UN SEUL BOUTON. Une cible tactile, une décision par écran — argument d'ergonomie mobile (70,8 % du trafic boutique est mobile), pas la statistique « +1 617 % » qui circule et qui remonte à un billet de blog de 2014 sans protocole. Le bouton est répété en bas pour ceux qui font défiler, mais c'est la même action et la même URL.

MESURE. Ne pilotez pas cet e-mail au taux d'ouverture : Apple Mail Privacy Protection pré-charge le pixel à la livraison, l'inflation constatée va de 15 à 35 points. Et depuis la recommandation CNIL du 12 mars 2026, un pixel de suivi à des fins d'analytique marketing exige un consentement distinct de celui de l'inscription — celui de l'encart ne le couvre pas. Les seuls KPI à retenir ici : clic, taux d'utilisation du code {{ code }} attribué à la source e-mail, et chiffre d'affaires par destinataire. Le vrai résultat de E2 se lit en CA incrémental sur des gens qui n'avaient pas acheté, pas en taux de conversion brut.

DÉSINSCRIPTION ET PREUVE. Le lien de désinscription figure dans l'e-mail lui-même, pas dans les CGV (exigence explicite du régulateur néerlandais, et bonne pratique partout) ; la ligne « vous recevez cet e-mail parce que… le {{ date_inscription }} » sert la charge de la preuve du consentement (art. 7.1 RGPD), qui pèse entièrement sur vous.

POINT BLOQUANT HORS COPY. Sans ESP, cette séquence partira sur un domaine à l'historique d'envoi marketing neuf. Un e-mail non délivré convertit à 0 % : faites valider SPF / DKIM / DMARC sur le domaine d'envoi avant de juger quoi que ce soit sur ce texte.

---

## E3 — J+7 · la dernière chance

**Objets proposés :**

1. Votre bon de 15 € expire jeudi
2. Dernier rappel : votre bon de 15 €
3. Il reste 2 jours pour vos 15 €

**Préheader :** Bon de 15 € dès 80 € d'achat. Après le {{ promo.date_fin }}, le code ne fonctionne plus.

**Appel à l'action :** Utiliser mon bon → https://www.myselfmonart.com/discount/{{ promo.code }} (bouton unique, pleine largeur, hauteur minimale 52 px ; le code est aussi donné en texte juste dessous en cas d'échec du lien)

### Corps

VARIABLES À BRANCHER (toutes déjà disponibles côté back-end)
{{ promo.code }}      = shop.metafields.promo.code (ex. MERCI-SZGJJ)
{{ promo.date_fin }}  = shop.metafields.promo.ends_at, formaté « 12 août » (mois en toutes lettres, en français — ne pas utiliser le filtre date de Shopify, il rend les mois en anglais)
{{ lien_bon }}        = https://www.myselfmonart.com/discount/{{ promo.code }}
⚠️ AUCUNE variable de prénom n'est disponible : l'encart ne collecte que contact[email] (snippets/promo-popup.liquid). L'e-mail est donc écrit sans nom, volontairement. Si un jour un champ prénom est ajouté au formulaire, la personnalisation devient possible.

────────────────────────────────────────
[EN-TÊTE]

MyselfMonArt
(logo en image, texte alternatif « MyselfMonArt ». L'e-mail doit rester complet et compréhensible si les images sont bloquées.)

────────────────────────────────────────
[PRÉHEADER — texte masqué en haut du HTML]

Bon de 15 € dès 80 € d'achat. Après le {{ promo.date_fin }}, le code ne fonctionne plus.

────────────────────────────────────────
[TITRE]

Votre bon de 15 € expire le {{ promo.date_fin }} à 23 h 59.

────────────────────────────────────────
[UNE SEULE PHRASE, SOUS LE TITRE]

C'est le dernier e-mail que nous vous envoyons à son sujet.

────────────────────────────────────────
[BLOC CODE — en texte vivant, jamais dans une image]

Votre code : {{ promo.code }}
15 € offerts dès 80 € d'achat.

────────────────────────────────────────
[BOUTON — appel à l'action unique]

Utiliser mon bon
→ {{ lien_bon }}

────────────────────────────────────────
[LIGNE DISCRÈTE SOUS LE BOUTON]

Si le bouton ne s'ouvre pas, entrez le code {{ promo.code }} au moment du paiement.

────────────────────────────────────────
[CORPS — deux phrases, pas une de plus]

Après cette date, le code cesse simplement de fonctionner. Nous ne le prolongeons pas.

Si une œuvre vous est restée en tête, c'est le moment de lui donner un mur.

────────────────────────────────────────
[CONDITIONS DU BON — obligatoires dans l'e-mail, jamais renvoyées à un lien]

· Dès 80 € d'achat, hors frais de livraison
· Une seule fois par client
· Non cumulable avec la promotion en cours
· Valable jusqu'au {{ promo.date_fin }} à 23 h 59

En dessous de 150 € de panier, ce bon est la meilleure offre du moment. Au-delà, c'est la promotion en cours qui s'applique d'elle-même, et elle vous fera gagner davantage.

[À CONFIRMER : la promotion automatique « Vacance d'été » court jusqu'au 30/08/2026. Si la date d'expiration du bon tombe APRÈS cette date, ce paragraphe et la puce « Non cumulable » doivent être retirés automatiquement — sinon l'e-mail parle d'une promotion qui n'existe plus.]

────────────────────────────────────────
[SIGNATURE]

À bientôt,
L'équipe MyselfMonArt

────────────────────────────────────────
[PIED DE PAGE]

Vous recevez cet e-mail parce que vous avez demandé ce bon sur myselfmonart.com et coché la case d'accord.

Se désinscrire en un clic · Politique de confidentialité

Une question ? Écrivez-nous : team@myselfmonart.com

MyselfMonArt — [À CONFIRMER : raison sociale exacte (SAS KINDOPIA ?), numéro SIREN, mention « RCS » + ville du greffe, adresse du siège social. Ces trois éléments sont obligatoires dans toute correspondance publicitaire (art. R.123-237 du code de commerce) et ne figurent nulle part dans le dépôt du thème — les reprendre de la page Mentions légales.]

────────────────────────────────────────
NOTES DE MISE EN PAGE (pour le designer, pas pour le client)

1. Une seule colonne, largeur max 600 px. Titre, code, date et bouton doivent tenir dans le premier écran d'un iPhone sans défilement. Les conditions viennent juste dessous.
2. Le montant, le code, le seuil et la date sont en TEXTE, jamais dans une image : les images sont bloquées par défaut chez une partie des clients de messagerie.
3. Tester en mode clair ET en mode sombre (Apple Mail et Gmail concentrent l'essentiel des ouvertures, et Gmail inverse partiellement les couleurs en mode sombre).
4. Le code s'affiche dans un cadre en pointillés, comme dans l'encart du site : même objet, même signe visuel, on ne réinvente pas.
5. Aucun compte à rebours animé. La date en clair suffit, et elle ne se casse pas d'un client de messagerie à l'autre.
6. Un seul lien-action : le bouton. Les seuls autres liens autorisés sont ceux du pied de page (désinscription, confidentialité, contact).
7. Visuel d'œuvre : facultatif, une seule image, sous les conditions. Si le designer en met une, l'e-mail doit rester complet sans elle.

### Pourquoi ces choix

POURQUOI UNE SEULE IDÉE, ET SI COURT
L'e-mail 3 arrive après deux autres et après un encart qui a DÉJÀ affiché le code à l'écran, avec bouton copier et lien /discount pré-appliquant la remise. Toute la population « chaude » a donc eu trois occasions d'agir. Le seul argument neuf qui reste est l'échéance. Ajouter de la réassurance ou des avis ici diluerait le seul message qui n'a pas encore été dit — et cela ferait doublon avec l'e-mail 2, qui porte la preuve (4,2/5 sur 81 avis).

LES OBJETS
Les trois font 30, 34 et 30 caractères, soit la fenêtre 25-35 qui maximise la CONVERSION (Attentive, 91+ milliards d'objets analysés). Aucun émoji : les objets sans émoji surperforment systématiquement dans cette même source. Le montant est en euros et non en pourcentage, toujours d'après Attentive, et cela garde le bon visuellement distinct du « -10 % » automatique. Trois réserves à connaître avant d'arbitrer : (a) l'objet n°1 exige une variable jour de la semaine calculée depuis ends_at — si le back-end ne peut pas la fournir, prendre le n°2, qui ne contient aucune variable ; (b) l'objet n°3 n'est vrai que si l'envoi part exactement à J-2 : si le calage bouge, il ment et il faut le retirer ; (c) une variante « expire le 12 août » tient en 35 caractères en août mais déborde en septembre — d'où le choix du jour de la semaine plutôt que de la date dans l'objet.

LE PRÉHEADER
Il n'est pas décoratif, il est réglementaire. L'article L.122-8 du code de la consommation impose qu'une offre promotionnelle envoyée par voie électronique soit identifiable « de manière claire et non équivoque dès sa réception » : le montant, le seuil et l'échéance doivent donc être visibles dans l'aperçu de la boîte de réception, pas seulement dans le corps. Il est front-loadé parce que l'aperçu mobile coupe vite.

LE CADRAGE DE L'URGENCE
« Après cette date, le code cesse simplement de fonctionner. Nous ne le prolongeons pas. » — c'est factuellement vrai : l'encart du site s'auto-éteint sur promo.ends_ts et la remise Shopify expire au même instant. On n'a donc pas besoin de fabriquer de la pression, il suffit de décrire le mécanisme. Pas de compte à rebours animé : le rendu dynamique est fragile en e-mail, et Seguno confirme le bénéfice de l'urgence sans jamais en publier l'ampleur — les chiffres spectaculaires qui circulent sur les comptes à rebours sont des cas clients sans protocole. La date en clair est le choix robuste.

« C'EST LE DERNIER E-MAIL QUE NOUS VOUS ENVOYONS À SON SUJET »
Phrase vérifiable, puisque la séquence s'arrête à trois. Elle transforme la contrainte du marchand en promesse tenue, et c'est le meilleur levier connu contre le désabonnement sur un dernier rappel (le benchmark de référence situe le désabonnement d'un e-mail de bienvenue à 0,87 %, Omnisend). Elle porte aussi la voix : on informe, on ne harcèle pas.

LE VERDICT SUR LES 150 €, DONNÉ AU CLIENT
15 € = 10 % de 150 € : le point d'équivalence est arithmétiquement exact. Sur le panier réel de la boutique (médiane 126,50 €, moyenne 138-163 € selon la fenêtre), le bon gagne pour la grande majorité des commandes. Formuler le verdict au lieu de laisser le client arbitrer seul lève l'objection de non-cumulabilité au lieu de la subir, et cela reprend mot pour mot la logique déjà servie dans l'encart (clé note_150) — cohérence site/e-mail. La réserve entre crochets est indispensable : la promo automatique s'arrête le 30/08/2026, et un e-mail qui parlerait d'une promotion éteinte serait faux.

LES CONDITIONS DANS L'E-MAIL, PAS DERRIÈRE UN LIEN
L'article L.122-9 impose que les conditions de l'offre soient « clairement précisées et aisément accessibles ». Les quatre puces reprennent exactement les conditions affichées sur le site (dès 80 € hors livraison, une seule fois par client, non cumulable, échéance datée). Une omission substantielle relèverait de la pratique commerciale trompeuse par omission. Elles restent en puces d'une ligne pour ne pas casser la brièveté.

L'ABSENCE DE PRÉNOM
Vérifié dans le code : le formulaire de l'encart ne poste que contact[email], contact[accepts_marketing] et contact[tags]. Aucun prénom n'existe dans la fiche client créée. La personnalisation est pourtant le levier documenté sur les e-mails déclenchés (+13 % sur acheteurs connus, Attentive) : c'est une amélioration à considérer en amont, sur le formulaire, pas un manque à combler par un « Bonjour » générique creux. Aucun faux « Bonjour {{ prénom }} » ne doit être branché sur un champ vide.

UN SEUL APPEL À L'ACTION
Une cible tactile, une décision par écran : 70,8 % du trafic de la boutique est mobile. C'est un argument d'ergonomie, pas de statistique — les chiffres qui circulent sur le CTA unique (« +371 % », « +1 617 % ») remontent à un billet de blog de 2014 sans échantillon ni protocole et ne doivent pas servir d'argumentaire. Le rappel du code en texte sous le bouton est un filet : si le lien casse ou si le client de messagerie le mange, l'offre reste utilisable.

CE QU'IL FAUT MESURER
Ne pas piloter au taux d'ouverture : Apple représente 64,66 % des ouvertures mesurées et sa protection de la vie privée précharge le pixel à la livraison (inflation de 15 à 35 points, Litmus, mai 2026). S'ajoute une contrainte française récente : depuis le 14 avril 2026, un pixel de suivi à finalité marketing exige un consentement DISTINCT de celui donné pour recevoir l'e-mail (recommandation CNIL, délibération n° 2026-042). Les seuls KPI à retenir ici sont le clic et le taux d'utilisation effective du code — ce dernier étant de toute façon la seule métrique honnête pour ce dispositif.

TROIS POINTS DE VIGILANCE HORS COPIE
1. Mentions d'entreprise : SIREN, « RCS » + ville du greffe et siège social sont obligatoires dans toute correspondance publicitaire (art. R.123-237 du code de commerce). Ils ne figurent nulle part dans le dépôt — d'où le crochet à combler avant envoi.
2. Délivrabilité : sans ESP, l'envoi partira sur un domaine à l'historique marketing neuf. Un e-mail non délivré convertit à 0 % ; SPF, DKIM et DMARC conditionnent tous les chiffres ci-dessus.
3. Version allemande : cet e-mail est écrit pour la France. Le droit allemand attend un double opt-in comme standard de preuve (BGH, 10.02.2011, I ZR 164/09) et le risque n'y est pas l'amende mais l'Abmahnung, déclenchable par un seul e-mail non consenti. La traduction DE ne doit pas partir sans que le réglage « confirmation d'inscription » de Shopify soit activé.

---
