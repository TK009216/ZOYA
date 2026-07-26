<#
.SYNOPSIS
    ZOYA VPN Manager - PlanetVPN & ProtonVPN service control with IP verification
.DESCRIPTION
    Manages VPN service restart and server switching to rotate public IP address.
    Supports PlanetVPN (service restart) and ProtonVPN (service + potential CLI).
.NOTES
    Part of ZOYA IP Rotator System
    Author: ZOYA (T.K)
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("status", "restart-planet", "restart-proton", "restart-all", "switch-planet", "switch-proton", "check-ip")]
    [string]$Command = "status",

    [Parameter()]
    [string]$ConfigPath = ".\config.json"
)

# Load Config
$config = Get-Content -Path $ConfigPath -Raw | ConvertFrom-Json
$vpnConfig = $config.vpn

# Helper: Get Current Public IP
function Get-PublicIP {
    param([int]$TimeoutSeconds = 10)
    
    $ipUrls = @(
        "https://api.ipify.org?format=json",
        "https://httpbin.org/ip",
        "https://icanhazip.com"
    )
    
    foreach ($url in $ipUrls) {
        try {
            $response = Invoke-RestMethod -Uri $url -TimeoutSec $TimeoutSeconds -ErrorAction Stop
            if ($response.ip) { return $response.ip }
            if ($response.origin) { return $response.origin }
            if ($response -match '^[\d\.]+$') { return $response.Trim() }
        } catch {
            Write-Warning "IP check failed for $url : $_"
        }
    }
    
    # Fallback: try DNS
    try {
        $hostEntry = [System.Net.Dns]::GetHostEntry("myip.opendns.com")
        return $hostEntry.AddressList[0].IPAddressToString
    } catch { }
    
    return $null
}

# Helper: Wait for IP Change
function Wait-ForIPChange {
    param(
        [string]$OldIP,
        [int]$MaxWaitSeconds = 30,
        [int]$CheckInterval = 3
    )
    
    $elapsed = 0
    while ($elapsed -lt $MaxWaitSeconds) {
        Start-Sleep -Seconds $CheckInterval
        $elapsed += $CheckInterval
        $newIP = Get-PublicIP
        if ($newIP -and $newIP -ne $OldIP) {
            Write-Host "[OK] IP changed: $OldIP -> $newIP" -ForegroundColor Green
            return $newIP
        }
        Write-Host "  Waiting for IP change... ($elapsed/$MaxWaitSeconds s)" -ForegroundColor Gray
    }
    
    Write-Warning "IP did NOT change within $MaxWaitSeconds seconds"
    return $null
}

# PlanetVPN Operations
function Invoke-PlanetVPNRestart {
    param([int]$MaxRetries = 5)
    
    Write-Host "`n[PlanetVPN] Restarting service..." -ForegroundColor Cyan
    
    $serviceName = $vpnConfig.planetvpn.service_name
    $delay = $vpnConfig.planetvpn.restart_delay_seconds
    
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        $oldIP = Get-PublicIP
        Write-Host "[PlanetVPN] Attempt $attempt/$MaxRetries (Current IP: $oldIP)"
        
        try {
            Stop-Service -Name $serviceName -Force -ErrorAction Stop
            Write-Host "  [OK] Service stopped" -ForegroundColor Green
        } catch {
            Write-Warning "  Failed to stop service: $_"
        }
        
        Start-Sleep -Seconds $delay
        
        try {
            Start-Service -Name $serviceName -ErrorAction Stop
            Write-Host "  [OK] Service started" -ForegroundColor Green
        } catch {
            Write-Warning "  Failed to start service: $_"
            continue
        }
        
        Start-Sleep -Seconds $vpnConfig.planetvpn.ip_check_delay
        
        $newIP = Wait-ForIPChange -OldIP $oldIP -MaxWaitSeconds 20
        if ($newIP) {
            return @{ Status = "Success"; VPN = "PlanetVPN"; OldIP = $oldIP; NewIP = $newIP; Attempts = $attempt }
        }
        
        Write-Host "  IP unchanged, retrying..." -ForegroundColor Yellow
    }
    
    return @{ Status = "Failed"; VPN = "PlanetVPN"; Error = "Max retries reached without IP change" }
}

function Invoke-PlanetVPNStatus {
    $serviceName = $vpnConfig.planetvpn.service_name
    
    try {
        $svc = Get-Service -Name $serviceName -ErrorAction Stop
        $ip = Get-PublicIP
        return @{
            ServiceName = $serviceName
            Status = $svc.Status.ToString()
            StartType = $svc.StartType.ToString()
            PublicIP = $ip
            Running = ($svc.Status -eq 'Running')
        }
    } catch {
        return @{
            ServiceName = $serviceName
            Status = "Not Found"
            StartType = "N/A"
            PublicIP = $null
            Running = $false
            Error = $_.Exception.Message
        }
    }
}

# ProtonVPN Operations
function Invoke-ProtonVPNRestart {
    param([int]$MaxRetries = 5)
    
    Write-Host "`n[ProtonVPN] Restarting service..." -ForegroundColor Cyan
    
    $serviceName = $vpnConfig.protonvpn.service_name
    $delay = $vpnConfig.protonvpn.restart_delay_seconds
    $installPath = $vpnConfig.protonvpn.install_path
    
    $cliPaths = @(
        "$installPath\protonvpn-cli.exe",
        "$installPath\ProtonVPN.exe",
        "$installPath\cli\protonvpn-cli.exe",
        "C:\Program Files\Proton\VPN\v5.1.5\ProtonVPN.exe"
    )
    $cliPath = $null
    foreach ($p in $cliPaths) {
        if (Test-Path $p) { $cliPath = $p; break }
    }
    
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        $oldIP = Get-PublicIP
        Write-Host "[ProtonVPN] Attempt $attempt/$MaxRetries (Current IP: $oldIP)"
        
        if ($cliPath) {
            try {
                Write-Host "  Using CLI: $cliPath"
                $process = Start-Process -FilePath $cliPath -ArgumentList "--kill" -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 3
                $process = Start-Process -FilePath $cliPath -ArgumentList "--connect" -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
            } catch {
                Write-Warning "  CLI method failed, falling back to service restart"
            }
        }
        
        try {
            Stop-Service -Name $serviceName -Force -ErrorAction Stop
            Write-Host "  [OK] Service stopped" -ForegroundColor Green
        } catch {
            Write-Warning "  Failed to stop service (may not be running): $_"
        }
        
        Start-Sleep -Seconds $delay
        
        try {
            Start-Service -Name $serviceName -ErrorAction Stop
            Write-Host "  [OK] Service started" -ForegroundColor Green
        } catch {
            Write-Warning "  Failed to start service: $_"
            continue
        }
        
        Start-Sleep -Seconds $vpnConfig.protonvpn.ip_check_delay
        
        $newIP = Wait-ForIPChange -OldIP $oldIP -MaxWaitSeconds 20
        if ($newIP) {
            return @{ Status = "Success"; VPN = "ProtonVPN"; OldIP = $oldIP; NewIP = $newIP; Attempts = $attempt }
        }
        
        Write-Host "  IP unchanged, retrying..." -ForegroundColor Yellow
    }
    
    return @{ Status = "Failed"; VPN = "ProtonVPN"; Error = "Max retries reached without IP change" }
}

function Invoke-ProtonVPNStatus {
    $serviceName = $vpnConfig.protonvpn.service_name
    
    try {
        $svc = Get-Service -Name $serviceName -ErrorAction Stop
        $ip = Get-PublicIP
        return @{
            ServiceName = $serviceName
            Status = $svc.Status.ToString()
            StartType = $svc.StartType.ToString()
            PublicIP = $ip
            Running = ($svc.Status -eq 'Running')
        }
    } catch {
        return @{
            ServiceName = $serviceName
            Status = "Not Found"
            StartType = "N/A"
            PublicIP = $null
            Running = $false
            Error = $_.Exception.Message
        }
    }
}

# Switch VPN Server (try different server)
function Invoke-PlanetVpnSwitch {
    Write-Host "`n[PlanetVPN] Attempting server switch..." -ForegroundColor Cyan
    
    Get-Process | Where-Object { $_.ProcessName -like "*planet*" -or $_.ProcessName -like "*PlanetVPN*" } | 
        Stop-Process -Force -ErrorAction SilentlyContinue
    
    return Invoke-PlanetVPNRestart -MaxRetries $vpnConfig.max_switches_per_vpn
}

function Invoke-ProtonVpnSwitch {
    Write-Host "`n[ProtonVPN] Attempting server switch..." -ForegroundColor Cyan
    
    $installPath = $vpnConfig.protonvpn.install_path
    
    $cliCandidates = @(
        "$installPath\ProtonVPN.exe",
        "$installPath\resources\bin\protonvpn-cli.exe",
        "C:\Program Files\Proton\VPN\v5.1.5\resources\bin\protonvpn-cli.exe"
    )
    
    $cli = $null
    foreach ($c in $cliCandidates) {
        if (Test-Path $c) { $cli = $c; break }
    }
    
    if ($cli) {
        Write-Host "  Found CLI at: $cli"
        Start-Process -FilePath $cli -ArgumentList "disconnect" -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Start-Process -FilePath $cli -ArgumentList "connect --fastest" -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 10
        $newIP = Get-PublicIP
        if ($newIP) { return @{ Status = "Success"; VPN = "ProtonVPN"; NewIP = $newIP; Method = "CLI" } }
    }
    
    return Invoke-ProtonVPNRestart -MaxRetries $vpnConfig.max_switches_per_vpn
}

# Main Dispatcher
function Show-Status {
    Write-Host "`n=======================================" -ForegroundColor Magenta
    Write-Host "  ZOYA VPN Manager - Status Report" -ForegroundColor Cyan
    Write-Host "=======================================" -ForegroundColor Magenta
    
    $currentIP = Get-PublicIP
    Write-Host "`nCurrent Public IP: " -NoNewline
    if ($currentIP) { Write-Host "$currentIP" -ForegroundColor Green } 
    else { Write-Host "Unknown" -ForegroundColor Red }
    
    Write-Host "`n--- PlanetVPN ---" -ForegroundColor Yellow
    $pStatus = Invoke-PlanetVPNStatus
    Write-Host "  Service: $($pStatus.ServiceName)"
    Write-Host "  Status:  " -NoNewline
    if ($pStatus.Running) { Write-Host "Running" -ForegroundColor Green } 
    else { Write-Host "Stopped" -ForegroundColor Red }
    Write-Host "  Enabled: $($vpnConfig.planetvpn.enabled)"
    
    Write-Host "`n--- ProtonVPN ---" -ForegroundColor Yellow
    $prStatus = Invoke-ProtonVPNStatus
    Write-Host "  Service: $($prStatus.ServiceName)"
    Write-Host "  Status:  " -NoNewline
    if ($prStatus.Running) { Write-Host "Running" -ForegroundColor Green } 
    else { Write-Host "Stopped" -ForegroundColor Red }
    Write-Host "  Enabled: $($vpnConfig.protonvpn.enabled)"
    
    Write-Host "`n=======================================`n" -ForegroundColor Magenta
}

switch ($Command) {
    "status" {
        Show-Status
    }
    "restart-planet" {
        $result = Invoke-PlanetVPNRestart
        $result | ConvertTo-Json
    }
    "restart-proton" {
        $result = Invoke-ProtonVPNRestart
        $result | ConvertTo-Json
    }
    "restart-all" {
        $r1 = Invoke-PlanetVPNRestart
        Start-Sleep -Seconds 5
        $r2 = Invoke-ProtonVPNRestart
        @{ PlanetVPN = $r1; ProtonVPN = $r2 } | ConvertTo-Json
    }
    "switch-planet" {
        $result = Invoke-PlanetVpnSwitch
        $result | ConvertTo-Json
    }
    "switch-proton" {
        $result = Invoke-ProtonVpnSwitch
        $result | ConvertTo-Json
    }
    "check-ip" {
        $ip = Get-PublicIP
        if ($ip) {
            Write-Host "Current Public IP: $ip" -ForegroundColor Green
        } else {
            Write-Host "Could not determine public IP" -ForegroundColor Red
        }
    }
}
