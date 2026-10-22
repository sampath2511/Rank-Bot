import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    media_type = Column(String(20), nullable=False) # "video", "image", "audio"
    original_filename = Column(String(255), nullable=False)
    storage_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    thumbnail_path = Column(String(512), nullable=True)
    
    duration = Column(Float, default=0.0)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/octet-stream")
    source_url = Column(String(1024), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="media_assets")
    ranking_entries = relationship("RankingEntry", back_populates="asset")
