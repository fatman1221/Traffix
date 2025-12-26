# Traffix - 智能体聊天应用

一个支持图片和消息上传的智能体应用，具有历史记录功能。

## 技术栈

- **前端**: React + TypeScript + Vite
- **后端**: Python + FastAPI
- **数据库**: MySQL
- **大模型**: 阿里云通义千问

## 项目结构

```
Traffix/
├── frontend/          # React 前端应用
├── backend/           # Python 后端服务
├── database/          # 数据库脚本
└── README.md
```

## 快速开始

### 前端

```bash
cd frontend
npm install
npm run dev
```

### 后端

**注意：需要 Python 3.8 或更高版本**

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 app.py
```

### 数据库

```bash
mysql -u root -p < database/init.sql
```

## 环境配置

### 1. 数据库配置

首先创建 MySQL 数据库：

```bash
mysql -u root -p < database/init.sql
```

### 2. 后端环境配置

复制环境变量示例文件：

```bash
cd backend
cp env.example .env
```

编辑 `backend/.env` 文件，配置以下内容：

```
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/traffix
DASHSCOPE_API_KEY=your_dashscope_api_key
ALIYUN_MODEL=qwen-turbo
```

**注意**：
- `DATABASE_URL`: 将 `your_password` 替换为你的 MySQL 密码
- `DASHSCOPE_API_KEY`: 从 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/) 获取 API Key
- `ALIYUN_MODEL`: 
  - 支持图片分析：`qwen-vl-plus`（推荐）、`qwen-vl-max`
  - 仅文本对话：`qwen-turbo`、`qwen-plus`、`qwen-max`
  - **注意**：如果上传图片，系统会自动切换到 `qwen-vl-plus` 模型

### 3. 安装依赖

**前端依赖**：
```bash
cd frontend
npm install
```

**后端依赖**：
```bash
cd backend
pip install -r requirements.txt
```

## 运行项目

### 启动后端服务

```bash
cd backend
python3 app.py
```

后端服务将在 `http://localhost:8000` 启动

### 启动前端服务

```bash
cd frontend
npm run dev
```

前端应用将在 `http://localhost:3000` 启动

## 功能特性

- ✅ 支持文字消息发送
- ✅ 支持图片上传和识别
- ✅ 对话历史记录保存
- ✅ 多会话管理
- ✅ 淡紫色简约主题界面
- ✅ 实时 AI 对话响应

## 使用说明

1. 打开前端页面 `http://localhost:3000`
2. 点击"历史记录"查看之前的对话
3. 点击"新建"创建新的对话会话
4. 在输入框中输入文字或点击📷上传图片
5. 按 Enter 或点击"发送"按钮发送消息
6. AI 会自动回复你的消息

