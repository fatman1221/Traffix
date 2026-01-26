# 基于多模态大模型的交通事件感知与辅助处理系统 - 使用指南

## 系统概述

本系统是一个完整的交通事件感知与处理平台，支持公众举报、智能初审、工单管理等核心功能。

## 已实现功能

### ✅ 核心功能模块

#### 1. 多模态大模型交通事件识别模块
- ✅ 图像/视频上传与预处理
- ✅ 多模态大模型推理（支持Qwen2-VL等模型）
- ✅ 问答接口（预设问题：如"图中公路上有没有抛洒物？"）
- ✅ 结构化数据返回（事件类型、置信度、位置等）

#### 2. 公众举报与智能初审模块
- ✅ 用户注册/登录（公众用户和管理员分开）
- ✅ 事件上报（支持多图上传）
- ✅ 事件类型选择（可选，系统会自动识别）
- ✅ 地点和描述填写
- ✅ 智能初审（自动比对用户选择和模型识别结果）
- ✅ 自动填充工单信息
- ✅ 人工复核界面（管理端）

#### 3. 工单管理模块
- ✅ 工单列表（按状态筛选）
- ✅ 工单详情查看
- ✅ 工单状态流转
- ✅ 处理记录

#### 4. 数据管理与模型训练模块
- ⚠️ 简化实现（使用预训练模型，不进行实际训练）

## 技术栈

- **前端**: React + TypeScript + Vite + React Router
- **后端**: Python + FastAPI + SQLAlchemy
- **数据库**: MySQL
- **大模型**: 阿里云通义千问（Qwen-VL-Plus）或其他支持的模型

## 快速开始

### 1. 环境准备

#### 数据库初始化
```bash
mysql -u root -p < database/init.sql
```

#### 后端依赖安装
```bash
cd backend
pip install -r requirements.txt
```

#### 前端依赖安装
```bash
cd frontend
npm install
```

### 2. 配置环境变量

编辑 `backend/env` 或 `backend/.env` 文件：

```env
# 数据库配置
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/traffix

# 模型配置
MODEL_PROVIDER=aliyun  # 可选: aliyun, ollama, openai
MODEL_NAME=qwen-vl-plus

# 阿里云 DashScope API Key（如果使用阿里云）
DASHSCOPE_API_KEY=your_api_key

# JWT密钥（生产环境请修改）
JWT_SECRET_KEY=your-secret-key-change-in-production
```

### 3. 创建管理员账户

```bash
cd backend
python init_admin.py
```

默认管理员账户：
- 用户名: `admin`
- 密码: `admin123`

**⚠️ 重要：首次登录后请立即修改密码！**

### 4. 启动服务

#### 启动后端
```bash
cd backend
python app.py
```

后端服务将在 `http://localhost:8000` 启动

#### 启动前端
```bash
cd frontend
npm run dev
```

前端应用将在 `http://localhost:3000` 启动

### 5. 使用系统

#### 公众用户
1. 访问 `http://localhost:3000`
2. 点击"注册"创建账户（需要手机号）
3. 登录后进入"交通事件上报"页面
4. 上传图片、填写信息、提交举报
5. 在"我的举报"页面查看举报记录和状态

#### 管理员
1. 使用管理员账户登录
2. 进入"工单管理"页面
3. 查看工单列表，可按状态筛选
4. 点击工单查看详情
5. 对需要人工复核的举报进行审核
6. 更新工单状态和处理意见

## API接口说明

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 公众端接口
- `POST /api/reports` - 创建事件举报
- `GET /api/reports/my` - 获取我的举报记录

### 模型识别接口
- `POST /api/recognize` - 图片事件识别（问答形式）

### 管理端接口
- `GET /api/admin/tickets` - 获取工单列表
- `GET /api/admin/tickets/{ticket_id}` - 获取工单详情
- `POST /api/admin/reports/{report_id}/review` - 人工复核举报
- `POST /api/admin/tickets/{ticket_id}/update` - 更新工单状态

## 智能初审规则

系统会根据以下规则进行自动初审：

1. **模型识别失败** → 需要人工复核
2. **置信度 < 0.3** → 需要人工复核
3. **用户选择类型与模型识别类型匹配 + 置信度 ≥ 0.6** → 自动通过
4. **用户选择类型与模型识别类型不匹配** → 需要人工复核
5. **置信度 < 0.6** → 需要人工复核

自动通过的举报会自动创建工单。

## 数据库表结构

- `users` - 用户表（公众用户和管理员）
- `reports` - 举报事件表
- `report_images` - 举报图片表（支持多图）
- `tickets` - 工单表
- `model_recognition_results` - 模型识别结果表
- `review_records` - 审核记录表
- `ticket_records` - 处理记录表

## 注意事项

1. **安全性**：
   - 生产环境请修改JWT密钥
   - 使用强密码策略
   - 启用HTTPS

2. **性能**：
   - 图片上传建议限制大小（可在前端添加）
   - 模型识别可能需要几秒到十几秒，请耐心等待

3. **模型配置**：
   - 如果使用本地模型（Ollama），需要先启动Ollama服务
   - 如果使用阿里云，需要有效的API Key

## 故障排查

### 后端启动失败
- 检查数据库连接配置
- 检查环境变量文件是否存在
- 查看后端日志了解详细错误

### 模型识别失败
- 检查模型提供者配置
- 检查API Key是否有效
- 查看后端日志了解详细错误

### 前端无法连接后端
- 检查后端是否正常运行
- 检查CORS配置
- 检查代理配置（vite.config.ts）

## 开发说明

### 添加新的事件类型
编辑 `backend/event_recognition.py` 中的 `EVENT_TYPE_KEYWORDS` 字典。

### 修改智能初审规则
编辑 `backend/event_recognition.py` 中的 `auto_review_report` 函数。

### 添加新的API接口
在 `backend/app.py` 中添加新的路由函数。

## 毕业设计说明

本系统已实现所有**必须实现的功能**：
- ✅ 用户注册、登录、注销（公众端和管理端分开登录）
- ✅ 公众端：事件上报、我的举报记录查看
- ✅ 管理端：工单列表查看、工单详情查看、人工复核操作、工单状态更新
- ✅ 模型服务：能够对上传的图片进行事件识别，并回答预设问题
- ✅ 智能初审：系统自动根据模型识别结果和用户填写信息，给出初审意见

**可选功能**（可根据时间安排实现）：
- 地图选点
- 消息通知（短信或邮件）
- 数据看板（统计图表）

## 联系方式

如有问题，请查看代码注释或联系开发团队。

