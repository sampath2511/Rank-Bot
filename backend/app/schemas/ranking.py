from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.media import MediaAssetResponse

class RankingEntryBase(BaseModel):
    position: int = 1
    display_number: str = "1"
    custom_label: Optional[str] = ""
    trim_start: float = 0.0
    trim_end: Optional[float] = None
    display_duration: float = 3.5
    fit_mode: str = "contain"
    is_muted: bool = False
    transition_type: str = "cut"
    transition_duration: float = 0.3

class RankingEntryCreate(BaseModel):
    asset_id: Optional[str] = None
    position: Optional[int] = None
    display_number: Optional[str] = None
    custom_label: Optional[str] = ""
    display_duration: Optional[float] = 3.5

class RankingEntryUpdate(BaseModel):
    asset_id: Optional[str] = None
    position: Optional[int] = None
    display_number: Optional[str] = None
    custom_label: Optional[str] = None
    trim_start: Optional[float] = None
    trim_end: Optional[float] = None
    display_duration: Optional[float] = None
    fit_mode: Optional[str] = None
    is_muted: Optional[bool] = None
    transition_type: Optional[str] = None
    transition_duration: Optional[float] = None

class RankingReorderItem(BaseModel):
    id: str
    position: int
    display_number: Optional[str] = None

class RankingReorderRequest(BaseModel):
    order: List[RankingReorderItem]

class RankingEntryResponse(BaseModel):
    id: str
    project_id: str
    asset_id: Optional[str]
    position: int
    display_number: str
    custom_label: str
    trim_start: float
    trim_end: Optional[float]
    display_duration: float
    fit_mode: str
    is_muted: bool
    transition_type: str
    transition_duration: float
    effective_duration: Optional[float] = 3.5
    asset: Optional[MediaAssetResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
