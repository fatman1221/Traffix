# -*- coding: utf-8 -*-
"""处置部门树与事件类型默认指派建议（审核调度员选用）。"""

from typing import Any, Dict, List, Optional

# 部门 code -> 下级处室（可按本单位组织架构改）
DEPARTMENT_TREE: List[Dict[str, Any]] = [
    {
        "code": "traffic_police",
        "name": "交警部门",
        "children": [
            {"code": "traffic_order", "name": "秩序科"},
            {"code": "traffic_accident", "name": "事故处理中队"},
            {"code": "traffic_patrol", "name": "勤务中队"},
            {"code": "traffic_command", "name": "交通指挥中心"},
            {"code": "traffic_legal", "name": "法制科"},
        ],
    },
    {
        "code": "municipal",
        "name": "市政部门",
        "children": [
            {"code": "municipal_engineering", "name": "工程管理处"},
            {"code": "municipal_road", "name": "道路养护中心"},
            {"code": "municipal_facility", "name": "市政设施管理处"},
            {"code": "municipal_drain", "name": "排水管理处"},
            {"code": "municipal_lighting", "name": "城市照明管理所"},
        ],
    },
    {
        "code": "urban_mgmt",
        "name": "城管部门",
        "children": [
            {"code": "urban_env", "name": "市容环境执法大队"},
            {"code": "urban_parking", "name": "静态交通管理办"},
            {"code": "urban_illegal", "name": "违建查处大队"},
            {"code": "urban_garden", "name": "园林绿化科"},
        ],
    },
    {
        "code": "transport",
        "name": "交通运输部门",
        "children": [
            {"code": "transport_highway", "name": "公路事业发展中心"},
            {"code": "transport_road", "name": "道路运输服务中心"},
            {"code": "transport_enforce", "name": "交通综合执法支队"},
        ],
    },
    {
        "code": "emergency",
        "name": "应急管理部门",
        "children": [
            {"code": "emergency_rescue", "name": "应急救援中心"},
            {"code": "emergency_coord", "name": "应急协调科"},
            {"code": "emergency_flood", "name": "防汛抗旱指挥部值班室"},
        ],
    },
    {
        "code": "fire_rescue",
        "name": "消防救援",
        "children": [
            {"code": "fire_command", "name": "119 指挥中心"},
            {"code": "fire_station", "name": "辖区消防救援站"},
        ],
    },
    {
        "code": "health",
        "name": "医疗卫生",
        "children": [
            {"code": "health_emergency", "name": "120 急救中心"},
            {"code": "health_hospital", "name": "定点医院联络办"},
        ],
    },
    {
        "code": "street",
        "name": "属地街道办 / 乡镇",
        "children": [
            {"code": "street_admin", "name": "综合管理办公室"},
            {"code": "street_grid", "name": "网格化服务管理中心"},
            {"code": "street_safety", "name": "平安建设办"},
        ],
    },
    {
        "code": "highway_ops",
        "name": "高速公路运营单位",
        "children": [
            {"code": "hw_patrol", "name": "路产管理部 / 巡查"},
            {"code": "hw_rescue", "name": "清障救援调度"},
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
    "道路损坏": ("municipal", "municipal_engineering"),
    "交通事故": ("traffic_police", "traffic_accident"),
    "车辆违停": ("urban_mgmt", "urban_parking"),
    "抛洒物": ("urban_mgmt", "urban_env"),
    "拥堵": ("traffic_police", "traffic_command"),
    "设施": ("municipal", "municipal_facility"),
    "绿化": ("urban_mgmt", "urban_garden"),
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
    {"label": "交警 · 事故处理", "department_code": "traffic_police", "unit_code": "traffic_accident"},
    {"label": "市政 · 工程管理", "department_code": "municipal", "unit_code": "municipal_engineering"},
    {"label": "市政 · 道路养护", "department_code": "municipal", "unit_code": "municipal_road"},
    {"label": "城管 · 市容环境", "department_code": "urban_mgmt", "unit_code": "urban_env"},
    {"label": "城管 · 违停治理", "department_code": "urban_mgmt", "unit_code": "urban_parking"},
    {"label": "交通 · 公路事业", "department_code": "transport", "unit_code": "transport_highway"},
    {"label": "应急 · 救援", "department_code": "emergency", "unit_code": "emergency_rescue"},
    {"label": "消防", "department_code": "fire_rescue", "unit_code": "fire_command"},
    {"label": "街道办 · 综合办", "department_code": "street", "unit_code": "street_admin"},
    {"label": "高速 · 路产", "department_code": "highway_ops", "unit_code": "hw_patrol"},
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
