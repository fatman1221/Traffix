# -*- coding: utf-8 -*-
"""本地文件或 MinIO(S3 兼容) 对象存储，上传与读取统一入口。"""
from __future__ import annotations

import io
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

from minio import Minio
from minio.error import S3Error

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"

_minio_client: Optional[Minio] = None
_bucket: str = "traffix"
_use_minio: bool = False


def _env_bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).lower() in ("1", "true", "yes", "on")


def using_minio() -> bool:
    return _use_minio


def _normalize_stored_path(stored: str) -> str:
    """将库中路径统一为 uploads/xxx（正斜杠）。"""
    if not stored:
        return ""
    p = Path(stored)
    parts = p.parts
    if parts and parts[0] == "uploads":
        return "/".join(parts)
    name = p.name
    return f"uploads/{name}" if name else stored.replace("\\", "/")


def _object_key(stored_path: str) -> str:
    return _normalize_stored_path(stored_path)


def init_storage() -> None:
    global _minio_client, _bucket, _use_minio
    # 默认使用 MinIO；仅本地无对象存储时设 USE_MINIO=false
    _use_minio = _env_bool("USE_MINIO", "true")
    _bucket = os.getenv("MINIO_BUCKET", "traffix").strip() or "traffix"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if not _use_minio:
        _minio_client = None
        return

    endpoint = os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000").strip()
    access = os.getenv("MINIO_ACCESS_KEY", "minioadmin").strip()
    secret = os.getenv("MINIO_SECRET_KEY", "minioadmin").strip()
    secure = _env_bool("MINIO_USE_SSL", "false")

    _minio_client = Minio(
        endpoint,
        access_key=access,
        secret_key=secret,
        secure=secure,
    )
    try:
        if not _minio_client.bucket_exists(_bucket):
            _minio_client.make_bucket(_bucket)
    except S3Error as e:
        raise RuntimeError(f"MinIO 初始化失败（检查 MINIO_ENDPOINT 与服务是否启动）: {e}") from e


def save_upload(data: bytes, original_filename: Optional[str]) -> str:
    """保存文件到 MinIO（USE_MINIO=true）或本地 uploads/，返回库中路径 uploads/文件名。"""
    safe = _safe_filename(original_filename)
    name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{safe}"
    rel = f"uploads/{name}"

    if _use_minio and _minio_client:
        _minio_client.put_object(
            _bucket,
            rel,
            io.BytesIO(data),
            length=len(data),
            content_type=_guess_content_type(safe),
        )
        return rel

    path = UPLOAD_DIR / name
    path.write_bytes(data)
    return rel


def read_upload(stored_path: str) -> Optional[bytes]:
    """按库中存储的路径读取二进制内容。"""
    if not stored_path:
        return None
    key = _object_key(stored_path)

    if _use_minio and _minio_client:
        try:
            resp = _minio_client.get_object(_bucket, key)
            try:
                return resp.read()
            finally:
                resp.close()
                resp.release_conn()
        except S3Error:
            return None

    # 本地：支持 uploads/foo 或历史 Windows 反斜杠
    local = BASE_DIR / Path(stored_path)
    if local.is_file():
        return local.read_bytes()
    alt = BASE_DIR / key.replace("/", os.sep)
    if alt.is_file():
        return alt.read_bytes()
    return None


def public_upload_url_path(stored_path: str) -> str:
    """浏览器可用的 API 路径片段：/uploads/<basename>。"""
    if not stored_path:
        return ""
    return f"/uploads/{Path(_normalize_stored_path(stored_path)).name}"


def suffix_and_mime(stored_path: str) -> Tuple[str, str]:
    ext = Path(stored_path).suffix.lower()
    mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }.get(ext, "application/octet-stream")
    return ext, mime


def _safe_filename(name: Optional[str]) -> str:
    base = Path(name or "file").name
    base = re.sub(r"[^\w.\-]", "_", base).strip("._") or "file"
    return base[:200]


def _guess_content_type(filename: str) -> str:
    _, mime = suffix_and_mime(filename)
    return mime
