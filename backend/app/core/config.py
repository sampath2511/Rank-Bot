import os
import shutil
import glob
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RankStudio"
    API_V1_STR: str = "/api"
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    MEDIA_DIR: Path = Path("/tmp/media") if os.environ.get("VERCEL") else (BASE_DIR / "media")
    UPLOADS_DIR: Path = MEDIA_DIR / "uploads"
    THUMBNAILS_DIR: Path = MEDIA_DIR / "thumbnails"
    RENDERS_DIR: Path = MEDIA_DIR / "renders"
    TEMP_DIR: Path = MEDIA_DIR / "temp"
    
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "sqlite:////tmp/rankstudio.db" if os.environ.get("VERCEL") else f"sqlite:///{BASE_DIR}/rankstudio.db"
    )
    
    # Media constraints
    MAX_UPLOAD_SIZE_MB: int = 250
    ALLOWED_VIDEO_EXTENSIONS: set = {".mp4", ".mov", ".webm", ".m4v"}
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}
    ALLOWED_AUDIO_EXTENSIONS: set = {".mp3", ".wav", ".aac", ".m4a", ".ogg"}

    # FFmpeg paths
    FFMPEG_PATH: str = ""
    FFPROBE_PATH: str = ""

    class Config:
        case_sensitive = True
        env_file = ".env"

    def setup_directories(self):
        for directory in [self.MEDIA_DIR, self.UPLOADS_DIR, self.THUMBNAILS_DIR, self.RENDERS_DIR, self.TEMP_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    def resolve_ffmpeg_binaries(self):
        """Find the best available ffmpeg and ffprobe executables."""
        # 1. Check environment variables
        ffmpeg_bin = os.environ.get("FFMPEG_PATH", "")
        ffprobe_bin = os.environ.get("FFPROBE_PATH", "")

        # 2. Check standard system PATH
        if not ffmpeg_bin:
            ffmpeg_bin = shutil.which("ffmpeg") or ""
        if not ffprobe_bin:
            ffprobe_bin = shutil.which("ffprobe") or ""

        # 3. Check Gyan.FFmpeg in Windows WinGet packages
        if not ffmpeg_bin or not ffprobe_bin:
            winget_path = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft" / "WinGet" / "Packages"
            if winget_path.exists():
                ffmpegs = list(winget_path.glob("**/ffmpeg.exe"))
                ffprobes = list(winget_path.glob("**/ffprobe.exe"))
                if ffmpegs and not ffmpeg_bin:
                    ffmpeg_bin = str(ffmpegs[0])
                if ffprobes and not ffprobe_bin:
                    ffprobe_bin = str(ffprobes[0])

        # 4. Check imageio_ffmpeg fallback for ffmpeg
        if not ffmpeg_bin:
            try:
                import imageio_ffmpeg
                ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
            except Exception:
                pass

        self.FFMPEG_PATH = ffmpeg_bin or "ffmpeg"
        self.FFPROBE_PATH = ffprobe_bin or "ffprobe"

settings = Settings()
settings.setup_directories()
settings.resolve_ffmpeg_binaries()
