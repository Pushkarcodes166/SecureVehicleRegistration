$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " Secure Vehicle Registration Setup"
Write-Host "======================================`n" -ForegroundColor Cyan

foreach ($Folder in @("blockchain", "backend", "frontend")) {
    $Path = Join-Path $Root $Folder

    if (!(Test-Path (Join-Path $Path "package.json"))) {
        throw "package.json not found in $Folder"
    }

    Write-Host "`nInstalling $Folder dependencies..." -ForegroundColor Yellow
    Push-Location $Path

    try {
        npm install

        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed in $Folder"
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "`nCompiling Solidity contract..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "blockchain")

try {
    npx hardhat compile

    if ($LASTEXITCODE -ne 0) {
        throw "Smart contract compilation failed"
    }
}
finally {
    Pop-Location
}

$AbiSource = Join-Path $Root `
    "blockchain\artifacts\contracts\SecureVehicleRegistry.sol\SecureVehicleRegistry.json"

$AbiFolder = Join-Path $Root "backend\contract"
$AbiTarget = Join-Path $AbiFolder "SecureVehicleRegistry.json"

if (!(Test-Path $AbiSource)) {
    throw "Compiled contract ABI was not generated"
}

New-Item -ItemType Directory -Force -Path $AbiFolder | Out-Null
Copy-Item $AbiSource $AbiTarget -Force

Write-Host "`nSetup completed successfully!" -ForegroundColor Green
Write-Host "Next, run: .\start.ps1" -ForegroundColor Cyan