from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.media import MediaAssetResponse
from app.services.project_service import ProjectService
from app.services.media_service import MediaService
from app.models.project import Project
from app.models.ranking import RankingEntry

router = APIRouter()

@router.get("", response_model=List[ProjectResponse])
def get_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return ProjectService.get_projects(db, skip=skip, limit=limit)

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    return ProjectService.create_project(db, project_in)

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectService.update_project(db, project, project_in)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    success = ProjectService.delete_project(db, project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return None

@router.post("/{project_id}/duplicate", response_model=ProjectResponse)
def duplicate_project(project_id: str, db: Session = Depends(get_db)):
    original = ProjectService.get_project(db, project_id)
    if not original:
        raise HTTPException(status_code=404, detail="Original project not found")

    new_project = Project(
        name=f"{original.name} (Copy)",
        aspect_ratio=original.aspect_ratio,
        resolution_width=original.resolution_width,
        resolution_height=original.resolution_height,
        fps=original.fps,
        title_config=original.title_config,
        ranking_config=original.ranking_config,
        footer_config=original.footer_config,
        audio_config=original.audio_config
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Copy ranking entries
    for entry in original.ranking_entries:
        new_entry = RankingEntry(
            project_id=new_project.id,
            asset_id=entry.asset_id,
            position=entry.position,
            display_number=entry.display_number,
            custom_label=entry.custom_label,
            trim_start=entry.trim_start,
            trim_end=entry.trim_end,
            display_duration=entry.display_duration,
            fit_mode=entry.fit_mode,
            is_muted=entry.is_muted,
            transition_type=entry.transition_type,
            transition_duration=entry.transition_duration
        )
        db.add(new_entry)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/{project_id}/media", response_model=List[MediaAssetResponse])
def get_project_media(project_id: str, db: Session = Depends(get_db)):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return MediaService.get_assets_by_project(db, project_id)

@router.post("/{project_id}/media", response_model=List[MediaAssetResponse], status_code=status.HTTP_201_CREATED)
async def upload_project_media(
    project_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    project = ProjectService.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    results = []
    for f in files:
        asset = await MediaService.save_uploaded_file(db, f, project_id)
        results.append(asset)
    return results
