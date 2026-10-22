from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class RenderJobCreate(BaseModel):
    resolution_width: Optional[int] = 1080
    resolution_height: Optional[int] = 1920
    fps: Optional[int] = 30
    quality_preset: Optional[str] = "high" # "draft", "standard", "high"
    include_audio: Optional[bool] = True

class RenderJobResponse(BaseModel):
    id: str
    project_id: str
    status: str # queued, preparing, rendering, mixing, validating, completed, failed
    progress: int # 0 to 100
    current_step: str
    output_filename: Optional[str]
    output_path: Optional[str]
    download_url: Optional[str]
    file_size: Optional[int]
    total_duration: Optional[float]
    render_time_seconds: Optional[float]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True
