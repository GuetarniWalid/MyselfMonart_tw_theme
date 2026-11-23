// Après publication : la page en ligne montre-t-elle bien le texte relu ? Lit la page par curl (sans recopie)
// et cherche chaque phrase de l'intro, du guide et de la FAQ.
// Usage : node seo/cocon/outils/verifier-en-ligne.cjs seo/cocon/textes/<handle>.json…
// Chaque fichier est lu tel quel (format de PROCEDURE-COLLECTION.md) ; le handle de la page vient du fichier.
const fs = require("fs");
const { execFileSync } = require("child_process");
const ent = s => s.replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const norm = s => ent(s).replace(/<[^>]+>/g, " ").replace(/[’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const fichiers = process.argv.slice(2);
if (!fichiers.length) { console.error("Usage : node seo/cocon/outils/verifier-en-ligne.cjs seo/cocon/textes/<handle>.json…"); process.exit(2); }
let ko = 0;
for (const f of fichiers) {
  const t = JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
  const h = t.handle;
  // --retry : Shopify répond 429 quand les pages s'enchaînent trop vite ; curl attend puis recommence.
  const html = execFileSync("curl", ["-s", "-L", "--max-time", "30", "--retry", "5", "https://www.myselfmonart.com/collections/" + h + "?v=" + Date.now()], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const page = norm(html);
  const blocs = [t.intro, t.guide_html].concat(t.faq.flatMap(x => [x.q, x.a]));
  const phrases = blocs.flatMap(b => norm(b).split(/(?<=[.!?])\s+/)).filter(p => p.length > 25 && !/\[\[tp_/.test(p));
  const manquantes = phrases.filter(p => !page.includes(p));
  const titre = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "";
  const ok = manquantes.length === 0 && norm(h1).includes(t.title.toLowerCase());
  if (!ok) ko++;
  console.log((ok ? "✓ " : "✗ ") + h + " | " + (phrases.length - manquantes.length) + "/" + phrases.length + " phrases trouvées | H1 « " + norm(h1).slice(0, 60) + " » | <title> « " + ent(titre).trim().slice(0, 70) + " »" + (manquantes.length ? "\n    manquent : « " + manquantes.slice(0, 3).join(" » ; « ") + " »" : ""));
}
process.exit(ko ? 1 : 0);
