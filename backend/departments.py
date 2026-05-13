# -*- coding: utf-8 -*-
"""学校后勤调度部门树与事件类型默认指派建议。"""

from typing import Any, Dict, List, Optional

# 部门 code -> 下级处室（可按本单位组织架构改）
DEPARTMENT_TREE: List[Dict[str, Any]] = [
    {
        "code": "security_office",
        "name": "保卫处",
        "children": [
            {"code": "security_patrol", "name": "校园巡逻队"},
            {"code": "security_gate", "name": "校门秩序组"},
            {"code": "security_command", "name": "安保指挥室"},
        ],
    },
    {
        "code": "logistics_office",
        "name": "后勤保障处",
        "children": [
            {"code": "facility_maintenance", "name": "设施运维中心"},
            {"code": "power_team", "name": "水电保障组"},
            {"code": "property_team", "name": "物业服务组"},
        ],
    },
    {
        "code": "traffic_center",
        "name": "校园交通管理中心",
        "children": [
            {"code": "parking_team", "name": "停车管理组"},
            {"code": "road_order_team", "name": "道路秩序组"},
            {"code": "event_support_team", "name": "活动交通保障组"},
        ],
    },
    {
        "code": "it_center",
        "name": "信息化中心",
        "children": [
            {"code": "camera_support", "name": "视频监控运维组"},
            {"code": "platform_support", "name": "业务平台支持组"},
        ],
    },
    {
        "code": "college_link",
        "name": "院系联络中心",
        "children": [
            {"code": "college_student_affairs", "name": "学生事务联络组"},
            {"code": "college_office", "name": "院办联络组"},
        ],
    },
    {
        "code": "other",
        "name": "其他协同单位",
        "children": [
            {"code": "other_contact", "name": "综合联络组"},
            {"code": "other_temp", "name": "临时协调专班"},
        ],
    },
]

# 事件类型关键词 -> (部门 code, 处室 code)
_EVENT_DEFAULT: Dict[str, tuple] = {
    "车辆违停": ("traffic_center", "parking_team"),
    "校门拥堵": ("security_office", "security_gate"),
    "消防通道占用": ("security_office", "security_patrol"),
    "停车设施异常": ("logistics_office", "facility_maintenance"),
    "交通标识损坏": ("traffic_center", "road_order_team"),
    "拥堵": ("traffic_center", "road_order_team"),
    "设施": ("logistics_office", "facility_maintenance"),
    "其他": ("other", "other_contact"),
}


def _find_names(dept_code: str, unit_code: str) -> Optional[Dict[str, str]]:
    for d in DEPARTMENT_TREE:
        if d["code"] != dept_code:
            continue
        for c in d.get("children") or []:
            if c["code"] == unit_code:
                return {"department": d["name"], "unit": c["name"]}
    return None


def suggest_assignment(event_type: Optional[str]) -> Optional[Dict[str, str]]:
    """根据事件类型给出默认部门/处室（可人工修改）。"""
    if not event_type:
        return None
    et = event_type.strip()
    codes = _EVENT_DEFAULT.get(et)
    if not codes:
        for k, v in _EVENT_DEFAULT.items():
            if k in et or et in k:
                codes = v
                break
    if not codes:
        codes = _EVENT_DEFAULT["其他"]
    names = _find_names(codes[0], codes[1])
    if not names:
        return None
    return {
        "department_code": codes[0],
        "unit_code": codes[1],
        "department_name": names["department"],
        "unit_name": names["unit"],
    }


# 常用一键指派（供 API 返回给前端做快捷按钮）
QUICK_PRESETS: List[Dict[str, str]] = [
    {"label": "交通中心 · 停车管理", "department_code": "traffic_center", "unit_code": "parking_team"},
    {"label": "交通中心 · 道路秩序", "department_code": "traffic_center", "unit_code": "road_order_team"},
    {"label": "保卫处 · 校门秩序", "department_code": "security_office", "unit_code": "security_gate"},
    {"label": "保卫处 · 巡逻处置", "department_code": "security_office", "unit_code": "security_patrol"},
    {"label": "后勤处 · 设施运维", "department_code": "logistics_office", "unit_code": "facility_maintenance"},
    {"label": "后勤处 · 水电保障", "department_code": "logistics_office", "unit_code": "power_team"},
]


def list_quick_presets() -> List[Dict[str, str]]:
    """常用指派快捷项（含完整部门/处室名称）。"""
    out: List[Dict[str, str]] = []
    for p in QUICK_PRESETS:
        names = _find_names(p["department_code"], p["unit_code"])
        out.append(
            {
                "label": p["label"],
                "department_code": p["department_code"],
                "unit_code": p["unit_code"],
                "department_name": names["department"] if names else "",
                "unit_name": names["unit"] if names else "",
            }
        )
    return out
