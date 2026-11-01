from fastapi import APIRouter, HTTPException, Depends, status
import sqlite3
from database import get_db, get_db_context, log_activity
from auth import verify_password, get_password_hash, create_access_token, get_current_user
from models import UserRegister, UserLogin, UserUpdate
import seed

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register")
def register(user_data: UserRegister):
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        hashed_pwd = get_password_hash(user_data.password)
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, university, major, target_attendance)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_data.name,
            user_data.email,
            hashed_pwd,
            user_data.university or "Apex University",
            user_data.major or "Computer Science",
            user_data.target_attendance or 75.0
        ))
        user_id = cursor.lastrowid
        log_activity(user_id, "account_created", "Account created", f"Welcome to StudentOS, {user_data.name}!", conn=conn)

        # Create sample starter subjects so student has an intuitive start
        sample_subjects = [
            ("Data Structures & Algorithms", "CS-201", "Dr. Alan Turing", "#3B82F6", 75.0, 20, 18, "Hall A", 4),
            ("Computer Systems & Architecture", "CS-204", "Prof. Margaret Hamilton", "#8B5CF6", 75.0, 18, 13, "Room 302", 4),
            ("Linear Algebra & Calculus", "MATH-301", "Dr. Carl Gauss", "#EC4899", 75.0, 16, 14, "Sci-101", 3),
            ("Software Engineering Practice", "CS-310", "Prof. Grace Hopper", "#10B981", 75.0, 14, 12, "Lab 4", 3)
        ]
        for name, code, inst, color, target, cond, att, room, cred in sample_subjects:
            cursor.execute("""
                INSERT INTO subjects (user_id, name, code, instructor, color, target_percentage, classes_conducted, classes_attended, room, credits)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, name, code, inst, color, target, cond, att, room, cred))

    token = create_access_token({"sub": str(user_id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user_data.name,
            "email": user_data.email,
            "university": user_data.university or "Apex University",
            "major": user_data.major or "Computer Science",
            "target_attendance": user_data.target_attendance or 75.0
        }
    }

@router.post("/login")
def login(login_data: UserLogin):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (login_data.email,))
        user = cursor.fetchone()
        if not user or not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Invalid email or password")

        token = create_access_token({"sub": str(user["id"])})
        log_activity(user["id"], "login", "Logged in", f"Signed into StudentOS from web", conn=conn)
        conn.commit()
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "university": user["university"],
                "major": user["major"],
                "target_attendance": user["target_attendance"],
                "weekly_study_goal": user["weekly_study_goal"],
                "theme": user["theme"]
            }
        }
    finally:
        conn.close()

@router.post("/demo")
def demo_login():
    demo_user = seed.ensure_demo_user()
    token = create_access_token({"sub": str(demo_user["id"])})
    log_activity(demo_user["id"], "demo_login", "Demo Session Started", "Demo student session loaded")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": demo_user
    }

@router.get("/me")
def get_current_profile(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/profile")
def update_profile(update_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    fields = []
    values = []
    for field, val in update_data.model_dump(exclude_unset=True).items():
        if val is not None:
            fields.append(f"{field} = ?")
            values.append(val)

    if not fields:
        return current_user

    values.append(current_user["id"])
    with get_db_context() as conn:
        conn.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", tuple(values))
        log_activity(current_user["id"], "profile_update", "Profile updated", "Saved updated personal academic preferences", conn=conn)

    conn = get_db()
    try:
        user = conn.execute("SELECT id, name, email, university, major, target_attendance, weekly_study_goal, theme FROM users WHERE id = ?", (current_user["id"],)).fetchone()
        return dict(user)
    finally:
        conn.close()
