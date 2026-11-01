from fastapi import APIRouter, HTTPException, Depends
import math
from datetime import datetime
from database import get_db, get_db_context, log_activity
from auth import get_current_user
from models import SubjectCreate, SubjectUpdate, QuickAttendance

router = APIRouter(prefix="/api/subjects", tags=["Subjects & Attendance"])

def compute_attendance_stats(attended: int, conducted: int, target_pct: float):
    if conducted <= 0:
        pct = 100.0
        can_miss = 0
        must_attend = 0
        status = "on_track"
    else:
        pct = round((attended / conducted) * 100.0, 1)
        target = target_pct / 100.0
        if target >= 1.0:
            target = 0.9999

        if pct >= target_pct:
            status = "on_track"
            must_attend = 0
            can_miss = max(0, math.floor((attended / target) - conducted))
        else:
            status = "critical"
            can_miss = 0
            numerator = (target * conducted) - attended
            denominator = 1.0 - target
            must_attend = max(1, math.ceil(numerator / denominator)) if denominator > 0 else 1

    return {
        "percentage": pct,
        "status": status,
        "can_miss": can_miss,
        "must_attend": must_attend
    }

@router.get("")
def list_subjects(current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM subjects
            WHERE user_id = ?
            ORDER BY name ASC
        """, (current_user["id"],))
        rows = cursor.fetchall()
        result = []
        for row in rows:
            sub = dict(row)
            stats = compute_attendance_stats(sub["classes_attended"], sub["classes_conducted"], sub["target_percentage"])
            sub.update(stats)
            result.append(sub)
        return result
    finally:
        conn.close()

@router.post("")
def create_subject(payload: SubjectCreate, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO subjects (
                user_id, name, code, instructor, color, target_percentage,
                classes_conducted, classes_attended, room, credits, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"],
            payload.name,
            payload.code,
            payload.instructor or "",
            payload.color or "#3B82F6",
            payload.target_percentage if payload.target_percentage is not None else current_user["target_attendance"],
            max(0, payload.classes_conducted or 0),
            max(0, payload.classes_attended or 0),
            payload.room or "",
            payload.credits or 3,
            payload.notes or ""
        ))
        sub_id = cursor.lastrowid
        log_activity(current_user["id"], "subject_added", f"Added subject {payload.name}", f"Code: {payload.code}", conn=conn)

    conn = get_db()
    try:
        sub = dict(conn.execute("SELECT * FROM subjects WHERE id = ? AND user_id = ?", (sub_id, current_user["id"])).fetchone())
        stats = compute_attendance_stats(sub["classes_attended"], sub["classes_conducted"], sub["target_percentage"])
        sub.update(stats)
        return sub
    finally:
        conn.close()

@router.get("/{subject_id}")
def get_subject_detail(subject_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM subjects WHERE id = ? AND user_id = ?", (subject_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Subject not found")

        sub = dict(row)
        stats = compute_attendance_stats(sub["classes_attended"], sub["classes_conducted"], sub["target_percentage"])
        sub.update(stats)

        logs = [dict(r) for r in conn.execute("""
            SELECT * FROM attendance_logs WHERE subject_id = ? AND user_id = ? ORDER BY date DESC, created_at DESC LIMIT 30
        """, (subject_id, current_user["id"])).fetchall()]

        assignments = [dict(r) for r in conn.execute("""
            SELECT * FROM assignments WHERE subject_id = ? AND user_id = ? ORDER BY due_date ASC
        """, (subject_id, current_user["id"])).fetchall()]

        exams = [dict(r) for r in conn.execute("""
            SELECT * FROM examinations WHERE subject_id = ? AND user_id = ? ORDER BY exam_date ASC
        """, (subject_id, current_user["id"])).fetchall()]

        sub["logs"] = logs
        sub["assignments"] = assignments
        sub["exams"] = exams
        return sub
    finally:
        conn.close()

@router.put("/{subject_id}")
def update_subject(subject_id: int, payload: SubjectUpdate, current_user: dict = Depends(get_current_user)):
    fields = []
    values = []
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            fields.append(f"{field} = ?")
            values.append(val)

    if not fields:
        return get_subject_detail(subject_id, current_user)

    fields.append("updated_at = datetime('now')")
    values.extend([subject_id, current_user["id"]])

    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE subjects SET {', '.join(fields)} WHERE id = ? AND user_id = ?", tuple(values))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Subject not found")
        log_activity(current_user["id"], "subject_updated", f"Updated subject details", f"Subject ID: {subject_id}", conn=conn)

    return get_subject_detail(subject_id, current_user)

@router.delete("/{subject_id}")
def delete_subject(subject_id: int, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        sub = cursor.execute("SELECT name FROM subjects WHERE id = ? AND user_id = ?", (subject_id, current_user["id"])).fetchone()
        if not sub:
            raise HTTPException(status_code=404, detail="Subject not found")
        cursor.execute("DELETE FROM subjects WHERE id = ? AND user_id = ?", (subject_id, current_user["id"]))
        log_activity(current_user["id"], "subject_deleted", f"Removed subject {sub['name']}", conn=conn)
    return {"message": "Subject deleted successfully"}

@router.post("/{subject_id}/quick-attendance")
def quick_attendance(subject_id: int, payload: QuickAttendance, current_user: dict = Depends(get_current_user)):
    if payload.action not in ("attended", "missed"):
        raise HTTPException(status_code=400, detail="Action must be 'attended' or 'missed'")

    today_str = datetime.now().strftime("%Y-%m-%d")
    with get_db_context() as conn:
        cursor = conn.cursor()
        sub = cursor.execute("SELECT * FROM subjects WHERE id = ? AND user_id = ?", (subject_id, current_user["id"])).fetchone()
        if not sub:
            raise HTTPException(status_code=404, detail="Subject not found")

        if payload.action == "attended":
            new_conducted = sub["classes_conducted"] + 1
            new_attended = sub["classes_attended"] + 1
            log_status = "attended"
            log_title = f"Attended {sub['name']}"
        else:
            new_conducted = sub["classes_conducted"] + 1
            new_attended = sub["classes_attended"]
            log_status = "missed"
            log_title = f"Missed {sub['name']}"

        cursor.execute("""
            UPDATE subjects
            SET classes_conducted = ?, classes_attended = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
        """, (new_conducted, new_attended, subject_id, current_user["id"]))

        cursor.execute("""
            INSERT INTO attendance_logs (user_id, subject_id, date, status, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (current_user["id"], subject_id, today_str, log_status, f"Marked via quick action"))

        log_activity(current_user["id"], "attendance_marked", log_title, f"Class record: {new_attended}/{new_conducted}", conn=conn)

    return get_subject_detail(subject_id, current_user)
