# Traffix 后端依赖全局安装脚本 (Windows PowerShell)

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
Write-Host "⚠️  警告：即将全局安装依赖包" -ForegroundColor Yellow
Write-Host "   这会将包安装到系统 Python 环境中" -ForegroundColor Yellow
Write-Host "   可能会与其他项目产生依赖冲突" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "是否继续？(Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "已取消安装" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔧 升级 pip..." -ForegroundColor Cyan
& $pythonCmd -m pip install --upgrade pip --user

Write-Host ""
Write-Host "📦 全局安装项目依赖..." -ForegroundColor Cyan
& $pythonCmd -m pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 依赖安装完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Cyan
    Write-Host "1. 确保已创建 .env 文件（如果不存在）" -ForegroundColor Yellow
    Write-Host "2. 运行: python app.py" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ 依赖安装失败！" -ForegroundColor Red
    Write-Host "   如果遇到权限问题，请尝试以管理员身份运行 PowerShell" -ForegroundColor Yellow
    exit 1
}



