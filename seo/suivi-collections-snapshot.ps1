# Suivi récupération SEO collections — snapshot GSC + GA4 (fenêtre 28 j).
# Usage courant  : powershell -File suivi-collections-snapshot.ps1 -Label "J60"
# Rejeu historique : powershell -File suivi-collections-snapshot.ps1 -Label "J30" -Start 2026-06-07 -End 2026-07-05
# Chaque exécution UPSERT le snapshot (même label = remplacé, pas dupliqué) dans
# suivi-collections-tracking.json et régénère suivi-collections-tracking.md.
# NB : le token GSC expire ~7 j → si erreur d'auth, lancer d'abord : node ~/.claude/scripts/gsc/gsc.mjs auth
param(
  [string]$Label = "J0",
  [string]$Start,   # optionnel : rejouer une fenêtre passée (sinon = End - 28 j)
  [string]$End      # optionnel : sinon = aujourd'hui
)
$ErrorActionPreference = 'Continue'
$root = "C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\seo"
$gsc  = "C:\Users\gueta\.claude\scripts\gsc\gsc.mjs"
$ga4  = "C:\Users\gueta\.claude\scripts\gsc\ga4.mjs"

if ([string]::IsNullOrWhiteSpace($End))   { $End   = (Get-Date).ToString('yyyy-MM-dd') }
if ([string]::IsNullOrWhiteSpace($Start)) { $Start = ([datetime]::ParseExact($End,'yyyy-MM-dd',$null)).AddDays(-28).ToString('yyyy-MM-dd') }

# --- Périmètre : URL canonique FR uniquement ---------------------------------
# CRITIQUE : ancrer sur l'URL ENTIÈRE. Une regex non ancrée matche aussi
# ?page=2 et les préfixes de langue (/de-ch/, /fr-es/…) et écrase la vraie page.
$RX_GSC = '^https?://(?:www\.)?myselfmonart\.com/collections/([a-z0-9\-]+)/?$'
$RX_GA4 = '^/collections/([a-z0-9\-]+)/?$'

$wl = [System.IO.File]::ReadAllText("$root\collections-worklist.json", [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$done = @($wl.collections | Where-Object { $_.status -eq 'done' } | ForEach-Object { $_.handle })

Write-Host "GSC web par page ($Start -> $End, fra)..."
$gscMap = @{}
try {
  $gscCsv = & node $gsc query --site sc-domain:myselfmonart.com --type web --dimensions page --country fra --start-date $Start --end-date $End --row-limit 25000 --format csv 2>$null
  foreach ($r in ($gscCsv | ConvertFrom-Csv)) {
    if ($r.page -match $RX_GSC) { $gscMap[$matches[1]] = $r }
  }
} catch { Write-Host "GSC ERROR: $($_.Exception.Message)" }

Write-Host "GA4 Organic Search par page ($Start -> $End)..."
# --limit est OBLIGATOIRE : le défaut de ga4.mjs est 100 lignes, or le jeu réel
# dépasse 10 000 lignes (pagePath x canal) → sans lui, la quasi-totalité des
# collections tombe hors du top-100 et remonte à 0 session.
$ga4Map = @{}
try {
  $ga4Csv = & node $ga4 report --property 374096343 --dimensions pagePath,sessionDefaultChannelGroup --metrics sessions --start $Start --end $End --limit 20000 --format csv 2>$null
  foreach ($r in ($ga4Csv | ConvertFrom-Csv)) {
    # 'Organic Search' STRICT : 'Organic' large gonfle avec Social/Shopping.
    if (($r.sessionDefaultChannelGroup -eq 'Organic Search') -and ($r.pagePath -match $RX_GA4)) {
      $hk = $matches[1]
      $prev = 0
      if ($ga4Map.ContainsKey($hk)) { $prev = $ga4Map[$hk] }
      $ga4Map[$hk] = $prev + [int]([double]$r.sessions)
    }
  }
} catch { Write-Host "GA4 ERROR: $($_.Exception.Message)" }

# --- Garde-fou : ne JAMAIS écrire un snapshot vide ---------------------------
# C'est ce qui manquait : l'ancien script écrivait silencieusement des zéros.
if ($gscMap.Count -eq 0) { Write-Error "GSC n'a rendu aucune page canonique — snapshot ABANDONNE (token expire ? re-lancer 'node $gsc auth')."; exit 1 }
if ($ga4Map.Count -eq 0) { Write-Error "GA4 n'a rendu aucune page canonique — snapshot ABANDONNE (token expire ? re-lancer 'node $ga4 auth')."; exit 1 }
Write-Host "  -> $($gscMap.Count) pages GSC / $($ga4Map.Count) pages GA4 reconnues"

$rows = foreach ($h in $done) {
  $g = $gscMap[$h]
  $c = 0; $i = 0; $p = $null
  if ($g) { $c = [int]$g.clicks; $i = [int]$g.impressions; $p = [math]::Round([double]$g.position, 1) }
  $s = 0
  if ($ga4Map.ContainsKey($h)) { $s = $ga4Map[$h] }
  [pscustomobject]@{ handle = $h; gsc_clicks = $c; gsc_impr = $i; gsc_pos = $p; ga4_organic = $s }
}

# --- UPSERT par label + tri chronologique ------------------------------------
$trackPath = "$root\suivi-collections-tracking.json"
$track = if (Test-Path $trackPath) { [System.IO.File]::ReadAllText($trackPath,[System.Text.Encoding]::UTF8) | ConvertFrom-Json } else { [pscustomobject]@{ snapshots = @() } }
$snap = [pscustomobject]@{ label=$Label; date=(Get-Date).ToString('yyyy-MM-dd'); window="$Start..$End"; country='fra'; rows=$rows }
$kept = @(@($track.snapshots) | Where-Object { $_ -and $_.label -ne $Label })
$track.snapshots = @(@($kept + $snap) | Sort-Object -Property window)
$track | ConvertTo-Json -Depth 8 | Set-Content -Path $trackPath -Encoding UTF8

# ---- MD report (baseline -> dernier) ----------------------------------------
$snaps = @($track.snapshots)
$base = $snaps[0]; $last = $snaps[-1]
$baseMap = @{}; foreach ($r in $base.rows) { $baseMap[$r.handle] = $r }
$md = @()
$md += "# Suivi récupération SEO collections"
$md += ""
$md += "Éditorial E-E-A-T metafield-first (intro/guide/FAQ) appliqué le **2026-06-05** (voir collections-applied-log.md)."
$md += "Périmètre mesuré : **page collection canonique FR uniquement** (hors pagination ``?page=N`` et hors préfixes de langue)."
$md += "Source : GSC ``type=web`` + GA4 ``Organic Search``, fenêtres de 28 jours."
$md += ""
$md += "> ⚠️ **Contexte algorithmique** — Google a déployé un **core update du 21/05 au 02/06/2026**."
$md += "> Les livraisons SEO (salon 29/05, 46 collections 05/06) tombent en plein rollout : tout"
$md += "> snapshot de juin mesure le fond du trou, pas l'effet du travail."
$md += ""
$md += "> ⚠️ **La position moyenne est un indicateur piège.** Quand une page perd ses impressions"
$md += "> de longue traîne (mal classées), sa position moyenne *s'améliore* mécaniquement sans"
$md += "> aucun gain réel. Toujours lire **clics + impressions AVEC la position**, jamais la position seule."
$md += ""
$md += "## Totaux par snapshot"
$md += ""
$md += "| Snapshot | Fenêtre | Clics | Impressions | Sessions Organic |"
$md += "|---|---|---|---|---|"
foreach ($s in $snaps) {
  $tc = ($s.rows | Measure-Object gsc_clicks -Sum).Sum
  $ti = ($s.rows | Measure-Object gsc_impr -Sum).Sum
  $ts = ($s.rows | Measure-Object ga4_organic -Sum).Sum
  $md += "| **$($s.label)** | $($s.window) | $tc | $ti | $ts |"
}
$md += ""
$md += "## $($base.label) → $($last.label) (par collection, tri par clics actuels)"
$md += ""
$md += "| Collection | clics | Δclics | impressions | position | sessions Org |"
$md += "|---|---|---|---|---|---|"
foreach ($r in ($last.rows | Sort-Object -Property @{e={$_.gsc_clicks};Descending=$true})) {
  $b = $baseMap[$r.handle]
  $bc = '-'; $bi = '-'; $bp = '-'; $bs = '-'; $dc = ''
  if ($b) {
    $bc = $b.gsc_clicks; $bi = $b.gsc_impr; $bp = $b.gsc_pos; $bs = $b.ga4_organic
    $d = $r.gsc_clicks - $b.gsc_clicks
    if ($d -gt 0) { $dc = "▲ +$d" } elseif ($d -lt 0) { $dc = "▼ $d" } else { $dc = '=' }
  }
  $md += "| $($r.handle) | $bc→$($r.gsc_clicks) | $dc | $bi→$($r.gsc_impr) | $bp→$($r.gsc_pos) | $bs→$($r.ga4_organic) |"
}
$md += ""
$md += "_Témoins : **tableau-salon** (refonte dédiée 29/05) et **tableau-africain**._"
$md | Set-Content -Path "$root\suivi-collections-tracking.md" -Encoding UTF8

"OK snapshot '$Label' ($Start..$End) : $($rows.Count) collections"
"  total clics GSC            = $((($rows|Measure-Object gsc_clicks -Sum).Sum))"
"  total impressions GSC      = $((($rows|Measure-Object gsc_impr -Sum).Sum))"
"  total sessions Organic GA4 = $((($rows|Measure-Object ga4_organic -Sum).Sum))"
"  -> $trackPath + suivi-collections-tracking.md"
