from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from database import get_db
from auth import get_current_user
from routers.subjects_router import compute_attendance_stats
from routers.assignments_router import enrich_assignment
from routers.exams_router import enrich_exam

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard_data(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    # Time of day greeting
    hour = now.hour
    if hour < 12:
        greeting = "Good morning"
    elif hour < 17:
        greeting = "Good afternoon"
    else:
        greeting = "Good evening"

    conn = get_db()
    try:
        cursor = conn.cursor()

        # 1. Subjects and overall attendance
        cursor.execute("SELECT * FROM subjects WHERE user_id = ? ORDER BY name ASC", (user_id,))
        subject_rows = cursor.fetchall()
        total_subjects = len(subject_rows)
        total_conducted = sum(r["classes_conducted"] for r in subject_rows)
        total_attended = sum(r["classes_attended"] for r in subject_rows)
        overall_attendance_pct = round((total_attended / total_conducted * 100.0), 1) if total_conducted > 0 else 100.0

        subjects_summary = []
        critical_subjects_count = 0
        for r in subject_rows:
            s_dict = dict(r)
            stats = compute_attendance_stats(s_dict["classes_attended"], s_dict["classes_conducted"], s_dict["target_percentage"])
            if stats["status"] == "critical":
                critical_subjects_count += 1
            s_dict.update(stats)
            subjects_summary.append(s_dict)

        # 2. Assignments
        cursor.execute("""
            SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.user_id = ?
            ORDER BY a.due_date ASC
        """, (user_id,))
        assignment_rows = [enrich_assignment(dict(r)) for r in cursor.fetchall()]
        pending_assignments = [a for a in assignment_rows if a["status"] != "completed"]
        overdue_assignments = [a for a in pending_assignments if a.get("is_overdue")]
        completed_assignments_count = len([a for a in assignment_rows if a["status"] == "completed"])

        # 3. Upcoming Exams
        cursor.execute("""
            SELECT e.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM examinations e
            JOIN subjects s ON e.subject_id = s.id
            WHERE e.user_id = ?
            ORDER BY e.exam_date ASC
        """, (user_id,))
        exam_rows = [enrich_exam(dict(r)) for r in cursor.fetchall()]
        upcoming_exams = [e for e in exam_rows if e.get("is_upcoming")]
        next_exam = upcoming_exams[0] if upcoming_exams else None

        # 4. Today's Study Sessions
        cursor.execute("""
            SELECT ss.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM study_sessions ss
            LEFT JOIN subjects s ON ss.subject_id = s.id
            WHERE ss.user_id = ? AND ss.session_date = ?
            ORDER BY ss.start_time ASC
        """, (user_id, today_str))
        today_sessions = [dict(r) for r in cursor.fetchall()]
        today_studied_mins = sum(s["duration_minutes"] for s in today_sessions if s["completed"] == 1)
        today_planned_mins = sum(s["duration_minutes"] for s in today_sessions)

        # 5. Recent Activities
        cursor.execute("""
            SELECT * FROM activities
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 8
        """, (user_id,))
        recent_activities = [dict(r) for r in cursor.fetchall()]

        # 6. Overall Academic Progress Index (0 - 100)
        # 40% attendance score, 30% assignment completion, 30% study activity
        att_score = min(100.0, (overall_attendance_pct / max(1.0, current_user["target_attendance"])) * 100.0)
        assign_score = (completed_assignments_count / max(1, len(assignment_rows))) * 100.0 if assignment_rows else 85.0
        academic_score = round((att_score * 0.45) + (assign_score * 0.35) + 20.0, 1)

        return {
            "greeting": greeting,
            "user_name": current_user["name"],
            "university": current_user["university"],
            "major": current_user["major"],
            "current_date": now.strftime("%A, %B %d, %Y"),
            "current_time": now.strftime("%I:%M %p"),
            "stats": {
                "total_subjects": total_subjects,
                "overall_attendance": overall_attendance_pct,
                "target_attendance": current_user["target_attendance"],
                "total_classes_conducted": total_conducted,
                "total_classes_attended": total_attended,
                "critical_subjects_count": critical_subjects_count,
                "pending_assignments_count": len(pending_assignments),
                "overdue_assignments_count": len(overdue_assignments),
                "completed_assignments_count": completed_assignments_count,
                "upcoming_exams_count": len(upcoming_exams),
                "today_study_hours": round(today_studied_mins / 60.0, 1),
                "today_planned_hours": round(today_planned_mins / 60.0, 1),
                "academic_score": min(100.0, academic_score)
            },
            "next_exam": next_exam,
            "today_sessions": today_sessions,
            "priority_assignments": pending_assignments[:5],
            "subjects": subjects_summary,
            "recent_activities": recent_activities
        }
    finally:
        conn.close()
