"""Seed initial users and representatives so the platform is usable immediately.

Usage: python seed_data.py
"""
from app.auth.security import hash_password
from app.db import SessionLocal, init_db
from app.models.config import Configuration
from app.models.representative import Representative
from app.models.user import User
from app.services.representative_service import load_representative_csv

SEED_USERS = [
    {"name": "Admin User", "email": "admin@company.com", "password": "Admin@123", "role": "administrator"},
    {"name": "Youssef Hassan", "email": "manager@company.com", "password": "Manager@123", "role": "sales_manager"},
    {"name": "Sara Al-Emadi", "email": "rep@company.com", "password": "Rep@123", "role": "sales_representative"},
    {"name": "Executive User", "email": "exec@company.com", "password": "Exec@123", "role": "executive"},
    {"name": "Auditor User", "email": "auditor@company.com", "password": "Auditor@123", "role": "read_only_auditor"},
]

SEED_CONFIG = [
    {"key": "sales_ops_phone", "value": "+97444009999", "category": "reminders", "description": "72h escalation contact"},
    {"key": "reminder_stage_1_hours", "value": "24", "category": "reminders", "description": "First reminder threshold"},
    {"key": "reminder_stage_2_hours", "value": "48", "category": "reminders", "description": "Second reminder threshold"},
    {"key": "reminder_stage_3_hours", "value": "72", "category": "reminders", "description": "Escalation threshold"},
    {"key": "boss_phone", "value": "", "category": "notifications", "description": "WhatsApp number for the daily unassigned/stale-lead digest"},
]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        for u in SEED_USERS:
            if db.query(User).filter(User.email == u["email"]).first():
                continue
            db.add(User(name=u["name"], email=u["email"], hashed_password=hash_password(u["password"]), role=u["role"]))
        db.commit()

        for c in SEED_CONFIG:
            if db.query(Configuration).filter(Configuration.key == c["key"]).first():
                continue
            db.add(Configuration(**c))
        db.commit()

        if db.query(Representative).count() == 0:
            with open("seed_files/representatives.csv", encoding="utf-8") as f:
                content = f.read()
            result = load_representative_csv(db, content, "representatives.csv", "seed_script")
            print(f"Loaded {result.valid_rows}/{result.row_count} representatives from CSV")

        # Link the seeded sales rep user to REP-001 so role-scoped views work out of the box.
        rep_user = db.query(User).filter(User.email == "rep@company.com").first()
        rep_001 = db.query(Representative).filter(Representative.representative_code == "REP-001").first()
        if rep_user and rep_001 and not rep_user.representative_id:
            rep_user.representative_id = rep_001.id
            db.commit()

        print("Seed complete. Login with:")
        for u in SEED_USERS:
            print(f"  {u['email']} / {u['password']}  ({u['role']})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
