$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logPath = Join-Path $root 'long-run-monitor.log'
$started = Get-Date
$deadline = $started.AddHours(2)
"START $($started.ToString('o'))" | Set-Content -Encoding utf8 $logPath
while ((Get-Date) -lt $deadline) {
  $now = Get-Date
  try {
    $health = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 'http://127.0.0.1:8787/health'
    $db = Get-Content -Raw -Encoding utf8 (Join-Path $root 'content-db.json') | ConvertFrom-Json
    $node = Get-Process node -ErrorAction SilentlyContinue
    $content = $health.Content | ConvertFrom-Json
    $contentOk = $content.content.version -ge 3 -and $content.content.events -ge 54 -and $content.content.treasures -ge 48 -and $content.content.treasureSpawns -ge 48 -and $content.content.npcs -ge 20 -and $content.content.cases -ge 35 -and $content.content.discussions -ge 18 -and $content.content.parkGames -ge 21
    if ($health.StatusCode -ne 200 -or -not $node -or -not $contentOk) { "FAIL $($now.ToString('o')) status=$($health.StatusCode) node=$([bool]$node) content=$($health.Content)" | Add-Content -Encoding utf8 $logPath }
    else { "OK $($now.ToString('o')) rooms=$($health.Content) events=$($db.events.Count) cases=$($db.cases.Count)" | Add-Content -Encoding utf8 $logPath }
  } catch { "ERROR $($now.ToString('o')) $($_.Exception.Message)" | Add-Content -Encoding utf8 $logPath }
  Start-Sleep -Seconds 60
}
"END $((Get-Date).ToString('o'))" | Add-Content -Encoding utf8 $logPath
