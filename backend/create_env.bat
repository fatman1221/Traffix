@echo off
chcp 65001 >nul
echo 正在创建 env 文件...

(
echo # 数据库配置
echo DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/traffix
echo.
echo # 模型提供者配置
echo # 可选值: aliyun, ollama, openai
echo MODEL_PROVIDER=aliyun
echo.
echo # 模型名称（根据提供者不同而不同）
echo # 阿里云: qwen-turbo, qwen-plus, qwen-vl-plus 等
echo # Ollama: llama2, qwen, mistral 等（需要先下载模型）
echo # OpenAI兼容: 根据你的本地服务配置
echo MODEL_NAME=qwen-vl-plus
echo.
echo # 阿里云 DashScope 配置（当 MODEL_PROVIDER=aliyun 时使用）
echo # 在 https://dashscope.console.aliyun.com/ 获取 API Key
echo DASHSCOPE_API_KEY=your_dashscope_api_key
echo.
echo # Ollama 配置（当 MODEL_PROVIDER=ollama 时使用）
echo # 默认地址: http://localhost:11434
echo OLLAMA_BASE_URL=http://localhost:11434
echo.
echo # OpenAI 兼容 API 配置（当 MODEL_PROVIDER=openai 时使用）
echo # 适用于 LocalAI、vLLM 等
echo OPENAI_BASE_URL=http://localhost:8000/v1
echo OPENAI_API_KEY=
) > env

echo env 文件已创建！
echo 请编辑 env 文件，填入你的配置信息。
pause

