"""
认证工具模块
提供JWT token生成、验证和密码哈希功能
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from jose.exceptions import JWTClaimsError, ExpiredSignatureError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging

# 配置日志
logger = logging.getLogger(__name__)

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT配置
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

# HTTP Bearer scheme (设置为可选，允许我们手动处理)
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"生成token，使用的SECRET_KEY: {SECRET_KEY[:20]}...")
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """解码JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        logger.error("Token已过期")
        return None
    except JWTClaimsError as e:
        logger.error(f"JWT声明错误: {str(e)}")
        logger.error(f"使用的SECRET_KEY: {SECRET_KEY[:20]}... (长度: {len(SECRET_KEY)})")
        logger.error(f"Token前20个字符: {token[:20]}...")
        return None
    except JWTError as e:
        # 添加详细错误日志用于调试
        logger.error(f"JWT解码失败: {str(e)}")
        logger.error(f"使用的SECRET_KEY: {SECRET_KEY[:20]}... (长度: {len(SECRET_KEY)})")
        logger.error(f"Token前20个字符: {token[:20]}...")
        return None
    except Exception as e:
        logger.error(f"JWT解码异常: {str(e)}")
        return None


async def get_token_from_request(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """从请求头获取token（兼容multipart/form-data）"""
    # 首先尝试从HTTPBearer获取
    if credentials:
        logger.debug("从HTTPBearer获取token")
        return credentials.credentials
    
    # 如果HTTPBearer失败，直接从请求头获取（适用于multipart/form-data）
    authorization = request.headers.get("Authorization")
    if not authorization:
        logger.warning("请求头中缺少Authorization")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无法验证凭据：缺少Authorization头",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            logger.warning(f"不支持的认证方案: {scheme}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无法验证凭据：不支持的认证方案",
                headers={"WWW-Authenticate": "Bearer"},
            )
        logger.debug("从请求头成功获取token")
        return token
    except ValueError as e:
        logger.error(f"Authorization头格式错误: {authorization[:20]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无法验证凭据：Authorization头格式错误",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(get_token_from_request)):
    """获取当前用户（依赖注入）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        logger.error("Token为空")
        raise credentials_exception
    
    # 记录token信息用于调试（不记录完整token，只记录前20个字符）
    logger.debug(f"验证token: {token[:20]}...")
    logger.debug(f"使用的SECRET_KEY: {SECRET_KEY[:20]}... (长度: {len(SECRET_KEY)})")
    
    payload = decode_token(token)
    if payload is None:
        error_msg = (
            "Token验证失败。可能原因：\n"
            "1. JWT_SECRET_KEY与生成token时不一致（请检查backend/env文件）\n"
            "2. Token已过期（请重新登录）\n"
            "3. Token格式错误\n"
            f"当前使用的SECRET_KEY: {SECRET_KEY[:20]}..."
        )
        logger.error(error_msg)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无法验证凭据，请重新登录。如果问题持续，请检查JWT_SECRET_KEY配置",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        logger.error("Token中缺少user_id (sub字段)")
        raise credentials_exception
    
    # sub是字符串，需要转换为整数
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        logger.error(f"Token中的user_id格式错误: {user_id_str}")
        raise credentials_exception
    
    logger.debug(f"Token验证成功，用户ID: {user_id}, 角色: {payload.get('role')}")
    return {"user_id": user_id, "role": payload.get("role")}


async def get_current_public_user(current_user: dict = Depends(get_current_user)):
    """获取当前公众用户（依赖注入）"""
    if current_user["role"] != "public":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要公众用户权限"
        )
    return current_user


async def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    """获取当前管理员用户（依赖注入）"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user
