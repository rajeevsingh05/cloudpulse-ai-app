from fastapi import FastAPI
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="CloudPulse AI Service")

class IncidentRequest(BaseModel):
    environment: str
    issue: str

@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "ai-service"
    }

@app.post("/analyze")
def analyze_incident(request: IncidentRequest):
    issue = request.issue.lower()

    if "crashloopbackoff" in issue:
        root_cause = "Application container is repeatedly crashing."
        recommendation = "Check pod logs, environment variables, ConfigMap, Secret, and memory limits."
        severity = "High"
    elif "cpu" in issue:
        root_cause = "CPU usage is very high."
        recommendation = "Enable HPA and review traffic load."
        severity = "Medium"
    elif "memory" in issue:
        root_cause = "Pod may be facing memory pressure."
        recommendation = "Increase memory limits and inspect Grafana metrics."
        severity = "High"
    else:
        root_cause = "Unknown issue detected."
        recommendation = "Inspect logs and Prometheus metrics."
        severity = "Medium"

    return {
        "environment": request.environment,
        "severity": severity,
        "rootCause": root_cause,
        "recommendation": recommendation
    }

Instrumentator().instrument(app).expose(app)