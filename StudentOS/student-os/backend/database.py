import sqlite3
import os
from datetime import datetime
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'studentos.db')

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn

@contextmanager
def get_db_context():
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db_context() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            university TEXT DEFAULT 'Apex University',
            major TEXT DEFAULT 'Computer Science',
            target_attendance REAL DEFAULT 75.0,
            weekly_study_goal REAL DEFAULT 20.0,
            theme TEXT DEFAULT 'system',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            instructor TEXT,
            color TEXT DEFAULT '#3B82F6',
            target_percentage REAL DEFAULT 75.0,
            classes_conducted INTEGER DEFAULT 0,
            classes_attended INTEGER DEFAULT 0,
            room TEXT,
            credits INTEGER DEFAULT 3,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS attendance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('attended', 'missed', 'cancelled')),
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT NOT NULL,
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
            score REAL,
            max_score REAL DEFAULT 100,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            session_date TEXT NOT NULL,
            start_time TEXT,
            duration_minutes INTEGER DEFAULT 60,
            notes TEXT,
            completed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS examinations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            exam_type TEXT DEFAULT 'final' CHECK(exam_type IN ('midterm', 'final', 'quiz', 'lab', 'practical', 'project')),
            exam_date TEXT NOT NULL,
            room TEXT,
            weightage REAL DEFAULT 20,
            syllabus TEXT,
            target_score REAL DEFAULT 90,
            achieved_score REAL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_type TEXT NOT NULL,
            title TEXT NOT NULL,
            details TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
        CREATE INDEX IF NOT EXISTS idx_study_user ON study_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_exams_user ON examinations(user_id);
        CREATE INDEX IF NOT EXISTS idx_logs_user ON attendance_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
        """)

def log_activity(user_id: int, action_type: str, title: str, details: str = '', conn: sqlite3.Connection = None):
    try:
        if conn is not None:
            conn.execute(
                "INSERT INTO activities (user_id, action_type, title, details) VALUES (?, ?, ?, ?)",
                (user_id, action_type, title, details)
            )
        else:
            with get_db_context() as c:
                c.execute(
                    "INSERT INTO activities (user_id, action_type, title, details) VALUES (?, ?, ?, ?)",
                    (user_id, action_type, title, details)
                )
    except Exception as e:
        print(f"Error logging activity: {e}")
