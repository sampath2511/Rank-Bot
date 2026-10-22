from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.ranking import RankingEntry
from app.models.media import MediaAsset
from app.schemas.ranking import (
    RankingEntryCreate,
    RankingEntryUpdate,
    RankingEntryResponse,
    RankingReorderRequest
)

router = APIRouter()

def _enrich_entry(e: RankingEntry) -> RankingEntryResponse:
    dur = e.display_duration or 3.5
    if e.asset and e.asset.media_type == "video":
        s = e.trim_start or 0.0
        end = e.trim_end if e.trim_end is not None else (e.asset.duration or dur)
        dur = max(0.5, end - s)
    
    resp = RankingEntryResponse.model_validate(e)
    resp.effective_duration = round(dur, 2)
    return resp

@router.get("/projects/{project_id}/rankings", response_model=List[RankingEntryResponse])
def get_project_rankings(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    entries = db.query(RankingEntry)\
        .filter(RankingEntry.project_id == project_id)\
        .order_by(RankingEntry.position.asc())\
        .all()
    return [_enrich_entry(e) for e in entries]

@router.post("/projects/{project_id}/rankings", response_model=RankingEntryResponse, status_code=status.HTTP_201_CREATED)
def create_ranking_entry(project_id: str, entry_in: RankingEntryCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine next position
    existing_count = db.query(RankingEntry).filter(RankingEntry.project_id == project_id).count()
    pos = entry_in.position if entry_in.position is not None else existing_count + 1
    display_num = entry_in.display_number or str(pos)

    # If asset_id given, check asset
    trim_end = None
    display_dur = entry_in.display_duration or 3.5
    if entry_in.asset_id:
        asset = db.query(MediaAsset).filter(MediaAsset.id == entry_in.asset_id).first()
        if asset and asset.media_type == "video" and asset.duration:
            trim_end = asset.duration
            display_dur = asset.duration

    entry = RankingEntry(
        project_id=project_id,
        asset_id=entry_in.asset_id,
        position=pos,
        display_number=display_num,
        custom_label=entry_in.custom_label or f"Rank {pos}",
        display_duration=display_dur,
        trim_start=0.0,
        trim_end=trim_end
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _enrich_entry(entry)

@router.put("/projects/{project_id}/rankings/{entry_id}", response_model=RankingEntryResponse)
def update_ranking_entry(
    project_id: str,
    entry_id: str,
    entry_in: RankingEntryUpdate,
    db: Session = Depends(get_db)
):
    entry = db.query(RankingEntry).filter(
        RankingEntry.id == entry_id,
        RankingEntry.project_id == project_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ranking entry not found")

    update_data = entry_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(entry, field, val)

    db.commit()
    db.refresh(entry)
    return _enrich_entry(entry)

@router.patch("/rankings/{entry_id}", response_model=RankingEntryResponse)
@router.put("/rankings/{entry_id}", response_model=RankingEntryResponse)
def update_ranking_by_id(
    entry_id: str,
    entry_in: RankingEntryUpdate,
    db: Session = Depends(get_db)
):
    entry = db.query(RankingEntry).filter(RankingEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ranking entry not found")

    update_data = entry_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(entry, field, val)

    db.commit()
    db.refresh(entry)
    return _enrich_entry(entry)

@router.delete("/projects/{project_id}/rankings/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ranking_entry(project_id: str, entry_id: str, db: Session = Depends(get_db)):
    entry = db.query(RankingEntry).filter(
        RankingEntry.id == entry_id,
        RankingEntry.project_id == project_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ranking entry not found")

    db.delete(entry)
    db.commit()

    # Re-normalize remaining positions
    remaining = db.query(RankingEntry)\
        .filter(RankingEntry.project_id == project_id)\
        .order_by(RankingEntry.position.asc())\
        .all()
    for idx, rem in enumerate(remaining):
        rem.position = idx + 1
    db.commit()
    return None

@router.delete("/rankings/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ranking_by_id(entry_id: str, db: Session = Depends(get_db)):
    entry = db.query(RankingEntry).filter(RankingEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Ranking entry not found")
    proj_id = entry.project_id
    db.delete(entry)
    db.commit()

    remaining = db.query(RankingEntry)\
        .filter(RankingEntry.project_id == proj_id)\
        .order_by(RankingEntry.position.asc())\
        .all()
    for idx, rem in enumerate(remaining):
        rem.position = idx + 1
    db.commit()
    return None

@router.post("/projects/{project_id}/rankings/reorder", response_model=List[RankingEntryResponse])
@router.put("/projects/{project_id}/rankings/reorder", response_model=List[RankingEntryResponse])
def reorder_rankings(project_id: str, req: RankingReorderRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")


    for item in req.order:
        entry = db.query(RankingEntry).filter(
            RankingEntry.id == item.id,
            RankingEntry.project_id == project_id
        ).first()
        if entry:
            entry.position = item.position
            if item.display_number is not None:
                entry.display_number = item.display_number

    db.commit()

    entries = db.query(RankingEntry)\
        .filter(RankingEntry.project_id == project_id)\
        .order_by(RankingEntry.position.asc())\
        .all()
    return [_enrich_entry(e) for e in entries]

@router.post("/projects/{project_id}/rankings/renumber", response_model=List[RankingEntryResponse])
def auto_renumber_rankings(project_id: str, mode: str = "asc", db: Session = Depends(get_db)):
    """mode: 'asc' (1, 2, 3...) or 'countdown' (5, 4, 3, 2, 1)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    entries = db.query(RankingEntry)\
        .filter(RankingEntry.project_id == project_id)\
        .order_by(RankingEntry.position.asc())\
        .all()

    total = len(entries)
    for idx, e in enumerate(entries):
        if mode == "countdown":
            e.display_number = str(total - idx)
        else:
            e.display_number = str(idx + 1)

    db.commit()
    return [_enrich_entry(e) for e in entries]
