import os
import sys
import time
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.models.project import Project
from app.models.ranking import RankingEntry
from app.models.render import RenderJob
from app.schemas.project import ProjectCreate
from app.services.project_service import ProjectService
from app.services.media_service import MediaService
from app.rendering.ffmpeg_engine import FFmpegRenderEngine

def test_full_ffmpeg_render_pipeline():
    """Test full end-to-end FFmpeg rendering: segments, Pillow overlays, concatenation, and MP4 generation."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Create a project
    proj_in = ProjectCreate(name="E2E Render Test", template_type="standard_ranking")
    project = ProjectService.create_project(db, proj_in)
    assert project.id is not None

    # Update ranking entries durations to 1.5 seconds each for fast rendering test
    entries = db.query(RankingEntry).filter(RankingEntry.project_id == project.id).all()
    assert len(entries) >= 3
    for e in entries:
        e.display_duration = 1.5
    db.commit()

    # 2. Create RenderJob
    job = RenderJob(
        project_id=project.id,
        resolution="720x1280", # 720p 9:16 for super fast test
        fps=30,
        status="queued",
        progress=0.0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 3. Execute Render Engine
    print(f"Starting test render execution for Job {job.id}...")
    FFmpegRenderEngine.execute_render_job(job.id)

    # 4. Check completed job
    db.refresh(job)
    print("Render finished with status:", job.status)
    print("Error message (if any):", job.error_message)
    print("Output URL:", job.output_url)
    print("Output Path:", job.output_path)
    print("Duration:", job.duration)
    print("File size:", job.file_size)

    assert job.status == "completed", f"Render failed: {job.error_message}"
    assert job.output_path is not None
    assert os.path.exists(job.output_path)
    assert job.file_size > 10000
    assert job.duration >= 4.0 # 5 entries * 1.5s = ~7.5s

    # 5. FFprobe post-validation
    probe = MediaService.probe_media(Path(job.output_path))
    assert probe["has_video"] is True
    assert probe["width"] == 720
    assert probe["height"] == 1280
    assert probe["duration"] > 0

    print("SUCCESS: End-to-end MP4 rendering and FFprobe validation verified!")
    db.close()

def test_ffmpeg_render_with_sfx_and_audio_effects():
    """Verify that FFmpeg rendering succeeds with transition sound effects (SFX) and audio mixing."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Create project with transition SFX configured
    proj_in = ProjectCreate(name="SFX Audio Render Test", template_type="standard_ranking")
    project = ProjectService.create_project(db, proj_in)
    project.audio_config = {
        "bgm_asset_id": None,
        "bgm_volume": 0.4,
        "original_volume": 1.0,
        "bgm_fade_in": 0.5,
        "transition_sfx": "ding",
        "sfx_volume": 0.8
    }
    db.commit()

    # Fast duration for test
    entries = db.query(RankingEntry).filter(RankingEntry.project_id == project.id).all()
    for e in entries:
        e.display_duration = 1.0
    db.commit()

    # 2. Render job
    job = RenderJob(
        project_id=project.id,
        resolution="720x1280",
        fps=30,
        status="queued",
        progress=0.0
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 3. Execute
    FFmpegRenderEngine.execute_render_job(job.id)

    # 4. Assertions
    db.refresh(job)
    assert job.status == "completed", f"Render with SFX failed: {job.error_message}"
    assert job.output_path is not None
    assert os.path.exists(job.output_path)
    assert job.file_size > 5000

    # Probe validation
    probe = MediaService.probe_media(Path(job.output_path))
    assert probe["has_video"] is True
    assert probe["has_audio"] is True
    assert probe["duration"] >= 3.0
    print(f"SUCCESS: Render with procedural SFX verified! File size: {job.file_size} bytes")
    db.close()

if __name__ == "__main__":
    test_full_ffmpeg_render_pipeline()
    test_ffmpeg_render_with_sfx_and_audio_effects()

