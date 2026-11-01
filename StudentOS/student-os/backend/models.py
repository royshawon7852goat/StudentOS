from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    university: Optional[str] = "Apex University"
    major: Optional[str] = "Computer Science"
    target_attendance: Optional[float] = 75.0

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    target_attendance: Optional[float] = None
    weekly_study_goal: Optional[float] = None
    theme: Optional[str] = None

class SubjectCreate(BaseModel):
    name: str
    code: str
    instructor: Optional[str] = ""
    color: Optional[str] = "#3B82F6"
    target_percentage: Optional[float] = 75.0
    classes_conducted: Optional[int] = 0
    classes_attended: Optional[int] = 0
    room: Optional[str] = ""
    credits: Optional[int] = 3
    notes: Optional[str] = ""

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    instructor: Optional[str] = None
    color: Optional[str] = None
    target_percentage: Optional[float] = None
    classes_conducted: Optional[int] = None
    classes_attended: Optional[int] = None
    room: Optional[str] = None
    credits: Optional[int] = None
    notes: Optional[str] = None

class QuickAttendance(BaseModel):
    action: str = Field(..., description="'attended' or 'missed'")

class AssignmentCreate(BaseModel):
    subject_id: int
    title: str
    description: Optional[str] = ""
    due_date: str  # ISO string or YYYY-MM-DD / YYYY-MM-DDTHH:MM
    priority: Optional[str] = "medium"  # low, medium, high, urgent
    status: Optional[str] = "pending"   # pending, in_progress, completed
    score: Optional[float] = None
    max_score: Optional[float] = 100.0

class AssignmentUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = None
    max_score: Optional[float] = None

class StudySessionCreate(BaseModel):
    subject_id: Optional[int] = None
    title: str
    session_date: str  # YYYY-MM-DD
    start_time: Optional[str] = "10:00"
    duration_minutes: Optional[int] = 60
    notes: Optional[str] = ""
    completed: Optional[int] = 0

class StudySessionUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = None
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    completed: Optional[int] = None

class ExamCreate(BaseModel):
    subject_id: int
    title: str
    exam_type: Optional[str] = "final"  # midterm, final, quiz, lab, practical, project
    exam_date: str  # YYYY-MM-DDTHH:MM:SS
    room: Optional[str] = ""
    weightage: Optional[float] = 20.0
    syllabus: Optional[str] = ""
    target_score: Optional[float] = 90.0
    achieved_score: Optional[float] = None

class ExamUpdate(BaseModel):
    subject_id: Optional[int] = None
    title: Optional[str] = None
    exam_type: Optional[str] = None
    exam_date: Optional[str] = None
    room: Optional[str] = None
    weightage: Optional[float] = None
    syllabus: Optional[str] = None
    target_score: Optional[float] = None
    achieved_score: Optional[float] = None
