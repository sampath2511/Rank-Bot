from typing import Optional
from datetime import datetime
from pydantic import BaseModel, HttpUrl

class MediaAssetBase(BaseModel):
    media_type: str
    original_filename: str

class MediaAssetUpdate(BaseModel):
    original_filename: Optional[str] = None

class MediaUrlImportRequest(BaseModel):
    url: str

class MediaAssetResponse(BaseModel):
    id: str
    project_id: Optional[str]
    media_type: str
    original_filename: str
    storage_filename: str
    file_path: str
    thumbnail_path: Optional[str]
    duration: float
    width: Optional[int]
    height: Optional[int]
    file_size: int
    mime_type: str
    source_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
