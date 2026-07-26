<#
.SYNOPSIS
    ZOYA Master Controller - 3-Layer IP Rotation & Rate Limit Bypass Orchestrator
.DESCRIPTION
    Orchestrates multi-layer defense against rate limits:
    Layer 1 (VPN): PlanetVPN restart/switch -> ProtonVPN restart/switch
    Layer 2 (Proxy): Free proxy pool fetch, test, auto-rotate
    Layer 3 (API Key): Fallback API keys (future/reserved)
.NOTES
    Part of ZOYA IP Rotator System
    Author: ZOYA (T.K)
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("status", "check", "rotate-vpn", "rotate-proxy", "rotate-all", 
                  "auto", "monitor", "reset", "set-vpn", "help")]
    [string]$Command = "status",

    [Parameter()]
    [string]$ConfigPath = ".\config.json",

    [Parameter()]
    [int]$MonitorInterval = 30,

    [Parameter()]
    [int]$MonitorCount = 0,

    [Parameter()]
    [string]$VPN = "planet"
)

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = Join-Path $ScriptDir "logs"
$CacheDir = Join-Path $ScriptDir "cache"
$RotationHistory = Join-Path $ScriptDir "logs\rotation_history.log"
$StateFile = Join-Path $CacheDir "controller_state.json"

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
New-Item -ItemType Directory -Path $CacheDir -Force | Out-Null

# State Management
$state = @{
    CurrentLayer = 1  # 1=VPN, 2=Proxy, 3=APIKey
    CurrentVPN = "planetvpn"
    VpnSwitchCount = 0
    ProxyRotationCount = 0
    TotalRotations = 0
    LastRotationAt = $null
    LastLimitDetectedAt = $null
    IsBypassed = $false
    ErrorCount = 0
    HealthySince = $null
    PlanetVPNExhausted = $false
    ProtonVPNExhausted = $false
    ProxyExhausted = $false
}

function Load-State {
    if (Test-Path $StateFile) {
        try {
            $loaded = Get-Content -Path $StateFile -Raw | ConvertFrom-Json
            foreach ($prop in $loaded.PSObject.Properties) {
                $state[$prop.Name] = $prop.Value
            }
        } catch {
            Write-Warning "Failed to load state: $_"
        }
    }
}

function Save-State {
    try {
        $state | ConvertTo-Json | Set-Content -Path $StateFile -Force
    } catch {
        Write-Warning "Failed to save state: $_"
    }
}

Load-State

# Logging
function Write-RotationLog {
    param(
        [string]$Event,
        [string]$Detail = "",
        [string]$Level = "INFO",
        [string]$Layer = ""
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] [$Layer] $Event"
    if ($Detail) { $logLine += " - $Detail" }
    
    Add-Content -Path $RotationHistory -Value $logLine
    
    $color = switch ($Level) {
        "ERROR"   { "Red" }
        "WARN"    { "Yellow" }
        "SUCCESS" { "Green" }
        "INFO"    { "Cyan" }
        "DETAIL"  { "Gray" }
        default   { "White" }
    }
    Write-Host $logLine -ForegroundColor $color
}

# Layer 1: VPN Rotation
function Invoke-VpnRotation {
    Write-RotationLog -Event "[VPN] Layer 1: Starting VPN rotation..." -Level "INFO" -Layer "VPN"
    
    if (-not $state.PlanetVPNExhausted) {
        Write-RotationLog -Event "  Trying PlanetVPN..." -Level "DETAIL" -Layer "VPN"
        
        $result = & "$ScriptDir\vpn_manager.ps1" -Command "switch-planet" -ConfigPath $ConfigPath | ConvertFrom-Json
        
        if ($result.Status -eq "Success" -and $result.NewIP) {
            $state.CurrentVPN = "planetvpn"
            $state.VpnSwitchCount++
            $state.TotalRotations++
            $state.LastRotationAt = Get-Date
            $state.PlanetVPNExhausted = $false
            Save-State
            
            Write-RotationLog -Event "[OK] PlanetVPN switched" `
                -Detail "Old: $($result.OldIP) -> New: $($result.NewIP)" `
                -Level "SUCCESS" -Layer "VPN"
            return $true
        } else {
            Write-RotationLog -Event "[WARN] PlanetVPN failed" -Detail $result.Error -Level "WARN" -Layer "VPN"
            
            if ($state.VpnSwitchCount -ge 5) {
                $state.PlanetVPNExhausted = $true
                Save-State
                Write-RotationLog -Event "  PlanetVPN marked as exhausted" -Level "WARN" -Layer "VPN"
            }
        }
    } else {
        Write-RotationLog -Event "  Skipping PlanetVPN (exhausted)" -Level "DETAIL" -Layer "VPN"
    }
    
    if (-not $state.ProtonVPNExhausted) {
        Write-RotationLog -Event "  Trying ProtonVPN..." -Level "DETAIL" -Layer "VPN"
        
        $result = & "$ScriptDir\vpn_manager.ps1" -Command "switch-proton" -ConfigPath $ConfigPath | ConvertFrom-Json
        
        if ($result.Status -eq "Success" -and $result.NewIP) {
            $state.CurrentVPN = "protonvpn"
            $state.VpnSwitchCount++
            $state.TotalRotations++
            $state.LastRotationAt = Get-Date
            $state.ProtonVPNExhausted = $false
            Save-State
            
            Write-RotationLog -Event "[OK] ProtonVPN switched" `
                -Detail "New IP: $($result.NewIP)" `
                -Level "SUCCESS" -Layer "VPN"
            return $true
        } else {
            Write-RotationLog -Event "[WARN] ProtonVPN failed" -Detail $result.Error -Level "WARN" -Layer "VPN"
            $state.ProtonVPNExhausted = $true
            Save-State
        }
    } else {
        Write-RotationLog -Event "  Skipping ProtonVPN (exhausted)" -Level "DETAIL" -Layer "VPN"
    }
    
    Write-RotationLog -Event "[FAIL] Both VPNs exhausted - falling to Layer 2" -Level "WARN" -Layer "VPN"
    $state.CurrentLayer = 2
    Save-State
    return $false
}

# Layer 2: Proxy Rotation
function Invoke-ProxyRotation {
    Write-RotationLog -Event "[PROXY] Layer 2: Starting proxy rotation..." -Level "INFO" -Layer "PROXY"
    
    Write-RotationLog -Event "  Refreshing proxy pool..." -Level "DETAIL" -Layer "PROXY"
    $refreshResult = python "$ScriptDir\proxy_engine.py" refresh 2>&1 | Out-String
    
    try {
        $refreshData = $refreshResult | ConvertFrom-Json
        $proxyCount = $refreshData.total_proxies
        Write-RotationLog -Event "  Pool: $proxyCount working proxies" -Level "DETAIL" -Layer "PROXY"
    } catch {
        Write-RotationLog -Event "  Could not parse proxy refresh result" -Level "WARN" -Layer "PROXY"
    }
    
    $proxyResult = python "$ScriptDir\proxy_engine.py" get-proxy 2>&1 | Out-String
    
    try {
        $proxy = $proxyResult | ConvertFrom-Json
        
        if ($proxy.ip -and $proxy.port) {
            $state.CurrentLayer = 2
            $state.ProxyRotationCount++
            $state.TotalRotations++
            $state.LastRotationAt = Get-Date
            Save-State
            
            Write-RotationLog -Event "[OK] Proxy acquired" `
                -Detail "$($proxy.protocol)://$($proxy.ip):$($proxy.port)" `
                -Level "SUCCESS" -Layer "PROXY"
            return $proxy
        }
    } catch {
        Write-RotationLog -Event "  Failed to get proxy: $_" -Level "WARN" -Layer "PROXY"
    }
    
    Write-RotationLog -Event "[FAIL] No working proxies available" -Level "ERROR" -Layer "PROXY"
    $state.ProxyExhausted = $true
    $state.CurrentLayer = 3
    Save-State
    return $false
}

# Layer 3: API Key Fallback
function Invoke-ApiKeyFallback {
    Write-RotationLog -Event "[APIKEY] Layer 3: API Key fallback (NOT IMPLEMENTED)" -Level "WARN" -Layer "APIKEY"
    Write-RotationLog -Event "[FAIL] No more rotation options available" -Level "ERROR" -Layer "APIKEY"
    return $false
}

# Rate Limit Check
function Test-RateLimit {
    $result = python "$ScriptDir\limit_detector.py" check 2>&1 | Out-String
    
    try {
        $data = $result | ConvertFrom-Json
        
        if ($data.is_limited -eq $true) {
            Write-RotationLog -Event "[LIMIT] RATE LIMIT DETECTED" `
                -Detail "Confidence: $($data.confidence) | Sources: $($data.sources -join ', ')" `
                -Level "WARN" -Layer "DETECTOR"
            $state.LastLimitDetectedAt = Get-Date
            $state.ErrorCount++
            Save-State
            return $true
        }
        
        Write-RotationLog -Event "[OK] No rate limit detected" -Level "DETAIL" -Layer "DETECTOR"
        $state.HealthySince = Get-Date
        $state.ErrorCount = 0
        Save-State
        return $false
        
    } catch {
        Write-RotationLog -Event "  Failed to parse limit check: $_" -Level "WARN" -Layer "DETECTOR"
        return $false
    }
}

# Full Auto-Rotation
function Invoke-FullRotation {
    Write-RotationLog -Event "`n========================================" -Level "INFO" -Layer "MASTER"
    Write-RotationLog -Event "[MASTER] FULL ROTATION CYCLE STARTING" -Level "INFO" -Layer "MASTER"
    Write-RotationLog -Event "  Layer: $($state.CurrentLayer) | VPN: $($state.CurrentVPN)" -Level "DETAIL" -Layer "MASTER"
    Write-RotationLog -Event "========================================" -Level "INFO" -Layer "MASTER"
    
    $success = $false
    
    if ($state.CurrentLayer -le 1) {
        Write-RotationLog -Event "  -> Trying Layer 1 (VPN)..." -Level "INFO" -Layer "MASTER"
        $success = Invoke-VpnRotation
        if ($success) {
            Write-RotationLog -Event "[OK] Rotation at Layer 1 (VPN)" -Level "SUCCESS" -Layer "MASTER"
            return $true
        }
    }
    
    if ($state.CurrentLayer -le 2) {
        Write-RotationLog -Event "  -> Trying Layer 2 (Proxy)..." -Level "INFO" -Layer "MASTER"
        $success = Invoke-ProxyRotation
        if ($success) {
            Write-RotationLog -Event "[OK] Rotation at Layer 2 (Proxy)" -Level "SUCCESS" -Layer "MASTER"
            return $true
        }
    }
    
    if ($state.CurrentLayer -le 3) {
        Write-RotationLog -Event "  -> Trying Layer 3 (API Key)..." -Level "INFO" -Layer "MASTER"
        $success = Invoke-ApiKeyFallback
        if ($success) {
            Write-RotationLog -Event "[OK] Rotation at Layer 3 (API Key)" -Level "SUCCESS" -Layer "MASTER"
            return $true
        }
    }
    
    Write-RotationLog -Event "[FAIL] ALL LAYERS EXHAUSTED" -Level "ERROR" -Layer "MASTER"
    return $false
}

# Status Dashboard
function Show-Status {
    Write-Host "`n===============================================" -ForegroundColor Magenta
    Write-Host "  ZOYA IP Rotator - Status Dashboard" -ForegroundColor Cyan
    Write-Host "===============================================" -ForegroundColor Magenta
    
    $layerNames = @{1="VPN"; 2="Proxy"; 3="API Key"}
    Write-Host "`nLayer: $($state.CurrentLayer) - $($layerNames[$state.CurrentLayer])" -ForegroundColor Yellow
    
    Write-Host "`n--- VPN ---" -ForegroundColor Yellow
    & "$ScriptDir\vpn_manager.ps1" -Command "check-ip" -ConfigPath $ConfigPath
    
    try {
        & "$ScriptDir\vpn_manager.ps1" -Command "status" -ConfigPath $ConfigPath 2>&1 | Out-Null
        Write-Host "  PlanetVPN: " -NoNewline
        if ($state.PlanetVPNExhausted) { Write-Host "EXHAUSTED" -ForegroundColor Red }
        else { Write-Host "Available" -ForegroundColor Green }
    } catch { }
    
    Write-Host "  Switches: $($state.VpnSwitchCount)"
    
    Write-Host "`n--- Proxy ---" -ForegroundColor Yellow
    $proxyStats = python "$ScriptDir\proxy_engine.py" status 2>&1 | Out-String
    try {
        $pData = $proxyStats | ConvertFrom-Json
        Write-Host "  Pool Size: " -NoNewline
        if ($pData.total_proxies -ge $pData.min_pool) { 
            Write-Host "$($pData.total_proxies)" -ForegroundColor Green
        } else {
            Write-Host "$($pData.total_proxies)" -ForegroundColor Red
        }
        Write-Host "  Rotations: $($state.ProxyRotationCount)"
        Write-Host "  Healthy: " -NoNewline
        if ($pData.healthy) { Write-Host "Yes" -ForegroundColor Green } 
        else { Write-Host "No - needs refresh" -ForegroundColor Red }
    } catch {
        Write-Host "  Pool: Error getting status" -ForegroundColor Red
    }
    
    Write-Host "`n--- Statistics ---" -ForegroundColor Yellow
    Write-Host "  Total Rotations: $($state.TotalRotations)"
    Write-Host "  Error Count: " -NoNewline
    if ($state.ErrorCount -gt 0) { Write-Host "$($state.ErrorCount)" -ForegroundColor Red }
    else { Write-Host "0" -ForegroundColor Green }
    
    if ($state.LastRotationAt) {
        Write-Host "  Last Rotation: $($state.LastRotationAt)"
    }
    if ($state.LastLimitDetectedAt) {
        Write-Host "  Last Limit: $($state.LastLimitDetectedAt)" -ForegroundColor Yellow
    }
    
    Write-Host "`n--- Status ---" -ForegroundColor Yellow
    if ($state.IsBypassed) {
        Write-Host "  BYPASS ACTIVE - limits should be clear" -ForegroundColor Green
    } else {
        Write-Host "  MONITORING - no active bypass" -ForegroundColor Yellow
    }
    
    Write-Host "`nCommands: auto, rotate-vpn, rotate-proxy, monitor`n" -ForegroundColor Gray
}

# Monitor Mode
function Start-Monitoring {
    param(
        [int]$IntervalSeconds = 30,
        [int]$MaxChecks = 0
    )
    
    Write-RotationLog -Event "[MONITOR] Monitoring started" -Detail "Interval: ${IntervalSeconds}s" -Level "INFO" -Layer "MONITOR"
    Write-RotationLog -Event "  Press Ctrl+C to stop" -Level "DETAIL" -Layer "MONITOR"
    
    $checkCount = 0
    $limitedDetected = 0
    
    while ($true) {
        $checkCount++
        Write-Host "`n[Check $checkCount]" -ForegroundColor Cyan
        
        $isLimited = Test-RateLimit
        
        if ($isLimited) {
            $limitedDetected++
            Write-Host "[LIMIT] Rate limit detected - triggering rotation..." -ForegroundColor Yellow
            Invoke-FullRotation
            
            Start-Sleep -Seconds 10
            Test-RateLimit | Out-Null
        }
        
        if ($checkCount % 3 -eq 0) {
            Write-Host "`nSummary: $limitedDetected/$checkCount limits detected" -ForegroundColor Gray
        }
        
        if ($MaxChecks -gt 0 -and $checkCount -ge $MaxChecks) {
            Write-RotationLog -Event "[MONITOR] Completed $MaxChecks checks" -Level "INFO" -Layer "MONITOR"
            break
        }
        
        Start-Sleep -Seconds $IntervalSeconds
    }
}

# Reset State
function Reset-State {
    Write-Host "Resetting controller state..." -ForegroundColor Yellow
    
    $state.CurrentLayer = 1
    $state.VpnSwitchCount = 0
    $state.ProxyRotationCount = 0
    $state.TotalRotations = 0
    $state.LastRotationAt = $null
    $state.LastLimitDetectedAt = $null
    $state.IsBypassed = $false
    $state.ErrorCount = 0
    $state.HealthySince = $null
    $state.PlanetVPNExhausted = $false
    $state.ProtonVPNExhausted = $false
    $state.ProxyExhausted = $false
    
    Save-State
    Write-Host "[OK] State reset complete" -ForegroundColor Green
}

# Main Dispatcher
switch ($Command) {
    "status" {
        Show-Status
    }
    "check" {
        $isLimited = Test-RateLimit
        if ($isLimited) {
            Write-Host "[LIMIT] RATE LIMITED" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "[OK] NO LIMIT DETECTED" -ForegroundColor Green
            exit 0
        }
    }
    "rotate-vpn" {
        Invoke-VpnRotation
    }
    "rotate-proxy" {
        Invoke-ProxyRotation
    }
    "rotate-all" {
        Invoke-FullRotation
    }
    "auto" {
        Write-RotationLog -Event "[MASTER] Auto-rotation triggered" -Level "INFO" -Layer "MASTER"
        
        $isLimited = Test-RateLimit
        if ($isLimited) {
            $success = Invoke-FullRotation
            
            if ($success) {
                $state.IsBypassed = $true
                Save-State
                Write-RotationLog -Event "[OK] Bypass active" -Level "SUCCESS" -Layer "MASTER"
            } else {
                Write-RotationLog -Event "[FAIL] Bypass failed - all layers exhausted" -Level "ERROR" -Layer "MASTER"
            }
        } else {
            Write-Host "[OK] No rate limit detected - no rotation needed" -ForegroundColor Green
        }
    }
    "monitor" {
        Start-Monitoring -IntervalSeconds $MonitorInterval -MaxChecks $MonitorCount
    }
    "reset" {
        Reset-State
    }
    "set-vpn" {
        Write-Host "Setting active VPN: $VPN"
        if ($VPN -in @("planet", "planetvpn")) {
            $state.CurrentVPN = "planetvpn"
            $state.PlanetVPNExhausted = $false
            Save-State
            Write-Host "[OK] PlanetVPN selected" -ForegroundColor Green
        } elseif ($VPN -in @("proton", "protonvpn")) {
            $state.CurrentVPN = "protonvpn"
            $state.ProtonVPNExhausted = $false
            Save-State
            Write-Host "[OK] ProtonVPN selected" -ForegroundColor Green
        } else {
            Write-Host "Unknown VPN: $VPN. Use: planet or proton" -ForegroundColor Red
        }
    }
    "help" {
        Write-Host @"

ZOYA IP Rotator - Commands
================================
status          Show status dashboard
check           Quick rate limit check
rotate-vpn      Force VPN rotation
rotate-proxy    Force proxy rotation
rotate-all      Full rotation (VPN, Proxy, API Key)
auto            Check + auto-rotate if needed
monitor         Continuous monitoring
reset           Reset all state
set-vpn         Set active VPN (planet or proton)

Examples:
  .\master_controller.ps1 status
  .\master_controller.ps1 auto
  .\master_controller.ps1 monitor -MonitorInterval 60

"@
    }
}
