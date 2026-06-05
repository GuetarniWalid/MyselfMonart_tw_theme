# Suivi récupération SEO collections — snapshot GSC + GA4 (fenêtre glissante 28 j).
# Usage : powershell -File suivi-collections-snapshot.ps1 -Label "J0"   (puis "J14", "J30")
# Réutilisable : chaque exécution APPEND un snapshot daté dans suivi-collections-tracking.json
# et régénère suivi-collections-tracking.md (table baseline vs dernier + deltas).
# NB : le token GSC expire ~7 j → si erreur d'auth, lancer d'abord : node ~/.claude/scripts/gsc/gsc.mjs auth
param([string]$Label = "J0")
$ErrorActionPreference = 'Continue'
$root = "C:\Users\gueta\Documents\Mes_projets\tw_myselfmonart_shopify_theme\seo"
$gsc  = "C:\Users\gueta\.claude\scripts\gsc\gsc.mjs"
$ga4  = "C:\Users\gueta\.claude\scripts\gsc\ga4.mjs"
$today = (Get-Date).ToString('yyyy-MM-dd')
$d28   = (Get-Date).AddDays(-28).ToString('yyyy-MM-dd')

$wl = [System.IO.File]::ReadAllText("$root\collections-worklist.json", [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$done = @($wl.collections | Where-Object { $_.status -eq 'done' } | ForEach-Object { $_.handle })

Write-Host "GSC par page ($d28 -> $today, fra)..."
$gscMap = @{}
try {
  $gscCsv = & node $gsc query --site sc-domain:myselfmonart.com --type web --dimensions page --country fra --start-date $d28 --end-date $today --row-limit 2000 --format csv 2>$null
  foreach ($r in ($gscCsv | ConvertFrom-Csv)) { if ($r.page -match '/collections/([a-z0-9\-]+)') { $gscMap[$matches[1]] = $r } }
} catch { Write-Host "GSC ERROR: $($_.Exception.Message)" }

Write-Host "GA4 Organic par page ($d28 -> $today)..."
$ga4Map = @{}
try {
  $ga4Csv = & node $ga4 report --property 374096343 --dimensions pagePath,sessionDefaultChannelGroup --metrics sessions --start $d28 --end $today --format csv 2>$null
  foreach ($r in ($ga4Csv | ConvertFrom-Csv)) {
    if (($r.sessionDefaultChannelGroup -match 'Organic') -and ($r.pagePath -match '/collections/([a-z0-9\-]+)')) {
      $hk = $matches[1]; $ga4Map[$hk] = [int]([double]$r.sessions) + ($(if($ga4Map.ContainsKey($hk)){$ga4Map[$hk]}else{0}))
    }
  }
} catch { Write-Host "GA4 ERROR: $($_.Exception.Message)" }

$rows = foreach ($h in $done) {
  $g = $gscMap[$h]
  [pscustomobject]@{
    handle      = $h
    gsc_clicks  = if ($g) { [int]$g.clicks } else { 0 }
    gsc_impr    = if ($g) { [int]$g.impressions } else { 0 }
    gsc_pos     = if ($g) { [math]::Round([double]$g.position, 1) } else { $null }
    ga4_organic = if ($ga4Map.ContainsKey($h)) { $ga4Map[$h] } else { 0 }
  }
}

$trackPath = "$root\suivi-collections-tracking.json"
$track = if (Test-Path $trackPath) { [System.IO.File]::ReadAllText($trackPath,[System.Text.Encoding]::UTF8) | ConvertFrom-Json } else { [pscustomobject]@{ snapshots = @() } }
$snap = [pscustomobject]@{ label=$Label; date=$today; window="$d28..$today"; country='fra'; rows=$rows }
$track.snapshots = @(@($track.snapshots) + $snap)
$track | ConvertTo-Json -Depth 8 | Set-Content -Path $trackPath -Encoding UTF8

# ---- MD report (baseline vs dernier + delta) ----
$snaps = @($track.snapshots)
$base = $snaps[0]; $last = $snaps[-1]
$baseMap = @{}; foreach ($r in $base.rows) { $baseMap[$r.handle] = $r }
$md = @()
$md += "# Suivi récupération SEO collections (post Core Update déc. 2025)"
$md += ""
$md += "Mécanisme : éditorial E-E-A-T metafield-first (intro/guide/FAQ) appliqué le 2026-06-05. Voir collections-applied-log.md."
$md += "Snapshots (fenêtre glissante 28 j, GSC web FR + GA4 Organic) :"
foreach ($s in $snaps) { $md += "- **$($s.label)** ($($s.date), $($s.window)) — clics GSC=$((($s.rows|Measure-Object gsc_clicks -Sum).Sum)) · sessions Organic=$((($s.rows|Measure-Object ga4_organic -Sum).Sum))" }
$md += ""
$md += "## $($base.label) → $($last.label) (par collection)"
$md += ""
$md += "| Collection | clics $($base.label)→$($last.label) | pos $($base.label)→$($last.label) | Δpos | sessions Org $($base.label)→$($last.label) |"
$md += "|---|---|---|---|---|"
foreach ($r in ($last.rows | Sort-Object -Property @{e={$_.gsc_clicks};Descending=$true})) {
  $b = $baseMap[$r.handle]
  $dpos = if ($b -and $b.gsc_pos -and $r.gsc_pos) { [math]::Round($b.gsc_pos - $r.gsc_pos,1) } else { '' }
  $arrow = if ($dpos -ne '' -and $dpos -gt 0) { "▲ +$dpos" } elseif ($dpos -ne '' -and $dpos -lt 0) { "▼ $dpos" } else { '=' }
  $bc = if($b){$b.gsc_clicks}else{'-'}; $bp = if($b){$b.gsc_pos}else{'-'}; $bs = if($b){$b.ga4_organic}else{'-'}
  $md += "| $($r.handle) | $bc→$($r.gsc_clicks) | $bp→$($r.gsc_pos) | $arrow | $bs→$($r.ga4_organic) |"
}
$md += ""
$md += "_Témoin de tête : **tableau-salon** (refondu 29/05, ~1 sem d'avance) puis **tableau-africain**. La position doit remonter sous 2-6 semaines, surtout au prochain core update._"
$md | Set-Content -Path "$root\suivi-collections-tracking.md" -Encoding UTF8

"OK snapshot '$Label' : $($rows.Count) collections"
"  total clics GSC (28j)      = $((($rows|Measure-Object gsc_clicks -Sum).Sum))"
"  total impressions GSC      = $((($rows|Measure-Object gsc_impr -Sum).Sum))"
"  total sessions Organic GA4 = $((($rows|Measure-Object ga4_organic -Sum).Sum))"
"  -> $trackPath + suivi-collections-tracking.md"