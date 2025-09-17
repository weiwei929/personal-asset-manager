@echo off
chcp 65001 >nul

echo 🚀 开始部署个人资产管理系统...
echo.

REM 1. 检查Node.js环境
echo 📋 检查环境...
for /f "tokens=*" %%i in ('node -v') do set node_version=%%i
for /f "tokens=*" %%i in ('npm -v') do set npm_version=%%i
echo Node.js版本: %node_version%
echo npm版本: %npm_version%
echo.

REM 2. 安装依赖
echo 📦 安装依赖...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败！
    pause
    exit /b 1
)
echo.

REM 3. 清理开发数据提醒
echo ⚠️  重要提醒：
echo    请确保已清除所有测试数据！
echo    在浏览器控制台执行: window.dataReset.clear^(^)
echo.
set /p confirm="已清理测试数据？(y/N): "
if /i not "%confirm%"=="y" (
    echo ❌ 请先清理测试数据再继续部署
    pause
    exit /b 1
)

REM 4. 构建生产版本
echo 🏗️  构建生产版本...
call npm run build
if errorlevel 1 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)

REM 5. 检查构建结果
if exist "dist" (
    echo ✅ 构建成功！
    echo 📂 构建文件位于: ./dist/
    echo.
    echo 📊 构建文件列表:
    dir /b dist
) else (
    echo ❌ 构建失败！
    pause
    exit /b 1
)

REM 6. 生成部署信息
echo 部署信息 > dist\DEPLOY_INFO.txt
echo ================== >> dist\DEPLOY_INFO.txt
echo 构建时间: %date% %time% >> dist\DEPLOY_INFO.txt
echo Node.js: %node_version% >> dist\DEPLOY_INFO.txt
echo npm: %npm_version% >> dist\DEPLOY_INFO.txt
echo 环境: production >> dist\DEPLOY_INFO.txt
echo ================== >> dist\DEPLOY_INFO.txt

echo.
echo 🎉 部署准备完成！
echo 📁 可部署文件: ./dist/
echo 📖 部署指南: ./DEPLOYMENT.md
echo.
echo 🚀 下一步:
echo    1. 将 dist/ 目录上传到服务器
echo    2. 配置Web服务器
echo    3. 测试访问功能
echo.
pause
