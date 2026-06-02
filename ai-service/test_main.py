from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# ----------------------------------------------------------------
# GET /health
# ----------------------------------------------------------------

def test_health_returns_status_up():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"

def test_health_returns_ai_service_name():
    response = client.get("/health")
    assert response.json()["service"] == "ai-service"

# ----------------------------------------------------------------
# POST /analyze — CrashLoopBackOff
# ----------------------------------------------------------------

def test_analyze_detects_crashloopbackoff():
    response = client.post("/analyze", json={
        "environment": "dev",
        "issue": "Backend pod is in CrashLoopBackOff with high restart count"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "High"
    assert "crashing" in data["rootCause"].lower()
    assert data["environment"] == "dev"

# ----------------------------------------------------------------
# POST /analyze — CPU
# ----------------------------------------------------------------

def test_analyze_detects_high_cpu():
    response = client.post("/analyze", json={
        "environment": "prod",
        "issue": "CPU usage is spiking on node pool"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "Medium"
    assert "cpu" in data["rootCause"].lower()

# ----------------------------------------------------------------
# POST /analyze — Memory
# ----------------------------------------------------------------

def test_analyze_detects_memory_pressure():
    response = client.post("/analyze", json={
        "environment": "staging",
        "issue": "Pod OOMKilled due to memory limit exceeded"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "High"
    assert "memory" in data["rootCause"].lower()

# ----------------------------------------------------------------
# POST /analyze — Unknown / fallback
# ----------------------------------------------------------------

def test_analyze_handles_unknown_issue():
    response = client.post("/analyze", json={
        "environment": "dev",
        "issue": "Service is intermittently unresponsive"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "Medium"
    assert "unknown" in data["rootCause"].lower()

def test_analyze_returns_recommendation_for_unknown_issue():
    response = client.post("/analyze", json={
        "environment": "dev",
        "issue": "unknown error"
    })
    assert "recommendation" in response.json()

# ----------------------------------------------------------------
# POST /analyze — Contract / payload validation
# ----------------------------------------------------------------

def test_analyze_response_contains_all_required_fields():
    response = client.post("/analyze", json={
        "environment": "prod",
        "issue": "CrashLoopBackOff detected"
    })
    data = response.json()
    assert all(k in data for k in ["environment", "severity", "rootCause", "recommendation"])

def test_analyze_returns_422_for_missing_fields():
    response = client.post("/analyze", json={"environment": "dev"})  # missing "issue"
    assert response.status_code == 422

def test_analyze_environment_is_echoed_back():
    response = client.post("/analyze", json={
        "environment": "production",
        "issue": "cpu throttling detected"
    })
    assert response.json()["environment"] == "production"
