# ============================================================
# Secure Vehicle Registration - Complete Startup Script
# React + Express + Hardhat
# Dynamic backend/frontend ports
# ============================================================

$ErrorActionPreference = "Stop"

$Root       = $PSScriptRoot
$Blockchain = Join-Path $Root "blockchain"
$Backend    = Join-Path $Root "backend"
$Frontend   = Join-Path $Root "frontend"

$RpcUrl = "http://127.0.0.1:8545"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Stop-Startup {
    param([string]$Message)

    Write-Host "`nSTARTUP FAILED: $Message" -ForegroundColor Red
    Write-Host "Read the error above, fix it, and run .\start.ps1 again." -ForegroundColor Yellow
    exit 1
}

function Test-Port {
    param([int]$Port)

    $Client = $null

    try {
        $Client = New-Object System.Net.Sockets.TcpClient
        $Result = $Client.BeginConnect("127.0.0.1", $Port, $null, $null)

        if (!$Result.AsyncWaitHandle.WaitOne(500)) {
            return $false
        }

        $Client.EndConnect($Result)
        return $true
    }
    catch {
        return $false
    }
    finally {
        if ($Client) {
            $Client.Close()
        }
    }
}

function Get-FreePort {
    param(
        [int]$StartPort,
        [int]$EndPort
    )

    for ($Port = $StartPort; $Port -le $EndPort; $Port++) {
        $Listener = $null

        try {
            $Listener = New-Object System.Net.Sockets.TcpListener(
                [System.Net.IPAddress]::Loopback,
                $Port
            )

            $Listener.Start()
            $Listener.Stop()

            return $Port
        }
        catch {
            if ($Listener) {
                try { $Listener.Stop() } catch {}
            }
        }
    }

    throw "No free port found between $StartPort and $EndPort."
}

# ------------------------------------------------------------
# 1. Validate project
# ------------------------------------------------------------

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SECUREREG - STARTUP MANAGER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$RequiredFiles = @(
    (Join-Path $Blockchain "package.json"),
    (Join-Path $Blockchain "contracts\SecureVehicleRegistry.sol"),
    (Join-Path $Blockchain "scripts\deploy.js"),
    (Join-Path $Backend "package.json"),
    (Join-Path $Backend "server.js"),
    (Join-Path $Frontend "package.json"),
    (Join-Path $Frontend "src\App.jsx")
)

foreach ($File in $RequiredFiles) {
    if (!(Test-Path $File)) {
        Stop-Startup "Required file is missing: $File"
    }
}

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-Startup "Node.js is not installed or is not available in PATH."
}

if (!(Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Stop-Startup "npm.cmd is not available. Check your Node.js installation."
}

Write-Host "Node.js: $(node --version)"
Write-Host "npm:     $(npm --version)"

# ------------------------------------------------------------
# 2. Select available application ports
# ------------------------------------------------------------

Write-Step "Selecting available ports"

try {
    $BackendPort = Get-FreePort -StartPort 5000 -EndPort 5099
    $FrontendPort = Get-FreePort -StartPort 5173 -EndPort 5273
}
catch {
    Stop-Startup $_.Exception.Message
}

$BackendUrl = "http://localhost:$BackendPort"
$FrontendUrl = "http://localhost:$FrontendPort"

Write-Host "Backend port : $BackendPort" -ForegroundColor Green
Write-Host "Frontend port: $FrontendPort" -ForegroundColor Green

# ------------------------------------------------------------
# 3. Start or reuse the Hardhat blockchain
# ------------------------------------------------------------

Write-Step "Checking Hardhat blockchain"

if (Test-Port 8545) {
    try {
        $RpcBody = @{
            jsonrpc = "2.0"
            method  = "eth_chainId"
            params  = @()
            id      = 1
        } | ConvertTo-Json -Compress

        $RpcResponse = Invoke-RestMethod `
            -Uri $RpcUrl `
            -Method Post `
            -ContentType "application/json" `
            -Body $RpcBody `
            -TimeoutSec 5
    }
    catch {
        Stop-Startup "Port 8545 is occupied, but a working RPC service was not found."
    }

    if ($RpcResponse.result -ne "0x7a69") {
        Stop-Startup "RPC service on port 8545 is not using chain ID 31337."
    }

    Write-Host "Existing local Hardhat network detected." -ForegroundColor Green
}
else {
    Write-Host "Starting local Hardhat node..."

    Start-Process `
        -FilePath "cmd.exe" `
        -WorkingDirectory $Blockchain `
        -ArgumentList @("/k", "npx hardhat node") | Out-Null

    $RpcReady = $false

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1

        if (Test-Port 8545) {
            $RpcReady = $true
            break
        }
    }

    if (!$RpcReady) {
        Stop-Startup "Hardhat node failed to start. Check the blockchain terminal."
    }

    Write-Host "Hardhat node is ready." -ForegroundColor Green
}

# ------------------------------------------------------------
# 4. Compile contract
# ------------------------------------------------------------

Write-Step "Compiling smart contract"

$CompileLog = Join-Path $env:TEMP "securereg-compile.log"

Push-Location $Blockchain

try {
    & cmd.exe /d /c "npx hardhat compile > `"$CompileLog`" 2>&1"
    $CompileExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if (Test-Path $CompileLog) {
    Get-Content $CompileLog | ForEach-Object { Write-Host $_ }
}

if ($CompileExitCode -ne 0) {
    Stop-Startup "Smart contract compilation failed."
}

# ------------------------------------------------------------
# 5. Update backend ABI
# ------------------------------------------------------------

Write-Step "Preparing contract ABI"

$AbiSource = Join-Path $Blockchain `
    "artifacts\contracts\SecureVehicleRegistry.sol\SecureVehicleRegistry.json"

$AbiFolder = Join-Path $Backend "contract"
$AbiTarget = Join-Path $AbiFolder "SecureVehicleRegistry.json"

if (!(Test-Path $AbiSource)) {
    Stop-Startup "Compiled contract ABI file was not generated."
}

New-Item -ItemType Directory -Force -Path $AbiFolder | Out-Null
Copy-Item $AbiSource $AbiTarget -Force

# ------------------------------------------------------------
# 6. Deploy smart contract
# ------------------------------------------------------------

Write-Step "Deploying smart contract"

$DeployLog = Join-Path $env:TEMP "securereg-deploy.log"

Push-Location $Blockchain

try {
    & cmd.exe /d /c "npx hardhat run scripts/deploy.js --network localhost > `"$DeployLog`" 2>&1"
    $DeployExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

$DeployText = ""

if (Test-Path $DeployLog) {
    $DeployText = Get-Content $DeployLog -Raw
    Write-Host $DeployText
}

if ($DeployExitCode -ne 0) {
    Stop-Startup "Contract deployment failed. Review the deployment log output."
}

if ($DeployText -notmatch '(?im)Contract address:\s*(0x[a-fA-F0-9]{40})') {
    Stop-Startup "Deployment succeeded or returned output, but the contract address could not be detected. Check scripts/deploy.js."
}

$ContractAddress = $Matches[1]

Write-Host "Contract address: $ContractAddress" -ForegroundColor Green

# ------------------------------------------------------------
# 7. Write backend environment
# ------------------------------------------------------------

Write-Step "Configuring backend"

$EnvPath = Join-Path $Backend ".env"

@(
    "PORT=$BackendPort"
    "RPC_URL=http://127.0.0.1:8545"
    "CONTRACT_ADDRESS=$ContractAddress"
) | Set-Content -Path $EnvPath -Encoding ascii

Write-Host "Backend environment configured." -ForegroundColor Green

# ------------------------------------------------------------
# 8. Start backend
# ------------------------------------------------------------

Write-Step "Starting backend"

Start-Process `
    -FilePath "cmd.exe" `
    -WorkingDirectory $Backend `
    -ArgumentList @("/k", "npm run dev") | Out-Null

$BackendReady = $false

for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1

    try {
        $Health = Invoke-RestMethod `
            -Uri "$BackendUrl/api/health" `
            -Method Get `
            -TimeoutSec 3

        if (
            $Health.success -eq $true -and
            $Health.blockchain -eq "connected" -and
            [string]$Health.chainId -eq "31337"
        ) {
            $BackendReady = $true
            break
        }
    }
    catch {
        # The backend may still be starting.
    }
}

if (!$BackendReady) {
    Stop-Startup "Backend health check failed. Inspect the backend terminal and .env file."
}

Write-Host "Backend and blockchain health check passed." -ForegroundColor Green

# ------------------------------------------------------------
# 9. Configure frontend environment
# ------------------------------------------------------------

Write-Step "Configuring frontend"

# Vite reads VITE_API_URL when its process starts.
# No source files are rewritten by this script.

$env:VITE_API_URL = $BackendUrl

Write-Host "Frontend API URL: $env:VITE_API_URL" -ForegroundColor Green

# ------------------------------------------------------------
# 10. Start frontend on selected port
# ------------------------------------------------------------

Write-Step "Starting frontend"

$FrontendCommand = "set VITE_API_URL=$BackendUrl&& npm run dev -- --host 0.0.0.0 --port $FrontendPort --strictPort"

Start-Process `
    -FilePath "cmd.exe" `
    -WorkingDirectory $Frontend `
    -ArgumentList @("/k", $FrontendCommand) | Out-Null

$FrontendReady = $false

for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1

    try {
        $Page = Invoke-WebRequest `
            -Uri $FrontendUrl `
            -Method Get `
            -TimeoutSec 3 `
            -UseBasicParsing

        if ($Page.StatusCode -ge 200 -and $Page.StatusCode -lt 400) {
            $FrontendReady = $true
            break
        }
    }
    catch {
        # Vite may still be starting.
    }
}

if (!$FrontendReady) {
    Stop-Startup "Frontend failed to respond. Check its terminal for Vite errors."
}

# ------------------------------------------------------------
# 11. Final status
# ------------------------------------------------------------

Write-Host "`n============================================" -ForegroundColor Green
Write-Host " ALL SERVICES STARTED SUCCESSFULLY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

Write-Host "Frontend : $FrontendUrl"
Write-Host "Backend  : $BackendUrl"
Write-Host "Health   : $BackendUrl/api/health"
Write-Host "Stats    : $BackendUrl/api/stats"
Write-Host "Contract : $ContractAddress"

Write-Host "`nOpening SecureReg in your browser..." -ForegroundColor Cyan
Start-Process $FrontendUrl

Write-Host "`nKeep all service terminal windows open." -ForegroundColor Yellow
Write-Host "The local blockchain and its records reset if the Hardhat node is restarted."