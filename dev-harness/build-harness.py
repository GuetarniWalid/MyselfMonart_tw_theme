# -*- coding: utf-8 -*-
"""
Génère dev-harness/promo-popup-harness.html À PARTIR de snippets/promo-popup.liquid.

Pourquoi : le banc a dérivé deux fois du snippet (attribut `hidden` puis classe `bottom-3`),
et chaque fois le test a validé un markup qui n'était plus celui de production. On résout le
Liquid mécaniquement plutôt que de recopier à la main.

Usage :  python dev-harness/build-harness.py
"""
import io, json, os, re, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNIPPET = os.path.join(RACINE, "snippets", "promo-popup.liquid")
SORTIE = os.path.join(RACINE, "dev-harness", "promo-popup-harness.html")

# Langue et MARCHÉ sont deux axes indépendants — c'est précisément ce qu'il faut pouvoir tester :
#   python dev-harness/build-harness.py            → fr / France / EUR
#   python dev-harness/build-harness.py fr CA      → fr / Canada / CAD (+ mentions canadiennes)
#   python dev-harness/build-harness.py en US      → en / États-Unis / USD
PAYS = {"FR": "EUR", "US": "USD", "CA": "CAD", "CH": "CHF", "GB": "GBP", "JP": "JPY"}
LANG = sys.argv[1] if len(sys.argv) > 1 else "fr"
CODE_PAYS = (sys.argv[2] if len(sys.argv) > 2 else "FR").upper()
if CODE_PAYS not in PAYS:
    raise SystemExit("pays inconnu : %s (attendu %s)" % (CODE_PAYS, "/".join(PAYS)))
DEVISE = PAYS[CODE_PAYS]
LOCALE = os.path.join(RACINE, "locales", ("fr.default" if LANG == "fr" else LANG) + ".json")
if not os.path.exists(LOCALE):
    raise SystemExit("locale inconnue : %s" % LANG)

CODE = "MERCI-K7QX"
DEADLINE = "30 septembre 2026"
UNTIL_TS = "1790812799"  # 2026-09-30T23:59:59+02:00

raw = io.open(LOCALE, encoding="utf-8").read().lstrip("﻿")
T = json.loads(raw[raw.find("{"):])["sections"]["promo_popup"]

# Le snippet ne s'affiche pas hors des 5 devises servies. Le banc doit reproduire ce verdict,
# sinon on testerait un encart que la production n'aurait jamais rendu.
if DEVISE not in ("EUR", "USD", "CAD", "CHF", "GBP"):
    raise SystemExit("devise %s non servie — en production l'encart ne s'affiche PAS. "
                     "C'est le comportement attendu, pas une erreur du banc." % DEVISE)
CLE = DEVISE.lower()
MONTANT = T["amount_" + CLE]
SEUIL = T["threshold_" + CLE]
BASCULE = T["crossover_" + CLE]
PARAMS = {"min": SEUIL, "amount": MONTANT, "seuil": BASCULE}

s = io.open(SNIPPET, encoding="utf-8").read()

# 1) on ne garde que le corps rendu (entre le {% if %} et le {% endif %})
s = s[s.index("<promo-popup"): s.rindex("</promo-popup>") + len("</promo-popup>")]

# 2) déplier la boucle des 3 conditions
bloc = re.search(r"\{%-\s*for i in \(1\.\.3\)\s*-%\}(.*?)\{%-\s*endfor\s*-%\}", s, re.S)
if bloc:
    motif = bloc.group(1)
    déplié = "".join(motif.replace("append: i", "append: %d" % i) for i in (1, 2, 3))
    s = s[:bloc.start()] + déplié + s[bloc.end():]

# 3) commentaires Liquid — en REPRODUISANT le contrôle d'espaces.
# ⛔ Ne jamais revenir à un simple re.sub(..., "") : il laisse les espaces autour du commentaire,
# alors que Liquid les MANGE quand la balise porte un tiret (`{%-` à gauche, `-%}` à droite).
# Sans cette fidélité, le garde-fou « attribut collé » plus bas est AVEUGLE au cas qu'il vise :
# un commentaire glissé entre `<a` et son premier attribut rend `<ahref="...` — une balise
# inconnue, stylée comme un bouton mais qui n'est pas un lien, dont le clic ne fait RIEN.
# Survenu en production le 2026-08-07 : le bouton « Appliquer ma remise » n'appliquait rien.
_COMMENT = re.compile(
    r"([ \t]*\n?[ \t]*)?\{%(-?)\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*(-?)%\}([ \t]*\n?[ \t]*)?",
    re.S)
def _sans_commentaire(m):
    avant, tiret_gauche, tiret_droit, apres = m.groups()
    return ("" if tiret_gauche == "-" else (avant or "")) + \
           ("" if tiret_droit == "-" else (apres or ""))
s = _COMMENT.sub(_sans_commentaire, s)

# 4) traductions, y compris les clés construites par concaténation
def trad(m):
    expr = m.group(1)
    concat = re.match(r"'sections\.promo_popup\.([a-z_]+)'\s*\|\s*append:\s*(\d+)\s*\|\s*append:\s*'([a-z_]+)'\s*\|\s*t(?:\s*:\s*(min|amount|seuil):\s*promo_\w+)?", expr)
    if concat:
        val = T.get(concat.group(1) + concat.group(2) + concat.group(3), "??")
        # `cond_1_lead` porte le seuil d'achat : la clé est construite ET paramétrée.
        if concat.group(4):
            val = val.replace("{{ %s }}" % concat.group(4), PARAMS[concat.group(4)])
        return val
    # ⚠️ `date: '@@'` — le thème rend volontairement un MARQUEUR que le JS remplace ensuite par
    # l'échéance personnelle du visiteur. Le banc doit le laisser tel quel : y injecter une date
    # ferait passer pour correct un affichage qui, en production, montrerait la fin de campagne.
    marqueur = re.match(r"'sections\.promo_popup\.([a-z0-9_]+)'\s*\|\s*t\s*:\s*date:\s*'@@'", expr)
    if marqueur:
        return T.get(marqueur.group(1), "??").replace("{{ date }}", "@@")
    # Les chaînes paramétrées par la devise : `| t: min: promo_threshold` & co.
    param = re.match(r"'sections\.promo_popup\.([a-z0-9_]+)'\s*\|\s*t\s*:\s*(min|amount|seuil):\s*promo_\w+", expr)
    if param:
        val = PARAMS[param.group(2)]
        return T.get(param.group(1), "??").replace("{{ %s }}" % param.group(2), val)
    simple = re.match(r"'sections\.promo_popup\.([a-z0-9_]+)'\s*\|\s*t(?:\s*:\s*date:\s*\w+)?(?:\s*\|\s*(?:escape|url_encode))?", expr)
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
s = re.sub(r"\{\{\s*request\.locale\.iso_code\s*\}\}", LANG, s)
s = re.sub(r"\{\{\s*promo_currency\s*\}\}", DEVISE, s)
s = re.sub(r"\{\{\s*promo_amount\s*\}\}", MONTANT, s)
s = re.sub(r"\{\{\s*promo_threshold\s*\}\}", SEUIL, s)
s = re.sub(r"\{\{\s*localization\.country\.iso_code\s*\}\}", CODE_PAYS, s)

# Les mentions canadiennes ne sont rendues qu'au Canada : le banc tranche comme le Liquid.
def _canada(m):
    return m.group(1) if CODE_PAYS == "CA" else ""
s = re.sub(r"\{%-\s*if localization\.country\.iso_code == 'CA'\s*-%\}(.*?)\{%-\s*endif\s*-%\}",
           _canada, s, flags=re.S)

# ⛔ Le banc ne doit JAMAIS appeler le vrai back-end : chaque essai créerait un client Shopify
# et un code de remise réels. On pointe sur une adresse bidon, interceptée par le stub du gabarit.
s = s.replace("https://backend.myselfmonart.com/api/newsletter/subscribe", "/__stub/subscribe")

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

# 7bis) le VERDICT SERVEUR (form.posted_successfully?) n'existe pas hors Shopify : le banc
# simule toujours le cas « pas encore soumis ». Le succès se teste en posant à la main
# data-promo-posted="true" sur l'écran 2 depuis la console.
s = re.sub(r"\{%-\s*if form\.posted_successfully\?\s*-%\}.*?\{%-\s*endif\s*-%\}", "", s, flags=re.S)
s = re.sub(r"\{%\s*if promo_posted\s*%\}.*?\{%\s*endif\s*%\}", "", s, flags=re.S)

# 8) le <script> du thème -> le fichier local
s = re.sub(r"<script src=\"\{\{[^}]*\}\}\"[^>]*></script>", "", s)

restes = re.findall(r"\{\{.*?\}\}|\{%.*?%\}", s)
if restes:
    raise SystemExit("STOP — Liquid non résolu : %s" % restes[:5])

# ⛔ Attribut COLLÉ au nom de balise. Le tiret de `{%-` supprime l'espace qui le précède :
# un commentaire glissé entre `<button` et son premier attribut produit `<buttontype="button"`,
# soit un élément qui n'est plus un bouton. Survenu en production le 2026-08-04, invisible à
# la relecture. On refuse de générer plutôt que de tester un markup cassé.
CONNUES = {"button", "input", "form", "div", "span", "label", "a", "p", "ul", "li", "h2",
           "svg", "path", "circle", "template", "promo-popup", "main-product-blocks", "strong"}
for tag in set(re.findall(r"<([a-zA-Z][a-zA-Z0-9-]*)(?=[\s>/])", s)):
    if tag.lower() not in CONNUES:
        raise SystemExit("STOP — balise inconnue « <%s » : attribut probablement collé au nom "
                         "(tiret Liquid `{%%-` ayant mangé l'espace ?)" % tag)
if re.search(r"<[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z]=[\"']", s):
    raise SystemExit("STOP — attribut collé au nom de balise détecté")

GABARIT = u"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Banc d'essai — encart promo ({lang}/{pays}/{devise})</title>
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
  <strong>BANC D'ESSAI — {lang} · {pays} · {devise}</strong>
  <button onclick="reset()">Réinitialiser</button>
  <button onclick="document.querySelector('promo-popup').open()">Ouvrir</button>
  <button onclick="toggleBuy()">Bouton d'achat</button>
  <button onclick="toggleCookie()">Bandeau cookies</button>
  <button onclick="window.__stubMode='ok'">Serveur OK</button>
  <button onclick="window.__stubMode='already'">Déjà inscrit</button>
  <button onclick="window.__stubMode='fail'">Serveur en échec</button>
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
  /* ⛔ STUB DU BACK-END. Le banc ne doit jamais atteindre backend.myselfmonart.com : chaque
     essai y créerait un vrai client Shopify et un vrai code de remise. On intercepte donc
     l'adresse bidon /__stub/subscribe et on rend une réponse conforme au contrat.
     Les trois boutons de la barre pilotent le scénario. */
  window.__stubMode = 'ok';
  const __vraiFetch = window.fetch;
  window.fetch = function (url, opts) {{
    if (String(url).indexOf('/__stub/subscribe') === -1) return __vraiFetch.apply(this, arguments);
    const corps = JSON.parse((opts && opts.body) || '{{}}');
    document.getElementById('log').textContent =
      'POST reçu — ' + corps.email + ' · locale=' + corps.locale
      + ' · currency=' + corps.currency + ' · country=' + corps.country
      + ' · consent=' + corps.consent + (corps.hp ? ' · POT DE MIEL REMPLI' : '');
    window.__dernierPost = corps;
    if (window.__stubMode === 'fail') {{
      return Promise.resolve(new Response(JSON.stringify({{ ok: false, error: 'rate_limited' }}),
        {{ status: 429, headers: {{ 'Content-Type': 'application/json' }} }}));
    }}
    const fin = new Date(Date.now() + 8 * 24 * 3600 * 1000);
    return Promise.resolve(new Response(JSON.stringify({{
      ok: true,
      state: window.__stubMode === 'already' ? 'already' : 'subscribed',
      code: 'MERCI-TEST42',
      expires_at: fin.toISOString(),
    }}), {{ status: 200, headers: {{ 'Content-Type': 'application/json' }} }}));
  }};

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

io.open(SORTIE, "w", encoding="utf-8", newline="\n").write(GABARIT.format(corps=s.strip(), lang=LANG, pays=CODE_PAYS, devise=DEVISE))
print("banc genere : %s — %s / %s / %s (%d octets)"
      % (os.path.basename(SORTIE), LANG, CODE_PAYS, DEVISE, len(s)))
