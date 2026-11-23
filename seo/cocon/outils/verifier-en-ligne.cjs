// Après publication : la page en ligne montre-t-elle bien le texte relu ? Lit la page par curl (sans recopie)
// et cherche chaque phrase de l'intro, du guide et de la FAQ.
// Usage : node seo/cocon/outils/verifier-en-ligne.cjs seo/cocon/textes/<handle>.json…
// Chaque fichier est lu tel quel (format de PROCEDURE-COLLECTION.md) ; le handle de la page vient du fichier.
// Sortie : 0 tout est bon ; 1 au moins un texte diffère de la page ; 2 Shopify n'a pas servi la page (anti-robot), à relancer plus tard.
const fs = require("fs");
const { execFileSync } = require("child_process");
const ent = s => s.replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&laquo;/g, "«").replace(/&raquo;/g, "»").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const norm = s => ent(s).replace(/<[^>]+>/g, " ").replace(/[’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const fichiers = process.argv.slice(2);
if (!fichiers.length) { console.error("Usage : node seo/cocon/outils/verifier-en-ligne.cjs seo/cocon/textes/<handle>.json…"); process.exit(2); }
let ko = 0, inconnus = 0;
for (const f of fichiers) {
  const t = JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));
  const h = t.handle;
  const blocs = [t.intro, t.guide_html].concat(t.faq.flatMap(x => [x.q, x.a]));
  const phrases = blocs.flatMap(b => norm(b).split(/(?<=[.!?])\s+/)).filter(p => p.length > 25 && !/\[\[tp_/.test(p));
  let html = "", manquantes = phrases, h1 = "", titre = "", pasLaPage = true;
  for (let essai = 0; essai <= 3; essai++) {
    if (essai) pause(30000 * essai); // Shopify sert parfois sa page anti-robot quand les requêtes s'enchaînent : on attend 30 s, 60 s puis 90 s.
    // --retry : Shopify répond 429 quand les pages s'enchaînent trop vite ; curl attend puis recommence.
    try { html = execFileSync("curl", ["-s", "-L", "--max-time", "30", "--retry", "5", "https://www.myselfmonart.com/collections/" + h + "?v=" + Date.now()], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }); }
    catch (e) { html = ""; } // délai dépassé ou réseau coupé : on retente comme pour la page anti-robot.
    const page = norm(html);
    manquantes = phrases.filter(p => !page.includes(p));
    titre = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "";
    // Page anti-robot, ou une autre page que la collection : aucune phrase trouvée et pas le bon H1.
    pasLaPage = /your connection needs to be verified/i.test(html) || (manquantes.length === phrases.length && !norm(h1).includes(t.title.toLowerCase()));
    if (!pasLaPage) break;
  }
  if (pasLaPage) {
    inconnus++;
    console.log("? " + h + " | Shopify n'a pas servi la page (page anti-robot, H1 « " + norm(h1).slice(0, 60) + " ») : relancer ce contrôle dans quelques minutes. Le texte n'est pas en cause, ne rien corriger.");
    continue;
  }
  const ok = manquantes.length === 0 && norm(h1).includes(t.title.toLowerCase());
  if (!ok) ko++;
  console.log((ok ? "✓ " : "✗ ") + h + " | " + (phrases.length - manquantes.length) + "/" + phrases.length + " phrases trouvées | H1 « " + norm(h1).slice(0, 60) + " » | <title> « " + ent(titre).trim().slice(0, 70) + " »" + (manquantes.length ? "\n    manquent : « " + manquantes.slice(0, 3).join(" » ; « ") + " »" : ""));
}
process.exit(ko ? 1 : inconnus ? 2 : 0);
