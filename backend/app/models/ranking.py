import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RankingEntry(Base):
    __tablename__ = "ranking_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(String(36), ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    
    position = Column(Integer, nullable=False, default=1)
    display_number = Column(String(20), default="1")
    custom_label = Column(String(255), default="")
    
    # Clip timing and trimming
    trim_start = Column(Float, default=0.0)
    trim_end = Column(Float, nullable=True)
    display_duration = Column(Float, default=3.5) # for images or default fallback
    
    # Display styling
    fit_mode = Column(String(30), default="contain") # "cover", "contain", "blurred_bg"
    is_muted = Column(Boolean, default=False)
    transition_type = Column(String(30), default="cut") # "cut", "fade", "zoom", "slide"
    transition_duration = Column(Float, default=0.3)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="ranking_entries")
    asset = relationship("MediaAsset", back_populates="ranking_entries")
