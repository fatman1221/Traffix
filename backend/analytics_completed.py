# -*- coding: utf-8 -*-
"""已结案工单统计分析（学校后勤场景）。"""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

from sqlalchemy.orm import Session


VIOLATION_KEYWORDS = {
    "停车秩序问题": ["违停", "乱停", "占道停车", "违规停车"],
    "通行拥堵问题": ["拥堵", "缓行", "排队", "堵塞"],
    "安全通道占用": ["消防通道", "生命通道", "通道占用"],
    "交通设施异常": ["标志损坏", "道闸故障", "车位损坏", "停车设施"],
    "校内事故风险": ["碰撞", "剐蹭", "追尾", "事故"],
}


def _as_text(v: Any) -> str:
    return str(v or "").strip()


def _classify_violation(event_type: str, description: str) -> str:
    text = f"{event_type} {description}".lower()
    for category, words in VIOLATION_KEYWORDS.items():
        if any(w in text for w in words):
            return category
    return "其他/待细分"


def _is_accident(event_type: str, description: str) -> bool:
    text = f"{event_type} {description}".lower()
    accident_words = ["碰撞", "剐蹭", "追尾", "事故", "人员受伤", "险情"]
    return any(w in text for w in accident_words)


def build_completed_tickets_analytics(db: Session) -> Dict[str, Any]:
    from app import Ticket as TModel

    tickets = (
        db.query(TModel)
        .filter(TModel.status.in_(["resolved", "closed"]))
        .all()
    )
    total = len(tickets)
    if total == 0:
        return {
            "total_completed": 0,
            "by_event_type": [],
            "by_violation_category": [],
            "by_location": [],
            "accident_hotspots": [],
            "by_department": [],
            "suggestions": [
                "当前尚无状态为「已解决」或「已关闭」的工单，结案积累后可在此查看校园交通问题分布、高发点位与处置建议。",
            ],
        }

    type_counter: Counter = Counter()
    violation_counter: Counter = Counter()
    loc_counter: Counter = Counter()
    accident_loc_counter: Counter = Counter()
    dept_counter: Counter = Counter()

    for t in tickets:
        et = _as_text(t.event_type) or "未分类"
        desc = _as_text(t.description)
        type_counter[et] += 1
        violation_counter[_classify_violation(et, desc)] += 1
        loc = _as_text(t.location)
        loc_key = loc[:100] if loc else "未填写/未识别校内位置"
        loc_counter[loc_key] += 1
        if _is_accident(et, desc):
            accident_loc_counter[loc_key] += 1
        if t.assigned_department:
            du = f"{t.assigned_department}"
            if t.assigned_unit:
                du += f" · {t.assigned_unit}"
            dept_counter[du] += 1
        else:
            dept_counter["未指派部门"] += 1

    by_type: List[Dict[str, Any]] = [
        {"event_type": k, "count": v, "ratio": round(v / total, 4)}
        for k, v in type_counter.most_common()
    ]
    by_violation_category: List[Dict[str, Any]] = [
        {"category": k, "count": v, "ratio": round(v / total, 4)}
        for k, v in violation_counter.most_common()
    ]
    by_location: List[Dict[str, Any]] = [
        {"location": k, "count": v, "ratio": round(v / total, 4)}
        for k, v in loc_counter.most_common(20)
    ]
    accident_hotspots: List[Dict[str, Any]] = [
        {"location": k, "count": v, "ratio": round(v / total, 4)}
        for k, v in accident_loc_counter.most_common(10)
    ]
    by_department: List[Dict[str, Any]] = [
        {"label": k, "count": v}
        for k, v in dept_counter.most_common(15)
    ]

    suggestions: List[str] = []

    top_type = by_type[0]
    suggestions.append(
        f"结案工单共 {total} 起。其中「{top_type['event_type']}」最多（{top_type['count']} 起，"
        f"约占 {top_type['ratio'] * 100:.1f}%），建议将该类问题纳入校内高峰时段重点巡查计划。"
    )
    if by_violation_category:
        top_violation = by_violation_category[0]
        suggestions.append(
            f"违规细分中「{top_violation['category']}」占比最高（{top_violation['count']} 起），"
            "建议设置该类型专项整治时段，并建立后勤闭环复盘台账。"
        )

    if len(by_location) >= 1 and by_location[0]["count"] >= 2:
        top_loc = by_location[0]
        suggestions.append(
            f"点位「{top_loc['location'][:60]}{'…' if len(top_loc['location']) > 60 else ''}」"
            f"相关结案 {top_loc['count']} 起，建议联合保卫与后勤开展现场踏勘和设施优化。"
        )
    if accident_hotspots:
        top_accident_loc = accident_hotspots[0]
        suggestions.append(
            f"事故风险高发点位「{top_accident_loc['location'][:60]}{'…' if len(top_accident_loc['location']) > 60 else ''}」"
            f"累计 {top_accident_loc['count']} 起，建议强化导流提示、人员值守与夜间照明。"
        )

    unassigned = dept_counter.get("未指派部门", 0)
    if unassigned and unassigned / total > 0.3:
        suggestions.append(
            f"有 {unassigned} 起结案工单未记录指派部门（占比 {unassigned / total * 100:.0f}%），"
            "建议调度员在结案前完善「部门 / 班组」信息，便于绩效考核与运营复盘。"
        )

    if len(by_type) >= 2:
        second = by_type[1]
        suggestions.append(
            f"次要高发类型为「{second['event_type']}」（{second['count']} 起），可针对性安排校园交通专项治理。"
        )

    return {
        "total_completed": total,
        "by_event_type": by_type,
        "by_violation_category": by_violation_category,
        "by_location": by_location,
        "accident_hotspots": accident_hotspots,
        "by_department": by_department,
        "suggestions": suggestions,
    }
