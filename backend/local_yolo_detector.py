# -*- coding: utf-8 -*-
"""Local YOLO .pt model inference for uploaded traffic images."""
from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from PIL import Image

logger = logging.getLogger(__name__)

MODEL_EVENT_NAMES = {
    "paosawu": "抛洒物",
    "weiting": "车辆违停",
    "jiaotongshigu": "交通事故",
    "kengwa": "道路损坏",
}

_model_cache: Dict[str, object] = {}


def list_model_paths(model_dir: Path, model_files: Optional[Iterable[str]] = None) -> List[Path]:
    """Return existing .pt model paths in a stable order."""
    if model_files:
        candidates = [Path(item.strip()) for item in model_files if item and item.strip()]
        paths = [p if p.is_absolute() else model_dir / p for p in candidates]
    else:
        paths = sorted(model_dir.glob("*.pt"))
    return [p for p in paths if p.is_file()]


def has_local_models(model_dir: Path, model_files: Optional[Iterable[str]] = None) -> bool:
    return bool(list_model_paths(model_dir, model_files))


def recognize_with_local_pt(
    image_bytes: bytes,
    *,
    model_dir: Path,
    model_files: Optional[Iterable[str]] = None,
    conf_threshold: float = 0.25,
) -> Dict:
    """Run all configured .pt models and return a result shaped like the cloud recognizer."""
    model_paths = list_model_paths(model_dir, model_files)
    if not model_paths:
        return {
            "success": False,
            "error": f"No .pt models found in {model_dir}",
            "answer": "",
            "structured_data": {},
            "event_type": None,
            "confidence": 0.0,
        }

    try:
        from ultralytics import YOLO
    except ImportError:
        return {
            "success": False,
            "error": "Local .pt recognition requires installing ultralytics. Run: pip install -r requirements.txt",
            "answer": "",
            "structured_data": {"missing_dependency": "ultralytics"},
            "event_type": None,
            "confidence": 0.0,
        }

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    detections = []

    for model_path in model_paths:
        cache_key = str(model_path.resolve())
        model = _model_cache.get(cache_key)
        if model is None:
            logger.info("Loading local YOLO model: %s", model_path)
            model = YOLO(cache_key)
            _model_cache[cache_key] = model

        results = model.predict(source=image, conf=conf_threshold, verbose=False)
        event_type = MODEL_EVENT_NAMES.get(model_path.stem.lower(), model_path.stem)

        for result in results:
            names = getattr(result, "names", {}) or {}
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue

            for box in boxes:
                confidence = float(box.conf[0].item()) if getattr(box, "conf", None) is not None else 0.0
                class_id = int(box.cls[0].item()) if getattr(box, "cls", None) is not None else -1
                class_name = names.get(class_id, str(class_id))
                xyxy = [round(float(v), 2) for v in box.xyxy[0].tolist()]
                detections.append({
                    "model": model_path.name,
                    "event_type": event_type,
                    "class_id": class_id,
                    "class_name": class_name,
                    "confidence": confidence,
                    "box": xyxy,
                })

    detections.sort(key=lambda item: item["confidence"], reverse=True)
    best = detections[0] if detections else None

    if best:
        answer = (
            f"本地模型识别到{best['event_type']}，置信度{best['confidence']:.2f}。"
            f"共检测到{len(detections)}个目标。"
        )
        event_type = best["event_type"]
        confidence = best["confidence"]
    else:
        answer = "本地模型未检测到配置的交通事件。"
        event_type = None
        confidence = 0.0

    return {
        "success": True,
        "question": "local_pt_detection",
        "answer": answer,
        "structured_data": {
            "provider": "local_yolo_pt",
            "models": [p.name for p in model_paths],
            "detections": detections,
        },
        "event_type": event_type,
        "confidence": confidence,
        "location": None,
    }
