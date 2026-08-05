# Brief design — les 3 e-mails du bon de 15 €

**Destinataire : Claude Design.**
**Date : 2026-08-05.** Marque : MyselfMonArt — tableaux et posters de décoration murale, positionnement premium.

---

## 1. Ce qu'on dessine, et pour qui

Un visiteur laisse son e-mail dans un encart de fiche produit en échange d'un **bon de 15 € dès 80 € d'achat**. Il reçoit ensuite trois e-mails :

| | Quand | Rôle |
|---|---|---|
| **E1** | immédiat | **Tenir la promesse.** Le bon, le code, le bouton. Rien d'autre. |
| **E2** | J+3, s'il n'a pas commandé | **Le désir.** L'œuvre, la matière, l'usage. Le bon en rappel discret. |
| **E3** | J+7, s'il n'a pas commandé | **La dernière chance.** Court, franc, une seule idée. |

Ce sont des e-mails **envoyés par notre propre serveur**, pas par un éditeur Shopify. Tu n'es donc enfermé dans aucun gabarit : le HTML sera intégré tel quel.

**Chaque destinataire a un code qui lui est propre**, valable 14 jours à partir de son inscription. Le code et la date sont donc des variables, jamais du texte figé.

---

## 2. Les cinq contraintes non négociables

### 2.1 — Une seule maquette doit tenir dans 5 langues

Français, anglais, allemand, espagnol, néerlandais — **dès le lancement**. L'allemand et le néerlandais sont en moyenne **30 % plus longs** que le français.

Conséquences directes sur le dessin :

- **Aucune hauteur fixe.** Tout bloc s'étire vers le bas.
- **Boutons à largeur libre.** Un bouton calé au millimètre sur « Recevoir mon bon » cassera sur « Gutschein erhalten ».
- **Aucun texte dans une image.** Jamais. Ni le titre, ni le montant, ni le bouton.
- Le bloc de conditions légales doit pouvoir respirer sur **trois lignes au lieu de deux**.
- Prévoir qu'un titre passe de **une à deux lignes** sans que la mise en page se disloque.

### 2.2 — Mobile d'abord, vraiment

**70,8 % du trafic est mobile.** Une seule colonne, **600 px maximum**, et l'essentiel dans le premier écran d'un iPhone — titre, code, bouton compris.

Zones tactiles : **44 px minimum**. Bouton principal : **52 px de haut minimum**, pleine largeur sur mobile.

### 2.3 — L'e-mail doit rester compréhensible images bloquées

Beaucoup de messageries ne chargent pas les images par défaut. Doivent donc être en **texte HTML vivant, jamais en image** :

- le **code promo** (il sera copié à la main, il doit être sélectionnable d'un appui long) ;
- le **montant**, le **seuil de 80 €**, la **date d'expiration** ;
- les **conditions du bon** ;
- le **lien de désabonnement** et les **mentions légales**.

Toute image porte un texte alternatif utile.

### 2.4 — Clair et sombre

Le rendu doit être testé dans les deux modes sur **Apple Mail et Gmail**, qui représentent l'essentiel des ouvertures. Attention aux logos noirs sur fond transparent et aux ombres portées, qui disparaissent ou s'inversent en mode sombre.

### 2.5 — Un seul bouton par e-mail

Un seul appel à l'action. Les autres liens sont du texte discret. Sur E2, le bouton peut être répété à l'identique en haut et en bas — même libellé, même destination.

---

## 3. Ce qui doit figurer dans chaque e-mail, sans exception

Ce n'est pas de la décoration légale : **le taux de plainte est notre risque principal**. Au-dessus de 0,08 % de plaintes, notre compte d'envoi peut être fermé sans préavis. À notre volume, **une seule plainte suffit à dépasser le seuil**. Ce qui suit protège le dispositif.

- **Le rappel du contexte de collecte**, en clair : « Vous avez demandé votre bon de 15 € sur myselfmonart.com le JJ/MM. »
- **Le lien de désabonnement, visible dans le pied de page** — pas seulement dans les en-têtes techniques. Il doit être **facile à trouver**, pas caché en gris clair sur fond crème. C'est contre-intuitif commercialement ; c'est ce qui protège l'expéditeur.
- **L'adresse postale de la SAS KINDOPIA.**
- **Un lien vers la politique de confidentialité.**
- Les **conditions du bon**, dans le corps : dès 80 € hors livraison · une seule fois · non cumulable · date d'expiration.

**Aucun pixel de suivi d'ouverture.** Depuis la recommandation CNIL de mars 2026, il exigerait un consentement distinct que nous ne recueillons pas. On pilote au clic.

---

## 4. La structure des trois e-mails

Les textes complets sont fournis à part. Voici les blocs à mettre en page.

### E1 — « Voici votre bon » *(le plus important)*

1. **En-tête** — logo seul, centré. Pas de menu.
2. **Le bon** — titre, le **code en très visible** (cadre à bordure tiretée, reprise exacte de l'encart du site), le montant, le seuil, la date d'expiration. **Ce bloc doit tenir dans le premier écran.**
3. **Le bouton** — « Appliquer ma remise ». Sous le bouton, en petit : « Si le bouton ne fonctionne pas, saisissez le code au moment du paiement. » *(Ce secours n'est pas cosmétique : le lien repose sur un cookie, qui se perd entre le navigateur intégré de l'application de messagerie et le vrai navigateur. Sur mobile, c'est fréquent.)*
4. **Deux phrases de marque** — respiration, pas de vente.
5. **Les conditions du bon.**
6. **Pied de page** — mentions du §3.

### E2 — « Ce que ça change, sur un mur »

1. En-tête.
2. **Accroche + visuel de l'œuvre consultée**, cliquable vers la même destination que le bouton.
3. **Bouton** — « Revoir l'œuvre ».
4. **Ce que ça change** — l'usage : au-dessus du canapé, dans une entrée, dans une chambre.
5. **Deux matières** — toile et affiche, côte à côte.
6. **Rassurance.**
7. **Rappel discret du bon** + date.
8. Pied de page.

### E3 — « Dernier rappel »

Court. Titre, une phrase, le code, le bouton, les conditions, le pied de page. **Rien d'autre.**

---

## 5. La marque

- Palette et typographies de la boutique : fond crème, brun profond pour le texte, terracotta en accent. Police d'affichage pour les titres, sans-serif lisible pour le corps.
- **Ton : premium, chaleureux, jamais criard.** Pas de majuscules hurlantes, pas de compte à rebours animé, pas de « DERNIÈRE CHANCE !!! ». On vend de l'art, pas du déstockage.
- L'urgence de E3 se porte par la clarté, pas par le tapage.

---

## 6. Ce que j'attends en livraison

- **Les 3 e-mails en maquette**, avec l'ordre des blocs, les espacements, les tailles et les couleurs.
- Le rendu **mobile et desktop**, **clair et sombre**.
- Les **images découpées**, avec leurs textes alternatifs.
- La démonstration qu'un **titre sur deux lignes** et un **bouton au libellé allemand** ne cassent rien.

**Pas de HTML fini.** L'intégration se fera côté serveur, en composants, pour que les trois e-mails partagent le même en-tête, le même pied de page conforme et la même charte : une correction se fait alors à un seul endroit. Un fichier HTML livré une fois deviendrait intouchable dans six mois.

---

## 7. ⚠️ À faire confirmer avant de dessiner

Ces éléments apparaissent dans les textes fournis mais **ne sont pas encore validés**. Ne pas les afficher tant qu'ils ne le sont pas — dans un e-mail promotionnel, une affirmation est opposable.

- La **note Trustpilot** : deux valeurs contradictoires circulent dans les documents du projet (4,2/81 et 4,5/81).
- Les **caractéristiques matière** citées dans E2 : grammage de la toile, durée de tenue des encres, profondeur du châssis, formats disponibles.
- La **politique de retour** (« 14 jours pour changer d'avis »).
- L'origine de fabrication. **La mention « Made in France » est proscrite** — la production n'est pas intégralement française.
- Les **délais de livraison** : ne rien afficher tant que les fiches produit se contredisent.
