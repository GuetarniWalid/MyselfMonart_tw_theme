# 01: Corriger l'épaisseur annoncée des toiles

**What to build:** les fiches toiles annoncent aujourd'hui une profondeur de 3 cm. Le châssis réel fait 2 cm (confirmé par Walid le 03/11/2026), comme le montre déjà la 3D de la fiche. Tout texte de la boutique qui donne l'épaisseur des toiles dit désormais 2 cm, dans toutes les langues. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Plus aucune mention de 3 cm pour l'épaisseur des toiles : textes des modèles de page, traductions (fr, en, de, es, nl), réglages du thème et métachamps, relus un par un, car le hook pre-commit ne voit pas les métachamps.
- [x] Si les données lues par Google mentionnent l'épaisseur, elles disent 2 cm.
- [x] Vérifié sur une fiche toile en ligne après le déploiement, en français et dans une autre langue.

## Notes de réalisation

Fait dans le thème (03/11/2026) :

- `templates/product.painting.json`, onglet « Détails du produit » : « La profondeur est de 2 cm pour les toiles. » C'était la seule mention de l'épaisseur des toiles dans le thème : modèles, sections, snippets, locales et réglages ont été relus. Ce texte a servi de source au brouillon d'e-mails, et sans doute aux textes de la collection Zèbre.
- `growth/EMAILS-BON15-TEXTES.md` : les deux mentions du brouillon d'e-mails sont passées à 2 cm. Les e-mails envoyés par le backend ne donnent pas d'épaisseur.
- La 3D (`chassisCm: 2.0`) et la partie des données Google (JSON-LD) écrite par le thème n'annoncent aucune autre épaisseur. Le JSON-LD reprend la description de chaque produit, corrigée ci-dessous pour Agrumes.

Écrit dans Shopify le 03/11/2026, après le déploiement, puis relu :

- Modèle `painting`, onglet « Détails du produit » : traductions en, de, es et nl.
- Collection Tableau Zèbre : description, `custom.guide` et `custom.faq`, avec leurs traductions. La FAQ est lue par Google.
- Collection Tableau Cuisine : description (« 4 cm » devient « 2 cm ») et ses traductions.
- Collection Tableau Mer : phrase « 2 ou 4 cm » réécrite dans la description et ses traductions.
- Produit « Tableau Agrumes - Fraîcheur éclatante » : phrase « 2 ou 4 cm » réécrite dans la description et ses traductions.

Écart à connaître : `updateCollection` ne transmet pas les espaces insécables. Dans les descriptions françaises de Cuisine (7) et de Mer (3), elles sont devenues des espaces simples. Les traductions de Cuisine ont été recopiées à la main : leurs longueurs sont exactes, mais la même perte y est possible. L'effet visible se limite à une espace en moins à quelques endroits.

Relu en lecture seule, aucun autre cas d'épaisseur :

- les descriptions et les métachamps éditoriaux en français des 95 collections ;
- les 60 articles de blog français en texte intégral (recherche des épaisseurs en cm, faite en ligne depuis le navigateur le 03/11) : aucune mention de l'épaisseur des toiles ;
- les traductions de 20 toiles (anciennes, récentes, au hasard) ;
- les descriptions françaises des produits, par recherche plein texte.

Pas relus : les traductions des métachamps des collections autres que Zèbre, les traductions des produits hors échantillon, les champs SEO hors échantillon et les traductions du blog.

Popups « Châssis 2 cm » et « Châssis 4 cm » : ils dépendent des options `chassis-de-2-cm` et `chassis-de-4-cm` (type `thickness`), que le thème ne lit pas. Ils ne s'affichent donc plus, et aucun produit n'a encore d'option châssis.

À faire valider par Walid :

- Supprimer ces deux popups et leurs options, désormais inutiles (facultatif).
- Hors épaisseur : `custom.guide` de tableau-rose, papier-peint-colore et papier-peint-fleur écrit la note Trustpilot en chiffres ; la description de tableau-zen contient une balise `<script src="chrome-extension://…">` ; dans celle de tableaux-nature-sauvage, le « r » de « mer » est un lien vers l'admin Shopify ; `translation.handle` de posters-affiches-africain a une adresse anglaise vide.

Vérifié en ligne le 03/11 sur la fiche toile du Bonsaï : « 2 cm » en fr, en, de, es et nl, et plus aucun « 3 cm ».
