# ClassicPOS - Reproduction Script for Windows
# This script reproduces the fix and verifies the build

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ClassicPOS Build Verification Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Node.js version
Write-Host "Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "Node version: $nodeVersion" -ForegroundColor Green

if ($nodeVersion -notmatch "v1[8-9]\.|v[2-9][0-9]\.") {
    Write-Host "WARNING: Node.js 18+ is recommended. Current version: $nodeVersion" -ForegroundColor Red
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

Write-Host "`n1. Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed successfully`n" -ForegroundColor Green

Write-Host "2. Running ESLint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Linter found issues, but continuing...`n" -ForegroundColor Yellow
} else {
    Write-Host "✓ Linting passed`n" -ForegroundColor Green
}

Write-Host "3. Building production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed successfully`n" -ForegroundColor Green

Write-Host "4. Checking build artifacts..." -ForegroundColor Yellow
if (Test-Path "dist/index.html") {
    Write-Host "✓ dist/index.html exists" -ForegroundColor Green
} else {
    Write-Host "ERROR: dist/index.html not found" -ForegroundColor Red
    exit 1
}

if (Test-Path "dist/assets") {
    $assetCount = (Get-ChildItem "dist/assets" -File).Count
    Write-Host "✓ Found $assetCount asset files in dist/assets" -ForegroundColor Green
} else {
    Write-Host "ERROR: dist/assets directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "BUILD VERIFICATION COMPLETE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start dev server:  npm run dev" -ForegroundColor White
Write-Host "  2. Open browser to:   http://localhost:8080" -ForegroundColor White
Write-Host "  3. Test inventory forms:" -ForegroundColor White
Write-Host "     - Purchase Orders: /purchase-orders" -ForegroundColor Gray
Write-Host "     - GRN: /goods-received-notes" -ForegroundColor Gray
Write-Host "     - Stock Adjustments: /stock-adjustments" -ForegroundColor Gray
Write-Host "     - Transfer of Goods: /transfer-of-goods`n" -ForegroundColor Gray

$startDev = Read-Host "Start development server now? (y/n)"
if ($startDev -eq "y") {
    Write-Host "`nStarting development server..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray
    npm run dev
}
