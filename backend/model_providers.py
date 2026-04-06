"""
模型提供者抽象层
支持多种模型部署方式：阿里云 DashScope、Ollama、OpenAI 兼容 API 等
"""
import os
import json
import base64
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
import requests
import dashscope
from dashscope import Generation, MultiModalConversation

# 禁用代理（避免代理连接问题）
# 设置环境变量，让 requests 和 dashscope 不使用代理
no_proxy_list = 'dashscope.aliyuncs.com,*.aliyuncs.com,api.minimax.io,localhost,127.0.0.1'
os.environ.setdefault('NO_PROXY', no_proxy_list)
os.environ.setdefault('no_proxy', no_proxy_list)

# 临时清空代理环境变量（仅对当前进程有效）
# 这会影响到所有使用这些环境变量的库，但可以确保 dashscope 不使用代理
original_proxies = {}
proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
for var in proxy_vars:
    if var in os.environ:
        original_proxies[var] = os.environ[var]
        os.environ.pop(var, None)

# 禁用 requests 的 SSL 警告
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

# 如果有代理被移除，记录日志
if original_proxies:
    logger.warning(f"检测到系统代理设置，已临时移除: {original_proxies}")
    logger.info("已设置 NO_PROXY，dashscope 将直接连接阿里云")

# 模型提供者类型
PROVIDER_ALIYUN = "aliyun"
PROVIDER_OLLAMA = "ollama"
PROVIDER_OPENAI = "openai"
PROVIDER_MINIMAX = "minimax"
PROVIDER_CUSTOM = "custom"


class ModelProvider:
    """模型提供者基类"""
    
    def call_model(self, messages: List[Dict], model: str, image_path: Optional[str] = None) -> str:
        """调用模型并返回文本内容"""
        raise NotImplementedError


class AliyunProvider(ModelProvider):
    """阿里云 DashScope 提供者"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        dashscope.api_key = api_key
        
        # 确保 dashscope 不使用代理
        # dashscope 底层使用 requests，通过环境变量 NO_PROXY 已设置
        # 如果仍有问题，可以尝试在调用时指定代理为空
        logger.info("DashScope 已初始化，将直接连接阿里云（已禁用代理）")
    
    def call_model(self, messages: List[Dict], model: str, image_path: Optional[str] = None) -> str:
        """调用阿里云模型"""
        use_multimodal = model.startswith('qwen-vl') or image_path is not None
        
        try:
            if use_multimodal:
                response = MultiModalConversation.call(model=model, messages=messages)
            else:
                response = Generation.call(model=model, messages=messages)
        except Exception as e:
            error_msg = str(e)
            if 'proxy' in error_msg.lower() or 'ProxyError' in error_msg or 'SSLError' in error_msg:
                logger.error(f"代理/SSL 连接错误: {e}")
                logger.error("提示: 系统可能设置了代理，但代理配置有问题。")
                logger.error("解决方案: 1) 检查系统代理设置 2) 临时禁用代理 3) 配置正确的代理")
                raise Exception(f"连接阿里云 API 时出现代理错误。请检查系统代理设置。原始错误: {e}")
            raise
        
        if response.status_code != 200:
            raise Exception(f"模型调用失败: {response.message}")
        
        # 提取文本内容
        if hasattr(response.output, 'text') and response.output.text:
            return self._extract_text(response.output.text)
        elif hasattr(response.output, 'choices') and response.output.choices:
            choice = response.output.choices[0]
            if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                return self._extract_text(choice.message.content)
            elif hasattr(choice, 'text'):
                return self._extract_text(choice.text)
        
        raise Exception("无法从响应中提取内容")
    
    def _extract_text(self, content):
        """提取文本内容"""
        if isinstance(content, list):
            text_parts = [item.get('text', '') if isinstance(item, dict) else str(item) 
                         for item in content if isinstance(item, (dict, str))]
            return '\n'.join(text_parts)
        elif isinstance(content, dict) and 'text' in content:
            return str(content['text'])
        return str(content)


class OllamaProvider(ModelProvider):
    """Ollama 本地模型提供者"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip('/')
    
    def call_model(self, messages: List[Dict], model: str, image_path: Optional[str] = None) -> str:
        """调用 Ollama 模型"""
        url = f"{self.base_url}/api/chat"
        
        # 转换消息格式
        ollama_messages = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # 处理多模态消息
            if isinstance(content, list):
                # Ollama 支持图片，需要转换为 base64
                ollama_content = []
                for item in content:
                    if isinstance(item, dict):
                        if 'image' in item:
                            # 如果是 data URI，提取 base64 部分
                            image_data = item['image']
                            if image_data.startswith('data:'):
                                ollama_content.append({
                                    'type': 'image',
                                    'source': {
                                        'type': 'base64',
                                        'media_type': image_data.split(';')[0].split(':')[1],
                                        'data': image_data.split(',')[1]
                                    }
                                })
                            else:
                                # 如果是文件路径，读取并转换为 base64
                                image_file = Path(image_data)
                                if image_file.exists():
                                    with open(image_file, 'rb') as f:
                                        img_data = base64.b64encode(f.read()).decode('utf-8')
                                    ollama_content.append({
                                        'type': 'image',
                                        'source': {
                                            'type': 'base64',
                                            'media_type': 'image/jpeg',
                                            'data': img_data
                                        }
                                    })
                        elif 'text' in item:
                            ollama_content.append({'type': 'text', 'text': item['text']})
                    elif isinstance(item, str):
                        ollama_content.append({'type': 'text', 'text': item})
                
                ollama_messages.append({
                    'role': role,
                    'content': ollama_content
                })
            else:
                ollama_messages.append({
                    'role': role,
                    'content': content
                })
        
        payload = {
            "model": model,
            "messages": ollama_messages,
            "stream": False
        }
        
        try:
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            
            if 'message' in result and 'content' in result['message']:
                return result['message']['content']
            else:
                raise Exception(f"Ollama 响应格式错误: {result}")
        except requests.exceptions.RequestException as e:
            raise Exception(f"调用 Ollama 失败: {str(e)}")


class OpenAIProvider(ModelProvider):
    """OpenAI 兼容 API 提供者（如 LocalAI、vLLM 等）"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key or "not-needed"
    
    def call_model(self, messages: List[Dict], model: str, image_path: Optional[str] = None) -> str:
        """调用 OpenAI 兼容 API"""
        url = f"{self.base_url}/v1/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        # 转换消息格式
        openai_messages = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # 处理多模态消息
            if isinstance(content, list):
                openai_content = []
                for item in content:
                    if isinstance(item, dict):
                        if 'image' in item:
                            image_data = item['image']
                            if image_data.startswith('data:'):
                                openai_content.append({
                                    "type": "image_url",
                                    "image_url": {
                                        "url": image_data
                                    }
                                })
                        elif 'text' in item:
                            openai_content.append({
                                "type": "text",
                                "text": item['text']
                            })
                    elif isinstance(item, str):
                        openai_content.append({
                            "type": "text",
                            "text": item
                        })
                
                openai_messages.append({
                    "role": role,
                    "content": openai_content
                })
            else:
                openai_messages.append({
                    "role": role,
                    "content": content
                })
        
        payload = {
            "model": model,
            "messages": openai_messages,
            "stream": False
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=120)
            response.raise_for_status()
            result = response.json()
            
            if 'choices' in result and len(result['choices']) > 0:
                message = result['choices'][0].get('message', {})
                return message.get('content', '')
            else:
                raise Exception(f"OpenAI 兼容 API 响应格式错误: {result}")
        except requests.exceptions.RequestException as e:
            raise Exception(f"调用 OpenAI 兼容 API 失败: {str(e)}")


class MiniMaxProvider(ModelProvider):
    """
    MiniMax 官方文本接口（chatcompletion_v2），支持多模态：
    content 为 [{type:text},{type:image_url}]，图片可为公网 URL 或 data URI。
    文档: https://api.minimax.io/v1/text/chatcompletion_v2
    """

    def __init__(self, api_key: str, base_url: str = "https://api.minimax.io"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        logger.info("MiniMax 已初始化，base_url=%s", self.base_url)

    def _convert_messages(self, messages: List[Dict]) -> List[Dict]:
        out: List[Dict[str, Any]] = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if isinstance(content, str):
                out.append({"role": role, "content": content})
                continue
            if isinstance(content, list):
                parts: List[Dict[str, Any]] = []
                for item in content:
                    if isinstance(item, dict):
                        if "image" in item:
                            parts.append(
                                {
                                    "type": "image_url",
                                    "image_url": {"url": item["image"]},
                                }
                            )
                        elif "text" in item:
                            parts.append({"type": "text", "text": item["text"]})
                    elif isinstance(item, str):
                        parts.append({"type": "text", "text": item})
                out.append({"role": role, "content": parts})
            else:
                out.append({"role": role, "content": str(content)})
        return out

    def call_model(self, messages: List[Dict], model: str, image_path: Optional[str] = None) -> str:
        url = f"{self.base_url}/v1/text/chatcompletion_v2"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": model,
            "messages": self._convert_messages(messages),
            "stream": False,
        }
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=120)
            response.raise_for_status()
            data = response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"调用 MiniMax 失败: {e}") from e

        base = data.get("base_resp") or {}
        code = base.get("status_code", 0)
        if code != 0:
            msg = base.get("status_msg", "")
            raise Exception(f"MiniMax 接口错误 [{code}]: {msg}")

        choices = data.get("choices") or []
        if not choices:
            raise Exception(f"MiniMax 响应缺少 choices: {data!r}")

        message = choices[0].get("message") or {}
        text = message.get("content")
        if text is None or (isinstance(text, str) and not text.strip()):
            alt = message.get("reasoning_content")
            if isinstance(alt, str) and alt.strip():
                text = alt
        if text is None:
            raise Exception(f"MiniMax 返回空内容: {data!r}")
        return str(text)


def create_provider() -> ModelProvider:
    """根据配置创建模型提供者"""
    provider_type = os.getenv("MODEL_PROVIDER", PROVIDER_ALIYUN).lower()
    
    if provider_type == PROVIDER_ALIYUN:
        api_key = os.getenv("DASHSCOPE_API_KEY", "")
        if not api_key:
            raise ValueError("DASHSCOPE_API_KEY 未设置")
        return AliyunProvider(api_key)
    
    elif provider_type == PROVIDER_OLLAMA:
        base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        return OllamaProvider(base_url)
    
    elif provider_type == PROVIDER_OPENAI:
        base_url = os.getenv("OPENAI_BASE_URL", "http://localhost:8000/v1")
        api_key = os.getenv("OPENAI_API_KEY", "")
        return OpenAIProvider(base_url, api_key)

    elif provider_type == PROVIDER_MINIMAX:
        api_key = os.getenv("MINIMAX_API_KEY", "")
        if not api_key:
            raise ValueError("MINIMAX_API_KEY 未设置")
        base_url = os.getenv("MINIMAX_BASE_URL", "https://api.minimax.io")
        return MiniMaxProvider(api_key, base_url)
    
    else:
        raise ValueError(f"不支持的模型提供者类型: {provider_type}")

