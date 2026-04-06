"""
初始化管理员账户脚本
运行此脚本创建默认管理员账户
"""
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import User, Base
from auth import get_password_hash
import os
from dotenv import load_dotenv

# 加载环境变量
env_file = Path(__file__).parent / ".env"
if not env_file.exists():
    env_file = Path(__file__).parent / "env"
load_dotenv(env_file)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:12345678@localhost:3306/traffix"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin():
    """创建默认管理员账户"""
    db = SessionLocal()
    try:
        # 检查是否已存在管理员
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print("管理员账户已存在，用户名: admin")
            print("如需重置密码，请手动更新数据库")
            return
        
        # 创建管理员账户
        admin = User(
            username="admin",
            phone="13800138000",
            password_hash=get_password_hash("admin123"),
            role="admin",
            real_name="系统管理员"
        )
        db.add(admin)
        db.commit()
        print("管理员账户创建成功！")
        print("用户名: admin")
        print("密码: admin123")
        print("请登录后立即修改密码！")
    except Exception as e:
        print(f"创建管理员账户失败: {e}")
        db.rollback()
    finally:
        db.close()

def create_dispatcher():
    """创建默认审核调度员（管理员在后台也可新建）"""
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == "dispatcher").first()
        if u:
            print("审核调度员已存在: dispatcher")
            return
        user = User(
            username="dispatcher",
            phone="13800138001",
            password_hash=get_password_hash("dispatcher123"),
            role="dispatcher",
            real_name="审核调度员",
        )
        db.add(user)
        db.commit()
        print("审核调度员创建成功：dispatcher / dispatcher123（请登录后修改密码）")
    except Exception as e:
        print(f"创建失败: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "dispatcher":
        create_dispatcher()
    else:
        create_admin()

