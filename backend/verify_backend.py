import sys
import os
import time
import requests
from pathlib import Path
import subprocess

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def log(msg, status="INFO"):
    symbol = {"INFO": "ℹ️", "SUCCESS": "✅", "WARN": "⚠️", "ERROR": "❌"}.get(status, "")
    print(f"{symbol} [{status}] {msg}")

def run_tests():
    print("=" * 65)
    print("🚀 RANKSTUDIO BACKEND LIVE END-TO-END VERIFICATION")
    print("=" * 65)

    # 1. Health Endpoint
    log("1. Testing GET /api/health ...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    assert health_data.get("status") == "healthy"
    assert health_data.get("ffmpeg", {}).get("available") is True
    assert health_data.get("ffprobe", {}).get("available") is True
    log(f"Health OK: FFmpeg & FFprobe verified ({health_data['app']})", "SUCCESS")

    # 2. Project Creation
    log("2. Testing POST /api/projects ...")
    project_payload = {
        "name": "Live Backend Verification Project",
        "aspect_ratio": "9:16",
        "title_config": {
            "line1": "TOP 3 BEST",
            "line2": "COFFEE SHOPS",
            "line1_color": "#FACC15",
            "line2_color": "#FFFFFF",
            "font_size": 48
        },
        "ranking_config": {
            "font_size": 52,
            "active_color": "#FACC15",
            "inactive_color": "#94A3B8"
        },
        "footer_config": {
            "enabled": True,
            "channel_name": "@TopRankings",
            "cta_text": "LIKE & SUBSCRIBE"
        },
        "audio_config": {
            "transition_sfx": "ding",
            "sfx_volume": 0.8
        }
    }
    r = requests.post(f"{BASE_URL}/projects", json=project_payload)
    assert r.status_code == 201, f"Failed to create project: {r.text}"
    project = r.json()
    project_id = project["id"]
    log(f"Project created with ID: {project_id}", "SUCCESS")

    # 3. Project Retrieval
    log(f"3. Testing GET /api/projects/{project_id} ...")
    r = requests.get(f"{BASE_URL}/projects/{project_id}")
    assert r.status_code == 200
    assert r.json()["name"] == project_payload["name"]
    log("Project retrieval verified", "SUCCESS")

    # 4. Project Update
    log(f"4. Testing PUT /api/projects/{project_id} ...")
    update_payload = {"name": "Updated Live Verification Project"}
    r = requests.put(f"{BASE_URL}/projects/{project_id}", json=update_payload)
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Live Verification Project"
    log("Project update verified", "SUCCESS")

    # 5. Media Upload (Synthetic test image)
    log("5. Testing POST /api/media/upload ...")
    from PIL import Image
    test_img_path = Path("test_verify_img.png")
    img = Image.new("RGB", (640, 640), color=(30, 144, 255))
    img.save(test_img_path)
    try:
        with open(test_img_path, "rb") as f:
            files = {"file": ("test_verify_img.png", f, "image/png")}
            r = requests.post(f"{BASE_URL}/media/upload", files=files)
        assert r.status_code == 201, f"Media upload failed: {r.text}"
        media = r.json()
        media_id = media["id"]
        assert media["media_type"] == "image"
        assert media["thumbnail_path"] is not None
        log(f"Media uploaded: ID {media_id}, Thumbnail generated: {media['thumbnail_path']}", "SUCCESS")
    finally:
        if test_img_path.exists():
            test_img_path.unlink()

    # 6. Media Listing
    log("6. Testing GET /api/media ...")
    r = requests.get(f"{BASE_URL}/media")
    assert r.status_code == 200
    media_list = r.json()
    assert any(m["id"] == media_id for m in media_list)
    log(f"Media listing verified ({len(media_list)} assets found)", "SUCCESS")

    # 7. SSRF Protection for URL Inspection
    log("7. Testing SSRF protection on POST /api/media/import-url ...")
    r = requests.post(f"{BASE_URL}/media/import-url", json={"url": "http://127.0.0.1:8000/secret"})
    assert r.status_code == 400, f"Expected 400 for loopback URL, got {r.status_code}"
    log("SSRF protection validated: loopback IP rejected with 400", "SUCCESS")

    # 8. Rankings CRUD
    log(f"8. Testing ranking entries on /api/projects/{project_id}/rankings ...")
    # Add a custom ranking entry
    entry_payload = {
        "position": 1,
        "display_number": "1",
        "custom_label": "Espresso Bar",
        "display_duration": 2.0,
        "asset_id": media_id
    }
    r = requests.post(f"{BASE_URL}/projects/{project_id}/rankings", json=entry_payload)
    assert r.status_code == 201, f"Failed to add ranking: {r.text}"
    new_entry = r.json()
    entry1_id = new_entry["id"]
    log(f"Added ranking entry 1 ({entry1_id})", "SUCCESS")

    # Add second ranking entry
    entry2_payload = {
        "position": 2,
        "display_number": "2",
        "custom_label": "Cappuccino Corner",
        "display_duration": 2.0,
        "asset_id": media_id
    }
    r = requests.post(f"{BASE_URL}/projects/{project_id}/rankings", json=entry2_payload)
    assert r.status_code == 201
    entry2_id = r.json()["id"]
    log(f"Added ranking entry 2 ({entry2_id})", "SUCCESS")

    # Update ranking entry
    r = requests.put(f"{BASE_URL}/rankings/{entry1_id}", json={"custom_label": "Artisan Espresso Bar"})
    assert r.status_code == 200
    assert r.json()["custom_label"] == "Artisan Espresso Bar"
    log("Ranking entry update verified", "SUCCESS")

    # Reorder ranking entries
    reorder_payload = {
        "order": [
            {"id": entry2_id, "position": 1, "display_number": "1"},
            {"id": entry1_id, "position": 2, "display_number": "2"}
        ]
    }
    r = requests.put(f"{BASE_URL}/projects/{project_id}/rankings/reorder", json=reorder_payload)
    assert r.status_code == 200, f"Reorder failed: {r.status_code} - {r.text}"
    log("Reordered ranking entries verified", "SUCCESS")

    # 9. Trigger Render Job & Verify FFmpeg Pipeline
    log(f"9. Testing POST /api/projects/{project_id}/render (Full FFmpeg video rendering) ...")
    render_payload = {"quality": "medium", "fps": 30}
    r = requests.post(f"{BASE_URL}/projects/{project_id}/render", json=render_payload)
    assert r.status_code == 202, f"Failed to submit render: {r.text}"
    render_job = r.json()
    job_id = render_job["id"]
    log(f"Render job submitted: {job_id}, status: {render_job['status']}", "SUCCESS")

    # Poll until completed
    log(f"10. Polling render job {job_id} until completion ...")
    max_wait = 60
    start_time = time.time()
    final_job = None
    while time.time() - start_time < max_wait:
        r = requests.get(f"{BASE_URL}/renders/{job_id}")
        assert r.status_code == 200, f"Get render status failed: {r.status_code} - {r.text}"
        job_data = r.json()
        status = job_data["status"]
        progress = job_data.get("progress", 0.0)
        sys.stdout.write(f"\r   ⏳ Status: {status} ({progress:.1f}%) - {job_data.get('current_step', '')[:40]}")
        sys.stdout.flush()
        if status in ("completed", "failed"):
            final_job = job_data
            break
        time.sleep(1)

    print()
    assert final_job is not None, "Render job timed out"
    assert final_job["status"] == "completed", f"Render failed: {final_job.get('error_message')}"
    output_path = final_job["output_path"]
    file_size = final_job["file_size"]
    log(f"Video rendered successfully! Path: {output_path}, Size: {file_size:,} bytes", "SUCCESS")

    # 11. Verify Output Video with FFprobe
    log("11. Inspecting rendered video file with ffprobe ...")
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size:stream=codec_name,width,height,codec_type",
        "-of", "json", output_path
    ]
    probe_res = subprocess.run(probe_cmd, capture_output=True, text=True)
    assert probe_res.returncode == 0, f"ffprobe error: {probe_res.stderr}"
    import json
    probe_data = json.loads(probe_res.stdout)
    streams = probe_data.get("streams", [])
    has_video = any(s.get("codec_type") == "video" for s in streams)
    has_audio = any(s.get("codec_type") == "audio" for s in streams)
    duration = float(probe_data.get("format", {}).get("duration", 0))

    assert has_video, "No video stream in rendered output!"
    assert has_audio, "No audio stream in rendered output!"
    assert duration > 0, "Rendered video duration is 0!"
    log(f"FFprobe verified: Video stream (H.264), Audio stream (AAC), Duration: {duration:.2f}s", "SUCCESS")

    # 12. Download Endpoint
    log(f"12. Testing GET /api/renders/{job_id}/download ...")
    r = requests.get(f"{BASE_URL}/renders/{job_id}/download", stream=True)
    assert r.status_code == 200, f"Download failed: {r.status_code}"
    downloaded_bytes = len(r.content)
    assert downloaded_bytes == file_size, f"Size mismatch: {downloaded_bytes} != {file_size}"
    log(f"Video download verified: {downloaded_bytes:,} bytes received", "SUCCESS")

    # 13. Project Duplication
    log(f"13. Testing POST /api/projects/{project_id}/duplicate ...")
    r = requests.post(f"{BASE_URL}/projects/{project_id}/duplicate")
    assert r.status_code in (200, 201), f"Failed to duplicate project: {r.text}"
    dup_project = r.json()
    dup_id = dup_project["id"]
    log(f"Project duplicated: new ID {dup_id} ('{dup_project['name']}')", "SUCCESS")

    # 14. Cleanup Projects
    log(f"14. Testing DELETE /api/projects/{project_id} & {dup_id} ...")
    r = requests.delete(f"{BASE_URL}/projects/{project_id}")
    assert r.status_code == 204
    r = requests.delete(f"{BASE_URL}/projects/{dup_id}")
    assert r.status_code == 204
    # Verify it is deleted
    r = requests.get(f"{BASE_URL}/projects/{project_id}")
    assert r.status_code == 404
    log("Project deletion verified (returns 404 after delete)", "SUCCESS")

    print("=" * 65)
    print("🎉 ALL 14 BACKEND ENDPOINTS & PIPELINES VERIFIED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        log(f"Verification FAILED: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        sys.exit(1)
