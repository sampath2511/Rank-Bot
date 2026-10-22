import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
import app.models # Ensure all models are registered with Base

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

def seed_starter_project():
    """Ensure a sample showcase project exists so fresh deployments are never blank."""
    from app.core.database import SessionLocal
    from app.models.project import Project
    from app.models.ranking import RankingEntry
    db = SessionLocal()
    try:
        if db.query(Project).count() == 0:
            sample = Project(
                id="sample-ranking-project",
                name="Top 5 Greatest Moments Ever",
                aspect_ratio="9:16",
                resolution_width=1080,
                resolution_height=1920,
                fps=30,
                title_config={
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
                },
                ranking_config={
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
                },
                footer_config={
                    "enabled": True,
                    "channel_name": "@RankStudio",
                    "cta_text": "SUBSCRIBE FOR MORE",
                    "bg_color": "#000000",
                    "text_color": "#FFFFFF",
                    "accent_color": "#FACC15",
                    "height": 110
                },
                audio_config={
                    "bgm_asset_id": None,
                    "bgm_volume": 0.4,
                    "original_volume": 1.0,
                    "bgm_fade_in": 1.0,
                    "bgm_fade_out": 1.5,
                    "transition_sfx": "ding",
                    "sfx_volume": 0.8
                }
            )
            db.add(sample)
            db.flush()

            entries = [
                {"pos": 1, "num": "1", "label": "Championship Winner", "dur": 3.5},
                {"pos": 2, "num": "2", "label": "Runner-Up Finalist", "dur": 3.5},
                {"pos": 3, "num": "3", "label": "Bronze Medalist", "dur": 3.5},
                {"pos": 4, "num": "4", "label": "Fourth Place Contender", "dur": 3.5},
                {"pos": 5, "num": "5", "label": "Honorable Mention", "dur": 3.5},
            ]
            for item in entries:
                entry = RankingEntry(
                    project_id=sample.id,
                    position=item["pos"],
                    display_number=item["num"],
                    custom_label=item["label"],
                    display_duration=item["dur"],
                    fit_mode="contain"
                )
                db.add(entry)
            db.commit()
            print("[RankStudio] Seeded starter showcase project 'sample-ranking-project'.")
    except Exception as e:
        print(f"[RankStudio] Seeding notice: {e}")
        db.rollback()
    finally:
        db.close()

seed_starter_project()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Social Media Ranking Video Editor Backend API",
    version="1.0.0"
)

# CORS configuration supporting localhost, Vercel frontend, and custom origins
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "")
allowed_origins = [
    origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()
]
if not allowed_origins:
    allowed_origins = ["*"]
else:
    allowed_origins.extend([
        "https://rank-bot-six.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ])
    allowed_origins = list(set(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure storage directories exist
settings.setup_directories()
settings.resolve_ffmpeg_binaries()

# Mount media directory for direct access to uploaded/rendered files and thumbnails
app.mount("/media", StaticFiles(directory=str(settings.MEDIA_DIR)), name="media")

# Include main API router
from app.api.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "RankStudio Video Editor API is running",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
