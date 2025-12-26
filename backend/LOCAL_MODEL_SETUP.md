# 本地模型部署指南

本项目支持多种本地模型部署方式，你可以根据需要选择合适的方式。

## 方式一：Ollama（推荐，最简单）

### 1. 安装 Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
从 [Ollama 官网](https://ollama.ai/download) 下载安装包

### 2. 下载模型

```bash
# 下载支持多模态的模型（推荐）
ollama pull qwen2-vl:7b

# 或下载纯文本模型
ollama pull qwen2:7b
ollama pull llama2:7b
ollama pull mistral:7b
```

### 3. 启动 Ollama 服务

Ollama 安装后会自动启动服务，默认运行在 `http://localhost:11434`

### 4. 配置项目

编辑 `backend/.env` 文件：

```env
MODEL_PROVIDER=ollama
MODEL_NAME=qwen2-vl:7b
OLLAMA_BASE_URL=http://localhost:11434
```

### 5. 测试

```bash
# 测试 Ollama 是否运行
curl http://localhost:11434/api/tags

# 测试模型
ollama run qwen2-vl:7b "你好"
```

## 方式二：OpenAI 兼容 API（LocalAI、vLLM 等）

### 使用 LocalAI

1. **安装 LocalAI**

```bash
# 使用 Docker
docker run -p 8080:8080 --name local-ai -ti localai/localai:latest-aio-cpu
```

2. **配置项目**

编辑 `backend/.env` 文件：

```env
MODEL_PROVIDER=openai
MODEL_NAME=your-model-name
OPENAI_BASE_URL=http://localhost:8080/v1
OPENAI_API_KEY=not-needed
```

### 使用 vLLM

1. **安装 vLLM**

```bash
pip install vllm
```

2. **启动服务**

```bash
python -m vllm.entrypoints.openai.api_server \
    --model your-model-path \
    --port 8000
```

3. **配置项目**

编辑 `backend/.env` 文件：

```env
MODEL_PROVIDER=openai
MODEL_NAME=your-model-name
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=not-needed
```

## 方式三：继续使用阿里云（默认）

如果不想使用本地模型，保持默认配置即可：

```env
MODEL_PROVIDER=aliyun
MODEL_NAME=qwen-vl-plus
DASHSCOPE_API_KEY=your-api-key
```

## 支持的模型格式

### 文本模型
- Ollama: `qwen2`, `llama2`, `mistral` 等
- OpenAI兼容: 任何支持 Chat Completions API 的模型

### 多模态模型（支持图片）
- Ollama: `qwen2-vl:7b`, `llava` 等
- OpenAI兼容: 支持 vision 的模型

## 性能对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| Ollama | 简单易用，自动管理模型 | 性能一般 |
| vLLM | 高性能，支持批量推理 | 需要更多资源 |
| LocalAI | OpenAI 兼容，功能丰富 | 配置较复杂 |
| 阿里云 | 无需本地资源，稳定 | 需要网络，有费用 |

## 注意事项

1. **内存要求**: 本地模型通常需要较大的内存（7B 模型约需 8-16GB RAM）
2. **GPU 加速**: 如果有 NVIDIA GPU，建议使用 GPU 版本以获得更好性能
3. **模型下载**: 首次使用需要下载模型，可能需要较长时间
4. **端口冲突**: 确保本地服务端口不与项目端口冲突

## 故障排查

### Ollama 连接失败
```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags

# 重启 Ollama
ollama serve
```

### 模型加载失败
- 检查模型是否已下载: `ollama list`
- 检查磁盘空间是否足够
- 检查内存是否足够

### API 调用失败
- 查看后端日志: `python3 app.py`
- 检查 `.env` 配置是否正确
- 检查本地服务是否正常运行

