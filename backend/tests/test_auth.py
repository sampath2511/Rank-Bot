import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_auth_register_and_login():
    email = "creator@test.com"
    password = "password123"

    # Register
    res = client.post("/api/auth/register", json={"email": email, "password": password})
    assert res.status_code in [201, 400] # 201 or already exists
    if res.status_code == 201:
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == email

    # Login
    res_login = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res_login.status_code == 200
    login_data = res_login.json()
    token = login_data["access_token"]
    assert token

    # Check /me
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == email

def test_user_scoped_projects():
    # Register user 1
    u1_email = "user1@rankstudio.test"
    client.post("/api/auth/register", json={"email": u1_email, "password": "password123"})
    t1 = client.post("/api/auth/login", json={"email": u1_email, "password": "password123"}).json()["access_token"]

    # Register user 2
    u2_email = "user2@rankstudio.test"
    client.post("/api/auth/register", json={"email": u2_email, "password": "password123"})
    t2 = client.post("/api/auth/login", json={"email": u2_email, "password": "password123"}).json()["access_token"]

    # User 1 creates project
    p1 = client.post("/api/projects", json={"name": "User 1 Secret Project"}, headers={"Authorization": f"Bearer {t1}"}).json()
    p1_id = p1["id"]

    # User 1 can view
    r1 = client.get(f"/api/projects/{p1_id}", headers={"Authorization": f"Bearer {t1}"})
    assert r1.status_code == 200

    # User 2 cannot access user 1's project (403 Forbidden)
    r2 = client.get(f"/api/projects/{p1_id}", headers={"Authorization": f"Bearer {t2}"})
    assert r2.status_code == 403
