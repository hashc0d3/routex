# Локальный Loki + Grafana без Docker (Windows). Бинарники и данные — в $Root (по умолчанию на D:,
# потому что на C: мало места). Пароль Grafana — в .env.local рядом со скриптом (не в git).
#   powershell -File deploy/observability/start-local.ps1        запустить
#   powershell -File deploy/observability/start-local.ps1 -Stop  остановить
param(
  [string]$Root = "D:\RouteX-observability",
  [switch]$Stop
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

if ($Stop) {
  Get-Process loki-windows-amd64, grafana, grafana-server -ErrorAction SilentlyContinue | Stop-Process -Force
  "Loki и Grafana остановлены"
  return
}

$loki = Get-ChildItem "$Root\loki" -Filter "loki*.exe" | Select-Object -First 1
$grafanaHome = Get-ChildItem $Root -Directory -Filter "grafana*" | Sort-Object Name -Descending | Select-Object -First 1
if (-not $loki -or -not $grafanaHome) { throw "Нет бинарников в $Root (нужны loki\loki-windows-amd64.exe и grafana-<версия>\)" }

$envFile = Join-Path $here ".env.local"
if (-not (Test-Path $envFile)) {
  $pw = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 18 | ForEach-Object { [char]$_ })
  [IO.File]::WriteAllText($envFile, "GRAFANA_ADMIN_PASSWORD=$pw`n", (New-Object Text.UTF8Encoding $false))
}
$vars = @{}
Get-Content $envFile | Where-Object { $_ -match "^\s*([A-Z_]+)=(.*)$" } | ForEach-Object { $vars[$Matches[1]] = $Matches[2].Trim() }

New-Item -ItemType Directory -Force "$Root\data\loki", "$Root\data\grafana", "$Root\logs" | Out-Null

if (-not (Get-Process loki-windows-amd64 -ErrorAction SilentlyContinue)) {
  $env:LOKI_DATA = "$Root\data\loki" -replace "\\", "/"
  $env:LOKI_BIND = "127.0.0.1"
  Start-Process $loki.FullName -ArgumentList "-config.file=`"$here\loki.yaml`"", "-config.expand-env=true" `
    -WindowStyle Hidden -RedirectStandardOutput "$Root\logs\loki.out.log" -RedirectStandardError "$Root\logs\loki.err.log"
}

if (-not (Get-Process grafana, grafana-server -ErrorAction SilentlyContinue)) {
  $env:GF_PATHS_DATA = "$Root\data\grafana"
  $env:GF_PATHS_LOGS = "$Root\logs"
  $env:GF_PATHS_PROVISIONING = "$here\grafana\provisioning"
  $env:ROUTEX_DASHBOARDS = "$here\grafana\dashboards"
  $env:LOKI_URL = "http://127.0.0.1:3100"
  $env:GF_SERVER_HTTP_ADDR = "127.0.0.1"
  $env:GF_SERVER_HTTP_PORT = "3002"
  $env:GF_SECURITY_ADMIN_USER = "admin"
  $env:GF_SECURITY_ADMIN_PASSWORD = $vars["GRAFANA_ADMIN_PASSWORD"]
  $env:GF_ANALYTICS_REPORTING_ENABLED = "false"
  $env:GF_ANALYTICS_CHECK_FOR_UPDATES = "false"
  $env:GF_NEWS_NEWS_FEED_ENABLED = "false"
  # не докачивать при старте трейсинг/профилирование и т.п. — нам нужен только Loki
  $env:GF_PLUGINS_PREINSTALL_DISABLED = "true"
  $env:GF_USERS_DEFAULT_LANGUAGE = "ru-RU"
  $env:GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH = "$here\grafana\dashboards\routex-events.json"
  $exe = Join-Path $grafanaHome.FullName "bin\grafana.exe"
  Start-Process $exe -ArgumentList "server", "--homepath", "`"$($grafanaHome.FullName)`"" -WorkingDirectory $grafanaHome.FullName `
    -WindowStyle Hidden -RedirectStandardOutput "$Root\logs\grafana.out.log" -RedirectStandardError "$Root\logs\grafana.err.log"
}

"Loki:    http://127.0.0.1:3100/ready"
"Grafana: http://localhost:3002  (admin / пароль в deploy/observability/.env.local)"
