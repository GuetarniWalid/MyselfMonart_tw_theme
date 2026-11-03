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

Espaces insécables : le caractère se perd à l'envoi, mais écrit `&nbsp;`, Shopify le convertit en U+00A0. Les 7 de Cuisine et les 3 de Mer sont ainsi rétablies. Un doute reste sur les textes recopiés à la main (traductions de Cuisine et de Zen, guides Trustpilot, guide et FAQ Zèbre) : une insécable devenue espace simple ne s'y verrait pas, car la longueur ne change pas.

Relu en lecture seule, aucun autre cas d'épaisseur :

- les descriptions et les métachamps éditoriaux en français des 95 collections ;
- les 60 articles de blog français en texte intégral (recherche des épaisseurs en cm, faite en ligne depuis le navigateur le 03/11) : aucune mention de l'épaisseur des toiles ;
- les traductions de 20 toiles (anciennes, récentes, au hasard) ;
- les descriptions françaises des produits, par recherche plein texte.

Pas relus : les traductions des métachamps des collections autres que Zèbre, les traductions des produits hors échantillon, les champs SEO hors échantillon et les traductions du blog.

Popups « Châssis 2 cm » et « Châssis 4 cm » : ils dépendent des options `chassis-de-2-cm` et `chassis-de-4-cm` (type `thickness`), que le thème ne lit pas. Ils ne s'affichent donc plus, et aucun produit n'a encore d'option châssis.

Validé par Walid, écrit le 03/11/2026 puis relu :

- `custom.guide` de tableau-rose, papier-peint-colore et papier-peint-fleur (métachamps 64743004995931, 64743110213979, 64743133970779) : note Trustpilot remplacée par les jetons, en français et dans les 4 traductions. `collection-editorial-auto` et `collection-editorial`, les deux chemins d'affichage, passent bien par `trustpilot-tokens`.
- Tableau Zen : balise `<script src="chrome-extension://…">` retirée de la description et des 4 traductions.
- Tableaux nature sauvage : lien vers l'admin retiré de la description et des 4 traductions.
- Tableau Cuisine : phrase reformulée, « Pour une touche chaleureuse qui accompagne vos cuisines en bois… », en français et dans les 4 traductions.

Laissés tels quels : les popups Châssis et `translation.handle` de posters-affiches-africain.

Traduction anglaise de nature sauvage : le « r » isolé hérité de l'ancien lien (« dedicated to the sear ») est retiré, sur accord de Walid. L'allemand (« Meer »), l'espagnol (« mar ») et le néerlandais (« zee ») n'avaient pas cette faute.

Vérifié en ligne le 03/11 :

- fiche toile du Bonsaï : « 2 cm » en fr, en, de, es et nl, et plus aucun « 3 cm » ;
- tableau-rose : « 4,2/5 sur 86 avis » affiché depuis le réglage, sans jeton brut (les collections de papier peint ne sont pas publiques, donc pas contrôlées en ligne) ;
- tableau-zen et tableaux-nature-sauvage : plus de balise d'extension ni de lien vers l'admin ;
- tableau-cuisine : nouvelle phrase dans la description.
