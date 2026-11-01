from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from typing import Optional
from database import get_db, get_db_context, log_activity
from auth import get_current_user
from models import AssignmentCreate, AssignmentUpdate

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

def enrich_assignment(item: dict):
    due = item.get("due_date", "")
    is_completed = item.get("status") == "completed"
    
    is_overdue = False
    due_soon = False
    try:
        if "T" in due:
            dt_due = datetime.fromisoformat(due)
        else:
            dt_due = datetime.strptime(due[:10], "%Y-%m-%d")
        
        diff_hours = (dt_due - datetime.now()).total_seconds() / 3600.0
        if not is_completed:
            if diff_hours < 0:
                is_overdue = True
            elif diff_hours <= 48:
                due_soon = True
    except Exception:
        pass

    item["is_overdue"] = is_overdue
    item["due_soon"] = due_soon
    return item

@router.get("")
def list_assignments(
    subject_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    conn = get_db()
    try:
        query = """
            SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.user_id = ?
        """
        params = [current_user["id"]]

        if subject_id:
            query += " AND a.subject_id = ?"
            params.append(subject_id)
        if status:
            query += " AND a.status = ?"
            params.append(status)
        if priority:
            query += " AND a.priority = ?"
            params.append(priority)
        if search:
            query += " AND (a.title LIKE ? OR a.description LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term])

        query += " ORDER BY a.status = 'completed' ASC, a.due_date ASC"

        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
        rows = [enrich_assignment(dict(r)) for r in cursor.fetchall()]
        return rows
    finally:
        conn.close()

@router.post("")
def create_assignment(payload: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        sub = cursor.execute("SELECT name FROM subjects WHERE id = ? AND user_id = ?", (payload.subject_id, current_user["id"])).fetchone()
        if not sub:
            raise HTTPException(status_code=400, detail="Invalid subject ID for this student")

        cursor.execute("""
            INSERT INTO assignments (
                user_id, subject_id, title, description, due_date, priority, status, score, max_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user["id"],
            payload.subject_id,
            payload.title,
            payload.description or "",
            payload.due_date,
            payload.priority or "medium",
            payload.status or "pending",
            payload.score,
            payload.max_score or 100.0
        ))
        assign_id = cursor.lastrowid
        log_activity(current_user["id"], "assignment_created", f"Added assignment: {payload.title}", f"Due: {payload.due_date} ({sub['name']})", conn=conn)

    conn = get_db()
    try:
        row = conn.execute("""
            SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.id = ? AND a.user_id = ?
        """, (assign_id, current_user["id"])).fetchone()
        return enrich_assignment(dict(row))
    finally:
        conn.close()

@router.get("/{assignment_id}")
def get_assignment(assignment_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("""
            SELECT a.*, s.name as subject_name, s.code as subject_code, s.color as subject_color
            FROM assignments a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.id = ? AND a.user_id = ?
        """, (assignment_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return enrich_assignment(dict(row))
    finally:
        conn.close()

@router.put("/{assignment_id}")
def update_assignment(assignment_id: int, payload: AssignmentUpdate, current_user: dict = Depends(get_current_user)):
    fields = []
    values = []
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            fields.append(f"{field} = ?")
            values.append(val)

    if not fields:
        return get_assignment(assignment_id, current_user)

    fields.append("updated_at = datetime('now')")
    values.extend([assignment_id, current_user["id"]])

    with get_db_context() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE assignments SET {', '.join(fields)} WHERE id = ? AND user_id = ?", tuple(values))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        log_activity(current_user["id"], "assignment_updated", "Updated assignment", f"Assignment ID: {assignment_id}", conn=conn)

    return get_assignment(assignment_id, current_user)

@router.patch("/{assignment_id}/toggle-status")
def toggle_status(assignment_id: int, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        row = cursor.execute("SELECT status, title FROM assignments WHERE id = ? AND user_id = ?", (assignment_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        current_status = row["status"]
        if current_status == "pending":
            next_status = "in_progress"
        elif current_status == "in_progress":
            next_status = "completed"
        else:
            next_status = "pending"

        cursor.execute("UPDATE assignments SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", (next_status, assignment_id, current_user["id"]))
        log_activity(current_user["id"], "assignment_status", f"Changed status to {next_status}", row["title"], conn=conn)

    return get_assignment(assignment_id, current_user)

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, current_user: dict = Depends(get_current_user)):
    with get_db_context() as conn:
        cursor = conn.cursor()
        row = cursor.execute("SELECT title FROM assignments WHERE id = ? AND user_id = ?", (assignment_id, current_user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")
        cursor.execute("DELETE FROM assignments WHERE id = ? AND user_id = ?", (assignment_id, current_user["id"]))
        log_activity(current_user["id"], "assignment_deleted", f"Deleted assignment: {row['title']}", conn=conn)
    return {"message": "Assignment deleted successfully"}
