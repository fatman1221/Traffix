# -*- coding: utf-8 -*-
"""
基于多模态大模型的道路状况综合识别系统 - 后端API
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum, DECIMAL, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
import os
from dotenv import load_dotenv
import aiofiles
from pathlib import Path
from typing import Optional, List
import base64
import logging
import json
import uuid
from model_providers import create_provider, ModelProvider
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_public_user, get_current_admin_user
)
from event_recognition import recognize_event_with_model, auto_review_report

# 配置日志（需要在其他配置之前）
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量（优先加载 .env，如果不存在则加载 env）
BASE_DIR = Path(__file__).parent
env_file = BASE_DIR / ".env"
if not env_file.exists():
    env_file = BASE_DIR / "env"
load_dotenv(env_file, override=True)  # override=True 确保覆盖已有环境变量
logger.info(f"加载环境变量文件: {env_file}")
if env_file.exists():
    logger.info(f"环境变量文件存在，文件大小: {env_file.stat().st_size} 字节")
    # 验证关键环境变量
    test_provider = os.getenv("MODEL_PROVIDER")
    test_key = os.getenv("DASHSCOPE_API_KEY")
    logger.info(f"MODEL_PROVIDER: {test_provider}, DASHSCOPE_API_KEY: {'已设置' if test_key else '未设置'}")
else:
    logger.warning(f"环境变量文件不存在: {env_file}")

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
    logger.info(f"开始初始化模型提供者，类型: {MODEL_PROVIDER}, 模型: {MODEL_NAME}")
    model_provider = create_provider()
    logger.info(f"✓ 模型提供者已成功初始化: {MODEL_PROVIDER}, 模型: {MODEL_NAME}")
except Exception as e:
    logger.error(f"✗ 模型提供者初始化失败: {e}", exc_info=True)
    logger.error(f"请检查环境变量配置，确保已设置正确的 MODEL_PROVIDER 和相应的 API Key")
    model_provider = None
    logger.warning("模型提供者为 None，后续调用将失败")

# 创建上传目录（BASE_DIR 已在上面定义，这里不需要重复定义）
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


# 新增数据模型
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum('public', 'admin', name='user_role'), nullable=False, default='public', index=True)
    real_name = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    description_text = Column(Text, nullable=True)
    contact_phone = Column(String(20), nullable=True)
    status = Column(SQLEnum('pending', 'auto_approved', 'auto_rejected', 'manual_review', 'approved', 'rejected', 'closed', name='report_status'), 
                    nullable=False, default='pending', index=True)
    auto_review_result = Column(String(50), nullable=True)
    auto_review_confidence = Column(DECIMAL(5, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="reports")
    images = relationship("ReportImage", back_populates="report", cascade="all, delete-orphan")
    ticket = relationship("Ticket", back_populates="report", uselist=False, cascade="all, delete-orphan")
    recognition_results = relationship("ModelRecognitionResult", back_populates="report", cascade="all, delete-orphan")
    review_records = relationship("ReviewRecord", back_populates="report", cascade="all, delete-orphan")


class ReportImage(Base):
    __tablename__ = "report_images"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    image_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", back_populates="images")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, unique=True, index=True)
    ticket_no = Column(String(50), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum('pending', 'assigned', 'processing', 'resolved', 'closed', name='ticket_status'),
                    nullable=False, default='pending', index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    priority = Column(SQLEnum('low', 'medium', 'high', 'urgent', name='ticket_priority'),
                      nullable=False, default='medium')
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    report = relationship("Report", back_populates="ticket")
    records = relationship("TicketRecord", back_populates="ticket", cascade="all, delete-orphan")


class ModelRecognitionResult(Base):
    __tablename__ = "model_recognition_results"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    question = Column(Text, nullable=True)
    answer = Column(Text, nullable=True)
    event_type_detected = Column(String(100), nullable=True)
    confidence = Column(DECIMAL(5, 2), nullable=True)
    structured_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", back_populates="recognition_results")


class ReviewRecord(Base):
    __tablename__ = "review_records"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    review_type = Column(SQLEnum('auto', 'manual', name='review_type'), nullable=False)
    review_result = Column(SQLEnum('approved', 'rejected', 'need_review', name='review_result'), nullable=False)
    review_comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    report = relationship("Report", back_populates="review_records")


class TicketRecord(Base):
    __tablename__ = "ticket_records"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    ticket = relationship("Ticket", back_populates="records")


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


# ==================== 新增API：用户认证 ====================

@app.post("/api/auth/register")
async def register(
    username: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    real_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """用户注册（公众用户）"""
    # 检查用户名和手机号是否已存在
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(status_code=400, detail="手机号已注册")
    
    # 创建用户
    user = User(
        username=username,
        phone=phone,
        password_hash=get_password_hash(password),
        role='public',
        real_name=real_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 生成token（sub必须是字符串）
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "phone": user.phone,
            "role": user.role
        }
    }


@app.post("/api/auth/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """用户登录（支持公众用户和管理员）"""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    # 生成token（sub必须是字符串）
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "phone": user.phone,
            "role": user.role
        }
    }


@app.get("/api/auth/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户信息"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return {
        "id": user.id,
        "username": user.username,
        "phone": user.phone,
        "role": user.role,
        "real_name": user.real_name
    }


# ==================== 新增API：事件上报 ====================

@app.post("/api/reports")
async def create_report(
    event_type: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    contact_phone: Optional[str] = Form(None),
    images: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_public_user),
    db: Session = Depends(get_db)
):
    """创建事件举报"""
    if not images:
        raise HTTPException(status_code=400, detail="至少需要上传一张图片")
    
    # 保存图片
    image_urls = []
    for idx, image in enumerate(images):
        file_path = UPLOAD_DIR / f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}_{image.filename}"
        async with aiofiles.open(file_path, 'wb') as f:
            content_data = await image.read()
            await f.write(content_data)
        image_urls.append(str(file_path.relative_to(BASE_DIR)))
    
    # 获取用户信息
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    
    # 创建举报记录
    report = Report(
        user_id=current_user["user_id"],
        event_type=event_type,
        location=location,
        description=description,
        description_text=description,
        contact_phone=contact_phone or user.phone,
        status='pending'
    )
    db.add(report)
    db.flush()
    
    # 保存图片记录
    for idx, image_url in enumerate(image_urls):
        report_image = ReportImage(
            report_id=report.id,
            image_url=image_url,
            image_order=idx
        )
        db.add(report_image)
    
    # 使用第一张图片进行模型识别
    first_image_path = BASE_DIR / image_urls[0]
    if first_image_path.exists():
        try:
            # 读取图片并转换为base64
            with open(first_image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
            ext = first_image_path.suffix.lower()
            mime_type = {
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
            }.get(ext, 'image/jpeg')
            image_base64 = f"data:{mime_type};base64,{image_data}"
            
            # 调用模型识别
            if model_provider:
                question = "图中公路上有没有抛洒物？如果有，请描述位置和类型。如果没有，请描述图中是否有其他交通异常情况。"
                recognition_result = recognize_event_with_model(
                    model_provider=model_provider,
                    image_path=image_base64,
                    question=question,
                    model_name=MODEL_NAME
                )
                
                # 保存识别结果
                model_result = ModelRecognitionResult(
                    report_id=report.id,
                    image_url=image_urls[0],
                    question=question,
                    answer=recognition_result.get("answer", ""),
                    event_type_detected=recognition_result.get("event_type"),
                    confidence=float(recognition_result.get("confidence", 0.0)),
                    structured_data=recognition_result.get("structured_data", {})
                )
                db.add(model_result)
                
                # 智能初审
                user_selected_types = [event_type] if event_type else []
                review_result, review_comment, confidence = auto_review_report(
                    user_selected_types=user_selected_types,
                    model_result=recognition_result
                )
                
                # 更新举报状态
                if review_result == "approved":
                    report.status = "auto_approved"
                elif review_result == "rejected":
                    report.status = "auto_rejected"
                else:
                    report.status = "manual_review"
                
                report.auto_review_result = review_result
                report.auto_review_confidence = float(confidence)
                
                # 保存审核记录
                review_record = ReviewRecord(
                    report_id=report.id,
                    reviewer_id=current_user["user_id"],  # 系统自动审核
                    review_type="auto",
                    review_result=review_result,
                    review_comment=review_comment
                )
                db.add(review_record)
                
                # 如果自动通过，创建工单
                if review_result == "approved":
                    ticket_no = f"T{datetime.now().strftime('%Y%m%d%H%M%S')}{report.id:06d}"
                    ticket = Ticket(
                        report_id=report.id,
                        ticket_no=ticket_no,
                        event_type=recognition_result.get("event_type") or event_type,
                        location=location or recognition_result.get("structured_data", {}).get("location"),
                        description=description or recognition_result.get("answer", ""),
                        status="pending",
                        priority="medium"
                    )
                    db.add(ticket)
        except Exception as e:
            logger.error(f"模型识别失败: {str(e)}", exc_info=True)
            # 识别失败不影响举报创建，但需要人工复核
            report.status = "manual_review"
    
    db.commit()
    db.refresh(report)
    
    return {
        "id": report.id,
        "status": report.status,
        "auto_review_result": report.auto_review_result,
        "auto_review_confidence": float(report.auto_review_confidence) if report.auto_review_confidence else None,
        "created_at": report.created_at.isoformat()
    }


@app.get("/api/reports/my")
async def get_my_reports(
    current_user: dict = Depends(get_current_public_user),
    db: Session = Depends(get_db)
):
    """获取我的举报记录"""
    reports = db.query(Report).filter(
        Report.user_id == current_user["user_id"]
    ).order_by(Report.created_at.desc()).all()
    
    result = []
    for report in reports:
        images = [img.image_url for img in report.images]
        result.append({
            "id": report.id,
            "event_type": report.event_type,
            "location": report.location,
            "description": report.description,
            "status": report.status,
            "auto_review_result": report.auto_review_result,
            "images": images,
            "created_at": report.created_at.isoformat()
        })
    
    return result


# ==================== 新增API：模型识别服务 ====================

@app.post("/api/recognize")
async def recognize_image(
    image: UploadFile = File(...),
    question: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """图片事件识别接口（问答形式）"""
    # 保存图片
    file_path = UPLOAD_DIR / f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}_{image.filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        content_data = await image.read()
        await f.write(content_data)
    
    # 读取图片并转换为base64
    with open(file_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    ext = file_path.suffix.lower()
    mime_type = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp'
    }.get(ext, 'image/jpeg')
    image_base64 = f"data:{mime_type};base64,{image_data}"
    
    if not model_provider:
        raise HTTPException(status_code=503, detail="模型服务未初始化")
    
    # 如果没有指定问题，使用默认问题
    if not question:
        question = "图中公路上有没有抛洒物？如果有，请描述位置和类型。如果没有，请描述图中是否有其他交通异常情况。"
    
    # 调用模型识别
    try:
        recognition_result = recognize_event_with_model(
            model_provider=model_provider,
            image_path=image_base64,
            question=question,
            model_name=MODEL_NAME
        )
        
        return {
            "success": recognition_result.get("success", False),
            "question": question,
            "answer": recognition_result.get("answer", ""),
            "structured_data": recognition_result.get("structured_data", {}),
            "event_type": recognition_result.get("event_type"),
            "confidence": float(recognition_result.get("confidence", 0.0)),
            "image_url": f"/uploads/{file_path.name}"
        }
    except Exception as e:
        logger.error(f"识别失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")


# ==================== 新增API：工单管理（管理端） ====================

@app.get("/api/admin/tickets")
async def get_tickets(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取工单列表（管理端）"""
    query = db.query(Ticket)
    if status:
        query = query.filter(Ticket.status == status)
    
    tickets = query.order_by(Ticket.created_at.desc()).all()
    
    result = []
    for ticket in tickets:
        report = ticket.report
        images = [img.image_url for img in report.images] if report else []
        result.append({
            "id": ticket.id,
            "ticket_no": ticket.ticket_no,
            "report_id": ticket.report_id,
            "event_type": ticket.event_type,
            "location": ticket.location,
            "description": ticket.description,
            "status": ticket.status,
            "priority": ticket.priority,
            "assigned_to": ticket.assigned_to,
            "images": images,
            "created_at": ticket.created_at.isoformat(),
            "updated_at": ticket.updated_at.isoformat()
        })
    
    return result


@app.get("/api/admin/tickets/{ticket_id}")
async def get_ticket_detail(
    ticket_id: int,
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取工单详情（管理端）"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="工单不存在")
    
    report = ticket.report
    images = [img.image_url for img in report.images] if report else []
    recognition_results = [
        {
            "id": r.id,
            "image_url": r.image_url,
            "question": r.question,
            "answer": r.answer,
            "event_type_detected": r.event_type_detected,
            "confidence": float(r.confidence) if r.confidence else None
        }
        for r in report.recognition_results
    ] if report else []
    
    review_records = [
        {
            "id": r.id,
            "review_type": r.review_type,
            "review_result": r.review_result,
            "review_comment": r.review_comment,
            "created_at": r.created_at.isoformat()
        }
        for r in report.review_records
    ] if report else []
    
    return {
        "id": ticket.id,
        "ticket_no": ticket.ticket_no,
        "report_id": ticket.report_id,
        "event_type": ticket.event_type,
        "location": ticket.location,
        "description": ticket.description,
        "status": ticket.status,
        "priority": ticket.priority,
        "assigned_to": ticket.assigned_to,
        "images": images,
        "recognition_results": recognition_results,
        "review_records": review_records,
        "report": {
            "id": report.id if report else None,
            "user_id": report.user_id if report else None,
            "event_type": report.event_type if report else None,
            "location": report.location if report else None,
            "description": report.description if report else None,
            "status": report.status if report else None,
            "auto_review_result": report.auto_review_result if report else None,
            "auto_review_confidence": float(report.auto_review_confidence) if report and report.auto_review_confidence else None
        } if report else None,
        "created_at": ticket.created_at.isoformat(),
        "updated_at": ticket.updated_at.isoformat()
    }


@app.post("/api/admin/reports/{report_id}/review")
async def review_report(
    report_id: int,
    review_result: str = Form(...),
    review_comment: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """人工复核举报（管理端）"""
    if review_result not in ["approved", "rejected", "need_review"]:
        raise HTTPException(status_code=400, detail="无效的审核结果")
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="举报不存在")
    
    # 更新举报状态
    if review_result == "approved":
        report.status = "approved"
        # 如果还没有工单，创建工单
        if not report.ticket:
            ticket_no = f"T{datetime.now().strftime('%Y%m%d%H%M%S')}{report.id:06d}"
            ticket = Ticket(
                report_id=report.id,
                ticket_no=ticket_no,
                event_type=report.event_type,
                location=report.location,
                description=report.description,
                status="pending",
                priority="medium"
            )
            db.add(ticket)
    elif review_result == "rejected":
        report.status = "rejected"
    else:
        report.status = "manual_review"
    
    # 保存审核记录
    review_record = ReviewRecord(
        report_id=report.id,
        reviewer_id=current_user["user_id"],
        review_type="manual",
        review_result=review_result,
        review_comment=review_comment
    )
    db.add(review_record)
    
    db.commit()
    
    return {"success": True, "message": "审核完成"}


@app.post("/api/admin/tickets/{ticket_id}/update")
async def update_ticket(
    ticket_id: int,
    status: Optional[str] = Form(None),
    assigned_to: Optional[int] = Form(None),
    priority: Optional[str] = Form(None),
    comment: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """更新工单状态（管理端）"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="工单不存在")
    
    old_status = ticket.status
    
    # 更新状态
    if status:
        if status not in ["pending", "assigned", "processing", "resolved", "closed"]:
            raise HTTPException(status_code=400, detail="无效的状态")
        ticket.status = status
    
    if assigned_to:
        ticket.assigned_to = assigned_to
    
    if priority:
        if priority not in ["low", "medium", "high", "urgent"]:
            raise HTTPException(status_code=400, detail="无效的优先级")
        ticket.priority = priority
    
    # 保存处理记录
    if status or assigned_to or priority or comment:
        record = TicketRecord(
            ticket_id=ticket.id,
            operator_id=current_user["user_id"],
            action="update",
            old_status=old_status,
            new_status=ticket.status,
            comment=comment
        )
        db.add(record)
    
    db.commit()
    db.refresh(ticket)
    
    return {
        "success": True,
        "ticket": {
            "id": ticket.id,
            "status": ticket.status,
            "assigned_to": ticket.assigned_to,
            "priority": ticket.priority
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

