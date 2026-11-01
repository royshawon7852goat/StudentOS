from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from database import get_db, get_db_context, log_activity
from auth import get_current_user
from models import ExamCreate, ExamUpdate

router = APIRouter(prefix="/api/examinations", tags=["Examinations"])

def enrich_exam(item: dict):
    exam_date_str = item.get("exam_date", "")
    now = datetime.now()
    days_left = 0
    hours_left = 0
    mins_left = 0
    total_seconds = 0
    is_upcoming = True

    try:
        if "T" in exam_date_str:
            dt_exam = datetime.fromisoformat(exam_date_str)
        else:
            dt_exam = datetime.strptime(exam_date_str[:16], "%Y-%m-%d %H:%M")

        delta = dt_exam - now
        total_seconds = int(delta.total_seconds())
        if total_seconds > 0:
            days_left = delta.days
            hours_left = (total_seconds % 86400) // 3600
            mins_left = (total_seconds % 3600) // 60
            is_upcoming = True
        else:
            is_upcoming = False
    except Exception:
        pass

    item["days_left"] = max(0, days_left)
    item["hours_left"] = max(0, hours_left)
    item["mins_left"] = max(0, mins_left)
    item["total_seconds_left"] = max(0, total_seconds)
    item["is_upcoming"] = is_upcoming
    return item

@router.get("")
def list_examinations(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT e.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM examinations e
            JOIN subjects s ON e.subject_id = s.id
            WHERE e.user_id = ?
            ORDER BY e.exam_date ASC
        """, (current_user["id"],))
        rows = [enrich_exam(dict(r)) for r in cursor.fetchall()]
        return rows
    finally:
        conn.close()

@router.post("")
def create_examination(payload: ExamCreate, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        sub = cursor.execute("SELECT name FROM subjects WHERE id = ? AND user_id = ?", (payload.subject_id, current_user["id"])).fetchone()
        if not sub:
            raise HTTPException(status_code=400, detail="Invalid subject ID for this student")

        cursor.execute("""
            INSERT INTO examinations (
                user_id, subject_id, title, exam_type, exam_date, room, weightage, syllabus, target_score, achieved_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"],
            payload.subject_id,
            payload.title,
            payload.exam_type or "final",
            payload.exam_date,
            payload.room or "",
            payload.weightage or 20.0,
            payload.syllabus or "",
            payload.target_score or 90.0,
            payload.achieved_score
        ))
        exam_id = cursor.lastrowid
        log_activity(current_user["id"], "exam_scheduled", f"Exam scheduled: {payload.title}", f"{payload.exam_date} ({sub['name']})", conn=conn)

    conn = get_db()
    try:
        row = conn.execute("""
            SELECT e.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM examinations e
            JOIN subjects s ON e.subject_id = s.id
            WHERE e.id = ? AND e.user_id = ?
        """, (exam_id, current_user["id"])).fetchone()
        return enrich_exam(dict(row))
    finally:
        conn.close()

@router.get("/{exam_id}")
def get_examination(exam_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("""
            SELECT e.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM examinations e
            JOIN subjects s ON e.subject_id = s.id
            WHERE e.id = ? AND e.user_id = ?
        """, (exam_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Exam not found")
        return enrich_exam(dict(row))
    finally:
        conn.close()

@router.put("/{exam_id}")
def update_examination(exam_id: int, payload: ExamUpdate, current_user: dict = Depends(get_current_user)):
    fields = []
    values = []
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            fields.append(f"{field} = ?")
            values.append(val)

    if not fields:
        return get_examination(exam_id, current_user)

    values.extend([exam_id, current_user["id"]])
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE examinations SET {', '.join(fields)} WHERE id = ? AND user_id = ?", tuple(values))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Exam not found")
        log_activity(current_user["id"], "exam_updated", "Updated exam details", f"Exam ID: {exam_id}", conn=conn)

    return get_examination(exam_id, current_user)

@router.delete("/{exam_id}")
def delete_examination(exam_id: int, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        row = cursor.execute("SELECT title FROM examinations WHERE id = ? AND user_id = ?", (exam_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Exam not found")
        cursor.execute("DELETE FROM examinations WHERE id = ? AND user_id = ?", (exam_id, current_user["id"]))
        log_activity(current_user["id"], "exam_deleted", f"Removed exam: {row['title']}", conn=conn)
    return {"message": "Exam deleted successfully"}
