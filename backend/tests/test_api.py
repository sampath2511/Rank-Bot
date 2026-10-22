import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.url_service import UrlImportService

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ffmpeg" in data
    assert "storage" in data
    assert data["ffmpeg"]["available"] is True

def test_create_and_get_project():
    # Create project
    create_payload = {
        "name": "Test Animals Ranking",
        "aspect_ratio": "9:16",
        "template_type": "standard_ranking"
    }
    create_res = client.post("/api/projects", json=create_payload)
    assert create_res.status_code in (200, 201)
    project_data = create_res.json()
    project_id = project_data["id"]
    assert project_data["name"] == "Test Animals Ranking"
    assert project_data["aspect_ratio"] == "9:16"
    assert project_data["ranking_entries_count"] == 5

    # Get project
    get_res = client.get(f"/api/projects/{project_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == project_id

    # List rankings
    rank_res = client.get(f"/api/projects/{project_id}/rankings")
    assert rank_res.status_code == 200
    rankings = rank_res.json()
    assert len(rankings) == 5

    # Update title config
    update_res = client.put(f"/api/projects/{project_id}", json={
        "name": "Updated Animals Ranking",
        "title_config": {
            "line1": "TOP 5",
            "line2": "WILD CATS",
            "line1_color": "#FACC15",
            "line2_color": "#38BDF8"
        }
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Updated Animals Ranking"
    assert update_res.json()["title_config"]["line1"] == "TOP 5"

    # Delete project
    del_res = client.delete(f"/api/projects/{project_id}")
    assert del_res.status_code in (200, 204)

    # Verify 404 after deletion
    get_deleted = client.get(f"/api/projects/{project_id}")
    assert get_deleted.status_code == 404

def test_url_import_ssrf_protection():
    # Localhost / internal IP should be blocked
    res = client.post("/api/media/import-url", json={"url": "http://127.0.0.1:8000/api/health"})
    assert res.status_code == 400

    res2 = client.post("/api/media/import-url", json={"url": "http://169.254.169.254/metadata"})
    assert res2.status_code == 400

    # Test UrlImportService with YouTube link
    yt_meta = UrlImportService.inspect_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert yt_meta["platform"] == "YouTube"
    assert "Metadata retrieved" in yt_meta["message"]
