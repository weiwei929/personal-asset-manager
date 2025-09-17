#!/bin/bash

# 个人资产管理系统部署脚本
# 用于清理测试数据并构建生产版本

echo "🚀 开始部署个人资产管理系统..."

# 1. 检查Node.js环境
echo "📋 检查环境..."
node_version=$(node -v)
npm_version=$(npm -v)
echo "Node.js版本: $node_version"
echo "npm版本: $npm_version"

# 2. 安装依赖
echo "📦 安装依赖..."
npm install

# 3. 运行测试（如果有）
echo "🧪 运行测试..."
# npm run test

# 4. 清理开发数据提醒
echo "⚠️  重要提醒："
echo "   请确保已清除所有测试数据！"
echo "   在浏览器控制台执行: window.dataReset.clear()"
echo ""
read -p "已清理测试数据？(y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "❌ 请先清理测试数据再继续部署"
    exit 1
fi

# 5. 构建生产版本
echo "🏗️  构建生产版本..."
npm run build

# 6. 检查构建结果
if [ -d "dist" ]; then
    echo "✅ 构建成功！"
    echo "📂 构建文件位于: ./dist/"
    
    # 显示文件大小
    echo "📊 构建文件大小:"
    du -sh dist/*
else
    echo "❌ 构建失败！"
    exit 1
fi

# 7. 生成部署信息
cat > dist/DEPLOY_INFO.txt << EOF
部署信息
==================
构建时间: $(date)
Git提交: $(git rev-parse --short HEAD)
分支: $(git branch --show-current)
Node.js: $node_version
npm: $npm_version
环境: production
==================
EOF

echo ""
echo "🎉 部署准备完成！"
echo "📁 可部署文件: ./dist/"
echo "📖 部署指南: ./DEPLOYMENT.md"
echo ""
echo "🚀 下一步:"
echo "   1. 将 dist/ 目录上传到服务器"
echo "   2. 配置Web服务器"
echo "   3. 测试访问功能"
