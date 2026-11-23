// Contrôle d'un ou plusieurs textes de collection avant création (format de PROCEDURE-COLLECTION.md).
// Usage : node seo/cocon/outils/verifier-texte.cjs seo/cocon/textes/<handle>.json… [--deja seo/cocon/textes]
// --deja : dossier des textes déjà publiés. Un fichier passé en argument et aussi présent dans ce dossier n’est pas comparé à lui-même.
// --retry : Shopify répond 429 quand les liens s’enchaînent trop vite ; curl attend puis recommence.
// Chaque fichier : {handle, title, requete_principale, seo_title, seo_description, intro, guide_html, faq:[{q,a}], cocon_links:[{url,label}], image:{src,alt}}
// Vérifie les longueurs, le h2 de tête, l'absence de h1, de « Made in France » et de note en chiffres, que chaque lien répond,
// et qu'aucun texte ne partage une suite de 8 mots avec un autre (les autres fichiers donnés, et ceux du dossier --deja).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const args = process.argv.slice(2);
const iDeja = args.indexOf("--deja");
const deja = iDeja >= 0 ? args.splice(iDeja, 2)[1] : null;
const lire = f => JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
const texte = t => [t.seo_title, t.seo_description, t.intro, t.guide_html, ...(t.faq || []).flatMap(x => [x.q, x.a])].join("\n");
const statuts = new Map();
const statut = url => {
  if (!statuts.has(url)) {
    let code = "?";
    try { code = execFileSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-L", "--max-time", "20", "--retry", "5", "https://www.myselfmonart.com" + url], { encoding: "utf8" }); } catch (e) { code = "err"; }
    statuts.set(url, code);
  }
  return statuts.get(url);
};
const nouveaux = args.map(f => lire(f));
const handlesNouveaux = new Set(nouveaux.map(t => t.handle));
let ko = 0;
const corpus = {};
for (const t of nouveaux) {
  const pb = [];
  const tout = texte(t);
  if (!t.seo_title || t.seo_title.length > 60) pb.push("titre SEO de " + (t.seo_title || "").length + " caractères (60 au plus)");
  if (!t.seo_description || t.seo_description.length < 120 || t.seo_description.length > 165) pb.push("meta description de " + (t.seo_description || "").length + " caractères (140 à 160)");
  if (/made in france|fabriqué en france/i.test(tout)) pb.push("« Made in France » interdit");
  if (/<h1/i.test(t.guide_html)) pb.push("h1 dans le guide");
  if (!/^\s*<h2/i.test(t.guide_html)) pb.push("le guide doit commencer par un h2");
  if (/\b\d[,.]\d\s*\/\s*5\b|\b\d{2,3}\s+avis\b/i.test(tout.replace(/\[\[TP_SCORE\]\]\/5 sur \[\[TP_COUNT\]\] avis/g, ""))) pb.push("note Trustpilot en chiffres (écrire [[TP_SCORE]]/5 sur [[TP_COUNT]] avis)");
  if (/\[\[TP_/.test(t.seo_title + t.seo_description)) pb.push("jeton Trustpilot dans le titre SEO ou la meta");
  const mots = t.guide_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  if (mots < 380 || mots > 650) pb.push("guide de " + mots + " mots (400 à 600)");
  const nfaq = (t.faq || []).length;
  if (nfaq < 4 || nfaq > 5) pb.push("FAQ de " + nfaq + " questions (4 ou 5)");
  const q = (t.requete_principale || "").toLowerCase();
  for (const [nom, champ] of [["titre SEO", t.seo_title], ["intro", t.intro], ["guide", t.guide_html]]) if (!String(champ).toLowerCase().includes(q)) pb.push("requête principale absente de : " + nom);
  const liens = [...t.guide_html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).concat((t.cocon_links || []).map(l => l.url)).concat((t.faq || []).flatMap(x => [...x.a.matchAll(/href="([^"]+)"/g)].map(m => m[1])));
  for (const u of new Set(liens)) {
    if (!u.startsWith("/")) { pb.push("lien non relatif : " + u); continue; }
    const h = (u.match(/^\/collections\/([^/?#]+)/) || [])[1];
    if (h && handlesNouveaux.has(h)) continue;
    const c = statut(u.split("#")[0]);
    if (c !== "200") pb.push("lien " + u + " → " + c);
  }
  corpus[t.handle] = tout.replace(/<[^>]+>/g, " ").toLowerCase();
  if (pb.length) ko++;
  console.log((pb.length ? "✗ " : "✓ ") + t.handle + " | " + mots + " mots | FAQ " + nfaq + (pb.length ? "\n    - " + pb.join("\n    - ") : ""));
}
if (deja && fs.existsSync(deja)) for (const f of fs.readdirSync(deja).filter(f => f.endsWith(".json"))) { try { const t = lire(path.join(deja, f)); if (t.handle && !corpus[t.handle]) corpus["(déjà) " + t.handle] = texte(t).replace(/<[^>]+>/g, " ").toLowerCase(); } catch (e) { } }
const sh = s => { const w = s.replace(/\[\[tp_score\]\]\/5 sur \[\[tp_count\]\] avis/g, " ").replace(/[^a-zàâçéèêëîïôûùüÿœ' ]/gi, " ").split(/\s+/).filter(Boolean); const o = new Set(); for (let i = 0; i + 8 <= w.length; i++) o.add(w.slice(i, i + 8).join(" ")); return o; };
const H = Object.keys(corpus);
for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) {
  if (H[i].startsWith("(déjà)") && H[j].startsWith("(déjà)")) continue;
  const a = sh(corpus[H[i]]), b = sh(corpus[H[j]]);
  let n = 0; const ex = []; for (const x of a) if (b.has(x)) { n++; if (ex.length < 2) ex.push(x); }
  if (n > 2) { ko++; console.log("✗ " + n + " suites de 8 mots communes : " + H[i] + " / " + H[j] + " — « " + ex.join(" » ; « ") + " »"); }
}
process.exit(ko ? 1 : 0);
