import os
import shutil
import subprocess
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.project import Project
from app.models.ranking import RankingEntry
from app.models.media import MediaAsset
from app.models.render import RenderJob
from app.rendering.overlay_generator import OverlayGenerator
from app.services.media_service import MediaService

class FFmpegRenderEngine:
    @staticmethod
    def _update_job(
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[float] = None,
        step: Optional[str] = None,
        error: Optional[str] = None,
        output_url: Optional[str] = None,
        output_path: Optional[str] = None,
        file_size: Optional[int] = None,
        duration: Optional[float] = None
    ):
        """Thread-safe update of RenderJob status in SQLite."""
        db: Session = SessionLocal()
        try:
            job = db.query(RenderJob).filter(RenderJob.id == job_id).first()
            if job:
                if status is not None:
                    job.status = status
                if progress is not None:
                    job.progress = round(progress, 1)
                if step is not None:
                    job.current_step = step
                if error is not None:
                    job.error_message = error
                if output_url is not None:
                    job.output_url = output_url
                if output_path is not None:
                    job.output_path = output_path
                if file_size is not None:
                    job.file_size = file_size
                if duration is not None:
                    job.duration = duration
                if status in ("completed", "failed"):
                    job.completed_at = datetime.utcnow()
                db.commit()
        except Exception as e:
            print(f"[FFmpegRenderEngine] DB update error: {e}")
        finally:
            db.close()

    @classmethod
    def render_project(cls, db_factory=None, job_id: str = "", project_id: str = "", options=None):
        return cls.execute_render_job(job_id)

    @classmethod
    def execute_render_job(cls, job_id: str):
        """Main rendering pipeline executed synchronously or via background task."""
        db: Session = SessionLocal()
        temp_dir = settings.TEMP_DIR / job_id
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            job = db.query(RenderJob).filter(RenderJob.id == job_id).first()
            if not job:
                return

            project: Project = db.query(Project).filter(Project.id == job.project_id).first()
            if not project:
                cls._update_job(job_id, status="failed", error="Project not found")
                return

            cls._update_job(job_id, status="preparing", progress=5.0, step="Validating project settings and assets")

            # Parse canvas dimensions
            res_parts = (job.resolution or "1080x1920").split("x")
            width = int(res_parts[0]) if len(res_parts) == 2 else 1080
            height = int(res_parts[1]) if len(res_parts) == 2 else 1920
            fps = job.fps or 30

            # Gather ranking entries
            entries: List[RankingEntry] = db.query(RankingEntry).filter(
                RankingEntry.project_id == project.id
            ).order_by(RankingEntry.position.asc()).all()

            if not entries:
                cls._update_job(job_id, status="failed", error="Project contains no ranking entries.")
                return

            all_numbers = [e.display_number or str(e.position) for e in entries]
            total_entries = len(entries)
            segment_files = []

            title_config = project.title_config or {}
            ranking_config = project.ranking_config or {}
            footer_config = project.footer_config or {}
            audio_config = project.audio_config or {}

            # Generate procedural transition sound effect if enabled
            transition_sfx = audio_config.get("transition_sfx", "none")
            sfx_volume = float(audio_config.get("sfx_volume", 0.7))
            sfx_file = None

            sfx_presets = {
                "ding": "aevalsrc=exprs='sin(2*PI*1760*t)*exp(-8*t)':s=44100:d=0.5",
                "bell": "aevalsrc=exprs='(sin(2*PI*1046.5*t)+0.5*sin(2*PI*2093*t))*exp(-6*t)':s=44100:d=0.6",
                "whoosh": "anoisesrc=d=0.35:c=pink:r=44100,bandpass=f=800:width_type=h:w=600,afade=t=in:st=0:d=0.1,afade=t=out:st=0.15:d=0.2",
                "pop": "aevalsrc=exprs='sin(2*PI*850*exp(-20*t)*t)*exp(-25*t)':s=44100:d=0.18",
                "beep": "aevalsrc=exprs='sin(2*PI*880*t)':s=44100:d=0.25,afade=t=out:st=0.15:d=0.1",
                "horn": "aevalsrc=exprs='(sin(2*PI*330*t)+sin(2*PI*440*t)+sin(2*PI*550*t))*exp(-4*t)':s=44100:d=0.6",
                "camera": "anoisesrc=d=0.12:c=white:r=44100,afade=t=out:st=0.02:d=0.1"
            }

            if transition_sfx and transition_sfx in sfx_presets:
                try:
                    sfx_path = temp_dir / "sfx.wav"
                    sfx_gen_cmd = [
                        settings.FFMPEG_PATH, "-y",
                        "-f", "lavfi", "-i", sfx_presets[transition_sfx],
                        "-af", f"volume={sfx_volume}",
                        "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2",
                        str(sfx_path)
                    ]
                    sfx_res = subprocess.run(sfx_gen_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10)
                    if sfx_res.returncode == 0 and sfx_path.exists():
                        sfx_file = sfx_path
                except Exception as sfx_err:
                    print(f"[FFmpegRenderEngine] Warning: Could not generate SFX tone: {sfx_err}")

            # Process each segment
            for i, entry in enumerate(entries):
                step_progress = 10.0 + (float(i) / total_entries) * 65.0
                cls._update_job(
                    job_id,
                    status="rendering",
                    progress=step_progress,
                    step=f"Rendering ranking #{entry.display_number or (i+1)} ({i+1}/{total_entries})"
                )

                overlay_png = temp_dir / f"overlay_{i}.png"
                OverlayGenerator.generate_segment_overlay(
                    output_path=overlay_png,
                    canvas_width=width,
                    canvas_height=height,
                    title_config=title_config,
                    ranking_config=ranking_config,
                    footer_config=footer_config,
                    all_ranking_numbers=all_numbers,
                    active_index=i
                )

                # Segment output
                seg_output = temp_dir / f"seg_{i}.mp4"
                asset: Optional[MediaAsset] = entry.asset

                # Determine duration and video scaling
                display_dur = entry.display_duration or 3.5

                fit_mode = entry.fit_mode or "contain"
                if fit_mode == "cover":
                    scale_filter = f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1"
                else: # contain with black bars
                    scale_filter = f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"

                if asset and asset.file_path:
                    raw_asset_path = settings.MEDIA_DIR / asset.file_path.replace("/media/", "")
                else:
                    raw_asset_path = None

                # Build ffmpeg command for this segment
                orig_vol = float(audio_config.get("original_volume", 1.0))
                if raw_asset_path and raw_asset_path.exists():
                    if asset.media_type == "image":
                        # Image to video segment + overlay + audio (with optional SFX)
                        if sfx_file:
                            cmd = [
                                settings.FFMPEG_PATH,
                                "-y",
                                "-loop", "1",
                                "-t", str(display_dur),
                                "-i", str(raw_asset_path),
                                "-i", str(overlay_png),
                                "-f", "lavfi",
                                "-t", str(display_dur),
                                "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                                "-i", str(sfx_file),
                                "-filter_complex",
                                f"[0:v]{scale_filter}[base];[base][1:v]overlay=0:0[outv];[2:a][3:a]amix=inputs=2:duration=first:dropout_transition=0[outa]",
                                "-map", "[outv]",
                                "-map", "[outa]",
                                "-c:v", "libx264",
                                "-pix_fmt", "yuv420p",
                                "-r", str(fps),
                                "-preset", "veryfast",
                                "-c:a", "aac",
                                "-b:a", "192k",
                                "-shortest",
                                str(seg_output)
                            ]
                        else:
                            cmd = [
                                settings.FFMPEG_PATH,
                                "-y",
                                "-loop", "1",
                                "-t", str(display_dur),
                                "-i", str(raw_asset_path),
                                "-i", str(overlay_png),
                                "-f", "lavfi",
                                "-t", str(display_dur),
                                "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                                "-filter_complex",
                                f"[0:v]{scale_filter}[base];[base][1:v]overlay=0:0[outv]",
                                "-map", "[outv]",
                                "-map", "2:a",
                                "-c:v", "libx264",
                                "-pix_fmt", "yuv420p",
                                "-r", str(fps),
                                "-preset", "veryfast",
                                "-c:a", "aac",
                                "-b:a", "192k",
                                "-shortest",
                                str(seg_output)
                            ]
                    else: # Video asset
                        trim_s = entry.trim_start or 0.0
                        probe_res = MediaService.probe_media(raw_asset_path)
                        asset_dur = probe_res["duration"]
                        if entry.trim_end and entry.trim_end > trim_s:
                            seg_dur = entry.trim_end - trim_s
                        elif asset_dur > trim_s:
                            seg_dur = min(display_dur, asset_dur - trim_s)
                        else:
                            seg_dur = display_dur

                        has_audio = probe_res["has_audio"] and not entry.is_muted

                        if has_audio:
                            if sfx_file:
                                cmd = [
                                    settings.FFMPEG_PATH,
                                    "-y",
                                    "-ss", str(trim_s),
                                    "-t", str(seg_dur),
                                    "-i", str(raw_asset_path),
                                    "-i", str(overlay_png),
                                    "-i", str(sfx_file),
                                    "-filter_complex",
                                    f"[0:v]{scale_filter}[base];[base][1:v]overlay=0:0[outv];[0:a]volume={orig_vol},aformat=channel_layouts=stereo:sample_rates=44100[a0];[a0][2:a]amix=inputs=2:duration=first:dropout_transition=0[outa]",
                                    "-map", "[outv]",
                                    "-map", "[outa]",
                                    "-c:v", "libx264",
                                    "-pix_fmt", "yuv420p",
                                    "-r", str(fps),
                                    "-preset", "veryfast",
                                    "-c:a", "aac",
                                    "-b:a", "192k",
                                    str(seg_output)
                                ]
                            else:
                                cmd = [
                                    settings.FFMPEG_PATH,
                                    "-y",
                                    "-ss", str(trim_s),
                                    "-t", str(seg_dur),
                                    "-i", str(raw_asset_path),
                                    "-i", str(overlay_png),
                                    "-filter_complex",
                                    f"[0:v]{scale_filter}[base];[base][1:v]overlay=0:0[outv];[0:a]volume={orig_vol},aformat=channel_layouts=stereo:sample_rates=44100[outa]",
                                    "-map", "[outv]",
                                    "-map", "[outa]",
                                    "-c:v", "libx264",
                                    "-pix_fmt", "yuv420p",
                                    "-r", str(fps),
                                    "-preset", "veryfast",
                                    "-c:a", "aac",
                                    "-b:a", "192k",
                                    str(seg_output)
                                ]
                        else:
                            # Video with silent audio injected + optional SFX
                            if sfx_file:
                                cmd = [
                                    settings.FFMPEG_PATH,
                                    "-y",
                                    "-ss", str(trim_s),
                                    "-t", str(seg_dur),
                                    "-i", str(raw_asset_path),
                                    "-i", str(overlay_png),
                                    "-f", "lavfi",
                                    "-t", str(seg_dur),
                                    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                                    "-i", str(sfx_file),
                                    "-filter_complex",
                                    f"[0:v]{scale_filter}[base];[base][1:v]overlay=0:0[outv];[2:a][3:a]amix=inputs=2:duration=first:dropout_transition=0[outa]",
                                    "-map", "[outv]",
                                    "-map", "[outa]",
                                    "-c:v", "libx264",
                                    "-pix_fmt", "yuv420p",
                                    "-r", str(fps),
                                    "-preset", "veryfast",
                                    "-c:a", "aac",
                                    "-b:a", "192k",
                                    str(seg_output)
                                ]
                            else:
                                cmd = [
                                    settings.FFMPEG_PATH,
                                    "-y",
                                    "-ss", str(trim_s),
                                    "-t", str(seg_dur),
                                    "-i", str(raw_asset_path),
                                    "-i", str(overlay_png),
                                    "-f", "lavfi",
                                    "-t", str(seg_dur),
                                    "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                                    "-filter_complex",
                                    f"[0:v]{scale_filter}[base];[base][1:v]overlay=0:0[outv]",
                                    "-map", "[outv]",
                                    "-map", "2:a",
                                    "-c:v", "libx264",
                                    "-pix_fmt", "yuv420p",
                                    "-r", str(fps),
                                    "-preset", "veryfast",
                                    "-c:a", "aac",
                                    "-b:a", "192k",
                                    str(seg_output)
                                ]
                else:
                    # Fallback solid background clip with label for ranking entry
                    if sfx_file:
                        cmd = [
                            settings.FFMPEG_PATH,
                            "-y",
                            "-f", "lavfi",
                            "-t", str(display_dur),
                            "-i", f"color=c=0x0f172a:s={width}x{height}:r={fps}",
                            "-i", str(overlay_png),
                            "-f", "lavfi",
                            "-t", str(display_dur),
                            "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                            "-i", str(sfx_file),
                            "-filter_complex",
                            "[0:v][1:v]overlay=0:0[outv];[2:a][3:a]amix=inputs=2:duration=first:dropout_transition=0[outa]",
                            "-map", "[outv]",
                            "-map", "[outa]",
                            "-c:v", "libx264",
                            "-pix_fmt", "yuv420p",
                            "-r", str(fps),
                            "-preset", "veryfast",
                            "-c:a", "aac",
                            "-b:a", "192k",
                            str(seg_output)
                        ]
                    else:
                        cmd = [
                            settings.FFMPEG_PATH,
                            "-y",
                            "-f", "lavfi",
                            "-t", str(display_dur),
                            "-i", f"color=c=0x0f172a:s={width}x{height}:r={fps}",
                            "-i", str(overlay_png),
                            "-f", "lavfi",
                            "-t", str(display_dur),
                            "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                            "-filter_complex",
                            "[0:v][1:v]overlay=0:0[outv]",
                            "-map", "[outv]",
                            "-map", "2:a",
                            "-c:v", "libx264",
                            "-pix_fmt", "yuv420p",
                            "-r", str(fps),
                            "-preset", "veryfast",
                            "-c:a", "aac",
                            "-b:a", "192k",
                            str(seg_output)
                        ]


                # Run segment rendering
                proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                if proc.returncode != 0 or not seg_output.exists() or seg_output.stat().st_size == 0:
                    err_msg = f"FFmpeg failed rendering segment {i+1}: {proc.stderr[-500:] if proc.stderr else 'unknown error'}"
                    cls._update_job(job_id, status="failed", error=err_msg)
                    return

                segment_files.append(seg_output)

            # ----------------------------------------------------
            # 2. CONCATENATE SEGMENTS
            # ----------------------------------------------------
            cls._update_job(job_id, status="rendering", progress=80.0, step="Concatenating ranking segments")
            concat_list_file = temp_dir / "concat_list.txt"
            with open(concat_list_file, "w", encoding="utf-8") as f:
                for sf in segment_files:
                    clean_path = str(sf.resolve()).replace("\\", "/")
                    f.write(f"file '{clean_path}'\n")

            concatenated_raw = temp_dir / "concatenated.mp4"
            concat_cmd = [
                settings.FFMPEG_PATH,
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_file),
                "-c", "copy",
                str(concatenated_raw)
            ]
            concat_proc = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if concat_proc.returncode != 0 or not concatenated_raw.exists():
                cls._update_job(job_id, status="failed", error=f"Concat failed: {concat_proc.stderr[-400:]}")
                return

            # ----------------------------------------------------
            # 3. MIX BACKGROUND MUSIC (IF CONFIGURED)
            # ----------------------------------------------------
            cls._update_job(job_id, status="mixing", progress=90.0, step="Mixing audio tracks and background music")
            final_output_file = settings.RENDERS_DIR / f"{job_id}.mp4"

            bgm_asset_id = audio_config.get("bgm_asset_id")
            bgm_asset = db.query(MediaAsset).filter(MediaAsset.id == bgm_asset_id).first() if bgm_asset_id else None
            bgm_path = (settings.MEDIA_DIR / bgm_asset.file_path.replace("/media/", "")) if (bgm_asset and bgm_asset.file_path) else None

            if bgm_path and bgm_path.exists():
                bgm_volume = float(audio_config.get("bgm_volume", 0.4))
                orig_volume = float(audio_config.get("original_volume", 1.0))
                fade_in = float(audio_config.get("bgm_fade_in", 0.5))
                bgm_filter = f"volume={bgm_volume}"
                if fade_in > 0:
                    bgm_filter += f",afade=t=in:st=0:d={fade_in}"

                # Mix video audio and looped BGM
                mix_cmd = [
                    settings.FFMPEG_PATH,
                    "-y",
                    "-i", str(concatenated_raw),
                    "-stream_loop", "-1",
                    "-i", str(bgm_path),
                    "-filter_complex",
                    f"[0:a]volume={orig_volume}[a0];[1:a]{bgm_filter}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]",
                    "-map", "0:v",
                    "-map", "[aout]",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-shortest",
                    str(final_output_file)
                ]
                mix_proc = subprocess.run(mix_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                if mix_proc.returncode != 0:
                    # Fallback to copy if amix failed
                    shutil.copy2(concatenated_raw, final_output_file)
            else:
                shutil.copy2(concatenated_raw, final_output_file)

            # ----------------------------------------------------
            # 4. POST-VALIDATION VIA FFPROBE (WITH FALLBACK)
            # ----------------------------------------------------
            cls._update_job(job_id, status="validating", progress=95.0, step="Validating exported MP4 stream integrity")
            probe_final = MediaService.probe_media(final_output_file)
            final_dur = float(probe_final.get("duration", 0.0))
            file_sz = final_output_file.stat().st_size if final_output_file.exists() else 0

            # If ffprobe is unavailable in environment, fallback to planned entries duration
            if final_dur <= 0.0 and file_sz > 0:
                final_dur = sum(float(e.display_duration or 3.5) for e in entries)

            if file_sz == 0 or final_dur <= 0.0:
                cls._update_job(job_id, status="failed", error="Render validation failed: Output video file is empty.")
                return

            # Completed!
            cls._update_job(
                job_id,
                status="completed",
                progress=100.0,
                step="Render completed successfully",
                output_path=str(final_output_file),
                output_url=f"/media/renders/{job_id}.mp4",
                file_size=file_sz,
                duration=round(final_dur, 2)
            )

        except Exception as e:
            traceback.print_exc()
            cls._update_job(job_id, status="failed", error=f"Render exception: {str(e)}")
        finally:
            db.close()
            # Clean up temp working files
            shutil.rmtree(temp_dir, ignore_errors=True)

FFmpegEngine = FFmpegRenderEngine
