#!/usr/bin/env node
/*
 * i18n leak auditor — méthode DIFF (zéro hallucination).
 * Pour chaque page : fetch FR (référence) + chaque locale cible, extrait des champs
 * normalisés, puis flague UNIQUEMENT les chaînes IDENTIQUES entre FR et la cible sur
 * des champs traduisibles (title/meta/og/headings/alt/JSON-LD/texte visible).
 * → exclut nativement les faux positifs cognats (marco/Rahmen ≠ cadre = chaînes différentes).
 * Sortie : growth/i18n-audit/out/<page>.json (par locale) + candidates.json + report.md
 *
 * Usage : node growth/i18n-audit/audit.mjs            (tout le matrix)
 *         node growth/i18n-audit/audit.mjs /cart /     (sous-ensemble de paths FR)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.myselfmonart.com';
const LOCALES = ['en', 'es', 'de', 'nl']; // FR = référence
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, { recursive: true });

// ----------------------------------------------------------------- matrix
const MATRIX = [
  // [label, frPath, type]
  ['home', '/', 'index'],
  // collections
  ['col-tableau-cuisine', '/collections/tableau-cuisine', 'collection'],
  ['col-tableau-animaux', '/collections/tableau-animaux', 'collection'],
  ['col-tableau-bureau', '/collections/tableau-bureau', 'collection'],
  ['col-horoscope-bebe', '/collections/horoscope-bebe', 'collection'],
  ['col-tableau-abstrait', '/collections/tableau-abstrait', 'collection'],
  // PDP perso (studio)
  ['pdp-foot-gen', '/products/poster-personnalise-foot-votre-enfant-en-joueur-de-legende', 'product'],
  ['pdp-foot-nb', '/products/cadeau-personnalise-foot-noir-et-blanc', 'product'],
  ['pdp-horoscope-bebe', '/products/belier-horoscope-cadeau-personnalise-bebe', 'product'],
  // PDP standard (variété)
  ['pdp-cuisine', '/products/tableau-toile-cocktail-sunrise-eclat-solaire', 'product'],
  ['pdp-bebe-lion', '/products/tableau-chambre-bebe-lion-tendre-aux-yeux-doux-et-couleurs-apaisantes', 'product'],
  // CMS pages
  ['page-apropos', '/pages/a-propos-de-myselfmonart', 'page'],
  ['page-contact', '/pages/contactez-nous', 'page'],
  ['page-faq', '/pages/faq', 'page'],
  ['page-guide-tailles', '/pages/guide-de-tailles', 'page'],
  ['page-cgv', '/pages/conditions-generales-de-vente', 'page'],
  ['page-mentions', '/pages/mentions-legales', 'page'],
  ['page-remboursement', '/pages/politique-de-remboursement', 'page'],
  ['page-confidentialite', '/pages/politique-de-confidentialite', 'page'],
  ['page-papier-peint', '/pages/papier-peint', 'page'],
  // blog
  ['blog-index', '/blogs/tableau-cuisine', 'blog'],
  ['blog-article', '/blogs/tableau-cuisine/quel-tableau-mettre-dans-une-cuisine', 'article'],
  // fonctionnel
  ['cart', '/cart', 'cart'],
  ['search', '/search?q=tableau', 'search'],
];

// ----------------------------------------------------------------- helpers
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', deg: '°', euro: '€', copy: '©', reg: '®', trade: '™', times: '×' };
function decode(s) {
  if (!s) return '';
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; } })
    .replace(/&([a-z]+);/gi, (m, n) => (ENTITIES[n] != null ? ENTITIES[n] : (ENTITIES[n.toLowerCase()] != null ? ENTITIES[n.toLowerCase()] : m)));
}
const stripTags = (s) => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i')) || tag.match(new RegExp(name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? decode(m[1]) : '';
}
function normSrc(src) {
  if (!src) return '';
  try {
    const u = src.startsWith('//') ? 'https:' + src : src;
    const p = new URL(u, BASE).pathname;
    return p.replace(/\.(jpg|jpeg|png|webp|gif|svg|avif)$/i, '').replace(/_\d+x\d*$/i, '').split('/').pop();
  } catch { return src; }
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchHtml(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // Accept-Language VIDE est requis : sans lui, Shopify géo-redirige certaines /es/ vers FR ;
      // avec "es" il redirige aussi vers FR. Empty = respecte le préfixe d'URL (prouvé empiriquement).
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA, 'Accept-Language': '' } });
      if ((res.status === 429 || res.status === 503) && attempt < 4) {
        const ra = parseInt(res.headers.get('retry-after') || '0', 10);
        await sleep(ra ? ra * 1000 : 1500 * (attempt + 1));
        continue;
      }
      const body = await res.text();
      return { status: res.status, finalUrl: res.url, body };
    } catch (e) {
      if (attempt === 4) return { status: 0, finalUrl: url, body: '', error: e.message };
      await sleep(800 * (attempt + 1));
    }
  }
  return { status: 429, finalUrl: url, body: '', error: 'rate-limited' };
}

function extract(html) {
  const out = { lang: '', title: '', metaDesc: '', canonical: '', ogLocale: '', ogTitle: '', ogDesc: '', ogImageAlt: '', twTitle: '', twDesc: '', headings: [], alts: [], jsonld: [], chunks: [] };
  out.lang = (html.match(/<html[^>]*\blang="([^"]+)"/i) || [])[1] || '';
  out.title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  out.canonical = (html.match(/<link[^>]+rel="canonical"[^>]*>/i) || []).map((t) => attr(t, 'href'))[0] || '';
  // metas
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const name = (attr(tag, 'name') || attr(tag, 'property')).toLowerCase();
    const content = attr(tag, 'content');
    if (!name || !content) continue;
    if (name === 'description') out.metaDesc = content;
    else if (name === 'og:locale') out.ogLocale = content;
    else if (name === 'og:title') out.ogTitle = content;
    else if (name === 'og:description') out.ogDesc = content;
    else if (name === 'og:image:alt') out.ogImageAlt = content;
    else if (name === 'twitter:title') out.twTitle = content;
    else if (name === 'twitter:description') out.twDesc = content;
  }
  // headings
  for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = stripTags(m[2]);
    if (t) out.headings.push({ level: +m[1], text: t });
  }
  // imgs
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const alt = attr(tag, 'alt');
    if (alt && alt.trim()) out.alts.push({ src: normSrc(attr(tag, 'src') || (attr(tag, 'srcset').split(',')[0] || '').trim().split(' ')[0]), alt: alt.trim() });
  }
  // json-ld string leaves
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1].trim());
      walkJson(data, '', out.jsonld);
    } catch { /* skip malformed */ }
  }
  // visible chunks
  let body = html;
  const bodyStart = body.search(/<body\b/i);
  if (bodyStart >= 0) body = body.slice(bodyStart);
  body = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  body = body.replace(/<\/(p|h[1-6]|li|div|section|figcaption|button|td|th|blockquote|dd|dt)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
  const seen = new Set();
  for (let line of stripTagsLines(body)) {
    line = line.trim();
    if (!line || line.length < 12) continue;
    if (!/\s/.test(line)) continue; // single token
    if (!/[a-zà-öø-ÿ]/i.test(line)) continue; // must contain letters
    if (seen.has(line)) continue;
    seen.add(line);
    out.chunks.push(line);
    if (out.chunks.length > 400) break;
  }
  return out;
}
function stripTagsLines(s) { return decode(s.replace(/<[^>]*>/g, '')).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()); }
const JSONLD_KEYS = new Set(['name', 'description', 'headline', 'jobtitle', 'slogan', 'articlebody', 'text', 'question', 'answer', 'acceptedanswer', 'caption', 'alternatename', 'disambiguatingdescription']);
function walkJson(node, path, acc) {
  if (node == null) return;
  if (typeof node === 'string') {
    const key = path.split('.').pop().toLowerCase();
    if (JSONLD_KEYS.has(key) && node.trim().length >= 4 && /\s/.test(node)) acc.push({ path, value: node.trim() });
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, i) => walkJson(v, path + '[' + i + ']', acc)); return; }
  if (typeof node === 'object') { for (const [k, v] of Object.entries(node)) walkJson(v, path ? path + '.' + k : k, acc); }
}

// ----------------------------------------------------------------- leak diff
// allowlist : chaînes légitimement identiques entre langues
const BRAND = /myselfmonart|kindopia|walid|trustpilot|instagram|facebook|tiktok|pinterest|youtube|visa|mastercard|paypal|klarna|american express|shop pay|google|whatsapp|©|\bsas\b/i;
function isNoise(s) {
  const t = s.trim();
  if (t.length < 12) return true;
  if (!/[a-zà-öø-ÿ]/i.test(t)) return true;        // pas de lettre
  if (!/\s/.test(t)) return true;                   // un seul mot
  if (BRAND.test(t)) return true;                   // marque / paiement / réseau
  if (/^[\d\s.,€$%×x✓★▼▲•|/–—-]+$/.test(t)) return true; // chiffres/prix/symboles
  if (/^\+?\d[\d\s().-]{6,}$/.test(t)) return true; // téléphone
  if (/@[\w.-]+\.\w+/.test(t)) return true;         // email
  if (/^\d{1,3}\s?(x|×)\s?\d{1,3}/.test(t)) return true; // dimensions 30x40
  // fragments de classes Tailwind / attributs (le `>` dans `[&>svg]` casse le strip de tags)
  if (/\]:|\[&|&_|&>|aria-[a-z]+="|="\w|svg\]|:\[&|motion-reduce|md:\[|first-child\]/.test(t)) return true;
  if (/"\s*(aria-hidden|class|role|data-)/.test(t)) return true;
  if (/[{}]|=>|\bvar\(|\brgb\(|px\]|rem\]/.test(t)) return true; // CSS/JS résiduel
  return false;
}
function diffPage(label, type, fr, loc, locale) {
  const items = [];
  const push = (kind, value, frValue) => items.push({ kind, value, frValue });
  // scalaires
  const scalar = [['title', 'title'], ['metaDesc', 'meta_description'], ['ogTitle', 'og:title'], ['ogDesc', 'og:description'], ['ogImageAlt', 'og:image:alt'], ['twTitle', 'twitter:title'], ['twDesc', 'twitter:description']];
  for (const [f, kind] of scalar) {
    if (fr[f] && loc[f] && fr[f] === loc[f] && !isNoise(fr[f])) push(kind, loc[f], fr[f]);
  }
  // og:locale attendu
  const expect = { en: 'en_US', es: 'es_ES', de: 'de_DE', nl: 'nl_NL' }[locale];
  if (loc.ogLocale && expect && loc.ogLocale !== expect) push('og:locale (mauvaise valeur)', loc.ogLocale, expect + ' attendu');
  // lang attribute
  if (loc.lang && !loc.lang.toLowerCase().startsWith(locale)) push('html lang (mauvaise valeur)', loc.lang, locale);
  // headings : intersection
  const frH = new Set(fr.headings.map((h) => h.text));
  for (const h of loc.headings) if (frH.has(h.text) && !isNoise(h.text)) push('heading h' + h.level, h.text, '(identique FR)');
  // alts : alignés par src
  const frAlt = new Map(fr.alts.map((a) => [a.src, a.alt]));
  const seenAlt = new Set();
  for (const a of loc.alts) {
    if (seenAlt.has(a.src + a.alt)) continue; seenAlt.add(a.src + a.alt);
    if (frAlt.get(a.src) === a.alt && !isNoise(a.alt)) push('alt image', a.alt, '(identique FR)');
  }
  // json-ld : alignés par path
  const frJ = new Map(fr.jsonld.map((j) => [j.path, j.value]));
  for (const j of loc.jsonld) if (frJ.get(j.path) === j.value && !isNoise(j.value)) push('json-ld ' + j.path, j.value, '(identique FR)');
  // chunks : intersection
  const frC = new Set(fr.chunks);
  const seenC = new Set();
  for (const c of loc.chunks) {
    if (frC.has(c) && !isNoise(c) && !seenC.has(c)) { seenC.add(c); push('texte visible', c, '(identique FR)'); }
  }
  return items;
}

// ----------------------------------------------------------------- run
const argPaths = process.argv.slice(2);
const matrix = argPaths.length ? MATRIX.filter((m) => argPaths.includes(m[1])) : MATRIX;
const candidates = [];
const summary = [];

for (const [label, frPath, type] of matrix) {
  process.stderr.write(`\n[${label}] ${frPath}\n`);
  const frRes = await fetchHtml(BASE + frPath);
  const fr = frRes.body ? extract(frRes.body) : null;
  const pageRec = { label, frPath, type, fr: { status: frRes.status, finalUrl: frRes.finalUrl } };
  if (!fr) { process.stderr.write(`  FR fetch failed: ${frRes.status} ${frRes.error || ''}\n`); summary.push({ label, error: 'fr-fetch-failed' }); continue; }
  for (const locale of LOCALES) {
    const res = await fetchHtml(BASE + '/' + locale + frPath);
    if (!res.body) { process.stderr.write(`  ${locale}: fetch failed ${res.status}\n`); continue; }
    const loc = extract(res.body);
    // garde-fou : si la page sert une autre langue que celle demandée (géo-redirect résiduel),
    // le diff produirait des centaines de faux positifs → on saute et on signale.
    if (loc.lang && !loc.lang.toLowerCase().startsWith(locale)) {
      pageRec[locale] = { status: res.status, finalUrl: res.finalUrl, servedLang: loc.lang, note: 'WRONG-LOCALE-SERVED — diff sauté' };
      process.stderr.write(`  ${locale}: ⚠️ sert ${loc.lang} (au lieu de ${locale}) — diff sauté\n`);
      await sleep(400);
      continue;
    }
    const items = diffPage(label, type, fr, loc, locale);
    pageRec[locale] = { status: res.status, finalUrl: res.finalUrl, ogLocale: loc.ogLocale, lang: loc.lang, leaks: items.length };
    if (items.length) candidates.push({ label, frPath, type, locale, finalUrl: res.finalUrl, items });
    process.stderr.write(`  ${locale}: ${items.length} candidats (status ${res.status})\n`);
    await sleep(400);
  }
  summary.push(pageRec);
  writeFileSync(resolve(OUT, label + '.json'), JSON.stringify({ pageRec, fr, candidates: candidates.filter((c) => c.label === label) }, null, 2));
}

writeFileSync(resolve(OUT, 'candidates.json'), JSON.stringify(candidates, null, 2));
writeFileSync(resolve(OUT, 'summary.json'), JSON.stringify(summary, null, 2));

// rapport markdown brut (avant vérif adversariale)
let md = `# Audit i18n — candidats de fuite FR (méthode diff, AVANT vérif adversariale)\n\nBase ${BASE} • locales ${LOCALES.join('/')} • ${matrix.length} pages\n\n`;
const byPage = {};
for (const c of candidates) (byPage[c.label] ||= []).push(c);
for (const [label] of matrix) {
  const cs = byPage[label] || [];
  const total = cs.reduce((n, c) => n + c.items.length, 0);
  md += `## ${label} — ${total} candidats\n`;
  for (const c of cs) {
    md += `\n### ${c.locale} (${c.items.length})\n`;
    for (const it of c.items) md += `- **${it.kind}** : \`${it.value.slice(0, 160).replace(/`/g, "'")}\`\n`;
  }
  md += '\n';
}
writeFileSync(resolve(OUT, 'report.md'), md);

const grand = candidates.reduce((n, c) => n + c.items.length, 0);
process.stderr.write(`\n=== TOTAL : ${grand} candidats sur ${candidates.length} (page,locale) ===\n`);
console.log(JSON.stringify({ pages: matrix.length, candidatePairs: candidates.length, candidateItems: grand }, null, 2));
