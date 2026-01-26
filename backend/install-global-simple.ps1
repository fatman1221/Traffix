# Simple global install script
# Usage: .\install-global-simple.ps1

Write-Host "Installing dependencies globally..." -ForegroundColor Cyan

# Try different Python commands
$pythonCmds = @("python3", "python", "py")

foreach ($cmd in $pythonCmds) {
    try {
        $result = & $cmd -m pip --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Found Python: $cmd" -ForegroundColor Green
            Write-Host "Upgrading pip..." -ForegroundColor Cyan
            & $cmd -m pip install --upgrade pip --user
            
            Write-Host "Installing dependencies..." -ForegroundColor Cyan
            & $cmd -m pip install -r requirements.txt
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Success! Dependencies installed globally." -ForegroundColor Green
                exit 0
            } else {
                Write-Host "Installation failed. Try running as administrator." -ForegroundColor Red
                exit 1
            }
        }
    } catch {
        continue
    }
}

Write-Host "Python not found. Please install Python first." -ForegroundColor Red
Write-Host "Download from: https://www.python.org/downloads/" -ForegroundColor Yellow



