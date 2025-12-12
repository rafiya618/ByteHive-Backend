# ByteHive-Backend - Install All Node Modules Script
# This script automatically installs node modules for all services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ByteHive-Backend - Install All Modules" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script's directory (this should be the ByteHive-Backend root)
$rootDir = $PSScriptRoot

# Define all directories with package.json
$directories = @(
    ".",
    "auth-service",
    "chatting-service",
    "comment-service",
    "community-service",
    "curation-service",
    "gateway",
    "notification-service",
    "posts-service",
    "retention-service",
    "shared-config",
    "smart-reading-service",
    "videocalling-service"
)

$successCount = 0
$failCount = 0
$startTime = Get-Date

foreach ($dir in $directories) {
    $fullPath = Join-Path $rootDir $dir
    $packageJsonPath = Join-Path $fullPath "package.json"
    
    if (Test-Path $packageJsonPath) {
        $displayName = if ($dir -eq ".") { "root" } else { $dir }
        Write-Host "[$displayName] " -ForegroundColor Yellow -NoNewline
        Write-Host "Installing dependencies..." -ForegroundColor White
        
        Push-Location $fullPath
        try {
            $output = npm install 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$displayName] " -ForegroundColor Green -NoNewline
                Write-Host "Successfully installed!" -ForegroundColor White
                $successCount++
            } else {
                Write-Host "[$displayName] " -ForegroundColor Red -NoNewline
                Write-Host "Installation failed!" -ForegroundColor White
                Write-Host $output -ForegroundColor DarkGray
                $failCount++
            }
        }
        catch {
            Write-Host "[$displayName] " -ForegroundColor Red -NoNewline
            Write-Host "Error: $_" -ForegroundColor White
            $failCount++
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Host "[$dir] Skipping - no package.json found" -ForegroundColor DarkGray
    }
    
    Write-Host ""
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Results:" -ForegroundColor White
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Failed:  $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host "  Duration: $([math]::Round($duration.TotalSeconds, 2)) seconds" -ForegroundColor White
Write-Host ""
