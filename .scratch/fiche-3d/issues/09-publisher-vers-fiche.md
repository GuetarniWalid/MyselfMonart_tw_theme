# 09: Du Publisher à la fiche

**What to build:** le premier tracé complet, de l'image à la fiche en ligne.
1. Walid envoie une image dans le Publisher et choisit la collection, comme aujourd'hui.
2. Claude écrit le titre, les textes, les textes alternatifs et les noms de fichiers, comme aujourd'hui.
3. Le serveur rend les photos (ticket 08) à la place des mockups.
4. Un écran de validation montre les photos et les textes.
5. Un clic publie la toile sur la nouvelle fiche.

Les médias gardent l'ordre dont dépendent les vignettes, le panier et les textes alternatifs : 1re = de face sur fond clair, 2e = l'image à plat, puis les autres photos. Le choix des mockups disparaît pour les toiles. Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 08 (rendus à la demande)

**Status:** ready-for-agent

- [x] Une image envoyée donne une toile sur la nouvelle fiche, avec ses photos, sans Photoshop ni Photopea. Le premier essai est publié en brouillon. *(brouillon réel, modèle `oeuvre-3d` relu sur Shopify ; créé par la commande, pas par l'écran ; la page n'a pas été vue, un brouillon ne se voit pas)*
- [ ] Photos dans l'ordre attendu, textes alternatifs et noms de fichiers écrits par Claude, traductions de nuit comme aujourd'hui. *(ordre, textes et noms vérifiés sur le brouillon ; traductions pas vérifiées : la nuit ne lit que les produits publiés, et OpenAI n'a plus de crédit, voir « Limites »)*
- [x] L'écran de validation montre les photos avant la publication, et on peut annuler. *(banc local : vraie page, vrai front, backend simulé ; pas en production, l'écran demande une connexion)*
- [ ] Vignette de collection, panier et fiche corrects pour la toile publiée, vérifiés en ligne.
- [x] Les posters et les autres types de produits gardent le chemin actuel tant que leur ticket n'est pas fait. *(voir « Ancien chemin »)*

## Notes de réalisation (05/11/2026)

**Fait.** Backend `ea3c0c4`, déployé ; `b88fe0a` et `ba7f514` (`[skip ci]`) n'ajoutent qu'une relecture au workflow d'essai. En haut de `/publisher`, carte « 1 · Votre image » : Mockups (défaut) ou Nouvelle fiche, pour une toile à créer seulement. Le choix passe avant l'image, parce que l'image lance les mockups favoris. Le serveur rend les photos pendant que Claude écrit les textes, un écran montre le tout, un clic crée le brouillon.
- `App/Services/ArtworkDraft` : `DraftFlow.ts` sans Adonis, ses bords dans `index.ts`. Table `artwork_drafts`, routes `/api/artwork-drafts`, avec connexion.
- `public/publisher/artwork-draft.js`, et trois points de branchement dans `app.js`, inertes tant que le chemin n'est pas choisi.
- Tout ou rien : un clic gagne, un échec retire le produit et rouvre la validation, un redémarrage reprend ce qui était en cours. La réparation horaire ne voit pas les brouillons : un filet recopie les variantes 4 min après la création si le webhook n'a rien fait.
- `node ace artwork:draft` et le workflow « Brouillon d'essai de la nouvelle fiche » font le même chemin sans l'écran.

**La source du front n'est pas le backend.** `public/publisher` et `publisher.edge` sont le miroir de `webapp/public`, dépôt `Midjourney-to-Shopify-chrome-extension`, par `sync-prod.js`. Le commit `39e812f` y est prêt mais pas poussé : le brief ne couvre pas ce dépôt. Tant qu'il n'y est pas, le prochain `sync-prod.js` efface ce chemin du Publisher.

**Essai réel, image à plat du Bonsaï, collection Tableau Zen.** [Brouillon](https://admin.shopify.com/store/team-689/products/10862725824859) : `DRAFT`, modèle `oeuvre-3d`, aucun canal, 5 médias `READY` dans l'ordre (face, à plat, trois-quarts, matière, coin), 95 variantes aux prix du vrai Bonsaï, catégorie, `artwork.type`, `link.mother_collection`, `title.short`. Préparation : 51 s, rendu et textes ensemble. Le webhook a passé la course avec `artwork.type` et copié les variantes.

**Ancien chemin.** `publishOnShopify`, `composePosterMedia` et les services Claude n'ont pas changé. Toile avec étape du poster jumeau, poster, tapisserie, reimage et personnalisé joués dans Chrome sur le front d'avant et sur le nouveau : mêmes appels, mêmes corps de publication, mêmes textes à l'écran, à part le choix du chemin. Ce banc simule le backend.

**Vérifié aussi.** `npm run test:golden` avec 39 contrôles du flux et 19 de l'écran, build, Prettier, ESLint, type-check, déploiement. Banc navigateur, 17 parcours : attente du studio, coupure réseau, échecs, retour aux mockups avec la même image, téléphone.

**Une fois le brouillon publié par Walid** (Actif, et cocher Boutique en ligne : il n'est sur aucun canal, sinon la fiche renvoie à l'accueil) :
- vignette de collection : le tableau y paraîtra plus petit, le cadrage reste à décider ;
- panier et tiroir : miniature de la 1re image ;
- fiche : la 3D part de l'image à plat, options, ajout au panier ;
- le lendemain : traductions et textes alternatifs traduits.

**Pour la suite.**
- Ticket 18 : `active` dans `artwork-draft.js` donne le défaut ; `writeProduct` et `product()` doublent `publishOnShopify`, à fusionner en retirant les mockups.
- Ticket 13 ou 15 : une photo ajoutée à `photoPlan` doit avoir sa ligne dans `PHOTO_CONTEXTS`, un test doré l'exige.
- Pinterest et Instagram prennent la 3e image : ce sera le trois-quarts sur ces toiles.

**Limites.**
- **OpenAI n'a plus de crédit** (429, vu à 16:57 le 05/11). Sur le brouillon, couleurs, thèmes et traduction des options ont échoué. Ça touche aussi l'ancien chemin et les traductions de nuit, qui passent par OpenAI. Une fois rechargé, `shopify:backfill_colors_themes` ne voit que les produits publiés.
- L'écran n'a tourné que sur le banc, jamais connecté en production. La route d'envoi et les ordres d'annulation n'ont pas été appelés pour de vrai.
- Paysage et carré : plan et tailles couverts par les tests, aucun vrai rendu ni brouillon.
- Les fichiers d'un essai annulé restent sur Spaces, 25 Mo environ.
- Un arrêt du serveur juste entre la création du produit et son inscription en base le laisserait inconnu : quelques millisecondes, non couvertes.
