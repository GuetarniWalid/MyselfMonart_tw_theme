---
name: shopify-section-dev
description: |
  Conventions de développement obligatoires pour créer ou modifier toute section Liquid dans ce theme Shopify MyselfMonArt. Invoque ce skill automatiquement dès que tu touches un fichier dans `sections/`, `snippets/`, `templates/`, ou que tu crées un nouveau composant front (hero, grille, FAQ, CTA, etc.). Couvre : architecture theme, Tailwind only, variables globales (couleurs main/secondary/accent/buy-button, fonts heading/roboto/limelight), admin-configurable via schema, SEO impeccable (H1 unique, hiérarchie Hn, alt, schema markup), accessibilité WCAG AA (focus visible, ARIA, contraste, motion-reduce), naming SEO des assets, build Tailwind, audit Lighthouse post-déploiement, contraintes `enabled_on.templates`, gestion conflits .tmp Shopify CLI.
---

# Skill — Développement de sections Shopify (MyselfMonArt theme)

> **À appliquer obligatoirement** dès qu'on touche à : `sections/*.liquid`, `snippets/*.liquid`, `templates/*.json`, `assets/*.css`, ou qu'on intègre une image/typo/couleur. Walid (président SAS KINDOPIA, fondateur MyselfMonArt) ne doit jamais avoir à répéter ces règles.

---

## 0. Anatomie d'une section Liquid Shopify (rappel)

```
sections/
  ma-section.liquid       ← Liquid + Tailwind + {% schema %}
templates/
  index.json              ← orchestration des sections sur une page (settings + order)
snippets/
  mon-helper.liquid       ← partials réutilisables (e.g. icon, json-ld)
assets/
  output.css              ← Tailwind compilé (ne pas éditer à la main)
  mon-image.jpg           ← assets statiques (servis via {{ ... | asset_url }})
```

Une section a 3 parties :
1. **Liquid templating** (rendu HTML avec settings + blocks)
2. **`{% schema %}` JSON** (paramètres admin-configurable)
3. **(optionnel) JS** : externalisé dans `assets/section-X.js`, chargé via `<script src="{{ '...' | asset_url }}" defer>`

---

## 1. Tailwind only (pas de CSS custom)

**Règle dure** : aucune `<style>` inline, aucun nouveau `.css` à part, aucun CSS scoped par section.

Pourquoi : le theme est tout Tailwind compilé via `npm run tw` (Tailwind 3.4.1, config dans [`tailwind.config.js`](tailwind.config.js)). Casser cette discipline éclate le bundle, les classes utilitaires deviennent inconsistantes, et le purge ne détecte plus rien.

### Avant d'utiliser une classe arbitraire

1. Vérifier si Tailwind l'a déjà — `text-2xl`, `bg-main-10`, `rounded-full`, `tracking-widest`, etc.
2. Vérifier les **`@layer components`** custom dans [`input.css`](input.css) (lignes ~411+) — il y a déjà `.title-highlight`, `.cart-button`, `.collapsible-tab`, `.product-grid`, etc.
3. Si rien ne convient, utiliser une **arbitrary value** (`text-[14px]`, `min-h-[80vh]`, `tracking-[0.08em]`). Tailwind les compile, mais n'en abuser pas.
4. Si vraiment une classe utility manque pour de bon, l'ajouter dans `tailwind.config.js` `theme.extend` — puis rebuild.

### Rebuild Tailwind après changement de classes

```bash
npx tailwindcss -i ./input.css -o ./assets/output.css --minify
```

Le mode watch (`npm run tw`) le fait auto. En une seule passe :

```bash
npm run tw -- --no-watch   # (ou la commande one-shot ci-dessus)
```

Sans rebuild, les nouvelles classes ne sont **pas** dans `output.css` → invisible côté browser même si présentes dans Liquid.

---

## 2. Variables globales du theme — toujours les réutiliser

### Couleurs (déclarées dans [`snippets/fonts-and-colors.liquid`](snippets/fonts-and-colors.liquid), exposées via Tailwind config)

| Tailwind class | Variable CSS | Settings admin Shopify |
|---|---|---|
| `bg-main`, `text-main`, `border-main` | `--color-main-rgb` | `settings.main_color` |
| `bg-main-5`, `bg-main-10`, `bg-main-20`, `bg-main-50`, `text-main-70`, `text-main-80`, `text-main-90`, `text-main-75` | idem alpha | idem |
| `bg-secondary`, `text-secondary`, `bg-secondary-50` | `--color-secondary-rgb` | `settings.secondary_color` |
| `bg-accent`, `text-accent`, `bg-accent-20`, `bg-accent-50`, `bg-accent-70`, `bg-accent-90` | `--color-accent-rgb` | `settings.accent_color` |
| `bg-buy-button`, `bg-buy-button-10`, `bg-buy-button-20`, `bg-buy-button-30`, `bg-buy-button-70` | `--color-buy-button-rgb` | `settings.buy_button_color` |
| `bg-like`, `bg-like-40` | `--color-like-rgb` | `settings.like_color` |

**Jamais hardcoder un hex.** Si Walid change la couleur de marque dans l'admin, tous les composants suivent automatiquement.

### Typographies (Tailwind extend → `fontFamily`)

| Tailwind class | Famille |
|---|---|
| `font-roboto` | Roboto (corps de texte par défaut, html → `font-family: Roboto`) |
| `font-heading` | Custom font "heading" (heading.woff2 dans assets, h1-h6 par défaut via `@layer base`) |
| `font-limelight` | Limelight (titres alternatifs, sections type badges) |

Pour un titre éditorial → `font-heading`. Pour les capitales très stylées → `font-limelight`. Le corps par défaut est déjà Roboto.

### Component patterns existants

- **`.title-highlight`** ([`input.css:521`](input.css#L521)) — surligneur stabilo gradient bottom 50% en `buy-button-rgb`. Utilisé dans `badges`, `collapsible-content`, `trust-signals`, `customer-testimonial`, `product-recommendations`, `main-product`. **À réutiliser** pour les eyebrows ou H2 marqués.
- **`.cart-button`** — bouton CTA "neumorphic" (`bg-buy-button border-main border-[4px] rounded-xl shadow-neu-xl`).
- **`.product-grid`** — grille produits standard.
- **`shadow-neu-{xs,sm,md,lg,xl}`** — ombres neumorphic pour CTAs/cards.

### Breakpoints

```
mobile-mini  < 415px
mobile       < 767px
2xs          ≥ 410px
xs           ≥ 480px
sm           ≥ 640px
md           ≥ 768px
2md          ≥ 900px
lg           ≥ 1024px
xl           ≥ 1280px
2xl          ≥ 1536px
```

Utiliser **`md:` comme défaut** pour le desktop minimum, **`lg:`** pour les layouts complexes type split-screen.

---

## 3. Admin-configurable via `{% schema %}` (doc Shopify)

**Règle dure** : aucun texte, aucune image, aucun lien, aucune couleur ne doit être hardcodée dans le Liquid. Tout passe par les `settings` du schema → modifiable depuis le theme editor admin sans toucher au code.

### Structure schema minimale

```json
{% schema %}
{
  "name": "Home — Hero",
  "tag": "section",
  "class": "home-hero-section",
  "enabled_on": { "templates": ["index"] },
  "settings": [
    { "type": "header",     "content": "Contenu textuel" },
    { "type": "text",       "id": "eyebrow",    "label": "Eyebrow", "default": "..." },
    { "type": "textarea",   "id": "h1_title",   "label": "H1", "info": "Doit être unique sur la page." },
    { "type": "richtext",   "id": "body",       "label": "Texte" },
    { "type": "image_picker","id": "hero_image","label": "Image hero" },
    { "type": "text",       "id": "image_alt",  "label": "Alt text", "info": "Obligatoire SEO + a11y" },
    { "type": "url",        "id": "cta_link",   "label": "CTA lien" },
    { "type": "select",     "id": "layout",     "label": "Layout", "default": "image-right",
      "options": [
        { "value": "image-right", "label": "Image à droite" },
        { "value": "image-left",  "label": "Image à gauche" }
      ]
    },
    { "type": "checkbox",   "id": "enable_x",   "label": "Activer X", "default": true },
    { "type": "color",      "id": "bg_color",   "label": "Fond" }
  ],
  "blocks": [
    {
      "type": "feature",
      "name": "Feature",
      "settings": [
        { "type": "text",     "id": "title", "label": "Titre" },
        { "type": "richtext", "id": "text",  "label": "Texte" }
      ]
    }
  ],
  "presets": [
    { "name": "Home — Hero", "settings": { "h1_title": "Défaut" } }
  ]
}
{% endschema %}
```

### Types de settings disponibles

`text` / `textarea` / `richtext` / `number` / `url` / `image_picker` / `video_url` / `select` / `radio` / `checkbox` / `range` / `color` / `color_background` / `font_picker` / `collection` / `product` / `blog` / `page` / `article` / `link_list` / `liquid` / `html` / `header` (groupe visuel) / `paragraph` (texte d'info).

Voir doc : https://shopify.dev/docs/storefronts/themes/architecture/settings

### `enabled_on.templates` — **OBLIGATOIRE pour les sections home-only**

Si la section est conçue pour la home **uniquement**, la contraindre :

```json
"enabled_on": { "templates": ["index"] }
```

Sinon Shopify la propose dans l'éditeur de tous les templates → confusion + risque de réutilisation accidentelle qui casse une autre page. Valeurs possibles : `["index"]`, `["product"]`, `["collection"]`, `["page"]`, `["article"]`, ou une liste mixte.

### Limites schema

- **Settings level section** : pas de limite officielle, mais > 30 settings devient illisible. Grouper avec `header`.
- **Blocks** : `max_blocks` à définir si pertinent (multicolumn = 6, FAQ = 12, etc.).
- **JSON pur** dans le schema : pas de commentaires Liquid, pas de Liquid logic. Si besoin de dynamique → côté Liquid au-dessus.

### Restrictions richtext

`type: "richtext"` accepte uniquement les balises whitelisted Shopify : `<p>`, `<br>`, `<strong>`, `<em>`, `<u>`, `<i>`, `<b>`, `<a>` (href, title, target), `<ul>`, `<ol>`, `<li>`. **PAS** `<h1>-<h6>`, **PAS** `<div>`, **PAS** d'attribut `style=""` ni `class=""`. Si tu mets `style="text-align:left;display:inline-block"` sur un `<ol>` → upload bloqué par Shopify avec erreur.

---

## 4. SEO impeccable (à appliquer systématiquement)

### Hiérarchie

- **1 seul `<h1>`** par page. Sur la home, c'est dans le hero. Sur une collection, c'est le nom de la collection. Sur un article, c'est le titre de l'article.
- **Pas de saut de niveau** : H1 → H2 → H3 (pas H1 → H3).
- Si une section a un titre principal, c'est un H2 (sauf hero home = H1).

### Métadonnées (gérées par Shopify Admin, pas par le code Liquid)

- `<title>` et `<meta name="description">` → **Shopify Admin → Online Store → Preferences** pour la home, ou **Online Store → Pages/Products/Collections → SEO section** pour chaque page.
- Préférer un title 50-60 char incluant le keyword cible + nom de marque.
- Meta description 150-160 char, actionable, incluant le keyword.

### Schema markup JSON-LD

Le snippet [`snippets/json-ld-home.liquid`](snippets/json-ld-home.liquid) injecte sur la home : Organization, Store, BreadcrumbList, ItemList, FAQPage. Pour d'autres pages, étendre selon le besoin (`Product`, `Article`, `Recipe`, etc.).

### Images

- **Naming SEO** : `[type]-[keyword-cible]-[contexte]-[version].[ext]` — lowercase, tirets. Ex : `hero-tableau-decoration-murale-salon-v9.jpg`. Pas de IMG_1234.jpg, pas d'UUID.
- **Alt text** : 80-125 char, descriptif (pas de keyword stuffing), inclut le mot-clé cible quand pertinent. Toujours un setting `id="image_alt"` dans le schema (pas hardcodé).
- **Dimensions explicites** : `width=` et `height=` natifs sur `<img>` pour éviter le CLS (Cumulative Layout Shift).
- **Format** : extension réelle = extension fichier (un JPEG ne doit pas être nommé `.png`).
- **Compression** : viser ≤300 KB par image hero, ≤200 KB par vignette. WebP si possible pour les gros visuels.

### Pattern srcset Shopify (quand image_picker uploadée)

```liquid
<img
  srcset="{%- if hero_image.width >= 375 -%}{{ hero_image | image_url: width: 375 }} 375w,{%- endif -%}
          {%- if hero_image.width >= 750 -%}{{ hero_image | image_url: width: 750 }} 750w,{%- endif -%}
          {%- if hero_image.width >= 1100 -%}{{ hero_image | image_url: width: 1100 }} 1100w,{%- endif -%}
          {%- if hero_image.width >= 1800 -%}{{ hero_image | image_url: width: 1800 }} 1800w,{%- endif -%}
          {{ hero_image | image_url }} {{ hero_image.width }}w"
  sizes="(max-width: 1023px) 100vw, 58vw"
  src="{{ hero_image | image_url: width: 1100 }}"
  alt="{{ hero_image_alt | escape }}"
  width="{{ hero_image.width }}"
  height="{{ hero_image.height }}"
  loading="eager"           {# pour LCP, sinon "lazy" #}
  fetchpriority="high"      {# pour LCP, sinon retirer #}
  decoding="async"
  class="...">
```

Pour les assets statiques (`asset_url`), pas de transformation automatique → fournir le bon format/taille à la source ou pré-générer plusieurs tailles si besoin srcset réel.

---

## 5. Accessibilité WCAG AA (à appliquer systématiquement)

### Checklist a11y minimum

- [ ] **Contraste** texte/fond ≥ 4.5:1 (texte normal) ou ≥ 3:1 (texte large/UI). Vérifier avec [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) ou Chrome DevTools → Lighthouse.
- [ ] **Focus visible** sur tous les éléments interactifs : Tailwind `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-main focus-visible:ring-offset-2 focus-visible:ring-offset-secondary`.
- [ ] **Navigation clavier** : tous les liens/boutons natifs (`<a>`, `<button>`), pas de div cliquable. Tester tab/shift+tab/enter/escape.
- [ ] **prefers-reduced-motion** : Tailwind `motion-reduce:transition-none motion-reduce:animate-none` sur toute animation/transition.
- [ ] **ARIA** sur composants non-natifs :
  - Section qui a un titre : `aria-labelledby="id-du-titre"` sur la `<section>`, `id="id-du-titre"` sur le H1/H2.
  - Bouton image (pas de texte) : `aria-label="..."`.
  - Carrousel : `role="region" aria-label="..."`.
  - Accordéon : utiliser `<details>/<summary>` natif (déjà a11y).
- [ ] **Alt text** sur **toutes** les `<img>`. `alt=""` uniquement pour image purement décorative (background pattern, etc.).
- [ ] **Hiérarchie Hn** sans saut.
- [ ] **Lang** : `<html lang="fr">` géré par layout, mais si un mot étranger dans le texte → `<span lang="en">word</span>`.
- [ ] **Form labels** : chaque `<input>` a un `<label for="...">` ou `aria-label="..."`.
- [ ] **Skip-to-content** : présent dans le layout du theme (à vérifier dans `layout/theme.liquid` ou `tw-header.liquid`).

---

## 6. Workflow complet pour créer une section

### Étapes

1. **Briefing** : recap besoin + comment ça doit s'intégrer dans la page (template ciblé, copy, image, contraintes).
2. **Vérifier les composants/sections existantes** : grep le repo (sections, snippets, input.css `@layer components`) pour réutiliser ce qui existe avant de coder du neuf.
3. **Si section partagée avec d'autres pages** : ne **PAS** modifier la section existante. Soit créer une variante (`ma-section-home.liquid`) contrainte via `enabled_on.templates`, soit étendre avec settings optionnels qui ne changent rien quand vides.
4. **Coder le Liquid** en suivant § 1-5.
5. **Coder le schema** en mode admin-configurable strict (§ 3).
6. **Rebuild Tailwind** : `npx tailwindcss -i ./input.css -o ./assets/output.css --minify`.
7. **Référencer dans `templates/<page>.json`** avec settings remplis.
8. **Tester en local** : `shopify theme dev` (port 9292).
9. **Vérifier le rendu HTML** : curl + grep pour valider tags, alt, schema markup, classes.
10. **Audit Lighthouse** (cf § 7) — viser ≥ 90 sur Performance, Accessibilité, SEO, Best Practices.
11. **Commit Git** avec message explicite : `feat(section): ma-section X — Y`.
12. **Share preview Shopify** : `shopify theme share` génère un theme draft + URL.

### Gestion conflits .tmp Shopify CLI (Windows)

Sur Windows, les éditeurs créent des fichiers `.tmp.<hash>` pendant l'écriture atomique. Shopify CLI tente parfois de les uploader et échoue avec **"Doit avoir une extension de fichier .liquid"** ou **"illegal characters"**. Conséquence : `HTTP 500` sur la preview.

Solution : kill `shopify theme dev` + `shopify theme push --theme=<ID> --json` qui resynchronise propre (clean les .tmp orphelins), puis relancer `shopify theme dev`.

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*theme*dev*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

---

## 7. Audit Lighthouse obligatoire après modif

À faire systématiquement après une création/modif de section.

### Avec chrome-devtools MCP (Claude Code)

```
1. mcp__chrome-devtools__navigate_page → http://127.0.0.1:9292/  (ou autre URL)
2. mcp__chrome-devtools__lighthouse_audit
3. Lire le rapport. Viser 4 cibles : Performance ≥ 90, Accessibilité ≥ 95, SEO ≥ 95, Best Practices ≥ 90.
```

### Cibles métriques

| Métrique | Cible |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5 s |
| INP (Interaction to Next Paint) | < 200 ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FCP (First Contentful Paint) | < 1.8 s |
| TBT (Total Blocking Time) | < 200 ms |

### Si une métrique fail

- **LCP > 2.5s** : preload de l'image hero (`<link rel="preload" as="image">`), `fetchpriority="high"`, WebP, dimensions explicites, supprimer le render-blocking CSS/JS.
- **CLS > 0.1** : `width`/`height` sur toutes les `<img>`, réserver l'espace pour le contenu async, `font-display: swap` sur les `@font-face`.
- **INP > 200ms** : externaliser le JS lourd, lazy-load les composants non-critiques, supprimer les `setInterval` orphelins.
- **A11y < 95** : suivre les recommandations Lighthouse → fix alt manquants, contrastes, ARIA, focus.
- **SEO < 95** : title + meta description + canonical + lang + viewport + hreflang.

---

## 8. Voix de marque + faits structurels (contenu copy)

Quand on rédige du **copy** pour les settings (defaults, exemples, info) :

- **Voix Hayate** : vouvoiement systématique, premium-émotionnel-cocon. Pas de "tu", pas de marketing-speak.
- **Signature** finale obligatoire sur la home : `Avec soin, — Hayate / Team MyselfMonArt`.
- **Faits structurels** (cf [memory](file:///C:/Users/gueta/.claude/projects/c--Users-gueta-Documents-Mes-projets-tw-myselfmonart-shopify-theme/memory/project_myselfmonart_facts.md)) :
  - Siège : **Paris**
  - Service client : **Toulouse**
  - Impression : **Allemagne** (communiqué comme "Europe")
  - Création : **2022**
  - Trustpilot : **4.1/80** (ne pas afficher le 4.1 en gros, garder dans JSON-LD)
  - Volume : **1 015 tableaux livrés**
  - Téléphone : **09 60 44 61 50**
  - **NE PAS** revendiquer "Made in France" / "Fabriqué en France" (impression Allemagne, risque DGCCRF). Utiliser : "Studio créatif français à Toulouse", "Conçu en France", "Imprimé en Europe", "Direction artistique française".
- **Mot-clé cible homepage** : `tableau décoration murale` (Phase 1 keyword validation).

---

## 9. Anti-patterns à éviter absolument

- ❌ `<style>` inline ou `style="..."` sur des balises (sauf via `{% style %}` exceptionnel et justifié)
- ❌ CSS scoped par section dans `assets/x-styles.css`
- ❌ Hardcoder un hex `#C04B2F` au lieu de `bg-accent` ou `bg-buy-button`
- ❌ Hardcoder une font `font-family: "Playfair Display"` au lieu de `font-heading`
- ❌ `class="text-[#C04B2F]"` au lieu de `text-accent`
- ❌ Texte/lien/image hardcodé dans Liquid au lieu de setting schema
- ❌ Modifier une section partagée (image-banner, multicolumn, etc.) — créer une variante home-only à la place
- ❌ `<h1>` dans une section qui peut être réutilisée → utiliser un setting `heading_level` qui défaut à `h2`
- ❌ Image sans alt, sans dimensions, sans loading attribute
- ❌ Animation sans `motion-reduce:` modifier
- ❌ Bouton sans focus-visible
- ❌ Couleur de fond sans vérification de contraste vs texte
- ❌ Naming `IMG_1234.png`, `image.jpg`, `photo (2).jpg` (utiliser pattern SEO)
- ❌ `richtext` avec `<h2>`, `<div>`, `style=""`, `class=""` (rejeté par Shopify)
- ❌ Skip Lighthouse audit après modif

---

## 10. Référence rapide — où trouver quoi

| Quoi | Où |
|---|---|
| Couleurs tokens | [`tailwind.config.js`](tailwind.config.js) `theme.extend.colors`, [`snippets/fonts-and-colors.liquid`](snippets/fonts-and-colors.liquid) |
| Variables `--color-*-rgb` | `snippets/fonts-and-colors.liquid` |
| Settings admin (color, font, etc.) | `config/settings_schema.json` |
| Composants CSS custom | [`input.css`](input.css) `@layer components` (lignes ~411+) |
| Layout principal | [`layout/theme.liquid`](layout/theme.liquid) |
| `<head>` | [`snippets/head-base.liquid`](snippets/head-base.liquid) |
| JSON-LD home | [`snippets/json-ld-home.liquid`](snippets/json-ld-home.liquid) |
| Sections home actuelles | `sections/home-*.liquid` (hero, editorial-rich, usps-grid, cards-grid, studio-presence, customers-carousel, faq, cta-banner, signature) |
| Build Tailwind | `npm run tw` (watch) ou `npx tailwindcss -i ./input.css -o ./assets/output.css --minify` (one-shot) |
| Doc Shopify section schema | https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema |
| Doc Shopify settings | https://shopify.dev/docs/storefronts/themes/architecture/settings |

---

**Trigger ce skill** : à l'instant où on touche `sections/*.liquid`, `templates/*.json`, ou qu'on crée un nouveau composant front pour MyselfMonArt. Ne pas attendre que Walid le redemande.
