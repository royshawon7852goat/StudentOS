from datetime import datetime, timedelta
import sqlite3
from database import get_db, get_db_context
from auth import get_password_hash

DEMO_EMAIL = "demo@studentos.dev"
DEMO_PASS = "student123"

def ensure_demo_user():
    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (DEMO_EMAIL,)).fetchone()
        if user:
            return dict(user)
    finally:
        conn.close()

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    with get_db_context() as conn:
        cursor = conn.cursor()
        hashed = get_password_hash(DEMO_PASS)
        cursor.execute("""
            INSERT INTO users (name, email, password_hash, university, major, target_attendance, weekly_study_goal, theme)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Alex Morgan",
            DEMO_EMAIL,
            hashed,
            "Stanford University",
            "Computer Science & AI",
            75.0,
            20.0,
            "system"
        ))
        user_id = cursor.lastrowid

        # 1. Subjects
        subjects_data = [
            ("Data Structures & Algorithms", "CS-201", "Prof. Robert Tarjan", "#3B82F6", 75.0, 24, 21, "Gates Hall 104", 4, "Core CS major requirement. Focus on tree balance, graph flows."),
            ("Operating Systems & Concurrency", "CS-204", "Dr. Leslie Lamport", "#EF4444", 75.0, 22, 15, "Hewlett 201", 4, "Attendance critical! Currently at 68.2%, need 6 consecutive classes."),
            ("Database Management Systems", "CS-206", "Prof. Jennifer Widom", "#10B981", 75.0, 18, 16, "Packard 108", 3, "SQL query optimization, indexing, ACID transactions."),
            ("Linear Algebra & Probability", "MATH-202", "Dr. Gilbert Strang", "#F59E0B", 75.0, 20, 14, "Math 380", 3, "Eigenvalues, PCA, Markov chains, conditional distributions."),
            ("Artificial Intelligence Principles", "CS-310", "Prof. Daphne Koller", "#8B5CF6", 75.0, 16, 15, "Gates B01", 4, "Search algorithms, probabilistic reasoning, reinforcement learning.")
        ]

        sub_id_map = {}
        for name, code, inst, color, target, cond, att, room, cred, notes in subjects_data:
            cursor.execute("""
                INSERT INTO subjects (user_id, name, code, instructor, color, target_percentage, classes_conducted, classes_attended, room, credits, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, name, code, inst, color, target, cond, att, room, cred, notes))
            sub_id_map[code] = cursor.lastrowid

        # 2. Attendance Logs (Past 10 days)
        for i in range(10, 0, -1):
            log_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            # Alternate logs
            status_cs201 = "attended"
            status_cs204 = "missed" if i in (3, 7) else "attended"
            cursor.execute("INSERT INTO attendance_logs (user_id, subject_id, date, status, notes) VALUES (?, ?, ?, ?, ?)",
                           (user_id, sub_id_map["CS-201"], log_date, status_cs201, "Lecture & live coding"))
            cursor.execute("INSERT INTO attendance_logs (user_id, subject_id, date, status, notes) VALUES (?, ?, ?, ?, ?)",
                           (user_id, sub_id_map["CS-204"], log_date, status_cs204, "Kernel synchronization session"))

        # 3. Assignments
        assignments = [
            (sub_id_map["CS-201"], "B-Tree & Red-Black Tree Implementation", "Implement balanced tree operations in C++ with unit tests and benchmark comparison.", (now + timedelta(days=1, hours=4)).strftime("%Y-%m-%d %H:%M"), "high", "in_progress", None, 100),
            (sub_id_map["CS-204"], "Virtual Memory & Page Replacement Simulation", "Simulate FIFO, LRU, and Clock replacement algorithms with memory hit-ratio benchmarks.", (now + timedelta(days=3, hours=2)).strftime("%Y-%m-%d %H:%M"), "urgent", "pending", None, 100),
            (sub_id_map["CS-206"], "SQL Schema Design & Index Tuning", "Design an e-commerce normalized schema and demonstrate 10x query speedup with composite B-tree indices.", (now - timedelta(days=3)).strftime("%Y-%m-%d %H:%M"), "medium", "completed", 96.0, 100),
            (sub_id_map["CS-310"], "MDP & Reinforcement Learning Gridworld", "Solve the gridworld environment using value iteration and Q-learning policy extraction.", (now + timedelta(days=8)).strftime("%Y-%m-%d %H:%M"), "medium", "pending", None, 100),
            (sub_id_map["MATH-202"], "Singular Value Decomposition Problem Set", "Calculate SVD decomposition manually and apply image compression in Python notebook.", (now - timedelta(days=1)).strftime("%Y-%m-%d %H:%M"), "high", "pending", None, 50)
        ]

        for sub_id, title, desc, due, priority, status, score, max_score in assignments:
            cursor.execute("""
                INSERT INTO assignments (user_id, subject_id, title, description, due_date, priority, status, score, max_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, sub_id, title, desc, due, priority, status, score, max_score))

        # 4. Examinations
        exams = [
            (sub_id_map["CS-204"], "Operating Systems Midterm Exam", "midterm", (now + timedelta(days=4, hours=14)).strftime("%Y-%m-%dT10:00:00"), "Hewlett 200", 30.0, "Processes, Threads, Semaphores, Deadlocks, Page Replacement algorithms.", 92.0),
            (sub_id_map["CS-206"], "Database Systems Lab Practical", "practical", (now + timedelta(days=11, hours=8)).strftime("%Y-%m-%dT14:00:00"), "Packard Lab 3", 20.0, "Live query execution, stored procedures, indexing benchmarks, transaction isolation.", 95.0),
            (sub_id_map["CS-201"], "Algorithms Final Comprehensive Examination", "final", (now + timedelta(days=22, hours=10)).strftime("%Y-%m-%dT09:00:00"), "Dinkelspiel Auditorium", 40.0, "Dynamic programming, max flow / min cut, NP-completeness, advanced amortized analysis.", 90.0)
        ]

        for sub_id, title, etype, edate, room, weight, syllabus, target in exams:
            cursor.execute("""
                INSERT INTO examinations (user_id, subject_id, title, exam_type, exam_date, room, weightage, syllabus, target_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, sub_id, title, etype, edate, room, weight, syllabus, target))

        # 5. Study Sessions
        # Past few days for charts
        for i in range(5, 0, -1):
            sess_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            cursor.execute("""
                INSERT INTO study_sessions (user_id, subject_id, title, session_date, start_time, duration_minutes, notes, completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, sub_id_map["CS-201"], f"DSA Problem Solving Sprint #{i}", sess_date, "14:00", 90, "Leetcode medium graph problems", 1))

        # Today's sessions
        cursor.execute("""
            INSERT INTO study_sessions (user_id, subject_id, title, session_date, start_time, duration_minutes, notes, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, sub_id_map["CS-204"], "OS Semaphore & Deadlock Review", today_str, "09:30", 60, "Reviewed banker algorithm and dining philosophers code", 1))

        cursor.execute("""
            INSERT INTO study_sessions (user_id, subject_id, title, session_date, start_time, duration_minutes, notes, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, sub_id_map["CS-201"], "B-Tree Implementation Practice", today_str, "16:00", 90, "Draft split child and node insertion routines", 0))

        # Tomorrow's session
        tomorrow_str = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        cursor.execute("""
            INSERT INTO study_sessions (user_id, subject_id, title, session_date, start_time, duration_minutes, notes, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, sub_id_map["MATH-202"], "SVD & Eigenvector Drills", tomorrow_str, "11:00", 75, "Prepare chapter 6 exercises", 0))

        # 6. Activities
        activities = [
            ("study_completed", "Completed 60 min Study Session", "Operating Systems Semaphore & Deadlock Review"),
            ("attendance_marked", "Marked Attendance for CS-201", "Attended Data Structures & Algorithms"),
            ("assignment_created", "Added assignment: Page Replacement Simulation", "Due in 3 days for CS-204"),
            ("exam_scheduled", "Midterm Scheduled: CS-204 OS", "Date: in 4 days at Hewlett 200")
        ]
        for atype, atitle, adetails in activities:
            cursor.execute("INSERT INTO activities (user_id, action_type, title, details) VALUES (?, ?, ?, ?)",
                           (user_id, atype, atitle, adetails))

    conn = get_db()
    try:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(user)
    finally:
        conn.close()

if __name__ == "__main__":
    from database import init_db
    init_db()
    user = ensure_demo_user()
    print("Demo user ensured:", user["email"])
