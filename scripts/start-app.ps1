param(
    [int]$Port = 3000,
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:$Port"

function Test-ServerUp {
    try {
        Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-ServerUp)) {
    Start-Process -FilePath 'cmd.exe' `
        -ArgumentList '/c', 'npm run dev' `
        -WorkingDirectory $projectRoot `
        -WindowStyle Minimized

    $elapsed = 0
    while (-not (Test-ServerUp)) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        if ($elapsed -ge $TimeoutSeconds) {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show(
                "Ledgerly did not start within $TimeoutSeconds seconds. Check the minimized console window for errors.",
                "Ledgerly launch failed"
            ) | Out-Null
            exit 1
        }
    }
}

Start-Process $url
