$ErrorActionPreference = "Stop"

$ports = @(18790, 18791)
$connections = Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -Property LocalPort, OwningProcess -Unique

if (-not $connections) {
  Write-Host "[gateway:stop] no OpenSeaBri gateway ports are listening"
  exit 0
}

$stopped = New-Object System.Collections.Generic.HashSet[int]
foreach ($connection in $connections) {
  $pidValue = [int]$connection.OwningProcess
  if ($stopped.Contains($pidValue)) { continue }

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue
  if (-not $process) { continue }

  $commandLine = [string]$process.CommandLine
  $isOpenSeaBriGateway =
    $commandLine -match "SeaBridgeAI\\openseabri" -and
    ($commandLine -match "gateway/index\.ts" -or $commandLine -match "npm(\\.cmd)?\\s+run\\s+gateway")

  if (-not $isOpenSeaBriGateway) {
    Write-Host "[gateway:stop] port $($connection.LocalPort) is owned by PID $pidValue, but it does not look like OpenSeaBri gateway; leaving it alone"
    continue
  }

  Stop-Process -Id $pidValue -Force
  [void]$stopped.Add($pidValue)
  Write-Host "[gateway:stop] stopped OpenSeaBri gateway PID $pidValue"
}

if ($stopped.Count -eq 0) {
  Write-Host "[gateway:stop] no OpenSeaBri gateway process was stopped"
}
