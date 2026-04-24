# -*- coding: utf-8 -*-
"""
写入 6 条已结案工单演示数据，用于数据管理 -> 结案分析页面联调。

执行方式：
    cd backend
    python seed_completed_demo.py
"""
from __future__ import annotations

from datetime import UTC, datetime

from app import Report, SessionLocal, Ticket, User


def run() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first() or db.query(User).first()
        if not user:
            raise RuntimeError("未找到任何用户，请先初始化管理员账户。")

        now = datetime.now(UTC).replace(tzinfo=None)
        samples = [
            ("交通事故", "G15沈海高速K1423+200", "两车追尾，右侧车道受阻", "closed", "交警支队", "高速一大队"),
            ("交通事故", "G15沈海高速K1423+200", "夜间剐蹭事故，车辆停靠应急车道", "resolved", "交警支队", "高速一大队"),
            ("车辆违停", "中山路与人民路交叉口", "占道违法停车影响通行", "closed", "城管执法局", "机动中队"),
            ("抛洒物", "绕城高速南段K88", "货车遗撒导致路面散落物", "resolved", "路政管理处", "养护三队"),
            ("道路损坏", "迎宾大道北段", "路面坑洞较深存在安全隐患", "closed", "市政工程处", "道路养护科"),
            ("交通事故", "机场高速收费站出口", "三车轻微碰撞造成拥堵缓行", "closed", "交警支队", "事故处理科"),
        ]

        created = 0
        stamp = now.strftime("%Y%m%d%H%M%S")
        for idx, (event_type, location, description, status, dept, unit) in enumerate(samples, 1):
            report = Report(
                user_id=user.id,
                event_type=event_type,
                location=location,
                description=description,
                description_text=description,
                contact_phone=user.phone,
                status="approved",
                created_at=now,
                updated_at=now,
            )
            db.add(report)
            db.flush()

            ticket = Ticket(
                report_id=report.id,
                ticket_no=f"DEMO{stamp}{idx:02d}{report.id:04d}",
                event_type=event_type,
                location=location,
                description=description,
                status=status,
                priority="medium",
                assigned_department=dept,
                assigned_unit=unit,
                created_at=now,
                updated_at=now,
            )
            db.add(ticket)
            created += 1

        db.commit()
        print(f"写入完成：{created} 条演示工单")
        print("可在后台查看：数据管理 -> 结案分析")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
