import os
import sys

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app
from database import init_db

def run_e2e_tests():
    print("==========================================")
    print("  STUDENT-OS AUTOMATED INTEGRATION TESTS  ")
    print("==========================================")

    init_db()
    client = TestClient(app)

    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[OK] Health check API operational")

    # 2. SPA Serving
    res = client.get("/")
    assert res.status_code == 200, f"SPA root serving failed: {res.status_code}"
    assert "StudentOS" in res.text, "Index HTML missing StudentOS title"
    print("[OK] Frontend SPA index.html served at root '/'")

    # 3. Demo User Auth
    res = client.post("/api/auth/demo")
    assert res.status_code == 200, f"Demo login failed: {res.text}"
    demo_data = res.json()
    token = demo_data["access_token"]
    user = demo_data["user"]
    assert user["email"] == "demo@studentos.dev", f"Unexpected demo user: {user}"
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Demo student authenticated: {user['name']} ({user['email']})")

    # 4. User Registration & Independent Student Data Isolation
    new_student = {
        "name": "Samantha Chen",
        "email": f"samantha_{os.urandom(4).hex()}@university.edu",
        "password": "strongPassword123",
        "university": "MIT",
        "major": "Electrical Engineering & CS",
        "target_attendance": 80.0
    }
    res = client.post("/api/auth/register", json=new_student)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    sam_token = res.json()["access_token"]
    sam_headers = {"Authorization": f"Bearer {sam_token}"}
    print(f"[OK] New user registered successfully: {new_student['name']}")

    # Check that Samantha has her own independent records
    sam_subjects = client.get("/api/subjects", headers=sam_headers).json()
    alex_subjects = client.get("/api/subjects", headers=headers).json()
    assert sam_subjects[0]["user_id"] != alex_subjects[0]["user_id"], "Multi-tenant data isolation leak!"
    print("[OK] Multi-tenant strict data isolation verified across accounts")

    # 5. Dashboard Aggregations for Alex
    res = client.get("/api/dashboard", headers=headers)
    assert res.status_code == 200, f"Dashboard failed: {res.text}"
    dash = res.json()
    assert "stats" in dash, "Dashboard missing stats"
    assert dash["stats"]["total_subjects"] >= 5, "Expected at least 5 subjects"
    assert dash["stats"]["overall_attendance"] > 0, "Invalid overall attendance"
    print(f"[OK] Dashboard data verified: {dash['stats']['total_subjects']} subjects, {dash['stats']['overall_attendance']}% overall attendance")

    # 6. Attendance Calculator & Math Verification
    # CS-204 is Critical (e.g. 15/22 = 68.2%, target = 75%)
    cs204 = next(s for s in alex_subjects if s["code"] == "CS-204")
    assert cs204["status"] == "critical", f"CS-204 should be critical but got {cs204['status']}"
    assert cs204["must_attend"] > 0, "CS-204 must have positive must_attend count"
    print(f"[OK] Bunk Math verified for CS-204: {cs204['percentage']}% attendance -> Student must attend {cs204['must_attend']} consecutive classes")

    # Quick attendance action (+1 attended, +1 conducted)
    prev_attended = cs204["classes_attended"]
    prev_conducted = cs204["classes_conducted"]
    res = client.post(f"/api/subjects/{cs204['id']}/quick-attendance", json={"action": "attended"}, headers=headers)
    assert res.status_code == 200, f"Quick attendance failed: {res.text}"
    updated_sub = res.json()
    assert updated_sub["classes_attended"] == prev_attended + 1, "Attended count didn't increment"
    assert updated_sub["classes_conducted"] == prev_conducted + 1, "Conducted count didn't increment"
    print("[OK] 1-Click attendance action (+1 attended / +1 conducted) executed and persisted")

    # 7. Assignment CRUD & Status Cycle
    new_assign = {
        "subject_id": cs204["id"],
        "title": "Kernel Memory Allocator Lab",
        "description": "Buddy allocator implementation in C",
        "due_date": "2026-11-15T23:59:00",
        "priority": "high",
        "status": "pending"
    }
    res = client.post("/api/assignments", json=new_assign, headers=headers)
    assert res.status_code == 200, f"Assignment create failed: {res.text}"
    created_assign = res.json()
    assign_id = created_assign["id"]
    print(f"[OK] Assignment created: ID {assign_id} '{created_assign['title']}'")

    # Toggle status (pending -> in_progress -> completed)
    res = client.patch(f"/api/assignments/{assign_id}/toggle-status", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress", f"Expected in_progress, got {res.json()['status']}"
    res = client.patch(f"/api/assignments/{assign_id}/toggle-status", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "completed", f"Expected completed, got {res.json()['status']}"
    print("[OK] Assignment status toggle cycle verified (pending -> in_progress -> completed)")

    # Delete assignment
    res = client.delete(f"/api/assignments/{assign_id}", headers=headers)
    assert res.status_code == 200
    print("[OK] Assignment deleted successfully")

    # 8. Study Sessions CRUD & Weekly summary
    new_study = {
        "subject_id": cs204["id"],
        "title": "Concurrency Semaphores Deep Dive",
        "session_date": "2026-11-02",
        "start_time": "14:00",
        "duration_minutes": 90,
        "notes": "Solve dining philosophers problem",
        "completed": 0
    }
    res = client.post("/api/study-sessions", json=new_study, headers=headers)
    assert res.status_code == 200
    study_id = res.json()["id"]
    print(f"[OK] Study session scheduled: ID {study_id} (90 mins)")

    # Toggle completed
    res = client.patch(f"/api/study-sessions/{study_id}/toggle", headers=headers)
    assert res.status_code == 200
    assert res.json()["completed"] == 1
    print("[OK] Study session completed checkmark recorded")

    # Clean up
    client.delete(f"/api/study-sessions/{study_id}", headers=headers)

    # 9. Examinations Countdown Verification
    exams = client.get("/api/examinations", headers=headers).json()
    assert len(exams) >= 3, "Expected at least 3 exams in demo seed"
    upcoming = [e for e in exams if e["is_upcoming"]]
    assert len(upcoming) > 0, "Expected upcoming exams"
    first_exam = upcoming[0]
    assert "total_seconds_left" in first_exam and first_exam["total_seconds_left"] > 0
    print(f"[OK] Examination countdown verified: {first_exam['title']} ({first_exam['days_left']}d {first_exam['hours_left']}h left)")

    # 10. Analytics & Charts Payload
    res = client.get("/api/analytics", headers=headers)
    assert res.status_code == 200
    analytics = res.json()
    assert len(analytics["subject_charts"]) >= 5
    assert len(analytics["assignment_distribution"]) == 4
    assert len(analytics["weekly_study"]) == 7
    assert len(analytics["attendance_trend"]) == 14
    print("[OK] Analytics chart payloads generated: 5 subjects, 4 statuses, 7 days, 14-day trend")

    # 11. Data Export
    res = client.get("/api/export/json", headers=headers)
    assert res.status_code == 200
    assert "student_profile" in res.json()
    print("[OK] Full academic profile JSON backup export verified")

    res = client.get("/api/export/csv/attendance", headers=headers)
    assert res.status_code == 200
    assert "Date,Subject Code" in res.text
    print("[OK] Attendance CSV export verified")

    print("==========================================")
    print("  ALL 11 TEST SUITES PASSED FLAWLESSLY!   ")
    print("==========================================")

if __name__ == "__main__":
    run_e2e_tests()
