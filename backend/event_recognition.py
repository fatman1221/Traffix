"""
交通事件识别服务模块
使用多模态大模型进行事件识别和问答
"""
import logging
import json
import re
from typing import List, Dict, Optional, Tuple
from model_providers import ModelProvider

logger = logging.getLogger(__name__)

# 预设的交通事件识别问题
PRESET_QUESTIONS = {
    "default": [
        "图中公路上有没有抛洒物？",
        "图中是否有交通事故？",
        "图中是否有道路损坏？",
        "图中是否有车辆违停？",
        "图中是否有其他交通异常情况？"
    ],
    "debris": "图中公路上有没有抛洒物？如果有，请描述位置和类型。",
    "accident": "图中是否有交通事故？如果有，请描述事故类型和严重程度。",
    "damage": "图中是否有道路损坏？如果有，请描述损坏位置和类型。",
    "parking": "图中是否有车辆违停？如果有，请描述违停位置。",
    "other": "图中是否有其他交通异常情况？请详细描述。"
}

# 事件类型关键词映射
EVENT_TYPE_KEYWORDS = {
    "抛洒物": ["抛洒物", "垃圾", "杂物", "障碍物", "散落", "掉落"],
    "交通事故": ["事故", "碰撞", "追尾", "刮擦", "侧翻", "撞车"],
    "道路损坏": ["损坏", "坑洞", "裂缝", "破损", "塌陷", "坑洼"],
    "车辆违停": ["违停", "乱停", "占道", "违规停车"],
    "其他": ["异常", "故障", "堵塞", "拥堵"]
}


def recognize_event_with_model(
    model_provider: ModelProvider,
    image_path: str,
    question: Optional[str] = None,
    model_name: str = "qwen-vl-plus"
) -> Dict:
    """
    使用模型识别交通事件
    
    Args:
        model_provider: 模型提供者实例
        image_path: 图片路径（相对路径或绝对路径）
        question: 自定义问题，如果为None则使用预设问题
        model_name: 模型名称
    
    Returns:
        包含识别结果的字典
    """
    try:
        # 如果没有指定问题，使用默认问题
        if not question:
            question = PRESET_QUESTIONS["default"][0]  # 使用第一个预设问题
        
        # 构建消息
        messages = [
            {
                "role": "user",
                "content": [
                    {"image": image_path},  # 这里应该是base64编码的图片
                    {"text": question}
                ]
            }
        ]
        
        # 调用模型
        answer = model_provider.call_model(
            messages=messages,
            model=model_name,
            image_path=image_path
        )
        
        # 提取结构化信息
        structured_data = extract_structured_info(answer, question)
        
        return {
            "success": True,
            "question": question,
            "answer": answer,
            "structured_data": structured_data,
            "event_type": structured_data.get("event_type"),
            "confidence": structured_data.get("confidence", 0.0),
            "location": structured_data.get("location")
        }
    except Exception as e:
        logger.error(f"事件识别失败: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "answer": "",
            "structured_data": {},
            "event_type": None,
            "confidence": 0.0
        }


def extract_structured_info(answer: str, question: str) -> Dict:
    """
    从模型回答中提取结构化信息
    
    Args:
        answer: 模型回答文本
        question: 问题文本
    
    Returns:
        结构化数据字典
    """
    result = {
        "event_type": None,
        "confidence": 0.5,  # 默认置信度
        "location": None,
        "description": answer
    }
    
    answer_lower = answer.lower()
    
    # 检测事件类型
    detected_types = []
    for event_type, keywords in EVENT_TYPE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in answer or keyword in answer_lower:
                detected_types.append(event_type)
                break
    
    if detected_types:
        result["event_type"] = detected_types[0]  # 取第一个匹配的类型
        result["confidence"] = 0.7  # 如果检测到关键词，置信度设为0.7
    
    # 检测是否有事件（通过否定词判断）
    negative_words = ["没有", "无", "不存在", "未发现", "未看到", "看不到"]
    has_negative = any(word in answer for word in negative_words)
    
    if has_negative:
        result["event_type"] = None
        result["confidence"] = 0.3
    elif not detected_types and not has_negative:
        # 如果既没有检测到类型，也没有否定词，可能是其他情况
        result["event_type"] = "其他"
        result["confidence"] = 0.5
    
    # 尝试提取位置信息（简单正则匹配）
    location_patterns = [
        r"位置[：:]\s*([^，。\n]+)",
        r"地点[：:]\s*([^，。\n]+)",
        r"在([^，。\n]+)(?:处|位置|地点)",
    ]
    for pattern in location_patterns:
        match = re.search(pattern, answer)
        if match:
            result["location"] = match.group(1).strip()
            break
    
    return result


def auto_review_report(
    user_selected_types: List[str],
    model_result: Dict,
    confidence_threshold: float = 0.6
) -> Tuple[str, str, float]:
    """
    智能初审：根据用户选择和模型识别结果进行自动审核
    
    Args:
        user_selected_types: 用户选择的事件类型列表
        model_result: 模型识别结果
        confidence_threshold: 置信度阈值
    
    Returns:
        (审核结果, 审核意见, 置信度)
        审核结果: "approved", "rejected", "need_review"
    """
    model_event_type = model_result.get("event_type")
    model_confidence = model_result.get("confidence", 0.0)
    
    # 如果模型识别失败
    if not model_result.get("success", False) or model_confidence < 0.3:
        return ("need_review", "模型识别失败，需要人工复核", model_confidence)
    
    # 如果用户没有选择类型，使用模型识别的类型
    if not user_selected_types:
        if model_confidence >= confidence_threshold:
            return ("approved", f"自动通过：模型识别到{model_event_type}，置信度{model_confidence:.2f}", model_confidence)
        else:
            return ("need_review", f"需要复核：模型识别到{model_event_type}，但置信度较低({model_confidence:.2f})", model_confidence)
    
    # 检查用户选择的类型和模型识别的类型是否匹配
    type_match = False
    if model_event_type:
        # 简单的类型匹配（可以改进）
        for user_type in user_selected_types:
            if model_event_type in user_type or user_type in model_event_type:
                type_match = True
                break
    
    # 如果类型匹配且置信度高，自动通过
    if type_match and model_confidence >= confidence_threshold:
        return ("approved", f"自动通过：用户选择和模型识别一致({model_event_type})，置信度{model_confidence:.2f}", model_confidence)
    
    # 如果类型不匹配，需要人工复核
    if not type_match and model_event_type:
        return ("need_review", f"需要复核：用户选择({','.join(user_selected_types)})与模型识别({model_event_type})不一致", model_confidence)
    
    # 如果置信度较低，需要人工复核
    if model_confidence < confidence_threshold:
        return ("need_review", f"需要复核：模型识别置信度较低({model_confidence:.2f})", model_confidence)
    
    # 默认需要人工复核
    return ("need_review", "需要人工复核", model_confidence)

