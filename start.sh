#!/bin/bash

# Traffix 项目启动脚本

echo "🚀 启动 Traffix 智能体应用..."

# 检查后端环境变量
if [ ! -f "backend/.env" ]; then
    echo "⚠️  未找到 backend/.env 文件"
    echo "请先复制 env.example 并配置环境变量："
    echo "  cd backend && cp env.example .env"
    exit 1
fi

# 启动后端
echo "📦 启动后端服务..."
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ 服务已启动！"
echo "   后端: http://localhost:8000"
echo "   前端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait

