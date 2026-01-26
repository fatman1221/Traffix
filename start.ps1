# Traffix 项目启动脚本 (Windows PowerShell)

Write-Host "🚀 启动 Traffix 智能体应用..." -ForegroundColor Green

# 检查后端环境变量
$envFile = "backend\env"
$envFileDot = "backend\.env"
if (-not (Test-Path $envFile) -and -not (Test-Path $envFileDot)) {
    Write-Host "⚠️  未找到 backend\env 或 backend\.env 文件" -ForegroundColor Yellow
    Write-Host "请先配置环境变量文件"
    exit 1
}

# 检查 Python 是否安装
$pythonCmd = "python"
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-Host "❌ 未找到 Python，请先安装 Python" -ForegroundColor Red
    exit 1
}

# 启动后端
Write-Host "📦 启动后端服务..." -ForegroundColor Cyan
Set-Location backend
Start-Process -NoNewWindow $pythonCmd -ArgumentList "app.py"
Set-Location ..

# 等待后端启动
Write-Host "⏳ 等待后端启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 检查后端是否启动成功
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ 后端服务已启动" -ForegroundColor Green
} catch {
    Write-Host "⚠️  后端服务可能未完全启动，请检查日志" -ForegroundColor Yellow
}

# 启动前端
Write-Host "🎨 启动前端服务..." -ForegroundColor Cyan
Set-Location frontend

# 检查 node_modules 是否存在
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 安装前端依赖..." -ForegroundColor Yellow
    npm install
}

Start-Process -NoNewWindow npm -ArgumentList "run", "dev"
Set-Location ..

Write-Host ""
Write-Host "✅ 服务已启动！" -ForegroundColor Green
Write-Host "   后端: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "   前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host ""

# 等待用户中断
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "正在停止服务..." -ForegroundColor Yellow
    Get-Process | Where-Object { $_.ProcessName -eq "python" -or $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
}


