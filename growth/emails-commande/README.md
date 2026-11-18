# Mails de commande MyselfMonArt

Les cinq notifications Shopify d'une commande, dans les cinq langues de la boutique (fr, en, de, es, nl), en ligne depuis le 05/11/2026 :

| Mail | Modèle Shopify |
|---|---|
| Merci | `order_confirmation` |
| En fabrication (sans suivi) ou Terminée : voici votre suivi | `shipping_confirmation` |
| Terminée : voici votre suivi | `shipping_update` |
| Arrive bientôt | `shipment_out_for_delivery` |
| Arrivée | `shipment_delivered` |

## Retoucher un mail

1. Corriger `build.mjs` (mise en page) ou `strings.mjs` (textes de chaque langue). Jamais directement dans Shopify : la génération suivante écraserait la retouche.
2. `npm install`, puis `node build.mjs` : écrit `dist/<modèle>.<langue>.liquid` et les objets dans `dist/sujets.json`.
3. `node qa.mjs` : contrôles automatiques (Liquid, petit téléphone, textes alternatifs, liens).
4. `node preview.mjs && node apercu.mjs` : captures dans un vrai Chrome (clair, sombre, Gmail), puis la planche avant / après `apercu.html`, à relire avant toute mise en ligne.
5. Poser dans Shopify : le français dans Paramètres > Notifications (`/email_templates/<modèle>/edit`), les autres langues dans Translate & Adapt.

`logo.mjs` refait les images de l'en-tête (le visage du logo sans son rond, le nom en Welcome), à déposer dans Shopify > Contenu > Fichiers. `marque.mjs` donne leurs adresses et celle de la police du thème.

`preview/` et `apercu.html` ne sont pas gardés dans le dépôt (14 et 4 Mo) : les commandes ci-dessus les refont.

## Les nouveaux produits : l'œuvre telle que commandée

Un nouveau produit (créé par le Publisher depuis le 18/11/2026, modèle de page `oeuvre-3d`) n'a qu'une image, l'œuvre à plat. Les mails le dessinent en objet, comme la vignette du panier : la toile seule ou dans sa caisse américaine, le poster sous verre ou en simple feuille, avec son contour blanc s'il est commandé, à la teinte de l'atelier. Le héros des mails 1 et 5 et les vignettes des lignes (mails 1, 2, 3 et 5). Tout autre produit garde son image, à l'octet près.

- Le signal : `line.product.template_suffix == 'oeuvre-3d'`, la règle du thème (`snippets/artwork-kind.liquid`) et du serveur (`artworkMedia.ts`). Ou, si les notifications ne disent pas le modèle de page, une photo de ligne dont le fichier commence par `photo-studio-` : seuls les nouveaux produits en ont.
- L'œuvre à plat : `line.product.featured_image`, la 1re image, jamais `line.image`, qui devient la photo studio de la variante. Sans elle, rien n'est dessiné et la ligne garde son image.
- La matière et le cadre se lisent dans le format de la variante (3 options : toile, 2 : poster ; mots du cadre par langue dans `strings.mjs`, `frames`), la couleur et le contour du poster dans les propriétés `_cadre` et `_passe_partout`.
- Les teintes sont relues dans `input.css` (« Vignette d'œuvre ») à chaque `node build.mjs`.
- `qa.mjs` vérifie le nombre d'œuvres dessinées et le cadre lu dans chaque langue, d'après les traductions de la boutique.

## Les colis Colis Privé

Shopify n'envoie pas « Arrive bientôt » ni « Arrivée » pour ces colis. Le serveur (dépôt MyselfMonArt_Backend, `app/Services/CarrierEvents/mail`) les envoie lui-même depuis team@myselfmonart.com, avec ces mêmes modèles, relus dans Shopify à chaque passage. Une retouche posée dans Shopify vaut donc aussi pour eux. Une variable ou un filtre Liquid nouveau doit d'abord exister côté serveur (`mail/context.ts`, `mail/render.ts`).

Depuis le 18/11/2026 (backend a057986), le serveur donne à `line_item` les trois variables du dessin des nouveaux produits : `product.template_suffix`, `product.featured_image` et `properties`. Ses mails 2 et 5 les dessinent donc aussi. Sans elles, ils gardaient l'image de la ligne, sans erreur.

## Poser dans Shopify sans tout recopier (méthode du 18/11/2026)

Les modèles font 26 à 52 Ko : on ne les recopie pas à la main.
- `preview/` reçoit `liquid-<modèle>.<langue>.html` (copies de `dist/`) et `pont.html`, servis par `python -m http.server 47124 --bind 127.0.0.1`.
- Dans l'admin (Chrome), un bouton temporaire « PONT » ouvre `pont.html` d'un vrai clic. Cette page envoie les 25 modèles à l'admin par `postMessage`.
- **Français :** dans `/email_templates/<modèle>/edit`, le contenu de l'éditeur CodeMirror (`.cm-content`, `cmView.view.dispatch`) est remplacé, puis on clique sur « Enregistrer ».
- **Autres langues :** dans Translate & Adapt, un second bouton « COPIER » met le modèle dans le presse-papiers. On clique dans la traduction du corps, puis Ctrl+A et Ctrl+V, puis « Enregistrer ».
- **Contrôle :** `getTranslatableContent` sans valeurs. L'empreinte du français doit être le SHA-256 du fichier, et chaque traduction doit être `outdated: false` avec la longueur exacte du fichier.
