import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, JSON, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, default="Untitled Ranking Project")
    aspect_ratio = Column(String(16), default="9:16")
    resolution_width = Column(Integer, default=1080)
    resolution_height = Column(Integer, default=1920)
    fps = Column(Integer, default=30)
    
    # Visual & Styling Configurations stored as structured JSON
    # Title Config: lines, words styling, banner height, banner bg, outline, shadow
    title_config = Column(JSON, default=lambda: {
        "line1": "RANKING BEST",
        "line2": "MOMENTS EVER",
        "line1_color": "#FACC15",
        "line2_color": "#FFFFFF",
        "words": [
            {"text": "RANKING", "color": "#FACC15"},
            {"text": "BEST", "color": "#FACC15"},
            {"text": "MOMENTS", "color": "#FFFFFF"},
            {"text": "EVER", "color": "#38BDF8"}
        ],
        "font_size": 48,
        "banner_height": 220,
        "banner_bg": "#000000",
        "text_outline_color": "#000000",
        "text_outline_width": 3,
        "uppercase": True
    })

    # Ranking Numbers Styling Config
    ranking_config = Column(JSON, default=lambda: {
        "font_size": 52,
        "active_color": "#FACC15",
        "inactive_color": "#94A3B8",
        "outline_color": "#000000",
        "outline_width": 4,
        "left_margin": 40,
        "top_margin": 260,
        "spacing": 75,
        "show_all_numbers": True,
        "highlight_active": True,
        "badge_style": "plain"
    })

    # Footer Config
    footer_config = Column(JSON, default=lambda: {
        "enabled": True,
        "channel_name": "@RankStudio",
        "cta_text": "SUBSCRIBE FOR MORE",
        "bg_color": "#000000",
        "text_color": "#FFFFFF",
        "accent_color": "#FACC15",
        "height": 110
    })

    # Audio Config
    audio_config = Column(JSON, default=lambda: {
        "bgm_asset_id": None,
        "bgm_volume": 0.4,
        "original_volume": 1.0,
        "bgm_fade_in": 1.0,
        "bgm_fade_out": 1.5,
        "transition_sfx": "none"
    })

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    media_assets = relationship("MediaAsset", back_populates="project", cascade="all, delete-orphan")
    ranking_entries = relationship("RankingEntry", back_populates="project", order_by="RankingEntry.position", cascade="all, delete-orphan")
    render_jobs = relationship("RenderJob", back_populates="project", cascade="all, delete-orphan")

    @property
    def ranking_entries_count(self) -> int:
        return len(self.ranking_entries) if self.ranking_entries else 0

    @property
    def total_duration(self) -> float:
        total = 0.0
        for e in self.ranking_entries or []:
            dur = e.display_duration or 3.5
            if e.asset and e.asset.media_type == "video":
                s = e.trim_start or 0.0
                end = e.trim_end if e.trim_end is not None else (e.asset.duration or dur)
                dur = max(0.5, end - s)
            total += dur
        return round(total, 2)

