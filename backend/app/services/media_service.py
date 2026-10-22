import os
import uuid
import json
import subprocess
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
from fastapi import UploadFile, HTTPException
from PIL import Image, ImageOps
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.media import MediaAsset
import requests

class MediaService:
    @staticmethod
    def get_asset(db: Session, asset_id: str) -> Optional[MediaAsset]:
        return db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()

    @staticmethod
    def get_assets_by_project(db: Session, project_id: Optional[str] = None):
        query = db.query(MediaAsset)
        if project_id:
            query = query.filter(MediaAsset.project_id == project_id)
        return query.order_by(MediaAsset.created_at.desc()).all()

    @staticmethod
    def inspect_file_with_ffprobe(file_path: str) -> Dict[str, Any]:
        """Run ffprobe on a file to extract streams, duration, dimensions."""
        ffprobe = settings.FFPROBE_PATH
        if not ffprobe:
            return {}

        cmd = [
            ffprobe,
            "-v", "error",
            "-show_entries", "format=duration,size:stream=width,height,codec_type,codec_name,r_frame_rate",
            "-of", "json",
            file_path
        ]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15)
            if result.returncode == 0 and result.stdout:
                return json.loads(result.stdout)
        except Exception as e:
            print(f"[MediaService] ffprobe inspection failed for {file_path}: {e}")
        return {}

    @classmethod
    def probe_media(cls, file_path) -> Dict[str, Any]:
        """Convenience method returning duration, width, height, has_audio."""
        info = cls.inspect_file_with_ffprobe(str(file_path))
        format_info = info.get("format", {})
        duration = float(format_info.get("duration", 0.0))
        width, height = None, None
        has_audio = False
        for s in info.get("streams", []):
            if s.get("codec_type") == "video":
                width = s.get("width")
                height = s.get("height")
            elif s.get("codec_type") == "audio":
                has_audio = True

        return {
            "duration": duration,
            "width": width,
            "height": height,
            "has_audio": has_audio,
            "has_video": (width is not None and height is not None)
        }

    @staticmethod
    def generate_video_thumbnail(video_path: str, thumbnail_path: str, timestamp: float = 0.5) -> bool:
        """Extract a single frame from a video using ffmpeg."""
        ffmpeg = settings.FFMPEG_PATH
        if not ffmpeg:
            return False

        cmd = [
            ffmpeg,
            "-y",
            "-ss", str(timestamp),
            "-i", video_path,
            "-vframes", "1",
            "-vf", "scale=360:-1",
            thumbnail_path
        ]
        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
            return result.returncode == 0 and os.path.exists(thumbnail_path)
        except Exception as e:
            print(f"[MediaService] Thumbnail generation error: {e}")
            return False

    @staticmethod
    def generate_image_thumbnail(image_path: str, thumbnail_path: str, size=(360, 360)) -> bool:
        """Create a scaled thumbnail for an image using PIL."""
        try:
            with Image.open(image_path) as img:
                img = ImageOps.exif_transpose(img)
                img.thumbnail(size, Image.Resampling.LANCZOS)
                # Ensure RGB mode for JPEG/PNG saving
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGBA")
                else:
                    img = img.convert("RGB")
                img.save(thumbnail_path, "PNG")
            return True
        except Exception as e:
            print(f"[MediaService] PIL thumbnail error: {e}")
            return False

    @classmethod
    async def save_uploaded_file(
        cls,
        db: Session,
        upload_file: UploadFile,
        project_id: Optional[str] = None
    ) -> MediaAsset:
        ext = Path(upload_file.filename or "").suffix.lower()
        if not ext:
            raise HTTPException(status_code=400, detail="Uploaded file missing extension")

        # Determine media type
        if ext in settings.ALLOWED_VIDEO_EXTENSIONS:
            media_type = "video"
        elif ext in settings.ALLOWED_IMAGE_EXTENSIONS:
            media_type = "image"
        elif ext in settings.ALLOWED_AUDIO_EXTENSIONS:
            media_type = "audio"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format '{ext}'. Allowed: Videos ({', '.join(settings.ALLOWED_VIDEO_EXTENSIONS)}), Images ({', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}), Audio ({', '.join(settings.ALLOWED_AUDIO_EXTENSIONS)})"
            )

        asset_id = str(uuid.uuid4())
        unique_filename = f"{asset_id}{ext}"
        destination_path = settings.UPLOADS_DIR / unique_filename

        # Write uploaded file in chunks with max size validation
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        file_size = 0
        try:
            with open(destination_path, "wb") as f:
                while chunk := await upload_file.read(1024 * 1024):
                    file_size += len(chunk)
                    if file_size > max_bytes:
                        raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed size ({settings.MAX_UPLOAD_SIZE_MB}MB)")
                    f.write(chunk)
        except HTTPException:
            if destination_path.exists():
                destination_path.unlink()
            raise
        except Exception as e:
            if destination_path.exists():
                destination_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        # Extract metadata
        width = None
        height = None
        duration = 0.0
        thumbnail_rel_path = None

        if media_type == "video":
            probe_data = cls.inspect_file_with_ffprobe(str(destination_path))
            format_info = probe_data.get("format", {})
            duration = float(format_info.get("duration", 0.0))
            for stream in probe_data.get("streams", []):
                if stream.get("codec_type") == "video":
                    width = stream.get("width")
                    height = stream.get("height")
                    break

            thumb_name = f"thumb_{asset_id}.png"
            thumb_dest = settings.THUMBNAILS_DIR / thumb_name
            if cls.generate_video_thumbnail(str(destination_path), str(thumb_dest), timestamp=min(0.5, duration / 2 if duration > 0 else 0)):
                thumbnail_rel_path = f"/media/thumbnails/{thumb_name}"

        elif media_type == "image":
            duration = 3.5 # Default display duration for image clips
            try:
                with Image.open(destination_path) as img:
                    width, height = img.size
                thumb_name = f"thumb_{asset_id}.png"
                thumb_dest = settings.THUMBNAILS_DIR / thumb_name
                if cls.generate_image_thumbnail(str(destination_path), str(thumb_dest)):
                    thumbnail_rel_path = f"/media/thumbnails/{thumb_name}"
            except Exception as e:
                print(f"[MediaService] Image metadata extraction error: {e}")

        elif media_type == "audio":
            probe_data = cls.inspect_file_with_ffprobe(str(destination_path))
            format_info = probe_data.get("format", {})
            duration = float(format_info.get("duration", 0.0))

        # Store record in database
        asset = MediaAsset(
            id=asset_id,
            project_id=project_id,
            media_type=media_type,
            original_filename=upload_file.filename or unique_filename,
            storage_filename=unique_filename,
            file_path=f"/media/uploads/{unique_filename}",
            thumbnail_path=thumbnail_rel_path,
            duration=duration,
            width=width,
            height=height,
            file_size=file_size,
            mime_type=upload_file.content_type or f"{media_type}/{ext.lstrip('.')}"
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return asset

    @classmethod
    def import_from_url(cls, db: Session, url: str, project_id: Optional[str] = None) -> MediaAsset:
        """Download media from a direct URL with SSRF protection and type validation."""
        # SSRF safety: Prevent local address fetching
        url_lower = url.lower().strip()
        blocked_hosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1"]
        for b in blocked_hosts:
            if f"://{b}" in url_lower:
                raise HTTPException(status_code=400, detail="Cannot import from local addresses.")

        try:
            head_resp = requests.head(url, allow_redirects=True, timeout=10)
            content_type = head_resp.headers.get("content-type", "").lower()
            content_length = int(head_resp.headers.get("content-length", 0))

            if content_length > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"Remote file exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

            # Determine extension
            ext = ".mp4"
            if "video" in content_type:
                ext = ".mp4"
                media_type = "video"
            elif "image" in content_type:
                ext = ".png" if "png" in content_type else ".jpg"
                media_type = "image"
            elif "audio" in content_type:
                ext = ".mp3"
                media_type = "audio"
            else:
                # Try inferring from url path
                path_ext = Path(url.split("?")[0]).suffix.lower()
                if path_ext in settings.ALLOWED_VIDEO_EXTENSIONS:
                    ext = path_ext
                    media_type = "video"
                elif path_ext in settings.ALLOWED_IMAGE_EXTENSIONS:
                    ext = path_ext
                    media_type = "image"
                elif path_ext in settings.ALLOWED_AUDIO_EXTENSIONS:
                    ext = path_ext
                    media_type = "audio"
                else:
                    raise HTTPException(status_code=400, detail="URL does not point to a supported video, image, or audio resource.")

            asset_id = str(uuid.uuid4())
            unique_filename = f"{asset_id}{ext}"
            destination_path = settings.UPLOADS_DIR / unique_filename

            # Stream download
            with requests.get(url, stream=True, timeout=30) as r:
                r.raise_for_status()
                with open(destination_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1024 * 1024):
                        f.write(chunk)

            file_size = os.path.getsize(destination_path)
            width, height, duration = None, None, 0.0
            thumbnail_rel_path = None

            if media_type == "video":
                probe_data = cls.inspect_file_with_ffprobe(str(destination_path))
                format_info = probe_data.get("format", {})
                duration = float(format_info.get("duration", 0.0))
                for stream in probe_data.get("streams", []):
                    if stream.get("codec_type") == "video":
                        width = stream.get("width")
                        height = stream.get("height")
                        break
                thumb_name = f"thumb_{asset_id}.png"
                thumb_dest = settings.THUMBNAILS_DIR / thumb_name
                if cls.generate_video_thumbnail(str(destination_path), str(thumb_dest)):
                    thumbnail_rel_path = f"/media/thumbnails/{thumb_name}"

            elif media_type == "image":
                duration = 3.5
                with Image.open(destination_path) as img:
                    width, height = img.size
                thumb_name = f"thumb_{asset_id}.png"
                thumb_dest = settings.THUMBNAILS_DIR / thumb_name
                if cls.generate_image_thumbnail(str(destination_path), str(thumb_dest)):
                    thumbnail_rel_path = f"/media/thumbnails/{thumb_name}"

            elif media_type == "audio":
                probe_data = cls.inspect_file_with_ffprobe(str(destination_path))
                duration = float(probe_data.get("format", {}).get("duration", 0.0))

            asset = MediaAsset(
                id=asset_id,
                project_id=project_id,
                media_type=media_type,
                original_filename=Path(url.split("?")[0]).name or f"imported_{unique_filename}",
                storage_filename=unique_filename,
                file_path=f"/media/uploads/{unique_filename}",
                thumbnail_path=thumbnail_rel_path,
                duration=duration,
                width=width,
                height=height,
                file_size=file_size,
                mime_type=content_type or f"{media_type}/{ext.lstrip('.')}",
                source_url=url
            )
            db.add(asset)
            db.commit()
            db.refresh(asset)
            return asset

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to import media from URL: {str(e)}")

    @staticmethod
    def delete_asset(db: Session, asset_id: str) -> bool:
        asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
        if not asset:
            return False

        # Remove local files
        file_path = settings.BASE_DIR / asset.file_path.lstrip("/")
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

        if asset.thumbnail_path:
            thumb_path = settings.BASE_DIR / asset.thumbnail_path.lstrip("/")
            if thumb_path.exists():
                try:
                    thumb_path.unlink()
                except Exception:
                    pass

        db.delete(asset)
        db.commit()
        return True
