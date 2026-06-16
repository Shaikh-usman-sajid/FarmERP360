"""
FarmERP360 - Database Initializer
Creates all tables directly from SQLAlchemy models.
Runs before seed.py on every startup (safe - skips existing tables).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import Base, engine
from app.models import models  # noqa - registers all models


def init_db():
    print("🔧 Initializing database schema...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created (or already exist)")
    except Exception as e:
        print(f"❌ DB init error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    init_db()
