# Traffix 后端依赖安装脚本 (Windows PowerShell)

Write-Host "🔍 检查 Python 安装..." -ForegroundColor Cyan

# 检查 Python 是否安装
$pythonCmd = $null
$pythonCmds = @("python", "python3", "py")

foreach ($cmd in $pythonCmds) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $version -match "Python") {
            $pythonCmd = $cmd
            Write-Host "✅ 找到 Python: $version" -ForegroundColor Green
            break
        }
    } catch {
        continue
    }
}

if (-not $pythonCmd) {
    Write-Host "❌ 未找到 Python！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请先安装 Python：" -ForegroundColor Yellow
    Write-Host "1. 访问 https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "2. 下载并安装 Python 3.8 或更高版本" -ForegroundColor Yellow
    Write-Host "3. 安装时请勾选 'Add Python to PATH'" -ForegroundColor Yellow
    Write-Host "4. 安装完成后重新运行此脚本" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📦 创建虚拟环境..." -ForegroundColor Cyan

# 创建虚拟环境
if (Test-Path "env") {
    Write-Host "⚠️  虚拟环境已存在，跳过创建" -ForegroundColor Yellow
} else {
    & $pythonCmd -m venv env
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 创建虚拟环境失败！" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ 虚拟环境创建成功" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔧 激活虚拟环境并安装依赖..." -ForegroundColor Cyan

# 激活虚拟环境并安装依赖
$activateScript = ".\env\Scripts\Activate.ps1"

if (-not (Test-Path $activateScript)) {
    Write-Host "❌ 虚拟环境激活脚本不存在！" -ForegroundColor Red
    exit 1
}

# 执行安装
& $activateScript
& $pythonCmd -m pip install --upgrade pip
& $pythonCmd -m pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 依赖安装完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Cyan
    Write-Host "1. 确保已创建 .env 文件（如果不存在）" -ForegroundColor Yellow
    Write-Host "2. 运行: .\env\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "3. 运行: python app.py" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ 依赖安装失败！" -ForegroundColor Red
    exit 1
}



