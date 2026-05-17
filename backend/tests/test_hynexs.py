"""Backend tests for Hynexs Edu Counseller API"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://counseling-compass-1.preview.emergentagent.com").rstrip("/")


# Health & Stats
class TestHealth:
    def test_health_check(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        print(f"JOSAA records: {data.get('josaa_records')}, TS records: {data.get('ts_eamcet_records')}")

    def test_college_stats(self):
        r = requests.get(f"{BASE_URL}/api/colleges/stats")
        assert r.status_code == 200
        data = r.json()
        assert "josaa_colleges" in data
        assert "ts_colleges" in data


# Auth
class TestAuth:
    def test_register_new_user(self):
        import uuid
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User", "email": email, "password": "Test@123"
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["email"] == email

    def test_register_duplicate_email(self):
        email = "testuser@hynexsedu.com"
        # Try registering twice - first might succeed
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Dup", "email": email, "password": "Test@123"
        })
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Dup2", "email": email, "password": "Test@123"
        })
        assert r.status_code == 400

    def test_login_admin(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hynexsedu.com", "password": "Admin@123"
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@test.com", "password": "wrongpass"
        })
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "admin@hynexsedu.com"


# Predictions
class TestPredictions:
    def test_ts_eamcet_prediction(self):
        r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "TSEAMCET",
            "rank": 5000,
            "category": "OC",
            "gender": "Male"
        })
        assert r.status_code == 200
        data = r.json()
        assert "safe" in data
        assert "target" in data
        assert "dream" in data
        assert "ai_insight" in data
        total = len(data["safe"]) + len(data["target"]) + len(data["dream"])
        print(f"TS EAMCET results: safe={len(data['safe'])}, target={len(data['target'])}, dream={len(data['dream'])}")
        assert total > 0

    def test_josaa_prediction_open(self):
        r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "JOSAA",
            "rank": 10000,
            "category": "OPEN",
            "gender": "Male"
        })
        assert r.status_code == 200
        data = r.json()
        assert "safe" in data
        total = len(data["safe"]) + len(data["target"]) + len(data["dream"])
        print(f"JOSAA OPEN results: {total}")
        assert total > 0

    def test_josaa_prediction_obc(self):
        r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "JOSAA",
            "rank": 5000,
            "category": "OBC-NCL",
            "gender": "Female"
        })
        assert r.status_code == 200
        data = r.json()
        total = len(data["safe"]) + len(data["target"]) + len(data["dream"])
        print(f"JOSAA OBC results: {total}")
        assert total > 0

    def test_prediction_result_structure(self):
        r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "TSEAMCET", "rank": 1000, "category": "OC", "gender": "Male"
        })
        assert r.status_code == 200
        data = r.json()
        if data["safe"]:
            item = data["safe"][0]
            assert "institute" in item
            assert "branch" in item
            assert "category" in item
            assert "probability" in item
            assert "closing_rank" in item


# Counselor
class TestCounselor:
    def test_chat_basic(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/counselor/chat",
                          headers={"Authorization": f"Bearer {admin_token}"},
                          json={"message": "What are good engineering colleges in Hyderabad?", "session_id": "test-session"})
        assert r.status_code == 200
        data = r.json()
        assert "response" in data
        print(f"Counselor response length: {len(data['response'])}")


# Payments
class TestPayments:
    def test_create_order_for_new_user(self):
        """Create a non-premium user and test payment order"""
        import uuid
        email = f"paytest_{uuid.uuid4().hex[:6]}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Pay Test", "email": email, "password": "Test@123"
        })
        assert r.status_code == 200
        token = r.json()["access_token"]
        r2 = requests.post(f"{BASE_URL}/api/payment/create-order",
                           headers={"Authorization": f"Bearer {token}"},
                           json={"amount": 5000})
        assert r2.status_code == 200
        data = r2.json()
        print(f"Payment order: {data}")
        assert any(k in data for k in ["order_id", "id", "razorpay_order_id"])


# Fixtures
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@hynexsedu.com", "password": "Admin@123"
    })
    if r.status_code == 200:
        return r.json()["access_token"]
    pytest.skip("Admin login failed")
