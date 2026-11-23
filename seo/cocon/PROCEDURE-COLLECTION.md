# Créer une collection débloquée

Procédure suivie pour chaque nouvelle collection du cocon : à la main pendant une session, puis par la routine quotidienne. Plan et règles : [README.md](README.md).

## Quand

- La collection est **prête**. Son tag est porté par au moins 20 produits de son arbre : 20 toiles pour une collection « Tableau … », 20 posters pour une collection « Poster & Affiche … ». Et elle n'existe pas encore.
- L'outil `etatCocon` du connecteur Shopify donne cet état. La [carte des collections](https://claude.ai/artifact/BVe1r3KNmDx6GWB3Y6wbWY) le montre.
- On en crée **10 par jour au plus**. On prend d'abord les plus demandées sur Google, puis celles qui ont le plus de tableaux.

## 1. Le dossier

Pour chaque collection, on rassemble :
- **ses tableaux** : titres, liens, images, thèmes, couleurs, ventes sur 12 mois ;
- **sa place dans le cocon** : sa page mère, sa jumelle (la même collection dans l'autre arbre), ses sœurs ;
- **les recherches Google** qui contiennent son sujet, avec les pages de la boutique qui y répondent déjà ;
- **les suggestions Google** qui contiennent son sujet.

En session, ce dossier se fait avec `.scratch/cocon/dossiers.cjs`.

## 2. Les textes

Chaque texte est un fichier du dépôt, `seo/cocon/textes/<handle>.json`, avec les clés `handle`, `title`, `requete_principale`, `seo_title`, `seo_description`, `intro`, `guide_html`, `faq`, `cocon_links` et `image` (`src`, `alt`).
- Il reste identique au texte en ligne : une correction faite sur Shopify se reporte dans le fichier.
- Le dépôt est public : ces fichiers ne contiennent ni ventes ni chiffres de la Search Console. Le dossier de la collection (§ 1), qui en contient, reste hors du dépôt.

| Champ | Format | Contenu |
|---|---|---|
| `title` | texte | Titre du plan, par exemple « Tableau Minimaliste ». C'est le H1 de la page. |
| `handle` | texte | L'`id` du plan. Ne jamais le changer après la création. |
| SEO title (`global.title_tag`) | 60 caractères au plus | « Tableau minimaliste : … \| MyselfMonArt ». Pas de note Trustpilot. |
| Meta description (`global.description_tag`) | 140 à 160 caractères | La promesse, avec la requête principale. Pas de note Trustpilot. |
| `custom.intro` | `multi_line_text_field`, texte simple | 2 ou 3 phrases, requête principale au début. Vouvoiement. |
| `custom.guide` | `multi_line_text_field` contenant du HTML | 400 à 600 mots en `h2`/`h3`/`p`/`ul`/`strong`/`a`, commencé par un `h2` (jamais de `h1`). |
| `custom.faq` | `json` | 4 ou 5 objets `{"q": "…", "a": "<p>…</p>"}`, tirés des vraies recherches du dossier. |
| `custom.cocon_links` | `json` | 3 à 5 liens `{"url": "/collections/…", "label": "…"}` : la mère, la jumelle, 1 à 3 sœurs proches. |
| Image | URL d'une image produit + `alt` | Le tableau le plus vendu ou le plus représentatif. `alt` : « Titre — description courte \| MyselfMonArt ». |

Le guide suit cette trame : comment choisir, styles et ambiances, où l'accrocher et en quel format, entretien, pourquoi MyselfMonArt.
- **Toiles** : toile sur châssis bois. **Posters** : papier 250 g/m², avec ou sans cadre.
- Il fait des liens vers la page mère, la jumelle et 2 ou 3 tableaux phares du dossier.
- S'il cite la note, c'est toujours par `[[TP_SCORE]]/5 sur [[TP_COUNT]] avis`.

Exemples à suivre : l'éditorial de Tableau Zen et de Poster & Affiche Zen. Voix et garde-fous : [../shared/METHODOLOGY.md](../shared/METHODOLOGY.md), § 4 et § 7.

### Garde-fous

- **Jamais « Made in France ».** Dire « Conçu en France », « Imprimé en Europe ».
- **Aucun fait inventé.** Une affirmation vient du dossier ou des textes de référence ; sinon elle n'est pas écrite.
- **Note Trustpilot** : jamais en chiffres. Jamais dans le titre SEO ni dans la meta description.
- **Ne pas viser une requête qui a déjà sa page.** Si une page de la boutique y répond déjà (champ `pages_qui_repondent_deja` du dossier, ou une collection existante du même sujet), on la nomme et on fait un lien vers elle, sans la viser. Exemple : « tableau femme africaine » appartient à Tableau Africain, 4e sur Google ; Tableau Femme renvoie vers elle.
- **Un texte unique.** La version poster ne reprend pas la version toile. Chacune parle de son support et de ses usages.

### Vérification avant de livrer

D'abord le contrôle mécanique, sur tous les textes du jour à la fois : `node seo/cocon/outils/verifier-texte.cjs seo/cocon/textes/<handle>.json… --deja seo/cocon/textes`. L'option `--deja` les compare aussi aux textes déjà publiés. Il vérifie :
- les longueurs, le `h2` de tête, l'absence de `h1` et de « Made in France » ;
- la note Trustpilot ;
- que chaque lien répond ;
- qu'aucune suite de 8 mots n'est partagée entre deux textes.

Le 22/11, cinq rédacteurs ont imité le même texte modèle, et le contrôle a trouvé des paragraphes entiers répétés d'une collection à l'autre. Pour Google, c'est du contenu en série. Écrire chaque paragraphe pour son sujet, sans recopier un texte existant.

Puis une relecture adversariale :
- chaque affirmation est comparée au dossier ;
- chaque lien mène à une page qui existe ;
- il n'y a aucun `h1` dans le guide ;
- la requête principale apparaît dans le titre, l'intro et le guide, sans bourrage ;
- les phrases sont simples et le vouvoiement est respecté.

## 3. La création, par le connecteur Shopify

1. `createCollection`, non publiée, avec ces paramètres :
   - `title`, `handle`, `seo` (titre et description), `image` (src et alt) ;
   - les métachamps `custom.intro`, `custom.guide`, `custom.faq` et `custom.cocon_links` ;
   - `custom.type_of_collection` et `header.type`, en `single_line_text_field` valant `painting` ou `poster` ;
   - une règle automatique en ET :
     - toiles : `TAG = <tag>` et métachamp produit `artwork.type = painting` ;
     - posters : `TAG = <tag>` et `TYPE = poster`.
2. `setMetafield` `breadcrumb.parentCollection` (`collection_reference`) = GID de la page mère.
3. Vérifier, avant de publier :
   - qu'elle a au moins 20 produits : `listCollections` avec `query: "handle:<handle>"`, champ `productsCount` ;
   - qu'elle a ses métachamps : `getCollection`.
4. `updateCollection` avec `published: true`, puis `node seo/cocon/outils/verifier-en-ligne.cjs seo/cocon/textes/<handle>.json`. Ce script lit la page en ligne et y cherche chaque phrase du texte relu, ce qui attrape une erreur de recopie. S'il affiche « ? » (sortie 2), Shopify a servi sa page anti-robot : on relance plus tard, sans rien corriger. Un lien « → 429 » du contrôle des textes vient du même frein.
5. Le serveur fait seul le reste :
   - les traductions, la nuit (`TranslateCollection`) ;
   - `translation.handle` et `meta_object.media`, par ses tâches.

## 4. Après

- La pastille de la nouvelle collection apparaît seule sur sa page mère, car le thème lit le plan dans le métachamp du shop `cocon.plan`.
- La carte et l'outil `etatCocon` la montrent « en ligne » au passage suivant du veilleur.
- On ajoute une ligne au [journal](journal.md) : date, handle, nombre de produits, ce qui a été vérifié.
- On commite `seo/cocon/` (textes et journal), puis on pousse sur `main`, sans branche ni PR (voir `CLAUDE.md`). La routine le fait seule à la fin de son passage. Elle ne commite jamais un fichier du thème, car chaque push sur `main` déploie le thème en ligne.
