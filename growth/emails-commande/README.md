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

## Les colis Colis Privé

Shopify n'envoie pas « Arrive bientôt » ni « Arrivée » pour ces colis. Le serveur (dépôt MyselfMonArt_Backend, `app/Services/CarrierEvents/mail`) les envoie lui-même depuis team@myselfmonart.com, avec ces mêmes modèles, relus dans Shopify à chaque passage. Une retouche posée dans Shopify vaut donc aussi pour eux. Une variable ou un filtre Liquid nouveau doit d'abord exister côté serveur (`mail/context.ts`, `mail/render.ts`).
