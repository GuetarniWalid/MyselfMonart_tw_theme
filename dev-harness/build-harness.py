# -*- coding: utf-8 -*-
"""
Génère dev-harness/promo-popup-harness.html À PARTIR de snippets/promo-popup.liquid.

Pourquoi : le banc a dérivé deux fois du snippet (attribut `hidden` puis classe `bottom-3`),
et chaque fois le test a validé un markup qui n'était plus celui de production. On résout le
Liquid mécaniquement plutôt que de recopier à la main.

Usage :  python dev-harness/build-harness.py
"""
import io, json, os, re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNIPPET = os.path.join(RACINE, "snippets", "promo-popup.liquid")
LOCALE = os.path.join(RACINE, "locales", "fr.default.json")
SORTIE = os.path.join(RACINE, "dev-harness", "promo-popup-harness.html")

CODE = "MERCI-K7QX"
DEADLINE = "30 septembre 2026"
UNTIL_TS = "1790812799"  # 2026-09-30T23:59:59+02:00

raw = io.open(LOCALE, encoding="utf-8").read().lstrip("﻿")
T = json.loads(raw[raw.find("{"):])["sections"]["promo_popup"]

s = io.open(SNIPPET, encoding="utf-8").read()

# 1) on ne garde que le corps rendu (entre le {% if %} et le {% endif %})
s = s[s.index("<promo-popup"): s.rindex("</promo-popup>") + len("</promo-popup>")]

# 2) déplier la boucle des 3 conditions
bloc = re.search(r"\{%-\s*for i in \(1\.\.3\)\s*-%\}(.*?)\{%-\s*endfor\s*-%\}", s, re.S)
if bloc:
    motif = bloc.group(1)
    déplié = "".join(motif.replace("append: i", "append: %d" % i) for i in (1, 2, 3))
    s = s[:bloc.start()] + déplié + s[bloc.end():]

# 3) commentaires Liquid
s = re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", s, flags=re.S)

# 4) traductions, y compris les clés construites par concaténation
def trad(m):
    expr = m.group(1)
    concat = re.match(r"'sections\.promo_popup\.([a-z_]+)'\s*\|\s*append:\s*(\d+)\s*\|\s*append:\s*'([a-z_]+)'\s*\|\s*t", expr)
    if concat:
        return T.get(concat.group(1) + concat.group(2) + concat.group(3), "??")
    simple = re.match(r"'sections\.promo_popup\.([a-z0-9_]+)'\s*\|\s*t(?:\s*:\s*date:\s*\w+)?(?:\s*\|\s*escape)?", expr)
    if simple:
        return T.get(simple.group(1), "??").replace("{{ date }}", DEADLINE)
    return ""
# ⚠️ tester « sections.promo_popup » et non « promo_popup » : sinon settings.promo_popup_delay
#    est pris pour une clé de traduction et remplacé par une chaîne vide.
s = re.sub(r"\{\{\s*(.*?)\s*\}\}", lambda m: trad(m) if "sections.promo_popup" in m.group(1) else m.group(0), s)

# 5) le reste des sorties Liquid
s = s.replace("{{ promo_code }}", CODE).replace("{{ end_ts }}", UNTIL_TS)
s = re.sub(r"\{\{\s*promo_code\s*\|[^}]*\}\}", CODE, s)
s = re.sub(r"\{\{\s*'fond-mur-beige-clair-texture\.webp'[^}]*\}\}", "../assets/fond-mur-beige-clair-texture.webp", s)
s = re.sub(r"\{\{\s*routes\.root_url\s*\}\}", "/", s)
s = re.sub(r"\{\{\s*product\.url[^}]*\}\}", "/products/exemple", s)
s = re.sub(r"\{\{\s*settings\.promo_popup_delay[^}]*\}\}", "2", s)
s = re.sub(r"\{\{\s*settings\.promo_popup_pages[^}]*\}\}", "1", s)
s = re.sub(r"\{\{\s*cart\.item_count\s*\}\}", "0", s)

# 6) snippets rendus
ICONE_ERREUR = ('<svg aria-hidden="true" focusable="false" class="inline-block" viewBox="0 0 13 13" width="17" height="17">'
                '<circle cx="6.5" cy="6.5" r="5.5" fill="#f87171"/>'
                '<path d="M5.87 3.53l.1 4.04h1.05l.1-4.04H5.87zm.63 6.13a.66.66 0 100-1.31.66.66 0 000 1.31z" fill="currentColor"/></svg>')
ICONE_REMISE = '<svg aria-hidden="true" focusable="false" width="15" height="15" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor"/></svg>'
s = s.replace("{% render 'tw-icon-error' %}", ICONE_ERREUR).replace("{% render 'tw-icon-discount' %}", ICONE_REMISE)

# 7) le formulaire Shopify
s = re.sub(r"\{%-\s*form 'customer'[^%]*-%\}",
           '<form action="/contact" method="post" class="flex flex-col min-h-0">', s)
s = re.sub(r"\{%-\s*endform\s*-%\}", "</form>", s)

# 8) le <script> du thème -> le fichier local
s = re.sub(r"<script src=\"\{\{[^}]*\}\}\"[^>]*></script>", "", s)

restes = re.findall(r"\{\{.*?\}\}|\{%.*?%\}", s)
if restes:
    raise SystemExit("STOP — Liquid non résolu : %s" % restes[:5])

GABARIT = u"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Banc d'essai — encart promo « bon de 15 € »</title>
<!-- ⚠️ FICHIER GÉNÉRÉ : ne pas éditer à la main. Source = snippets/promo-popup.liquid.
     Régénérer avec :  python dev-harness/build-harness.py  -->
<link rel="stylesheet" href="../assets/output.css">
<style>
  @font-face {{ font-family: "heading"; src: url("../assets/heading.woff2") format("woff2"); font-display: swap; }}
  :root {{
    --color-main-rgb: 33, 21, 12; --color-secondary-rgb: 255, 255, 255;
    --color-brand-50-rgb: 243, 225, 218; --color-brand-500-rgb: 215, 155, 134;
    --color-brand-900-rgb: 109, 55, 36; --color-buy-button-rgb: 215, 155, 134;
    --color-terra-rgb: 166, 84, 55; --anim-motion: cubic-bezier(0.17, 0.67, 0.61, 1.06);
  }}
  body {{ font-family: Roboto, sans-serif; background: #efece8; margin: 0; }}
  .harness-bar {{ position: fixed; top: 0; left: 0; right: 0; z-index: 99; background: #21150c; color: #fff; padding: 8px 12px; font: 12px/1.4 ui-monospace, monospace; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }}
  .harness-bar button {{ font: inherit; padding: 4px 10px; border-radius: 999px; border: 1px solid #fff; background: transparent; color: #fff; cursor: pointer; }}
  .fake-page {{ padding: 60px 16px 200px; max-width: 720px; }}
</style>
</head>
<body>
<div class="harness-bar">
  <strong>BANC D'ESSAI</strong>
  <button onclick="reset()">Réinitialiser</button>
  <button onclick="document.querySelector('promo-popup').open()">Ouvrir</button>
  <button onclick="toggleBuy()">Bouton d'achat</button>
  <button onclick="toggleCookie()">Bandeau cookies</button>
  <span id="log"></span>
</div>
<div class="fake-page">
  <h1 class="font-heading font-bold text-3xl">Fiche produit factice</h1>
  <p class="mt-4">Sur mobile la page doit rester lisible : l'encart n'est pas modal. Sur desktop, le voile la couvre.</p>
  <main-product-blocks class="block mt-8 p-4 border-1 border-main rounded-xl">
    <p class="text-sm text-main-80">&lt;main-product-blocks&gt; — point de montage de la pastille.</p>
    <p class="mt-2 font-heading font-bold text-2xl">102,50 €</p>
  </main-product-blocks>
</div>
<button class="float-buy-button cart-button fixed bottom-3 left-4 md:bottom-6 md:left-1/2 max-w-[70%] z-20 px-6 py-3 rounded-xl bg-buy-button">Ajouter au panier</button>
<div id="cookies-banner" class="fixed bottom-6 left-5 md:left-16 right-5 bg-secondary border-1 border-main rounded-xl max-w-[550px] px-6 py-4 z-50 hidden">Bandeau cookies factice</div>

{corps}

<script>
  window.trapFocus = (e, first, last) => {{
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {{ last.focus(); e.preventDefault(); }}
    else if (!e.shiftKey && document.activeElement === last) {{ first.focus(); e.preventDefault(); }}
  }};
  window.removeTrapFocus = (el) => {{ if (el && el.focus) el.focus(); }};
  if (!window.__mmaPvCounted) {{
    window.__mmaPvCounted = true;
    const bump = () => {{ try {{ sessionStorage.setItem('mma_pv_count', String((parseInt(sessionStorage.getItem('mma_pv_count'),10)||0)+1)); }} catch(e) {{}} }};
    bump(); document.addEventListener('mma:soft-navigation', bump);
  }}
  function reset() {{ localStorage.clear(); sessionStorage.clear(); location.reload(); }}
  function toggleBuy() {{ document.querySelector('.float-buy-button').classList.toggle('hidden'); }}
  function toggleCookie() {{ document.getElementById('cookies-banner').classList.toggle('hidden'); }}
</script>
<script src="../assets/promo-popup.js" defer></script>
</body>
</html>
"""

io.open(SORTIE, "w", encoding="utf-8", newline="\n").write(GABARIT.format(corps=s.strip()))
print("banc genere : %s (%d octets)" % (os.path.basename(SORTIE), len(s)))
