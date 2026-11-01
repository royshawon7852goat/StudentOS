from fastapi import APIRouter, Depends, Response
from datetime import datetime
import json
import csv
import io
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/export", tags=["Data Export"])

@router.get("/json")
def export_all_json(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    try:
        cursor = conn.cursor()
        subjects = [dict(r) for r in cursor.execute("SELECT * FROM subjects WHERE user_id = ?", (user_id,)).fetchall()]
        logs = [dict(r) for r in cursor.execute("SELECT * FROM attendance_logs WHERE user_id = ?", (user_id,)).fetchall()]
        assignments = [dict(r) for r in cursor.execute("SELECT * FROM assignments WHERE user_id = ?", (user_id,)).fetchall()]
        study = [dict(r) for r in cursor.execute("SELECT * FROM study_sessions WHERE user_id = ?", (user_id,)).fetchall()]
        exams = [dict(r) for r in cursor.execute("SELECT * FROM examinations WHERE user_id = ?", (user_id,)).fetchall()]

        data = {
            "exported_at": datetime.now().isoformat(),
            "student_profile": current_user,
            "subjects": subjects,
            "attendance_logs": logs,
            "assignments": assignments,
            "study_sessions": study,
            "examinations": exams
        }

        json_bytes = json.dumps(data, indent=2).encode("utf-8")
        filename = f"StudentOS_Backup_{current_user['name'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.json"
        return Response(
            content=json_bytes,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    finally:
        conn.close()

@router.get("/csv/attendance")
def export_attendance_csv(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT l.date, s.code, s.name, l.status, l.notes
            FROM attendance_logs l
            JOIN subjects s ON l.subject_id = s.id
            WHERE l.user_id = ?
            ORDER BY l.date DESC
        """, (user_id,))
        rows = cursor.fetchall()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Subject Code", "Subject Name", "Status", "Notes"])
        for r in rows:
            writer.writerow([r["date"], r["code"], r["name"], r["status"], r["notes"]])

        csv_content = output.getvalue().encode("utf-8")
        filename = f"StudentOS_Attendance_{datetime.now().strftime('%Y%m%d')}.csv"
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    finally:
        conn.close()
