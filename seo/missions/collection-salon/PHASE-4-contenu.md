# PHASE 4 — Contenu produit (copy + livrables admin)

> Voix Hayate (vouvoiement, premium-émotionnel-cocon). Toute la copy on-page est déjà intégrée dans le template `templates/collection.tableau-salon.json`. Ce document récapitule + liste ce qui reste à saisir **côté admin Shopify**.

---

## A. Copy ON-PAGE (déjà dans le template — local)

### H1 (bannière, = nom de la collection)
`Tableau Salon` *(le H1 reprend `collection.title` — voir §C pour la valeur admin recommandée).*

### Intro courte (sous le H1, = `collection.description`) — à saisir admin (§C)
> Des tableaux choisis à la main pour faire de votre salon une pièce qui vous ressemble — chic, moderne ou apaisante. Toile premium et cadre bois massif, pensés pour durer.

### Éditorial #1 — H2 « Quel tableau choisir pour votre salon ? »
3 paragraphes (intro émotionnelle + styles avec liens vers `tableau-abstrait`, `tableau-zen`, `tableau-paysage`, `tableau-couleur` + renvoi guides blog styles & cocooning).

### Éditorial #2 — H2 « Bien choisir votre tableau de salon »
- H3 « La bonne taille au-dessus du canapé » (règle des 2/3, repères cm, effet galerie).
- H3 « Des matières pensées pour durer » (toile 285 g/m², encres archival 75 ans, cadre bois massif, conçu en France / imprimé en Europe).
- Renvoi guides blog petit salon / grand salon.

### Maillage — H2 « Explorez nos autres univers déco »
Carrousel vers : tableau-abstrait, tableau-zen, tableau-paysage, tableau-couleur, tableau-chambre, tableau-cuisine, tableau-bureau.

### FAQ — H2 « Vos questions sur les tableaux de salon » (+ schema FAQPage)
6 questions issues des vraies requêtes GSC / PAA (réponses 42-59 mots, citation-worthy) :
1. Quel tableau choisir pour un salon ?
2. Quelle taille de tableau au-dessus d'un canapé ?
3. Où placer un tableau dans un salon ?
4. Quel style de tableau pour un salon moderne ?
5. Vos tableaux sont-ils de bonne qualité ?
6. Comment se passe la livraison ?

### Signature
> Avec soin, — Hayate / Team MyselfMonArt

---

## B. Schema JSON-LD (déjà en place)

| Schema | Source | Statut |
|---|---|---|
| **BreadcrumbList** | section `breadcrumb` | existant ✓ |
| **ItemList** (produits) | section `main-collection-product-grid` | existant ✓ |
| **CollectionPage** | `snippets/json-ld-collection.liquid` (via `custom-liquid`) | **ajouté** ✓ |
| **FAQPage** | section `collapsible-content` (`emit_faq_jsonld: true`) | **activé** ✓ |

> Couverture schema **supérieure aux 3 concurrents** (qui n'ont ni FAQPage ni CollectionPage).

---

## C. À SAISIR CÔTÉ ADMIN SHOPIFY (hors theme — non local)

> Ces champs vivent dans la base Shopify, pas dans le repo. À renseigner par Walid (ou via l'admin) **avant mise en ligne**.

**Online Store → Collections → « tableau-salon » :**

1. **Theme template** → sélectionner **`tableau-salon`** *(indispensable : c'est ce qui active le nouveau template ; sinon la collection garde l'ancien rendu par défaut).*

2. **Description de la collection** (champ description) → coller l'intro courte :
   > Des tableaux choisis à la main pour faire de votre salon une pièce qui vous ressemble — chic, moderne ou apaisante. Toile premium et cadre bois massif, pensés pour durer.

3. **Search engine listing → Edit :**
   - **Page title (≤ 60 car)** :
     `Tableau salon : déco murale chic & moderne | MyselfMonArt` *(57 car)*
   - **Meta description (≤ 155 car)** :
     `Habillez votre salon de tableaux chic et modernes, sélectionnés à la main. Toile 285 g, cadre bois massif, conçus en France. Livraison soignée.` *(≈ 145 car)*

4. (Optionnel) **Collection title** : garder **`Tableau Salon`** (keyword exact, breadcrumb propre). Le H1 reprend cette valeur.
