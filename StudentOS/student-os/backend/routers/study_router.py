from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta
from typing import Optional
from database import get_db, get_db_context, log_activity
from auth import get_current_user
from models import StudySessionCreate, StudySessionUpdate

router = APIRouter(prefix="/api/study-sessions", tags=["Study Planner"])

@router.get("")
def list_study_sessions(
    date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    try:
        query = """
            SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.color as subject_color
            FROM study_sessions s
            LEFT JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.user_id = ?
        """
        params = [current_user["id"]]

        if date:
            query += " AND s.session_date = ?"
            params.append(date)
        elif start_date and end_date:
            query += " AND s.session_date BETWEEN ? AND ?"
            params.extend([start_date, end_date])

        query += " ORDER BY s.session_date ASC, s.start_time ASC"

        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        sessions = [dict(r) for r in cursor.fetchall()]
        return sessions
    finally:
        conn.close()

@router.get("/summary")
def get_study_summary(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        start_of_week = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
        end_of_week = (now + timedelta(days=6 - now.weekday())).strftime("%Y-%m-%d")

        cursor.execute("""
            SELECT COALESCE(SUM(duration_minutes), 0) as mins_total,
                   COALESCE(SUM(CASE WHEN completed = 1 THEN duration_minutes ELSE 0 END), 0) as mins_completed,
                   COUNT(*) as total_sessions
            FROM study_sessions
            WHERE user_id = ? AND session_date = ?
        """, (current_user["id"], today_str))
        today_row = cursor.fetchone()

        cursor.execute("""
            SELECT COALESCE(SUM(duration_minutes), 0) as mins_total,
                   COALESCE(SUM(CASE WHEN completed = 1 THEN duration_minutes ELSE 0 END), 0) as mins_completed,
                   COUNT(*) as total_sessions
            FROM study_sessions
            WHERE user_id = ? AND session_date BETWEEN ? AND ?
        """, (current_user["id"], start_of_week, end_of_week))
        week_row = cursor.fetchone()

        daily_breakdown = []
        for i in range(7):
            day_dt = now - timedelta(days=now.weekday()) + timedelta(days=i)
            day_str = day_dt.strftime("%Y-%m-%d")
            day_name = day_dt.strftime("%a")
            cursor.execute("""
                SELECT COALESCE(SUM(CASE WHEN completed = 1 THEN duration_minutes ELSE 0 END), 0) as completed_mins,
                       COALESCE(SUM(duration_minutes), 0) as planned_mins
                FROM study_sessions
                WHERE user_id = ? AND session_date = ?
            """, (current_user["id"], day_str))
            d_row = cursor.fetchone()
            daily_breakdown.append({
                "date": day_str,
                "day": day_name,
                "completed_hours": round(d_row["completed_mins"] / 60.0, 1),
                "planned_hours": round(d_row["planned_mins"] / 60.0, 1),
                "is_today": day_str == today_str
            })

        return {
            "today_hours": round(today_row["mins_completed"] / 60.0, 1),
            "today_planned_hours": round(today_row["mins_total"] / 60.0, 1),
            "today_sessions_count": today_row["total_sessions"],
            "week_hours": round(week_row["mins_completed"] / 60.0, 1),
            "week_planned_hours": round(week_row["mins_total"] / 60.0, 1),
            "week_goal": current_user["weekly_study_goal"],
            "daily_breakdown": daily_breakdown
        }
    finally:
        conn.close()

@router.post("")
def create_study_session(payload: StudySessionCreate, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO study_sessions (
                user_id, subject_id, title, session_date, start_time, duration_minutes, notes, completed
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"],
            payload.subject_id,
            payload.title,
            payload.session_date,
            payload.start_time or "10:00",
            payload.duration_minutes or 60,
            payload.notes or "",
            payload.completed or 0
        ))
        sess_id = cursor.lastrowid
        log_activity(current_user["id"], "study_scheduled", f"Scheduled: {payload.title}", f"{payload.session_date} for {payload.duration_minutes} min", conn=conn)

    conn = get_db()
    try:
        row = conn.execute("""
            SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.color as subject_color
            FROM study_sessions s
            LEFT JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = ? AND s.user_id = ?
        """, (sess_id, current_user["id"])).fetchone()
        return dict(row)
    finally:
        conn.close()

@router.put("/{session_id}")
def update_study_session(session_id: int, payload: StudySessionUpdate, current_user: dict = Depends(get_current_user)):
    fields = []
    values = []
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            fields.append(f"{field} = ?")
            values.append(val)

    if not fields:
        conn = get_db()
        try:
            row = conn.execute("SELECT * FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, current_user["id"])).fetchone()
            return dict(row)
        finally:
            conn.close()

    values.extend([session_id, current_user["id"]])
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE study_sessions SET {', '.join(fields)} WHERE id = ? AND user_id = ?", tuple(values))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Study session not found")

    conn = get_db()
    try:
        row = conn.execute("""
            SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.color as subject_color
            FROM study_sessions s
            LEFT JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = ? AND s.user_id = ?
        """, (session_id, current_user["id"])).fetchone()
        return dict(row)
    finally:
        conn.close()

@router.patch("/{session_id}/toggle")
def toggle_session(session_id: int, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        row = cursor.execute("SELECT completed, title, duration_minutes FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        new_status = 0 if row["completed"] == 1 else 1
        cursor.execute("UPDATE study_sessions SET completed = ? WHERE id = ? AND user_id = ?", (new_status, session_id, current_user["id"]))
        action_name = "Completed study session" if new_status == 1 else "Reopened study session"
        log_activity(current_user["id"], "study_completed" if new_status == 1 else "study_reopened", action_name, f"{row['title']} ({row['duration_minutes']} min)", conn=conn)

    conn = get_db()
    try:
        row = conn.execute("""
            SELECT s.*, sub.name as subject_name, sub.code as subject_code, sub.color as subject_color
            FROM study_sessions s
            LEFT JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = ? AND s.user_id = ?
        """, (session_id, current_user["id"])).fetchone()
        return dict(row)
    finally:
        conn.close()

@router.delete("/{session_id}")
def delete_study_session(session_id: int, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        row = cursor.execute("SELECT title FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        cursor.execute("DELETE FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, current_user["id"]))
        log_activity(current_user["id"], "study_deleted", f"Cancelled session: {row['title']}", conn=conn)
    return {"message": "Study session deleted successfully"}
