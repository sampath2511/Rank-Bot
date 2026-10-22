from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class WordStyle(BaseModel):
    text: str
    color: str = "#FFFFFF"

class TitleConfig(BaseModel):
    line1: str = "RANKING BEST"
    line2: str = "MOMENTS EVER"
    line1_color: str = "#FACC15"
    line2_color: str = "#FFFFFF"
    words: Optional[List[WordStyle]] = None
    font_size: int = 48
    banner_height: int = 220
    banner_bg: str = "#000000"
    text_outline_color: str = "#000000"
    text_outline_width: int = 3
    uppercase: bool = True

class RankingConfig(BaseModel):
    font_size: int = 52
    active_color: str = "#FACC15"
    inactive_color: str = "#94A3B8"
    outline_color: str = "#000000"
    outline_width: int = 4
    left_margin: int = 40
    top_margin: int = 260
    spacing: int = 75
    show_all_numbers: bool = True
    highlight_active: bool = True
    badge_style: str = "plain"

class FooterConfig(BaseModel):
    enabled: bool = True
    channel_name: str = "@RankStudio"
    cta_text: str = "SUBSCRIBE FOR MORE"
    bg_color: str = "#000000"
    text_color: str = "#FFFFFF"
    accent_color: str = "#FACC15"
    height: int = 110

class AudioConfig(BaseModel):
    bgm_asset_id: Optional[str] = None
    bgm_volume: float = 0.4
    original_volume: float = 1.0
    bgm_fade_in: float = 1.0
    bgm_fade_out: float = 1.5
    transition_sfx: str = "none"

class ProjectBase(BaseModel):
    name: str = "Untitled Ranking Project"
    aspect_ratio: str = "9:16"
    resolution_width: int = 1080
    resolution_height: int = 1920
    fps: int = 30
    title_config: Optional[TitleConfig] = None
    ranking_config: Optional[RankingConfig] = None
    footer_config: Optional[FooterConfig] = None
    audio_config: Optional[AudioConfig] = None

class ProjectCreate(BaseModel):
    name: Optional[str] = "Untitled Ranking Project"
    aspect_ratio: Optional[str] = "9:16"
    template_type: Optional[str] = "standard_ranking" # e.g. "standard_ranking", "countdown", "comparison"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    aspect_ratio: Optional[str] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    fps: Optional[int] = None
    title_config: Optional[Dict[str, Any]] = None
    ranking_config: Optional[Dict[str, Any]] = None
    footer_config: Optional[Dict[str, Any]] = None
    audio_config: Optional[Dict[str, Any]] = None

class ProjectResponse(BaseModel):
    id: str
    name: str
    aspect_ratio: str
    resolution_width: int
    resolution_height: int
    fps: int
    title_config: Dict[str, Any]
    ranking_config: Dict[str, Any]
    footer_config: Dict[str, Any]
    audio_config: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    ranking_entries_count: Optional[int] = 0
    total_duration: Optional[float] = 0.0

    class Config:
        from_attributes = True
