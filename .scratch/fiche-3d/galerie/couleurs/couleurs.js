// Les couleurs d'une œuvre, pour le temps 2 de la fiche (« Chaque couleur agit sur vous »).
// Des fonctions pures sur des pixels RGBA : le même fichier sert dans la page et sur le serveur.
//
//   lire(d, W, H, declarees, options) → le modèle : les couleurs de l'image (centres) et celles qu'on montre
//       options.completer = false : montrer seulement les couleurs données (la liste est déjà arrêtée)
//   masques(d, W, H, modele) → pour chaque couleur montrée, ce qui revient en couleur (0..255 par pixel)
//
// Principe : la boutique déclare déjà, pour chaque tableau, une à trois couleurs principales, prises dans une liste
// fermée (Bleu, Vert, Noir, Beige / Crème, Doré / Or… : les métaobjets « shopify--color-pattern », qui servent au
// filtre des collections). On ne fait pas de nuances : un bleu nuit est un bleu. La page montre donc ces couleurs
// déclarées, dans leur ordre, et cherche dans l'image les zones de chacune. Elle montre toujours trois couleurs
// si possible : s'il y en a moins de trois de déclarées, on complète avec d'autres couleurs principales lues dans
// l'image, quand elles y sont en quantité suffisante (la boutique ne déclare que les principales). Sur le serveur,
// ce complément se fait une fois, au moment d'écrire les phrases ; la page reçoit alors la liste arrêtée.
// (La première lecture, par nuances, est gardée dans couleurs-nuances.js.)
(function (racine) {
  'use strict';

  /* ---------- sRGB <-> OKLab (un espace où les distances ressemblent à ce que voit l'œil) ---------- */
  var LIN = new Float32Array(256);
  for (var i0 = 0; i0 < 256; i0++) { var c0 = i0 / 255; LIN[i0] = c0 <= 0.04045 ? c0 / 12.92 : Math.pow((c0 + 0.055) / 1.055, 2.4); }
  function versLab(r, g, b, o) {
    var R = LIN[r], G = LIN[g], B = LIN[b];
    var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    o[0] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
    o[1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    o[2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  }
  function versRvb(L, a, b) {
    var l = L + 0.3963377774 * a + 0.2158037573 * b, m = L - 0.1055613458 * a - 0.0638541728 * b, s = L - 0.0894841775 * a - 1.2914855480 * b;
    l = l * l * l; m = m * m * m; s = s * s * s;
    var R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    var G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    var B = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    function g(x) { x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(x * 255))); }
    return [g(R), g(G), g(B)];
  }

  /* ---------- Les couleurs principales de la boutique ---------- */
  // clé, nom avec son article, libellé court, puis des couleurs d'exemple : toutes les nuances qu'on range sous ce nom.
  // Une couleur de l'image porte le nom de l'exemple le plus proche.
  var PRINCIPALES = [
    ['noir', 'le noir', 'Noir', '000000 0d0d0d 181818 222222 1c1b1a 2b2b2b'],
    ['gris', 'le gris', 'Gris', '3a3a3a 474747 33373b 6e6e6e 8a8a8a a0a0a0 9aa0a6 7d7a76 949088 bdbdbd c8c8c6 808080'],
    ['blanc', 'le blanc', 'Blanc', 'ffffff f6f6f4 ececea e6e4e0 dededc d0cfcc'],
    ['beige', 'le beige', 'Beige', 'f6efe0 efe6d3 f3e9d8 ece3d2 e8dfd0 e0d0b5 d9c7a8 cdb99b d8c4a6 d6c2a8 c9b79c d6c9bc d9cdbf d3c6b6 a8977f 9c8b76 8b7d6b b3a38c 96846e 7d7061 ead8ab'],
    ['marron', 'le marron', 'Marron', '6b4423 5a3a22 7a5230 4a2f1b 3b2416 8a6642 6e5138 4f3a2a 9a5630 a8502f 8b4a2b 7b3f22'],
    ['bleu', 'le bleu', 'Bleu', '0a1a3a 0b2a4d 1b2a49 0d1b2a 13233f 06223d 0a1422 101c30 1d4fa8 034a9a 2f6fd0 102e7f 1565c0 2962ff 0d47a1 2a5caa 0e4c78 14507f 1a5a8f 1e6aa8 87ceeb a7c7e7 9cc3e6 619acc 8fb8de b3d4f0 7fb2dd 0f5c6b 1a6b78 0e4d5c 16697a 1c7c8c 12505f 1fb5b0 40e0d0 2bb3c0 00acc1 3cc4c4 2a9db0 005bd3'],
    ['vert', 'le vert', 'Vert', 'a8d8c8 b2dfdb 9fd3c7 bfe3d6 a3cdbd 1f8f6a 0f7a5a 2e8b6f 177a5e 1d6b54 2f7d68 3f8f78 12352b 0f2e22 1b3d2f 14281d 0c2a1c 173a2a 0a2a20 1e4c3c 24513f 2a5a47 1f4a3a 1d4f3f 3a8f3a 4caf50 2e7d32 43a047 5aa02c 3f7f3a 9caf88 8fa37e a3b596 b2c2a5 87997a 7f9477 6b6b2f 556b2f 808000 4a5725 5c6b3a 7a7a3a 3f4a22 c5e17a a4c639 b5d94c cddc39 05aa3d'],
    ['jaune', 'le jaune', 'Jaune', 'ffd700 f3de13 ffe14d f7d038 ffeb3b f5c518 edb92e e7a23f e9a83a eeb04a f6dbb0 f3e0b5 f7e3b8 efd9a6 c98a2b b97f2e c9963f b8860b ba8a45 a9772f d6c52e'],
    ['dore', 'le doré', 'Doré', 'e6c477 dcb967 ecd08a d9b56c d49a06 e0b64f'],
    ['bronze', 'le bronze', 'Bronze', 'cd7f32 b87333 a97142 c08a4a 8c6a3a'],
    ['orange', "l'orange", 'Orange', 'ff7f00 f65902 ff9933 ef6c00 f28c28 e8702a d05a06 d2521e e06a1e d76839 ff7f6e f88379 ff8a65 f4a384 ee7b5f ffcba4 f9c9a8 f2b999 e9b08f f5d0b5 c8623c bf6a47 b9603f ff8a00'],
    ['rouge', 'le rouge', 'Rouge', 'd32f2f c0392b e53935 ab2c2b ff0000 b71c1c cc3a2a 6d1a2a 7b1e2e 800020 5c1a26 4a1420 6a2225 d62929'],
    ['rose', 'le rose', 'Rose', 'ff69b4 e75480 d85e7c f06292 e91e63 de5d83 e88aa8 f2c6cf e8b4b8 f7d6d9 e6a9b5 dba3ad edc4c0 e0318c ff1493 c71585 d6247e ff00a8 ffc0cb'],
    ['violet', 'le violet', 'Violet', '7b3fa0 8e44ad 6a1b9a 9c27b0 7e57c2 5e35b1 c8a2c8 b9a0d9 d1b3e0 c9b6e4 bfa8d6 4b1d3f 5d2a55 3f1d3a 6b2d5c 3a1a33 a54dcf']
  ];
  // Les identifiants (handles) des métaobjets de la boutique. Deux déclarations sont à part :
  // « multicolore » n'est pas une couleur, et « blanc-noir » en vaut deux.
  var HANDLES = { gris: 'gris', blanc: 'blanc', vert: 'vert', jaune: 'jaune', noir: 'noir', beige: 'beige', marron: 'marron', bleu: 'bleu', or: 'dore', rouge: 'rouge', rose: 'rose', bronze: 'bronze', orange: 'orange', violet: 'violet' };
  function rangDe(cle) { for (var x = 0; x < PRINCIPALES.length; x++) if (PRINCIPALES[x][0] === cle) return x; return -1; }
  var EX = PRINCIPALES.map(function (p) {
    var o = [0, 0, 0];
    return p[3].split(' ').map(function (hex) { versLab(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), o); return [o[0], o[1], o[2]]; });
  });
  // l'écart d'une couleur à chaque couleur principale : la distance à son exemple le plus proche.
  // La clarté compte un peu moins que la teinte : un bleu reste un bleu quand il fonce.
  var PL = 0.55;
  function ecarts(L, a, b) {
    return EX.map(function (liste) {
      var m = Infinity;
      for (var i = 0; i < liste.length; i++) { var e = liste[i], dL = L - e[0], da = a - e[1], db = b - e[2], dd = PL * dL * dL + da * da + db * db; if (dd < m) m = dd; }
      return Math.sqrt(m);
    });
  }

  /* ---------- 1. Lire ---------- */
  var NL = 24, NA = 32, AB = 0.4; // l'histogramme : 24 tranches de clarté, 32 × 32 cases de couleur
  // Jusqu'où une couleur de l'image peut s'éloigner d'une couleur déclarée et lui revenir quand même :
  // PROCHE toujours, RATIO fois son écart à la couleur qu'on lirait, et jamais plus qu'ACCEPTE
  var ACCEPTE = 0.12, PROCHE = 0.045, RATIO = 1.7, SECOURS = 0.11, NEUTRE = 0.03, NEUTRES = ['noir', 'gris', 'blanc', 'beige'], MIN_DECLAREE = 0.004, VIF = 0.045, MIN_PART = 0.012, MIN_NEUTRE = 0.035, AJOUT = 0.03, AJOUT_NET = 0.015, DISTINCTE = 0.08, SOMBRE = 0.2;
  function lire(d, W, H, declarees, options) {
    // a) les couleurs réellement présentes : un histogramme, puis quelques centres
    var pas = W > 400 ? 2 : 1, lab = [0, 0, 0], nb = NL * NA * NA; // une centaine de milliers de points suffit
    var cnt = new Float32Array(nb), sL = new Float32Array(nb), sa = new Float32Array(nb), sb = new Float32Array(nb), total = 0;
    for (var y = 0; y < H; y += pas) for (var x = 0; x < W; x += pas) {
      var i = (y * W + x) * 4; versLab(d[i], d[i + 1], d[i + 2], lab);
      var iL = Math.min(NL - 1, Math.floor(lab[0] * NL)), ia = Math.min(NA - 1, Math.max(0, Math.floor((lab[1] + AB) / (2 * AB) * NA))), ib = Math.min(NA - 1, Math.max(0, Math.floor((lab[2] + AB) / (2 * AB) * NA)));
      var k = (iL * NA + ia) * NA + ib; cnt[k]++; sL[k] += lab[0]; sa[k] += lab[1]; sb[k] += lab[2]; total++;
    }
    var pts = []; // une case occupée = un point, à la moyenne de ses pixels, avec son poids
    for (var k2 = 0; k2 < nb; k2++) if (cnt[k2]) pts.push([sL[k2] / cnt[k2], sa[k2] / cnt[k2], sb[k2] / cnt[k2], cnt[k2] / total]);
    // les départs : la case la plus lourde, puis à chaque fois la case la plus éloignée des départs déjà pris
    // (une case trop légère ne peut pas être un départ : ce serait du bruit)
    var KMAX = 14, ECART = 0.055, PLANCHER = 0.0007;
    var cand = pts.filter(function (p) { return p[3] >= PLANCHER; });
    if (!cand.length) cand = pts.slice();
    cand.sort(function (p, q) { return q[3] - p[3]; });
    var centres = [cand[0].slice(0, 3)];
    var dmin = cand.map(function (p) { return dist2(p, centres[0]); });
    while (centres.length < KMAX) {
      var bi = -1, bv = ECART * ECART;
      for (var c = 0; c < cand.length; c++) if (dmin[c] > bv) { bv = dmin[c]; bi = c; }
      if (bi < 0) break;
      centres.push(cand[bi].slice(0, 3));
      for (var c2 = 0; c2 < cand.length; c2++) { var dd = dist2(cand[c2], centres[centres.length - 1]); if (dd < dmin[c2]) dmin[c2] = dd; }
    }
    // quelques passes : chaque case rejoint le centre le plus proche, chaque centre va à la moyenne de ses cases
    var poids = [];
    for (var passe = 0; passe < 8; passe++) {
      var acc = centres.map(function () { return [0, 0, 0, 0]; });
      for (var p = 0; p < pts.length; p++) {
        var pt = pts[p], bj = 0, bd = Infinity;
        for (var j = 0; j < centres.length; j++) { var dj = dist2(pt, centres[j]); if (dj < bd) { bd = dj; bj = j; } }
        var A = acc[bj], w = pt[3]; A[0] += pt[0] * w; A[1] += pt[1] * w; A[2] += pt[2] * w; A[3] += w;
      }
      var suite = [], ps = [];
      for (var j2 = 0; j2 < centres.length; j2++) if (acc[j2][3] > 0) { suite.push([acc[j2][0] / acc[j2][3], acc[j2][1] / acc[j2][3], acc[j2][2] / acc[j2][3]]); ps.push(acc[j2][3]); }
      centres = suite; poids = ps;
    }
    var K = centres.length;
    // b) chaque centre : son écart à chaque couleur principale, et celle qu'on lirait sans rien savoir
    var ecart = centres.map(function (ct) { return ecarts(ct[0], ct[1], ct[2]); });
    var lue = ecart.map(function (r) { var b = 0; for (var x2 = 1; x2 < r.length; x2++) if (r[x2] < r[b]) b = x2; return b; });
    var pris = new Uint8Array(K);
    // (un presque noir revient plus facilement à une couleur déclarée très sombre : les branches d'un arbre
    //  sur un ciel de nuit sont, pour l'œil, dans le bleu nuit)
    function limite(j) { var l = Math.min(ACCEPTE, Math.max(PROCHE, RATIO * ecart[j][lue[j]])); return centres[j][0] < SOMBRE ? Math.max(l, 0.1) : l; }
    // une couleur presque neutre (un blanc, un gris, un noir) ne revient jamais avec une couleur franche
    // (dans le sombre, une couleur est moins vive sans être moins colorée : le seuil baisse avec la clarté)
    function permis(vif, L, x) { return L < SOMBRE || vif >= NEUTRE * Math.min(1, L / 0.5) || NEUTRES.indexOf(PRINCIPALES[x][0]) >= 0; }
    function decrire(g) {
      // la couleur de la pastille : la moyenne des centres, qui penche vers les plus francs et les plus typiques
      // de la couleur (le « blanc » d'un zèbre sépia est son crème le plus clair, pas la moyenne de ses rayures)
      var L = 0, a = 0, b = 0, w = 0, part = 0;
      g.centres.forEach(function (j) { var ct = centres[j], e = ecart[j][g.x] / 0.06, p2 = poids[j] * (Math.sqrt(ct[1] * ct[1] + ct[2] * ct[2]) + 0.03) * Math.exp(-e * e); L += ct[0] * p2; a += ct[1] * p2; b += ct[2] * p2; w += p2; part += poids[j]; });
      var P = PRINCIPALES[g.x]; g.cle = P[0]; g.nom = P[1]; g.libelle = P[2]; g.part = part;
      if (!w) return g;
      g.L = L / w; g.a = a / w; g.b = b / w; g.C = Math.sqrt(g.a * g.a + g.b * g.b); g.h = (Math.atan2(g.b, g.a) * 180 / Math.PI + 360) % 360;
      var rvb = versRvb(g.L, g.a, g.b); g.css = 'rgb(' + rvb.join(',') + ')';
      g.hex = '#' + rvb.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
      return g;
    }
    // c) les couleurs déclarées, dans leur ordre : chaque centre revient à la couleur déclarée la plus proche,
    //    s'il lui ressemble assez. Ce qui ne ressemble à aucune reste gris.
    var dec = (declarees || []).map(String), multi = dec.indexOf('multicolore') >= 0, nb2 = dec.indexOf('blanc-noir') >= 0, voulues = [];
    function veut(cle) { var x3 = rangDe(cle); if (x3 >= 0 && voulues.indexOf(x3) < 0) voulues.push(x3); }
    dec.forEach(function (h) { if (h === 'blanc-noir') { veut('noir'); veut('blanc'); } else if (HANDLES[h]) veut(HANDLES[h]); });
    var groupes = voulues.map(function (x4) { return { x: x4, centres: [], declaree: true }; });
    if (groupes.length) for (var j3 = 0; j3 < K; j3++) {
      var ct = centres[j3], vif = Math.sqrt(ct[1] * ct[1] + ct[2] * ct[2]), choix = null;
      if (nb2 && vif < 0.09) {
        // « Noir & Blanc » : tout ce qui n'est pas une couleur franche est du noir ou du blanc, selon sa clarté
        var cible = rangDe(ct[0] < 0.5 ? 'noir' : 'blanc'); groupes.forEach(function (g) { if (g.x === cible) choix = g; });
      } else {
        // la couleur déclarée la plus proche, si elle n'est pas beaucoup plus loin que la couleur qu'on lirait :
        // un fond blanc ne suit pas un jaune déclaré, un fond beige ne suit pas un bleu
        var best = limite(j3);
        groupes.forEach(function (g) { if (permis(vif, ct[0], g.x) && ecart[j3][g.x] < best) { best = ecart[j3][g.x]; choix = g; } });
      }
      if (choix) { choix.centres.push(j3); pris[j3] = 1; }
    }
    // une couleur déclarée restée vide reprend les centres de l'image qui lui ressemblent le plus, même s'ils
    // étaient allés à une autre couleur déclarée : des robes blanches peintes dans une lumière chaude sont
    // le blanc déclaré, pas un jaune. Elle ne vide jamais l'autre couleur.
    function partDe(g) { var p4 = 0; g.centres.forEach(function (j) { p4 += poids[j]; }); return p4; }
    groupes.forEach(function (vide) {
      if (partDe(vide) >= MIN_DECLAREE) return;
      var cand = [];
      for (var j5 = 0; j5 < K; j5++) {
        var ct2 = centres[j5], vif2 = Math.sqrt(ct2[1] * ct2[1] + ct2[2] * ct2[2]);
        if (permis(vif2, ct2[0], vide.x) && ecart[j5][vide.x] <= SECOURS && vide.centres.indexOf(j5) < 0) cand.push(j5);
      }
      if (!cand.length) return;
      cand.sort(function (p5, q5) { return ecart[p5][vide.x] - ecart[q5][vide.x]; });
      var seuil = ecart[cand[0]][vide.x] * 1.35 + 0.01;
      cand.forEach(function (j6) {
        if (ecart[j6][vide.x] > seuil) return;
        var tenant = null; groupes.forEach(function (g) { if (g !== vide && g.centres.indexOf(j6) >= 0) tenant = g; });
        if (tenant) { if (partDe(tenant) - poids[j6] < 0.3 * partDe(tenant)) return; tenant.centres.splice(tenant.centres.indexOf(j6), 1); }
        vide.centres.push(j6); pris[j6] = 1;
      });
    });
    var choisis = groupes.map(decrire).filter(function (g) { return g.part >= MIN_DECLAREE; });
    choisis.forEach(function (g) { g.centres.forEach(function (j) { pris[j] = 1; }); });
    // d) moins de trois couleurs déclarées (ou aucune, ou « Multicolore ») : on lit dans l'image les couleurs
    //    principales qui restent, et on complète jusqu'à trois avec celles qui sont là en quantité suffisante.
    //    La boutique ne déclare que les couleurs principales d'un tableau : il peut y en avoir d'autres. Ce qu'une couleur pèse : sa place dans l'image, et ce qui la fait remarquer
    //    (sa vivacité, ou son contraste de clarté avec la couleur dominante). Puis elle doit se distinguer des autres.
    var lues = [], declare = choisis.length > 0;
    if (choisis.length < 3 && !(options && options.completer === false)) {
      var parX = {};
      for (var j4 = 0; j4 < K; j4++) {
        if (pris[j4] || choisis.some(function (g) { return g.x === lue[j4]; })) continue;
        (parX[lue[j4]] || (parX[lue[j4]] = { x: lue[j4], centres: [], declaree: false })).centres.push(j4);
      }
      for (var cle in parX) lues.push(decrire(parX[cle]));
      var tous = choisis.concat(lues);
      var dominante = tous.reduce(function (p3, q) { return q.part > p3.part ? q : p3; }, tous[0]);
      lues.forEach(function (g) { g.note = Math.pow(g.part, 0.45) * (Math.max(g.C, 0.2 * Math.abs(g.L - dominante.L)) + 0.03); });
      // la quantité suffisante : sans rien de déclaré, les seuils de lecture ; pour compléter une déclaration,
      // une couleur ajoutée doit couvrir au moins 3 % du tableau (elle doit se voir sans la chercher)
      // (ou 1,5 % si elle saute aux yeux : très vive, ou bien plus claire que le reste, comme une lune sur la nuit),
      // et se distinguer nettement de celles déjà montrées
      var libres = lues.filter(function (g) {
        if (!declare) return g.part >= (g.C < VIF ? MIN_NEUTRE : MIN_PART);
        var assez = g.part >= AJOUT || (g.part >= AJOUT_NET && (g.C >= 0.1 || g.L - dominante.L >= 0.4));
        return assez && choisis.every(function (ch) { var dL = g.L - ch.L, da = g.a - ch.a, db = g.b - ch.b; return Math.sqrt(0.5 * dL * dL + da * da + db * db) >= DISTINCTE; });
      });
      // « Multicolore » : on complète avec des couleurs franches, pas avec un noir ou un gris
      if (multi && choisis.length) { var franches = libres.filter(function (g) { return g.C >= VIF; }); if (franches.length) libres = franches; }
      if (!libres.length && !choisis.length && lues.length) libres = [dominante];
      var premiere = 0;
      while (choisis.length < 3 && libres.length) {
        var bi2 = -1, bn = 0;
        for (var l = 0; l < libres.length; l++) {
          var g = libres[l], loin = 1;
          choisis.forEach(function (ch) {
            var f;
            if (g.C >= VIF && ch.C >= VIF && ecartTeinte(g.h, ch.h) < 40) f = 0.35; // deux couleurs de teinte voisine : la seconde apprend peu
            else { var dL = g.L - ch.L, da = g.a - ch.a, db = g.b - ch.b; f = Math.min(1, Math.max(0.2, Math.sqrt(0.5 * dL * dL + da * da + db * db) / 0.3)); }
            if (f < loin) loin = f;
          });
          var n = g.note * loin; if (n > bn) { bn = n; bi2 = l; }
        }
        if (bi2 < 0) break;
        if (!premiere) premiere = bn; else if (!declare && choisis.length >= 2 && bn < premiere * 0.15) break; // sans déclaration, la troisième doit peser un minimum
        choisis.push(libres.splice(bi2, 1)[0]);
      }
    }
    choisis.forEach(function (g, rang) { g.rang = rang; });
    return { centres: centres, poids: poids, choisis: choisis, lues: lues, lue: lue };
  }
  function ecartTeinte(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  function dist2(p, c) { var dL = p[0] - c[0], da = p[1] - c[1], db = p[2] - c[2]; return dL * dL + da * da + db * db; }

  /* ---------- 2. Les masques : pour chaque couleur montrée, ce qui revient en couleur ---------- */
  // Un pixel appartient à la couleur dont un centre est le plus proche. Entre deux couleurs, le passage est fondu
  // sur une petite largeur (FONDU), pour qu'aucun bord dur n'apparaisse dans un dégradé.
  var FONDU = 0.014;
  function masques(d, W, H, modele) {
    var n = W * H, C = modele.centres, K = C.length, G = modele.choisis.length, lab = [0, 0, 0];
    var appart = new Int8Array(K).fill(-1);
    modele.choisis.forEach(function (g, rang) { g.centres.forEach(function (j) { appart[j] = rang; }); });
    var cL = new Float32Array(K), ca = new Float32Array(K), cb = new Float32Array(K);
    for (var j = 0; j < K; j++) { cL[j] = C[j][0]; ca[j] = C[j][1]; cb[j] = C[j][2]; }
    var sorties = [], parts = new Float64Array(G);
    for (var g0 = 0; g0 < G; g0++) sorties.push(new Uint8ClampedArray(n));
    var dg = new Float32Array(G), jg = new Int16Array(G);
    for (var i = 0; i < n; i++) {
      versLab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], lab);
      var L = lab[0], a = lab[1], b = lab[2];
      // le centre le plus proche dans chaque couleur montrée, et les deux plus proches tous centres confondus
      for (var g = 0; g < G; g++) { dg[g] = Infinity; jg[g] = -1; }
      var d1 = Infinity, j1 = -1, d2 = Infinity, j2 = -1;
      for (var k = 0; k < K; k++) {
        var dL = L - cL[k], da = a - ca[k], db = b - cb[k], dd = dL * dL + da * da + db * db, gr = appart[k];
        if (gr >= 0 && dd < dg[gr]) { dg[gr] = dd; jg[gr] = k; }
        if (dd < d1) { d2 = d1; j2 = j1; d1 = dd; j1 = k; } else if (dd < d2) { d2 = dd; j2 = k; }
      }
      for (var g2 = 0; g2 < G; g2++) {
        var moi = jg[g2]; if (moi < 0) continue;
        // l'adversaire : le centre le plus proche qui n'est pas de cette couleur
        var adv, dadv;
        if (appart[j1] !== g2) { adv = j1; dadv = d1; }
        else if (j2 >= 0 && appart[j2] !== g2) { adv = j2; dadv = d2; }
        else {
          adv = -1; dadv = Infinity;
          for (var k3 = 0; k3 < K; k3++) if (appart[k3] !== g2) { var eL = L - cL[k3], ea = a - ca[k3], eb = b - cb[k3], ee = eL * eL + ea * ea + eb * eb; if (ee < dadv) { dadv = ee; adv = k3; } }
        }
        var al;
        if (adv < 0) al = 1;
        else {
          var fL = cL[moi] - cL[adv], fa = ca[moi] - ca[adv], fb = cb[moi] - cb[adv], D = Math.sqrt(fL * fL + fa * fa + fb * fb) || 1e-6;
          var s = (dadv - dg[g2]) / (2 * D); // distance à la frontière entre les deux centres, comptée du bon côté
          al = (s + FONDU) / (2 * FONDU); al = al < 0 ? 0 : al > 1 ? 1 : al * al * (3 - 2 * al);
        }
        if (al > 0.02) { sorties[g2][i] = Math.round(al * 255); parts[g2] += al; }
      }
    }
    // un très léger flou, pour qu'une matière peinte ne donne pas un semis de points
    var tmp = new Uint8ClampedArray(n);
    sorties.forEach(function (al) {
      for (var y = 0; y < H; y++) { var o = y * W; for (var x = 0; x < W; x++) { var g = x > 0 ? al[o + x - 1] : al[o + x], dr = x < W - 1 ? al[o + x + 1] : al[o + x]; tmp[o + x] = (g + 2 * al[o + x] + dr + 2) >> 2; } }
      for (var y2 = 0; y2 < H; y2++) { var o2 = y2 * W; for (var x2 = 0; x2 < W; x2++) { var h = y2 > 0 ? tmp[o2 + x2 - W] : tmp[o2 + x2], b = y2 < H - 1 ? tmp[o2 + x2 + W] : tmp[o2 + x2]; al[o2 + x2] = (h + 2 * tmp[o2 + x2] + b + 2) >> 2; } }
    });
    return sorties.map(function (alpha, rang) { return { alpha: alpha, part: parts[rang] / n }; });
  }

  racine.Couleurs = { lire: lire, masques: masques, versLab: versLab, versRvb: versRvb, PRINCIPALES: PRINCIPALES, HANDLES: HANDLES };
  /* ---------- Pour la planche d'essai : tout d'un coup ---------- */
  racine.lireCouleurs = function (d, W, H, declarees, options) {
    var t0 = Date.now(), modele = lire(d, W, H, declarees, options), t1 = Date.now(), m = masques(d, W, H, modele), t2 = Date.now();
    var teintes = modele.choisis.map(function (g, rang) {
      return { cle: g.cle, nom: g.nom, css: g.css, hex: g.hex, part: m[rang].part, alpha: m[rang].alpha, info: g.declaree ? 'déclarée' : 'lue' };
    });
    return { teintes: teintes, modele: modele, temps: [t1 - t0, t2 - t1], mode: (declarees && declarees.length ? 'déclaré : ' + declarees.join(', ') : 'rien de déclaré') + ' · lire ' + (t1 - t0) + ' ms, masques ' + (t2 - t1) + ' ms' };
  };
})(typeof window !== 'undefined' ? window : globalThis);
