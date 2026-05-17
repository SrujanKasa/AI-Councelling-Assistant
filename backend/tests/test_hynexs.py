"""Backend tests for Hynexs Edu Counseller API"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://counseling-compass-1.preview.emergentagent.com").rstrip("/")


# Test user fixture for the testuser@hynexsedu.com account
@pytest.fixture(scope="module")
def test_user_token():
    # Ensure exists
    requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test User", "email": "testuser@hynexsedu.com", "password": "Test@123"
    })
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@hynexsedu.com", "password": "Test@123"
    })
    if r.status_code == 200:
        return r.json()["access_token"]
    pytest.skip("Test user login failed")


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
        assert data["user"]["email"] == email.lower()

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
            "exam_type": "JEE_MAIN",
            "rank": 10000,
            "category": "OPEN",
            "gender": "Male"
        })
        assert r.status_code == 200
        data = r.json()
        assert "safe" in data
        total = len(data["safe"]) + len(data["target"]) + len(data["dream"])
        print(f"JEE_MAIN OPEN results: {total}")
        assert total > 0

    def test_josaa_prediction_obc(self):
        r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "JEE_MAIN",
            "rank": 5000,
            "category": "OBC-NCL",
            "gender": "Female"
        })
        assert r.status_code == 200
        data = r.json()
        total = len(data["safe"]) + len(data["target"]) + len(data["dream"])
        print(f"JEE_MAIN OBC results: {total}")
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


# === New tests for iteration 3 ===

# Test login of named test user
class TestNamedTestUser:
    def test_login_testuser(self):
        # Ensure the user exists (register may fail if already there - that's fine)
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User", "email": "testuser@hynexsedu.com", "password": "Test@123"
        })
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@hynexsedu.com", "password": "Test@123"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 10
        assert data["user"]["email"] == "testuser@hynexsedu.com"


# JEE_MAIN predict (exam_type as JEE_MAIN per review request)
class TestJeeMainPrediction:
    def test_jee_main_rank_10000_open(self):
        r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "JEE_MAIN",
            "rank": 10000,
            "category": "OPEN",
            "gender": "Male"
        })
        # Some implementations accept JEE_MAIN; some only JOSAA. Try both.
        if r.status_code != 200:
            r = requests.post(f"{BASE_URL}/api/predictions/predict", json={
                "exam_type": "JOSAA", "rank": 10000, "category": "OPEN", "gender": "Male"
            })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "safe" in data
        assert "target" in data
        assert "dream" in data
        total = len(data["safe"]) + len(data["target"]) + len(data["dream"])
        assert total > 0
        # capture an institute + branch for trend test
        for bucket in ("safe", "target", "dream"):
            if data[bucket]:
                item = data[bucket][0]
                global SAMPLE_INSTITUTE, SAMPLE_BRANCH
                SAMPLE_INSTITUTE = item.get("institute")
                SAMPLE_BRANCH = item.get("branch")
                break


SAMPLE_INSTITUTE = None
SAMPLE_BRANCH = None


# Trend endpoint
class TestTrend:
    def test_trend_with_jee_main_sample(self):
        # Get a sample first
        rp = requests.post(f"{BASE_URL}/api/predictions/predict", json={
            "exam_type": "JEE_MAIN", "rank": 10000, "category": "OPEN", "gender": "Male"
        })
        if rp.status_code != 200:
            rp = requests.post(f"{BASE_URL}/api/predictions/predict", json={
                "exam_type": "JOSAA", "rank": 10000, "category": "OPEN", "gender": "Male"
            })
        assert rp.status_code == 200, rp.text
        pdata = rp.json()
        sample = None
        for bucket in ("safe", "target", "dream"):
            if pdata.get(bucket):
                sample = pdata[bucket][0]
                break
        assert sample is not None
        # Try JEE_MAIN exam type first
        r = requests.get(f"{BASE_URL}/api/predictions/trend", params={
            "exam_type": "JEE_MAIN",
            "institute": sample["institute"],
            "branch": sample["branch"],
            "category": "OPEN",
            "gender": "Male",
            "quota": "AI",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "data" in data
        assert "trend" in data
        assert "predicted_2026" in data
        # 3 year-cards 2023/2024/2025
        years = [d["year"] for d in data["data"]]
        assert 2023 in years and 2024 in years and 2025 in years
        print(f"Trend: {data['trend']} predicted_2026={data['predicted_2026']}")


# Payment create-order
class TestPaymentCreateOrder:
    def test_create_order_returns_key_id(self):
        import uuid
        email = f"paykey_{uuid.uuid4().hex[:6]}@test.com"
        rr = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Pay Key", "email": email, "password": "Test@123"
        })
        assert rr.status_code == 200
        token = rr.json()["access_token"]
        r = requests.post(f"{BASE_URL}/api/payment/create-order",
                         headers={"Authorization": f"Bearer {token}"},
                         json={"amount": 5000})
        assert r.status_code == 200, r.text
        data = r.json()
        # Check order_id present
        assert any(k in data for k in ["order_id", "id", "razorpay_order_id"]), data
        # Check key_id matches expected razorpay test key
        key_id = data.get("key_id") or data.get("razorpay_key_id") or data.get("key")
        assert key_id == "rzp_test_SqLzcj7Txvg9w7", f"Got key_id: {key_id}"


# Google session - invalid session id should return 401 (or 400)
class TestGoogleSession:
    def test_invalid_session_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/auth/google-session", json={
            "session_id": "INVALID_SESSION_ID_FOR_TESTING_12345"
        })
        # Route must be reachable - return 401 (invalid) or 400 (no email)
        assert r.status_code in (400, 401), f"Got {r.status_code}: {r.text}"
