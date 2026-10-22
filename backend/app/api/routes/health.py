import os
import shutil
import subprocess
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health_check():
    ffmpeg_detected = bool(settings.FFMPEG_PATH and os.path.exists(settings.FFMPEG_PATH))
    ffprobe_detected = bool(settings.FFPROBE_PATH and os.path.exists(settings.FFPROBE_PATH))

    # Version inspection if available
    ffmpeg_version = "Unknown"
    if ffmpeg_detected:
        try:
            res = subprocess.run([settings.FFMPEG_PATH, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
            if res.returncode == 0:
                ffmpeg_version = res.stdout.split("\n")[0]
        except Exception:
            pass

    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "ffmpeg": {
            "available": ffmpeg_detected,
            "path": settings.FFMPEG_PATH,
            "version": ffmpeg_version
        },
        "ffprobe": {
            "available": ffprobe_detected,
            "path": settings.FFPROBE_PATH
        },
        "storage": {
            "media_dir": str(settings.MEDIA_DIR),
            "uploads_exists": settings.UPLOADS_DIR.exists(),
            "renders_exists": settings.RENDERS_DIR.exists()
        },
        "directories": {
            "media": str(settings.MEDIA_DIR),
            "uploads": str(settings.UPLOADS_DIR),
            "renders": str(settings.RENDERS_DIR)
        }
    }
