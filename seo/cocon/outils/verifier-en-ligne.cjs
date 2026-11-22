// Après publication : la page en ligne montre-t-elle bien le texte relu ? Lit la page par curl (sans recopie)
// et cherche chaque phrase de l'intro, du guide et de la FAQ.
// Usage : node seo/cocon/outils/verifier-en-ligne.cjs <texte.json>… (le handle est lu dans chaque fichier)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ent = s => s.replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const norm = s => ent(s).replace(/<[^>]+>/g, " ").replace(/[’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
let ko = 0;
const fichiers = {};
for (const f of process.argv.slice(2)) { const t0 = JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); fichiers[t0.handle] = f; }
for (const h of Object.keys(fichiers)) {
  const t = JSON.parse(fs.readFileSync(path.join(__dirname, "editorial", h + ".json"), "utf8").replace(/^﻿/, ""));
  const html = execFileSync("curl", ["-s", "-L", "--max-time", "30", "https://www.myselfmonart.com/collections/" + h + "?v=" + Date.now()], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
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
