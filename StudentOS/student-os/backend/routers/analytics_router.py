from fastapi import APIRouter, Depends
from datetime import datetime, timedelta
from database import get_db
from auth import get_current_user
from routers.subjects_router import compute_attendance_stats

router = APIRouter(prefix="/api/analytics", tags=["Performance Analytics"])

@router.get("")
def get_analytics(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    conn = get_db()
    try:
        cursor = conn.cursor()

        # 1. Subject-wise attendance
        cursor.execute("SELECT * FROM subjects WHERE user_id = ? ORDER BY name ASC", (user_id,))
        subject_rows = cursor.fetchall()
        subject_charts = []
        needs_attention = None
        strongest_subject = None
        min_pct = 999.0
        max_pct = -1.0

        for r in subject_rows:
            stats = compute_attendance_stats(r["classes_attended"], r["classes_conducted"], r["target_percentage"])
            pct = stats["percentage"]
            item = {
                "id": r["id"],
                "name": r["name"],
                "code": r["code"],
                "color": r["color"],
                "attended": r["classes_attended"],
                "conducted": r["classes_conducted"],
                "percentage": pct,
                "target": r["target_percentage"],
                "status": stats["status"],
                "can_miss": stats["can_miss"],
                "must_attend": stats["must_attend"]
            }
            subject_charts.append(item)

            if pct < min_pct:
                min_pct = pct
                needs_attention = item
            if pct > max_pct:
                max_pct = pct
                strongest_subject = item

        # 2. Assignment distribution
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM assignments
            WHERE user_id = ?
            GROUP BY status
        """, (user_id,))
        assign_counts = {r["status"]: r["count"] for r in cursor.fetchall()}
        
        # Check overdue count
        now_str = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM assignments
            WHERE user_id = ? AND status != 'completed' AND due_date < ?
        """, (user_id, now_str))
        overdue_count = cursor.fetchone()["count"]

        assignment_distribution = [
            {"name": "Completed", "value": assign_counts.get("completed", 0), "color": "#10B981"},
            {"name": "In Progress", "value": assign_counts.get("in_progress", 0), "color": "#3B82F6"},
            {"name": "Pending", "value": assign_counts.get("pending", 0), "color": "#F59E0B"},
            {"name": "Overdue", "value": overdue_count, "color": "#EF4444"}
        ]

        # 3. Weekly study hours (Mon - Sun)
        now = datetime.now()
        start_of_week = now - timedelta(days=now.weekday())
        weekly_study = []
        total_week_hours = 0.0

        for i in range(7):
            d = start_of_week + timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            day_label = d.strftime("%a")
            cursor.execute("""
                SELECT COALESCE(SUM(CASE WHEN completed = 1 THEN duration_minutes ELSE 0 END), 0) as completed_mins,
                       COALESCE(SUM(duration_minutes), 0) as total_mins
                FROM study_sessions
                WHERE user_id = ? AND session_date = ?
            """, (user_id, d_str))
            row = cursor.fetchone()
            comp_hrs = round(row["completed_mins"] / 60.0, 1)
            total_week_hours += comp_hrs
            weekly_study.append({
                "day": day_label,
                "date": d_str,
                "hours": comp_hrs,
                "planned": round(row["total_mins"] / 60.0, 1)
            })

        # 4. Attendance Trends (last 14 days)
        attendance_trend = []
        for i in range(13, -1, -1):
            d = now - timedelta(days=i)
            d_str = d.strftime("%Y-%m-%d")
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended_count,
                    SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_count
                FROM attendance_logs
                WHERE user_id = ? AND date = ?
            """, (user_id, d_str))
            log_row = cursor.fetchone()
            attendance_trend.append({
                "date": d.strftime("%b %d"),
                "attended": log_row["attended_count"] or 0,
                "missed": log_row["missed_count"] or 0
            })

        # 5. Study streak calculation
        cursor.execute("""
            SELECT DISTINCT session_date
            FROM study_sessions
            WHERE user_id = ? AND completed = 1
            ORDER BY session_date DESC
        """, (user_id,))
        active_dates = [r["session_date"] for r in cursor.fetchall()]
        streak = 0
        check_date = now.date()
        date_set = set(active_dates)
        
        # Check if today has study, else check yesterday
        if check_date.strftime("%Y-%m-%d") not in date_set:
            check_date = check_date - timedelta(days=1)

        while check_date.strftime("%Y-%m-%d") in date_set:
            streak += 1
            check_date -= timedelta(days=1)

        # 6. Overall Summary Metrics
        return {
            "subject_charts": subject_charts,
            "assignment_distribution": assignment_distribution,
            "weekly_study": weekly_study,
            "attendance_trend": attendance_trend,
            "insights": {
                "strongest_subject": strongest_subject,
                "needs_attention": needs_attention,
                "total_week_hours": round(total_week_hours, 1),
                "weekly_goal": current_user["weekly_study_goal"],
                "study_streak_days": streak,
                "target_attendance": current_user["target_attendance"]
            }
        }
    finally:
        conn.close()
