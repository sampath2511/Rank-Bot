import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.models.project import Project
from app.models.render import RenderJob
from app.schemas.render import RenderJobCreate, RenderJobResponse
from app.rendering.ffmpeg_engine import FFmpegEngine

router = APIRouter()

@router.post("/projects/{project_id}/render", response_model=RenderJobResponse, status_code=status.HTTP_202_ACCEPTED)
@router.post("/projects/{project_id}/renders", response_model=RenderJobResponse, status_code=status.HTTP_202_ACCEPTED)
def create_render_job(
    project_id: str,
    job_in: RenderJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.ranking_entries:
        raise HTTPException(status_code=400, detail="Cannot render a project with 0 ranking entries.")

    job = RenderJob(
        project_id=project_id,
        status="queued",
        progress=0,
        current_step="Job queued for processing..."
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch background rendering task using session factory
    background_tasks.add_task(
        FFmpegEngine.render_project,
        SessionLocal,
        job.id,
        project_id,
        job_in.model_dump()
    )

    return job

@router.get("/projects/{project_id}/renders", response_model=List[RenderJobResponse])
def get_project_renders(project_id: str, db: Session = Depends(get_db)):
    return db.query(RenderJob)\
        .filter(RenderJob.project_id == project_id)\
        .order_by(RenderJob.created_at.desc())\
        .all()

@router.get("/renders/{job_id}", response_model=RenderJobResponse)
def get_render_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(RenderJob).filter(RenderJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job

@router.get("/renders/{job_id}/download")
def download_rendered_video(job_id: str, db: Session = Depends(get_db)):
    job = db.query(RenderJob).filter(RenderJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail=f"Render is not complete (current status: {job.status})")

    if job.output_path and os.path.exists(job.output_path):
        file_path = Path(job.output_path)
    else:
        file_path = settings.RENDERS_DIR / f"{job.id}.mp4"

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Rendered file no longer exists on disk")

    return FileResponse(
        path=str(file_path),
        media_type="video/mp4",
        filename=job.output_filename
    )

