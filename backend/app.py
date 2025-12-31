from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
import os
from dotenv import load_dotenv
import aiofiles
from pathlib import Path
from typing import Optional
import base64
import logging
import json
from model_providers import create_provider, ModelProvider

# 配置日志（需要在其他配置之前）
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量（优先加载 .env，如果不存在则加载 env）
env_file = Path(__file__).parent / ".env"
if not env_file.exists():
    env_file = Path(__file__).parent / "env"
load_dotenv(env_file)

# 数据库配置
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:12345678@localhost:3306/traffix"
)

# 模型配置
MODEL_PROVIDER = os.getenv("MODEL_PROVIDER", "aliyun").lower()  # aliyun, ollama, openai
MODEL_NAME = os.getenv("MODEL_NAME", "qwen-vl-plus")  # 模型名称

# 初始化模型提供者
model_provider = None
try:
    model_provider = create_provider()
    logger.info(f"模型提供者已初始化: {MODEL_PROVIDER}, 模型: {MODEL_NAME}")
except Exception as e:
    logger.error(f"模型提供者初始化失败: {e}")
    logger.error(f"请检查环境变量配置，确保已设置正确的 MODEL_PROVIDER 和相应的 API Key")
    model_provider = None

# 创建上传目录
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# 数据库设置
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# 数据库模型
class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    content = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    created_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("ChatSession", back_populates="messages")


# 创建表
Base.metadata.create_all(bind=engine)

# FastAPI 应用
app = FastAPI(title="Traffix API")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（用于图片）
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# 数据库依赖
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 辅助函数：从各种格式中提取文本内容
def extract_text_from_content(content):
    """从各种格式中提取纯文本内容（Markdown 格式）"""
    if not content:
        return ""
    
    # 如果是列表（Python 对象或 JSON 解析后的对象）
    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, dict) and 'text' in item:
                text_parts.append(str(item['text']))
            elif isinstance(item, str):
                text_parts.append(item)
        result = '\n'.join(text_parts) if text_parts else ""
        logger.debug(f"从列表提取文本: {len(result)} 字符")
        return result
    
    # 如果是字典（Python 对象或 JSON 解析后的对象）
    if isinstance(content, dict):
        if 'text' in content:
            result = str(content['text'])
            logger.debug(f"从字典提取文本: {len(result)} 字符")
            return result
        return str(content)
    
    # 如果是字符串，尝试解析 JSON
    if isinstance(content, str):
        # 尝试解析为 JSON（可能是字符串形式的列表或字典）
        try:
            parsed = json.loads(content)
            # 递归处理解析后的对象
            return extract_text_from_content(parsed)
        except (json.JSONDecodeError, ValueError):
            # 不是 JSON，直接返回字符串（可能是 Markdown 格式的文本）
            return content
    
    # 其他类型转换为字符串
    return str(content)


# 调用大模型（统一接口）
def call_model(user_content: str, image_path: Optional[str] = None, history: list = None):
    """调用大模型（支持多种提供者）"""
    try:
        if not model_provider:
            error_msg = (
                f"模型提供者未初始化。\n"
                f"当前配置: MODEL_PROVIDER={MODEL_PROVIDER}, MODEL_NAME={MODEL_NAME}\n"
                f"请检查:\n"
                f"1. 环境变量文件 (backend/env 或 backend/.env) 是否存在\n"
                f"2. 如果使用阿里云，请确保 DASHSCOPE_API_KEY 已设置\n"
                f"3. 如果使用 Ollama，请确保 Ollama 服务正在运行\n"
                f"4. 查看后端日志了解详细错误信息"
            )
            logger.error(error_msg)
            raise Exception(error_msg)
        
        messages = []
        
        # 添加历史消息
        if history:
            for msg in history[-10:]:  # 只取最近10条消息
                msg_content = msg.get("content", "")
                
                # 确保 content 是字符串类型
                if not isinstance(msg_content, str):
                    if isinstance(msg_content, (list, dict)):
                        if isinstance(msg_content, list):
                            text_parts = [item.get("text", "") for item in msg_content if isinstance(item, dict) and "text" in item]
                            msg_content = " ".join(text_parts) if text_parts else ""
                        else:
                            msg_content = str(msg_content)
                    else:
                        msg_content = str(msg_content) if msg_content else ""
                
                if not msg_content or not msg_content.strip():
                    if msg.get("role") == "user":
                        msg_content = "[用户发送了图片或空消息]"
                    else:
                        msg_content = "[助手回复]"
                
                messages.append({
                    "role": msg["role"],
                    "content": msg_content
                })
        
        # 添加当前用户消息
        image_url = None
        if image_path:
            # 读取图片并转换为 base64
            image_file = BASE_DIR / image_path
            if image_file.exists():
                with open(image_file, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode('utf-8')
                ext = image_file.suffix.lower()
                mime_type = {
                    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                    '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
                }.get(ext, 'image/jpeg')
                image_url = f"data:{mime_type};base64,{image_data}"
                logger.info(f"图片已加载，大小: {len(image_data)} 字符")
        
        # 构建消息内容
        if image_url:
            user_message_content = [
                {"image": image_url},
                {"text": user_content if user_content.strip() else "请详细描述这张图片的内容，包括图片中的主要元素、场景、颜色、文字等信息。"}
            ]
            messages.append({"role": "user", "content": user_message_content})
        else:
            messages.append({"role": "user", "content": user_content if user_content else "你好"})
        
        # 确定使用的模型
        model_to_use = MODEL_NAME
        if image_url and MODEL_PROVIDER == "aliyun" and not model_to_use.startswith('qwen-vl'):
            model_to_use = "qwen-vl-plus"
            logger.info(f"检测到图片，自动切换到视觉模型: {model_to_use}")
        
        logger.info(f"调用模型: {model_to_use}, 提供者: {MODEL_PROVIDER}, 消息数量: {len(messages)}")
        
        # 使用模型提供者调用模型
        content = model_provider.call_model(
            messages=messages,
            model=model_to_use,
            image_path=image_url
        )
        
        logger.info(f"模型回复长度: {len(content)}")
        return content
    except Exception as e:
        logger.error(f"调用大模型异常: {str(e)}", exc_info=True)
        raise Exception(f"调用大模型时出错: {str(e)}")


# API 路由
@app.get("/")
def read_root():
    return {"message": "Traffix API is running"}


@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    """获取所有会话列表"""
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return [
        {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat()
        }
        for session in sessions
    ]


@app.post("/api/sessions")
def create_session(db: Session = Depends(get_db)):
    """创建新会话"""
    session = ChatSession()
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat()
    }


@app.get("/api/sessions/{session_id}/messages")
def get_messages(session_id: int, db: Session = Depends(get_db)):
    """获取会话的所有消息"""
    messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return [
        {
            "id": msg.id,
            "session_id": msg.session_id,
            "content": extract_text_from_content(msg.content) if msg.content else "",  # 处理可能的旧格式数据
            "image_url": f"/uploads/{Path(msg.image_url).name}" if msg.image_url else None,
            "role": msg.role,
            "created_at": msg.created_at.isoformat()
        }
        for msg in messages
    ]


@app.post("/api/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    content: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """发送消息并获取AI回复"""
    # 验证会话存在
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 保存用户消息
    image_url = None
    if image:
        # 保存图片
        file_path = UPLOAD_DIR / f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{image.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            content_data = await image.read()
            await f.write(content_data)
        image_url = str(file_path.relative_to(BASE_DIR))
    
    # 确保 content 是字符串类型
    user_content_str = str(content) if content else ""
    
    user_message = Message(
        session_id=session_id,
        content=user_content_str,
        image_url=image_url,
        role="user"
    )
    db.add(user_message)
    db.commit()
    
    # 获取历史消息
    history_messages = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    
    history = [
        {
            "role": msg.role,
            "content": msg.content or ""
        }
        for msg in history_messages[:-1]  # 排除刚添加的用户消息
    ]
    
    # 调用大模型
    try:
        assistant_content = call_model(
            user_content=user_content_str,
            image_path=image_url,
            history=history
        )
        # 使用辅助函数确保提取纯文本（处理可能的 JSON 字符串格式）
        assistant_content = extract_text_from_content(assistant_content)
    except Exception as e:
        assistant_content = f"抱歉，处理您的请求时出现错误: {str(e)}"
    
    # 保存AI回复（确保 content 是字符串）
    assistant_message = Message(
        session_id=session_id,
        content=str(assistant_content) if assistant_content else "",
        image_url=None,
        role="assistant"
    )
    db.add(assistant_message)
    
    # 更新会话标题（如果是第一条消息）
    if not session.title and user_content_str:
        session.title = user_content_str[:50]  # 取前50个字符作为标题
    
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(assistant_message)
    
    return {
        "id": assistant_message.id,
        "session_id": assistant_message.session_id,
        "content": extract_text_from_content(assistant_message.content) if assistant_message.content else "",
        "image_url": None,
        "role": assistant_message.role,
        "created_at": assistant_message.created_at.isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

