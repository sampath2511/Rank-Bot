from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.media import MediaAssetResponse, MediaUrlImportRequest
from app.services.media_service import MediaService

router = APIRouter()

@router.get("", response_model=List[MediaAssetResponse])
def get_assets(project_id: Optional[str] = None, db: Session = Depends(get_db)):
    return MediaService.get_assets_by_project(db, project_id)

@router.get("/projects/{project_id}/media", response_model=List[MediaAssetResponse])
def get_project_media(project_id: str, db: Session = Depends(get_db)):
    return MediaService.get_assets_by_project(db, project_id)

@router.post("/projects/{project_id}/media", response_model=List[MediaAssetResponse], status_code=status.HTTP_201_CREATED)
async def upload_project_media(
    project_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    results = []
    for f in files:
        asset = await MediaService.save_uploaded_file(db, f, project_id)
        results.append(asset)
    return results

@router.post("/upload", response_model=MediaAssetResponse, status_code=status.HTTP_201_CREATED)
async def upload_asset(
    file: UploadFile = File(...),
    project_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    return await MediaService.save_uploaded_file(db, file, project_id)


from app.services.url_service import UrlImportService

@router.post("/import-url")
def import_asset_from_url(
    req: MediaUrlImportRequest,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not UrlImportService.is_safe_url(req.url):
        raise HTTPException(
            status_code=400,
            detail="Security validation failed: Invalid URL or prohibited internal network destination."
        )

    try:
        asset = MediaService.import_from_url(db, req.url, project_id)
        return {
            "platform": "Direct Media",
            "url": req.url,
            "can_direct_download": True,
            "title": asset.original_filename,
            "thumbnail_url": asset.thumbnail_path,
            "message": "Successfully imported media file into project library",
            "id": asset.id,
            "file_path": asset.file_path,
            "media_type": asset.media_type
        }
    except HTTPException:
        raise
    except Exception as e:
        return UrlImportService.inspect_url(req.url)


@router.get("/{asset_id}", response_model=MediaAssetResponse)
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    asset = MediaService.get_asset(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return asset

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    success = MediaService.delete_asset(db, asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return None
