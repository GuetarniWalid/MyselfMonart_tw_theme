// Génère les cinq modèles de notification Shopify, dans les cinq langues de la boutique.
//
//   node build.mjs   →   dist/<modèle>.<langue>.liquid   et   dist/sujets.json
//
// Une seule source pour la mise en page : une correction se fait ici, jamais dans Shopify.
// Le code reste en tables et en styles en ligne : c'est ce qui passe partout, Outlook compris.
// Aucun texte dans une image, aucune hauteur fixe, aucun pixel de suivi, un bouton au plus.

import { mkdirSync, writeFileSync } from 'node:fs'
import { LOCALES } from './strings.mjs'
import { FONT_URL, LOGO_DARK, LOGO_HEIGHT, LOGO_LIGHT, LOGO_WIDTH } from './marque.mjs'

// --- Charte ----------------------------------------------------------------------------------
// Papier crème, encre brune, terracotta : la palette des mails du bon de 15 €, pour que la marque
// parle d'une seule voix. Un seul fond, sans carte : on lit une lettre, pas un formulaire.

const INK = '#21150c'
const TXT = '#4a3f37'
const SUB = '#6b5e55'
const ACC = '#a0502f'
const HAIR = '#ddd5ca'
const PAPER = '#f6f2ec'
const TILE = '#fffffe'
const BLUSH = '#f1dfd6'
const BLUSH_INK = '#7a3d24'
const ROSE = '#d79b86'

// Les titres prennent la police du site, Welcome, là où la messagerie accepte une police de marque
// (Apple Mail, Samsung Mail). Gmail la refuse : il affiche ce qu'il y a de plus proche sur l'appareil.
// Welcome reste hors du style en ligne : Outlook passerait sinon en Times.
const TITLE = "'Avenir Next',Avenir,'Century Gothic','Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const SANS = 'Roboto,Helvetica,Arial,sans-serif'

const DARK_RULES = [
  ['body,.bg', 'background-color:#17110b'],
  ['.ink', 'color:#f6ece2'],
  ['.txt', 'color:#e3d5c9'],
  ['.sub', 'color:#c6b5a8'],
  ['.fine', 'color:#bdaba0'],
  ['.acc', 'color:#eba98c'],
  ['.hair', 'border-color:#4a3829'],
  ['.barOn', 'border-color:#eba98c'],
  ['.barOff', 'border-color:#4a3829'],
  ['.panelSoft', 'background-color:#33231a'],
  ['.panelSoft .softLabel', 'color:#eba98c'],
  ['.panelDark', 'background-color:#2a1d13'],
  ['a', 'color:#eeb193'],
  ['.fine a', 'color:#e2d2c6'],
  ['.panelSoft a,.panelDark a', 'color:#f6ece2'],
  ['.btn', 'background-color:#e8b79f'],
  ['.btn a', 'color:#1c1108'],
  ['.btnLight', 'background-color:#e8b79f'],
  ['.btnLight a', 'color:#1c1108'],
  ['.logo,.logo a', 'color:#f0e2d6'],
  ['.logoLight', 'display:none'],
  ['.logoDark', 'display:block'],
]

const declare = (css) =>
  css
    .split(';')
    .map((d) => `${d} !important`)
    .join(';')

const darkCss = () =>
  `@media (min-width:1px){\n  :root{color-scheme:light dark;supported-color-schemes:light dark}\n}\n@media (prefers-color-scheme:dark){\n${DARK_RULES.map(([s, d]) => `  ${s}{${declare(d)}}`).join('\n')}\n}`

// Outlook.com et Windows Mail ignorent la media query et posent ces attributs sur ce qu'ils
// inversent. Bloc séparé : si un client rejette ce sélecteur, le reste du CSS survit.
const outlookDarkCss = () => {
  const rules = ['[data-ogsc]', '[data-ogsb]'].flatMap((attr) =>
    DARK_RULES.map(
      ([s, d]) => `  ${s.split(',').map((one) => `${attr} ${one}`).join(',')}{${declare(d)}}`
    )
  )
  return `@media (min-width:1px){\n${rules.join('\n')}\n}`
}

// Dans une media query : c'est la seule forme que Shopify garde telle quelle.
const fontCss = () => `@media (min-width:1px){
  @font-face{font-family:'Welcome Web';src:url('${FONT_URL}') format('woff2');font-weight:400;font-style:normal}
  .ff{font-family:'Welcome Web',${TITLE} !important}
}`

const BASE_CSS = `body{margin:0;padding:0;width:100%;background-color:${PAPER}}
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
a{color:${ACC}}
@media (min-width:1px){
  a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;font-size:inherit !important;font-family:inherit !important;font-weight:inherit !important;line-height:inherit !important}
}
@media only screen and (max-width:620px){
  .outer{padding:0 !important}
  .px{padding-left:24px !important;padding-right:24px !important}
  .h1{font-size:26px !important;line-height:34px !important}
  .btnw{width:100% !important}
  .tile{padding:28px 20px !important}
  .panel{padding:26px 22px !important}
  .trk{font-size:19px !important;letter-spacing:0 !important}
  .stack{display:block !important;width:100% !important;padding-right:0 !important}
}
@media only screen and (max-width:360px){
  .thumb{width:54px !important;padding-right:10px !important}
  .thumbImg{width:44px !important}
}`

// --- Typographie -----------------------------------------------------------------------------
// Apostrophes courbes partout, et en français les espaces insécables devant : ; ? !

const curl = (value) => value.replace(/'/g, '’')
const french = (value) => curl(value).replace(/ ([:;?!])/g, ' $1')

function typeset(node, fix) {
  if (typeof node === 'string') return fix(node)
  if (Array.isArray(node)) return node.map((item) => typeset(item, fix))
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      key === 'lang' || key === 'path' ? value : typeset(value, fix),
    ])
  )
}

// --- Briques ---------------------------------------------------------------------------------

const PAD = '&#847;&zwnj;&nbsp;'.repeat(20)
const HIDDEN = `display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;`

const text = (size, line, color, extra = '') =>
  `font-family:${SANS};font-size:${size}px;line-height:${line}px;color:${color};mso-line-height-rule:exactly;${extra}`
const title = (size, line, color, weight = 'normal') =>
  `font-family:${TITLE};font-size:${size}px;line-height:${line}px;color:${color};font-weight:${weight};mso-line-height-rule:exactly;`
const label = text(12, 16, SUB, 'letter-spacing:1.5px;text-transform:uppercase;')

const firstName = `{%- assign first_name = customer.first_name | strip -%}
{%- assign first_name_caps = first_name | upcase -%}
{%- if first_name != blank and first_name == first_name_caps -%}{%- assign first_name = first_name | downcase | capitalize -%}{%- endif -%}`

const hello = (s) =>
  `{% if first_name != blank %}${s.hello} {{ first_name }},{% else %}${s.helloBare}{% endif %}`

// Titre selon le nombre d'œuvres. Le kit d'accrochage ne compte pas : seule une ligne qui
// annonce un format (« 30x40 cm ») est une œuvre, et ce test marche dans toutes les langues.
// Shopify range le format dans le titre de la variante, pas dans celui de la ligne.
const lineFormat = (v) =>
  `{%- assign line_format = ${v}.variant.title | append: ' ' | append: ${v}.variant_title | append: ' ' | append: ${v}.title -%}`

const pickTitle = (m) =>
  `{% if art_count == 1 %}${m.titleOne}{% elsif art_count > 1 %}${m.titleMany}{% else %}${m.titleOther}{% endif %}`

const countFulfilled = `${firstName}
{%- assign art_count = 0 -%}
{%- assign hero = nil -%}
{%- for fl in fulfillment.fulfillment_line_items -%}
${lineFormat('fl.line_item')}
{%- if line_format contains ' cm' -%}
{%- assign art_count = art_count | plus: fl.quantity -%}
{%- if hero == nil and fl.line_item.image -%}{%- assign hero = fl.line_item -%}{%- endif -%}
{%- endif -%}
{%- endfor -%}`

const countOrdered = `${firstName}
{%- assign art_count = 0 -%}
{%- assign hero = nil -%}
{%- for line in subtotal_line_items -%}
${lineFormat('line')}
{%- if line_format contains ' cm' -%}
{%- assign art_count = art_count | plus: line.quantity -%}
{%- if hero == nil and line.image -%}{%- assign hero = line -%}{%- endif -%}
{%- endif -%}
{%- endfor -%}`

const lineTitle = (v) => `{%- assign item_title = ${v}.product.title | default: ${v}.title -%}
{%- if ${v}.presentment_title != blank -%}{%- assign item_title = ${v}.presentment_title -%}{%- endif -%}`

const head = (s) => `<!DOCTYPE html>
<html lang="${s.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light only">
<title>{{ email_title }}</title>
<style type="text/css">
${BASE_CSS}
</style>
<style type="text/css">
${fontCss()}
</style>
<style type="text/css">
${darkCss()}
</style>
<style type="text/css">
${outlookDarkCss()}
</style>
</head>`

const open = (s, preheader) => `<body class="bg" style="margin:0;padding:0;width:100%;background-color:${PAPER};">
<div role="article" aria-roledescription="email" aria-label="{{ email_title }}" lang="${s.lang}">
<span style="${HIDDEN}">${preheader}</span>
<span style="${HIDDEN}">${PAD}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="bg" bgcolor="${PAPER}" style="background-color:${PAPER};">
<tr><td align="center" class="outer" style="padding:0 12px;">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:600px;margin:0 auto;">
<tr><td align="center" class="px logo" style="padding:36px 44px 30px;${title(22, 30, INK)}">
<a href="{{ shop.url }}" style="display:inline-block;color:${INK};text-decoration:none;">
<img class="logoLight" src="${LOGO_LIGHT}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="MyselfMonArt" style="display:block;width:${LOGO_WIDTH}px;max-width:100%;height:auto;border:0;">
<img class="logoDark" src="${LOGO_DARK}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" alt="" style="display:none;width:${LOGO_WIDTH}px;max-width:100%;height:auto;border:0;mso-hide:all;">
</a>
</td></tr>`

const nowrap = (words) => words.replace(/ /g, '&nbsp;')

const close = (s) => `<tr><td class="px" style="padding:0 44px;"><p class="hair" style="margin:0;border-top:1px solid ${HAIR};font-size:0;line-height:0;">&nbsp;</p></td></tr>
<tr><td align="center" class="px fine" style="padding:22px 44px 44px;${text(13, 21, SUB, 'text-align:center;')}">
${s.tagline} ${s.studio}<br>
<a href="{{ shop.url }}${s.path}/policies/refund-policy" style="color:${SUB};text-decoration:underline;">${nowrap(s.returns)}</a>
&nbsp;·&nbsp; <a href="{{ shop.url }}${s.path}/policies/terms-of-service" style="color:${SUB};text-decoration:underline;">${nowrap(s.terms)}</a>
&nbsp;·&nbsp; <a href="{{ shop.url }}${s.path}/policies/privacy-policy" style="color:${SUB};text-decoration:underline;">${nowrap(s.privacy)}</a>
&nbsp;·&nbsp; <a href="{{ shop.url }}${s.path}/policies/legal-notice" style="color:${SUB};text-decoration:underline;">${nowrap(s.legal)}</a>
<!-- shopify-managed-taxes-footer -->
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</div>
</body>
</html>`

// Le repère de la série : quatre filets, le nom de l'étape en cours et son numéro. Un seul nom
// affiché : il tient à toutes les largeurs et dans toutes les langues, sans jamais se serrer.
const steps = (s, current) => {
  const step = Math.min(current, 4)
  const bars = s.steps.map((_, i) => {
    const reached = i < current
    return `<td width="25%" class="${reached ? 'barOn' : 'barOff'}" style="border-top:2px solid ${reached ? ACC : HAIR};font-size:0;line-height:0;">&nbsp;</td>`
  })
  const gap = '<td width="6" style="font-size:0;line-height:0;">&nbsp;</td>'
  return `<tr><td class="px" style="padding:0 44px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${bars.join(gap)}</tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td class="ink" style="padding-top:8px;${text(13, 18, INK, 'font-weight:bold;')}">${s.steps[step - 1]}</td>
<td align="right" class="sub" style="padding-top:8px;${text(13, 18, SUB)}">${s.stepCount.replace('{n}', step)}</td>
</tr></table>
</td></tr>`
}

const eyebrow = (s, top = 40) => `<tr><td class="px acc" style="padding:${top}px 44px 0;${text(12, 16, ACC, 'letter-spacing:1.5px;text-transform:uppercase;')}">${s.order} {{ order_name }}</td></tr>`

const heading = (words) => `<tr><td class="px" style="padding:12px 44px 0;">
<h1 class="h1 ink ff" style="margin:0;${title(29, 37, INK, '600')}">${words}</h1>
</td></tr>`

const paragraphs = (...lines) => `<tr><td class="px" style="padding:18px 44px 0;">
${lines
  .map(
    (line, i) =>
      `<p class="txt" style="margin:${i ? '12px' : '0'} 0 0;${text(16, 26, TXT)}">${line}</p>`
  )
  .join('\n')}
</td></tr>`

const button = (href, words, { light = false, top = 28 } = {}) => {
  const bg = light ? ROSE : INK
  const fg = light ? INK : '#fffffe'
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btnw" style="border-collapse:separate;margin-top:${top}px;">
<tr><td align="center" class="${light ? 'btnLight' : 'btn'}" bgcolor="${bg}" style="background-color:${bg};mso-padding-alt:16px 40px;">
<a href="${href}" style="display:block;padding:16px 40px;font-family:${SANS};font-size:16px;line-height:20px;font-weight:bold;letter-spacing:0.2px;color:${fg};text-decoration:none;mso-line-height-rule:exactly;">${words}</a>
</td></tr></table>`
}

const buttonRow = (href, words) => `<tr><td class="px" style="padding:0 44px;">${button(href, words)}</td></tr>`

const textLink = (href, words, top = 22) => `<tr><td class="px" style="padding:${top}px 44px 0;${text(16, 26, ACC)}">
<a href="${href}" style="color:${ACC};text-decoration:underline;">${words}</a>
</td></tr>`

// L'œuvre sur sa tuile blanche, avec de l'air, comme sur le mur d'une galerie, puis son cartel.
// Shopify rend l'image dans un carré sans la rogner : portrait ou paysage, rien n'est coupé.
const artTile = ({ width = 300, top = 40, cartel = true, when = 'art_count == 1 and hero' } = {}) => `{%- if ${when} -%}
${lineTitle('hero')}
<tr><td class="px" style="padding:${top}px 44px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td align="center" class="tile" bgcolor="${TILE}" style="background-color:${TILE};padding:44px 28px;">
<img src="{{ hero | img_url: '800x800' }}" width="${width}" alt="{{ item_title | escape }}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;">
</td></tr>${
  cartel
    ? `
<tr><td style="padding-top:14px;">
<p class="ink ff" style="margin:0;${title(16, 23, INK)}">{{ item_title }}</p>
{%- if hero.variant.title != blank and hero.variant.title != 'Default Title' %}
<p class="sub" style="margin:2px 0 0;${text(14, 21, SUB)}">{{ hero.variant.title }}</p>
{%- endif %}
</td></tr>`
    : ''
}
</table>
</td></tr>
{%- endif -%}`

// Une ligne d'article : vignette, titre, format et quantité.
const itemCells = (s, v, qty, { thumb = true } = {}) => `${
  thumb
    ? `<td width="76" valign="top" class="hair thumb" style="width:76px;padding:14px 16px 14px 0;border-top:1px solid ${HAIR};">
{%- if ${v}.image %}<img src="{{ ${v} | img_url: '160x160' }}" width="60" alt="" class="thumbImg" style="display:block;width:60px;height:auto;border:0;">{%- endif %}
</td>`
    : ''
}
<td valign="top" class="hair" style="padding:14px 0;border-top:1px solid ${HAIR};">
<p class="ink ff" style="margin:0;word-break:break-word;${title(16, 23, INK)}">{{ item_title }}</p>
<p class="sub" style="margin:2px 0 0;${text(14, 21, SUB)}">
{%- if ${v}.variant.title != blank and ${v}.variant.title != 'Default Title' %}{{ ${v}.variant.title }}{%- endif -%}
{%- if ${qty} > 1 %}{%- if ${v}.variant.title != blank and ${v}.variant.title != 'Default Title' %} &nbsp;·&nbsp; {% endif %}${s.qty} : {{ ${qty} }}{%- endif %}
</p>`

// La liste d'un colis, sans prix : ce n'est plus le sujet.
const parcelList = (s, { top = 40, when = null, title = s.inThisParcel } = {}) => `${when ? `{%- if ${when} -%}` : ''}
<tr><td class="px" style="padding:${top}px 44px 0;">
<p class="sub" style="margin:0 0 8px;${label}">${title}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
{%- for fl in fulfillment.fulfillment_line_items -%}
{%- assign item = fl.line_item -%}
${lineTitle('item')}
<tr>
${itemCells(s, 'item', 'fl.quantity')}
</td>
</tr>
{%- endfor -%}
</table>
</td></tr>
${when ? '{%- endif -%}' : ''}`

const partialNote = (s) => `{%- if fulfillment.item_count != item_count -%}
<tr><td class="px sub" style="padding:14px 44px 0;${text(14, 22, SUB)}">${s.partial}</td></tr>
{%- endif -%}`

const signature = (s, top = 40, { question = true } = {}) => `<tr><td class="px" style="padding:${top}px 44px 44px;">
${question ? `<p class="txt" style="margin:0 0 18px;${text(15, 24, TXT)}">${s.question}</p>` : ''}
<p class="txt" style="margin:0;${text(15, 24, TXT)}">${s.signoff}</p>
<p class="ink ff" style="margin:2px 0 0;${title(17, 25, INK)}">${s.signature}</p>
</td></tr>`

const orderUrl = (s) => `{% if order_status_url %}{{ order_status_url }}{% else %}{{ shop.url }}${s.path}{% endif %}`
const trackUrl = (s) =>
  `{% if fulfillment.tracking_url %}{{ fulfillment.tracking_url }}{% else %}${orderUrl(s)}{% endif %}`

// Le numéro de suivi, en chiffres droits et sélectionnable d'un appui long.
const trackingLines = (color) => `{%- for tracking_number in fulfillment.tracking_numbers -%}
{%- if fulfillment.tracking_urls[forloop.index0] -%}
<a href="{{ fulfillment.tracking_urls[forloop.index0] }}" style="color:${color};text-decoration:none;">{{ tracking_number }}</a>
{%- else -%}
{{ tracking_number }}
{%- endif -%}
{%- unless forloop.last %}<br>{% endunless -%}
{%- endfor -%}`

// Le nom du transporteur est tu s'il vaut « Other », le mot que Shopify écrit quand il ne le
// connaît pas.
const trackingPanel = (s, m, { dark }) => {
  const bg = dark ? INK : BLUSH
  const labelColor = dark ? '#e8cdbf' : BLUSH_INK
  const value = dark ? '#fffffe' : INK
  const note = dark ? '#e6d6cd' : TXT
  return `<tr><td class="px" style="padding:32px 44px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td class="panel ${dark ? 'panelDark' : 'panelSoft'}" bgcolor="${bg}" style="background-color:${bg};padding:30px 28px;">
<p${dark ? '' : ' class="softLabel"'} style="margin:0;${text(12, 16, labelColor, 'letter-spacing:1.5px;text-transform:uppercase;')}">
{%- if fulfillment.tracking_numbers.size > 1 %}${m.panelLabelMany ?? m.panelLabel}{%- else %}${m.panelLabel}{%- endif -%}
{%- if fulfillment.tracking_company != blank and fulfillment.tracking_company != 'Other' %} &nbsp;·&nbsp; {{ fulfillment.tracking_company }}{%- endif -%}
</p>
<p class="trk${dark ? '' : ' ink'}" style="margin:8px 0 0;${text(20, 30, value, 'letter-spacing:0.5px;word-break:break-all;')}">
${trackingLines(value)}
</p>
{%- if fulfillment.estimated_delivery_at %}
<p${dark ? '' : ' class="txt"'} style="margin:8px 0 0;${text(15, 23, note)}">${m.estimated} : {{ fulfillment.estimated_delivery_at | date: format: 'date' }}</p>
{%- endif %}
${button(trackUrl(s), m.button, { light: dark, top: 22 })}
${m.note ? `<p style="margin:16px 0 0;${text(14, 21, note)}">${m.note}</p>` : ''}
</td></tr>
</table>
</td></tr>`
}

// --- Les cinq mails --------------------------------------------------------------------------

// 1. Merci : l'œuvre, seule sur sa tuile. Le seul mail qui détaille les prix.
const confirmation = (s) => {
  const m = s.confirmation
  const greeting = `{% if art_count == 1 %}${m.titleOne}{% elsif art_count > 1 %}${m.titleMany}{% else %}${m.titleOther}{% endif %}{% if first_name != blank %}, {{ first_name }}{% endif %}`
  const row = (name, value, { strong = false, top = 6 } = {}) => `<tr>
<td class="${strong ? 'ink' : 'txt'}" style="padding-top:${top}px;${text(strong ? 16 : 15, 24, strong ? INK : TXT, strong ? 'font-weight:bold;' : '')}">${name}</td>
<td align="right" class="${strong ? 'ink' : 'txt'}" style="padding-top:${top}px;${strong ? text(20, 26, INK, 'font-weight:bold;') : text(15, 24, TXT)}white-space:nowrap;">${value}</td>
</tr>`
  const info = (name, value) => `<p class="sub" style="margin:0 0 6px;${label}">${name}</p>
<div class="txt" style="${text(15, 23, TXT)}">${value}</div>`

  const payment = `<p class="sub" style="margin:0 0 6px;${label}">${m.payment}</p>
{%- for transaction in transactions -%}
{%- if transaction.status == 'success' or transaction.status == 'pending' -%}
{%- if transaction.kind == 'capture' or transaction.kind == 'sale' %}
<p class="txt" style="margin:0;${text(15, 23, TXT)}">
{%- if transaction.payment_details.credit_card_company -%}
{{ transaction.payment_details.credit_card_company }} ${m.endingIn} {{ transaction.payment_details.credit_card_last_four_digits }}
{%- elsif transaction.gateway_display_name == 'Gift card' -%}
${m.giftCard} ${m.endingIn} {{ transaction.payment_details.gift_card.last_four_characters | upcase }} ({{ transaction.amount | money }})<br>${m.balance} : {{ transaction.payment_details.gift_card.balance | money }}
{%- else -%}
{{ transaction.gateway_display_name }}
{%- endif -%}
</p>
{%- endif -%}
{%- endif -%}
{%- endfor %}`

  return `${countOrdered}
{%- assign one_line = false -%}
{%- if art_count == 1 and hero and subtotal_line_items.size == 1 -%}{%- assign one_line = true -%}{%- endif -%}
{%- capture email_title %}${m.title}{% endcapture -%}
${head(s)}
${open(s, m.preheader)}
${steps(s, 1)}
${eyebrow(s)}
${heading(greeting)}
${paragraphs(m.body)}
{%- if consolidated_estimated_delivery_time -%}
<tr><td class="px txt" style="padding:12px 44px 0;${text(15, 24, TXT)}">${m.estimated} : <strong class="ink" style="color:${INK};">{{ consolidated_estimated_delivery_time }}</strong></td></tr>
{%- endif -%}
{%- if delivery_instructions != blank -%}
<tr><td class="px txt" style="padding:12px 44px 0;${text(15, 24, TXT)}">${m.instructions} : {{ delivery_instructions }}</td></tr>
{%- endif -%}
${buttonRow(orderUrl(s), m.button)}
${artTile({ cartel: true, when: 'one_line' })}
${artTile({ cartel: false, when: 'one_line == false and art_count == 1 and hero' })}
{%- assign gift_card_line_item = line_items | where: "gift_card" -%}
{%- if gift_card_line_item.first -%}
<tr><td class="px txt" style="padding:20px 44px 0;${text(15, 24, TXT)}">${m.giftCards}</td></tr>
{%- endif -%}
<tr><td class="px" style="padding:40px 44px 0;">
<p class="sub" style="margin:0 0 8px;${label}">${m.recap}</p>
{%- unless one_line %}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
{%- for line in subtotal_line_items -%}
${lineTitle('line')}
<tr>
{%- if art_count == 1 and hero %}
${itemCells(s, 'line', 'line.quantity', { thumb: false })}
{%- else %}
${itemCells(s, 'line', 'line.quantity')}
{%- endif %}
{%- for property in line.properties -%}
{%- assign property_first_char = property.first | slice: 0 -%}
{%- unless property.last == blank or property_first_char == '_' %}
<p class="sub" style="margin:2px 0 0;${text(14, 21, SUB)}">{{ property.first }} : {{ property.last }}</p>
{%- endunless -%}
{%- endfor -%}
{%- if line.refunded_quantity > 0 %}
<p class="acc" style="margin:2px 0 0;${text(14, 21, ACC)}">${m.refunded}</p>
{%- endif -%}
{%- for discount_allocation in line.discount_allocations -%}
{%- if discount_allocation.discount_application.target_selection != 'all' %}
<p class="acc" style="margin:2px 0 0;${text(14, 21, ACC)}">{{ discount_allocation.discount_application.title }} (-{{ discount_allocation.amount | money }})</p>
{%- endif -%}
{%- endfor %}
</td>
<td valign="top" align="right" class="hair txt" style="padding:14px 0 14px 12px;border-top:1px solid ${HAIR};white-space:nowrap;${text(15, 23, TXT)}">
{%- if line.final_line_price > 0 %}{{ line.final_line_price | money }}{%- else %}${m.freeItem}{%- endif %}
</td>
</tr>
{%- endfor -%}
</table>
{%- endunless %}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="hair" style="border-top:1px solid ${HAIR};">
<tr><td colspan="2" style="font-size:0;line-height:0;height:8px;">&nbsp;</td></tr>
${row(m.subtotal, '{{ subtotal_price | money }}', { top: 0 })}
{%- for discount_application in discount_applications -%}
{%- if discount_application.target_selection == 'all' -%}
${row(`${m.discount}{% if discount_application.title %} ({{ discount_application.title }}){% endif %}`, '-{{ discount_application.total_allocated_amount | money }}')}
{%- endif -%}
{%- endfor -%}
${row(m.shipping, `{% if shipping_price > 0 %}{{ shipping_price | money }}{% else %}${m.free}{% endif %}`)}
{%- if total_duties -%}
${row(m.duties, '{{ total_duties | money }}')}
{%- endif -%}
{%- if tax_price > 0 -%}
${row(m.taxes, '{{ tax_price | money }}')}
{%- endif -%}
{%- if total_tip and total_tip > 0 -%}
${row(m.tip, '{{ total_tip | money }}')}
{%- endif -%}
{%- if payment_terms -%}
{%- assign transaction_amount = 0 -%}
{%- for transaction in transactions -%}
{%- if transaction.status == 'success' -%}
{%- unless transaction.kind == 'authorization' or transaction.kind == 'void' -%}
{%- assign transaction_amount = transaction_amount | plus: transaction.amount -%}
{%- endunless -%}
{%- endif -%}
{%- endfor -%}
${row(m.paidToday, '{{ transaction_amount | money_with_currency }}', { strong: true, top: 12 })}
${row(`${m.dueOn} {{ payment_terms.next_payment.due_at | date: format: 'date' }}`, '{{ payment_terms.next_payment.amount_due | money_with_currency }}')}
{%- else -%}
${row(m.total, '{{ total_price | money_with_currency }}', { strong: true, top: 12 })}
{%- endif -%}
</table>
</td></tr>
{%- assign address_shipped = shipping_address | format_address -%}
{%- assign address_billed = billing_address | format_address -%}
<tr><td class="px" style="padding:36px 44px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
{%- if requires_shipping and shipping_address %}
<td valign="top" width="50%" class="stack" style="padding:0 16px 24px 0;">
${info(m.shipTo, '{{ shipping_address | format_address }}')}
</td>
{%- endif %}
<td valign="top" width="50%" class="stack" style="padding:0 0 24px;">
${payment}
</td>
</tr>
{%- if billing_address and address_billed != address_shipped %}
<tr>
<td valign="top" width="50%" class="stack" style="padding:0 16px 8px 0;">
${info(m.billTo, '{{ billing_address | format_address }}')}
</td>
<td width="50%" class="stack" style="font-size:0;line-height:0;">&nbsp;</td>
</tr>
{%- endif %}
</table>
</td></tr>
${signature(s, 16)}
${close(s)}`
}

// 2. En fabrication : une lettre, sans photo ni bouton. Shopify l'envoie quand la commande est
// marquée traitée, c'est-à-dire au passage à l'atelier. Si un numéro de suivi existe déjà à ce
// moment-là, le colis n'est plus en fabrication : le mail prend le texte de « terminée ».
const making = (s) => {
  const m = s.making
  const list = m.list
    .map(
      ([name, detail], i) => `<tr>
<td valign="top" class="hair" style="padding:14px 0;border-top:1px solid ${HAIR};">
<p class="ink ff" style="margin:0;${title(17, 24, INK)}">${name}</p>
<p class="txt" style="margin:2px 0 0;${text(15, 23, TXT)}">${detail}</p>
</td>
</tr>`
    )
    .join('\n')
  return `${countFulfilled}
{%- if fulfillment.tracking_numbers.size > 0 -%}
${readyBody(s)}
{%- else -%}
{%- capture email_title %}${pickTitle(m)}{% endcapture -%}
${head(s)}
${open(s, m.preheader)}
${steps(s, 2)}
${eyebrow(s)}
${heading(pickTitle(m))}
${paragraphs(hello(s), m.body)}
${partialNote(s)}
<tr><td class="px" style="padding:36px 44px 0;">
<p class="sub" style="margin:0 0 8px;${label}">${m.listTitle}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
${list}
</table>
</td></tr>
${parcelList(s, { top: 32, title: s.confirmation.recap })}
${textLink(orderUrl(s), m.button)}
${signature(s, 32)}
${close(s)}
{%- endif -%}`
}

// 3. Terminée : c'est le numéro de suivi qui fait l'événement, sur un aplat d'encre.
function readyBody(s) {
  const m = s.ready
  return `{%- capture email_title %}${pickTitle(m)}{% endcapture -%}
${head(s)}
${open(s, m.preheader)}
${steps(s, 3)}
${eyebrow(s)}
${heading(pickTitle(m))}
${paragraphs(hello(s), m.body)}
${partialNote(s)}
${trackingPanel(s, m, { dark: true })}
${parcelList(s, { top: 36 })}
${signature(s, 36)}
${close(s)}`
}

const ready = (s) => `${countFulfilled}
${readyBody(s)}`

// 4. Arrive bientôt : le plus court, il tient sur un écran de téléphone.
const out = (s) => {
  const m = s.out
  return `${countFulfilled}
{%- capture email_title %}${pickTitle(m)}{% endcapture -%}
${head(s)}
${open(s, m.preheader)}
${steps(s, 4)}
${eyebrow(s)}
${heading(pickTitle(m))}
${paragraphs(hello(s), m.body)}
${partialNote(s)}
${trackingPanel(s, m, { dark: false })}
${signature(s, 36)}
${close(s)}`
}

// 5. Arrivée : l'œuvre d'abord, en grand. Pas de bouton : plus rien à faire, seulement à profiter.
const delivered = (s) => {
  const m = s.delivered
  return `${countFulfilled}
{%- capture email_title %}${pickTitle(m)}{% endcapture -%}
${head(s)}
${open(s, m.preheader)}
${steps(s, 5)}
${artTile({ width: 400, top: 32 })}
${eyebrow(s, 36)}
${heading(pickTitle(m))}
${paragraphs(hello(s), m.body)}
${partialNote(s)}
${parcelList(s, { top: 32, when: 'art_count != 1 or hero == nil' })}
<tr><td class="px" style="padding:32px 44px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td class="hair" style="padding:16px 0;border-top:1px solid ${HAIR};border-bottom:1px solid ${HAIR};">
<p class="ink ff" style="margin:0;${title(17, 24, INK)}">${m.tipTitle}</p>
<p class="txt" style="margin:2px 0 0;${text(15, 23, TXT)}">${m.tip}</p>
</td></tr>
</table>
</td></tr>
<tr><td class="px txt" style="padding:24px 44px 0;${text(15, 24, TXT)}">${m.help}</td></tr>
${textLink(orderUrl(s), m.link, 12)}
${signature(s, 28, { question: false })}
${close(s)}`
}

export const TEMPLATES = {
  order_confirmation: { build: confirmation, part: 'confirmation' },
  shipping_confirmation: { build: making, part: 'making' },
  shipping_update: { build: ready, part: 'ready' },
  shipment_out_for_delivery: { build: out, part: 'out' },
  shipment_delivered: { build: delivered, part: 'delivered' },
}

mkdirSync('dist', { recursive: true })
const subjects = {}
for (const [locale, raw] of Object.entries(LOCALES)) {
  const s = typeset(raw, locale === 'fr' ? french : curl)
  subjects[locale] = {}
  for (const [name, { build, part }] of Object.entries(TEMPLATES)) {
    writeFileSync(`dist/${name}.${locale}.liquid`, build(s))
    subjects[locale][name] = s[part].subject.replace('{n}', '{{ name }}')
  }
  // Le mail « en fabrication » dit « terminée » si un numéro de suivi existe déjà.
  subjects[locale].shipping_confirmation = `{% if fulfillment.tracking_numbers.size > 0 %}${s.ready.subject.replace('{n}', '{{ name }}')}{% else %}${s.making.subject.replace('{n}', '{{ name }}')}{% endif %}`
}
writeFileSync('dist/sujets.json', JSON.stringify(subjects, null, 2))
console.log('Modèles générés :', Object.keys(TEMPLATES).length * Object.keys(LOCALES).length)
