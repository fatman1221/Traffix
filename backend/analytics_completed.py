# -*- coding: utf-8 -*-
"""已结案工单统计分析（resolved / closed）。"""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

from sqlalchemy.orm import Session


VIOLATION_KEYWORDS = {
    "违停违法": ["违停", "违法停车", "乱停", "占道停车"],
    "抛洒物风险": ["抛洒", "遗撒", "散落物", "落物"],
    "交通事故": ["交通事故", "追尾", "碰撞", "剐蹭", "侧翻", "翻车"],
    "道路设施损坏": ["道路损坏", "坑洞", "护栏损坏", "标志损坏", "路面破损"],
    "拥堵缓行": ["拥堵", "缓行", "排队", "车流大"],
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
    accident_words = ["交通事故", "追尾", "碰撞", "剐蹭", "侧翻", "翻车", "事故"]
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
                "当前尚无状态为「已解决」或「已关闭」的工单，结案积累后可在此查看违规类型分布、高发路段与处置建议。",
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
        loc_key = loc[:100] if loc else "未填写/未识别路段"
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
        f"约占 {top_type['ratio'] * 100:.1f}%），建议将该类问题纳入重点巡查与宣传预案。"
    )
    if by_violation_category:
        top_violation = by_violation_category[0]
        suggestions.append(
            f"违规细分中「{top_violation['category']}」占比最高（{top_violation['count']} 起），"
            "建议设置该类型专项执法时段，并建立闭环复盘台账。"
        )

    if len(by_location) >= 1 and by_location[0]["count"] >= 2:
        top_loc = by_location[0]
        suggestions.append(
            f"路段「{top_loc['location'][:60]}{'…' if len(top_loc['location']) > 60 else ''}」"
            f"相关结案 {top_loc['count']} 起，建议联合属地开展隐患排查、标志标线或设施维护。"
        )
    if accident_hotspots:
        top_accident_loc = accident_hotspots[0]
        suggestions.append(
            f"事故高发路段「{top_accident_loc['location'][:60]}{'…' if len(top_accident_loc['location']) > 60 else ''}」"
            f"累计 {top_accident_loc['count']} 起，建议重点开展测速管控、警示标识增设与夜间照明优化。"
        )

    unassigned = dept_counter.get("未指派部门", 0)
    if unassigned and unassigned / total > 0.3:
        suggestions.append(
            f"有 {unassigned} 起结案工单未记录指派部门（占比 {unassigned / total * 100:.0f}%），"
            "建议调度员在结案前尽量完善「部门 / 处室」信息，便于绩效考核与复盘。"
        )

    if len(by_type) >= 2:
        second = by_type[1]
        suggestions.append(
            f"次要高发类型为「{second['event_type']}」（{second['count']} 起），可针对性安排专项整治或联席会议。"
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
