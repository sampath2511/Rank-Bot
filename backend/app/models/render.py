import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RenderJob(Base):
    __tablename__ = "render_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # Status: queued, preparing, rendering, mixing, validating, completed, failed
    status = Column(String(30), default="queued")
    progress = Column(Float, default=0.0) # 0.0 to 100.0
    current_step = Column(String(255), default="Job queued")
    
    output_path = Column(String(512), nullable=True)
    output_url = Column(String(512), nullable=True)
    file_size = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)
    resolution = Column(String(30), default="1080x1920")
    fps = Column(Integer, default=30)
    error_message = Column(String(1024), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="render_jobs")

    @property
    def output_filename(self) -> str:
        if self.output_path:
            import os
            return os.path.basename(self.output_path)
        return f"{self.id}.mp4"

    @property
    def download_url(self) -> str:
        return f"/api/renders/{self.id}/download"

    @property
    def total_duration(self) -> float:
        return self.duration or 0.0

    @property
    def render_time_seconds(self) -> float:
        if self.completed_at and self.created_at:
            return round((self.completed_at - self.created_at).total_seconds(), 1)
        return 0.0
