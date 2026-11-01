import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import init_db
from seed import ensure_demo_user
from routers import (
    auth_router,
    dashboard_router,
    subjects_router,
    assignments_router,
    study_router,
    exams_router,
    analytics_router,
    export_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        ensure_demo_user()
    except Exception as e:
        print(f"Error seeding demo user: {e}")
    yield

app = FastAPI(
    title="StudentOS API",
    description="Intelligent University Student Productivity and Academic Management Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router.router)
app.include_router(dashboard_router.router)
app.include_router(subjects_router.router)
app.include_router(assignments_router.router)
app.include_router(study_router.router)
app.include_router(exams_router.router)
app.include_router(analytics_router.router)
app.include_router(export_router.router)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "StudentOS Core API", "version": "1.0.0"}

# Serve frontend production build if it exists
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
