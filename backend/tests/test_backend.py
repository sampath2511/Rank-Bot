import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.database import SessionLocal, engine, Base
from app.models.project import Project
from app.models.ranking import RankingEntry
from app.schemas.project import ProjectCreate
from app.services.project_service import ProjectService
from app.rendering.overlay_generator import OverlayGenerator

def test_backend_setup():
    print("1. Testing settings and paths...")
    print("   FFmpeg path:", settings.FFMPEG_PATH)
    print("   FFprobe path:", settings.FFPROBE_PATH)
    assert settings.FFMPEG_PATH, "FFMPEG_PATH must not be empty"

    print("2. Testing database table creation...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("3. Testing ProjectService creation with standard template...")
    p_in = ProjectCreate(name="Viral Ranking Test", template_type="standard_ranking")
    proj = ProjectService.create_project(db, p_in)
    print(f"   Created project {proj.id} with {proj.ranking_entries_count} ranking entries.")
    assert proj.id is not None
    assert proj.ranking_entries_count == 5

    print("4. Testing OverlayGenerator...")
    test_overlay_path = str(settings.TEMP_DIR / "test_overlay.png")
    OverlayGenerator.generate_segment_overlay(
        output_path=test_overlay_path,
        width=1080,
        height=1920,
        active_position=1,
        all_positions=[
            {"position": 1, "display_number": "1", "label": "Winner"},
            {"position": 2, "display_number": "2", "label": "Runner Up"},
            {"position": 3, "display_number": "3", "label": "Third"}
        ],
        title_config=proj.title_config,
        ranking_config=proj.ranking_config,
        footer_config=proj.footer_config,
        segment_label="WINNER ENTRY"
    )
    assert os.path.exists(test_overlay_path), "Overlay PNG must be generated"
    file_size = os.path.getsize(test_overlay_path)
    print(f"   Generated overlay PNG: {test_overlay_path} ({file_size} bytes)")
    assert file_size > 1000

    print("5. Testing FFmpeg Video Rendering Pipeline...")
    from app.models.render import RenderJob
    from app.rendering.ffmpeg_engine import FFmpegRenderEngine

    job = RenderJob(
        project_id=proj.id,
        status="queued",
        resolution="720x1280", # Fast render test
        fps=30
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    print(f"   Starting render job {job.id}...")
    FFmpegRenderEngine.execute_render_job(job.id)

    db.refresh(job)
    print(f"   Render status: {job.status}, Progress: {job.progress}%, Step: {job.current_step}")
    if job.status == "failed":
        print(f"   Render error: {job.error_message}")
        assert False, f"Render failed: {job.error_message}"
    
    assert job.status == "completed"
    assert job.output_path is not None
    assert os.path.exists(job.output_path)
    final_size = os.path.getsize(job.output_path)
    print(f"   Render output: {job.output_path} ({final_size} bytes, duration: {job.duration}s)")
    assert final_size > 50000

    db.close()
    print("ALL BACKEND & FFMPEG RENDERING TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_backend_setup()

