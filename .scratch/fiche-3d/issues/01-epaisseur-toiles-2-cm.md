# 01: Corriger l'épaisseur annoncée des toiles

**What to build:** les fiches toiles annoncent aujourd'hui une profondeur de 3 cm. Le châssis réel fait 2 cm (confirmé par Walid le 03/11/2026), comme le montre déjà la 3D de la fiche. Tout texte de la boutique qui donne l'épaisseur des toiles dit désormais 2 cm, dans toutes les langues. Contexte : README du dossier `fiche-3d`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Plus aucune mention de 3 cm pour l'épaisseur des toiles : textes des modèles de page, traductions (fr, en, de, es, nl), réglages du thème et métachamps, relus un par un, car le hook pre-commit ne voit pas les métachamps.
- [ ] Si les données lues par Google mentionnent l'épaisseur, elles disent 2 cm.
- [ ] Vérifié sur une fiche toile en ligne après le déploiement, en français et dans une autre langue.

## Notes de réalisation

Fait dans le thème (03/11/2026) :

- `templates/product.painting.json`, onglet « Détails du produit » : « La profondeur est de 2 cm pour les toiles. » C'était la seule mention de l'épaisseur des toiles dans le thème : modèles, sections, snippets, locales et réglages ont été relus. Ce texte a servi de source au brouillon d'e-mails, et sans doute aux textes de la collection Zèbre.
- `growth/EMAILS-BON15-TEXTES.md` : les deux mentions du brouillon d'e-mails sont passées à 2 cm. Les e-mails envoyés par le backend ne donnent pas d'épaisseur.
- La 3D (`chassisCm: 2.0`) et la partie des données Google (JSON-LD) écrite par le thème n'annoncent aucune autre épaisseur. Le JSON-LD reprend en revanche la description de chaque produit : voir « Tableau Agrumes » plus bas.

Reste à faire dans Shopify, après le déploiement :

- Traductions en, de, es et nl de l'onglet (clé `section.product.painting.json.main.collapsible_tab_9gdLK4.content`) : elles disent encore 3 cm. Il faut les réenregistrer avec le nouveau digest. Sinon, la tâche de nuit `TranslateStaticSection` (4 h 30) les retraduira d'elle-même.
- Collection Tableau Zèbre : sa description, `custom.guide` et `custom.faq` disent 3 cm, et la FAQ est lue par Google. Leurs traductions sont à relire aussi.
- Les collections Tableau Cuisine (« 4 cm ») et Tableau Mer (« 2 ou 4 cm »), ainsi que le produit « Tableau Agrumes - Fraîcheur éclatante » (« 2 ou 4 cm »), annoncent encore une autre épaisseur que 2 cm.
- Métachamps éditoriaux des collections : seuls 4 jeux ont été relus (Zèbre, Poster Zèbre, Entrée et Couloir, Cuisine), sur environ 50.

Déjà relus, sans autre cas : les descriptions françaises des produits (recherche plein texte sur tout le catalogue, aucune ne dit 3 cm), les 12 pages, les 95 descriptions de collections et les popups d'options. Parmi ces popups, seuls « Châssis 2 cm » et « Châssis 4 cm » restent, ceux d'une ancienne option. Pas relus : les articles de blog (le connecteur ne sait pas les lister), les traductions des produits une par une et d'éventuelles valeurs d'option « Chassis de 4cm ».

À vérifier en ligne : une fiche toile, en français et dans une autre langue.
