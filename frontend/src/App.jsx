import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./App.css";
import { Toastex } from "toastex";
import "toastex/toastex.css";

Toastex.config({
  variant: "swift",
  position: "top-center",
  duration: 5,
  sound: true,
});

const API_URL = import.meta.env.VITE_API_URL || "";

function App() {
  const [health, setHealth] = useState({});
  const [deployments, setDeployments] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [environment, setEnvironment] = useState("dev");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");

  // Backend health
  useEffect(() => {
    axios
      .get(`${API_URL}/api/health`)
      .then((res) => {
        setHealth(res.data || {});
        Toastex.success("Backend is healthy and reachable!");
      })
      .catch(() => {
        setHealth({ status: "Backend not reachable" });
        Toastex.error(
          "Backend is not running or unreachable. Please check the service."
        );
      });
  }, []);

  // GitOps / environment status
  useEffect(() => {
    axios
      .get(`${API_URL}/api/deployments`)
      .then((res) => setDeployments(res.data || null))
      .catch(() => setDeployments(null));
  }, []);

  // Open incidents
  useEffect(() => {
    axios
      .get(`${API_URL}/api/incidents`)
      .then((res) => setIncidents(Array.isArray(res.data) ? res.data : []))
      .catch(() => setIncidents([]));
  }, []);

  // Incidents available in the currently selected environment
  const envIncidents = useMemo(
    () => incidents.filter((i) => i.environment === environment),
    [incidents, environment]
  );

  // Keep the selected incident valid when the environment changes
  useEffect(() => {
    if (envIncidents.length === 0) {
      setSelectedIncidentId("");
      return;
    }
    const stillValid = envIncidents.some((i) => i.id === selectedIncidentId);
    if (!stillValid) {
      setSelectedIncidentId(envIncidents[0].id);
    }
  }, [envIncidents, selectedIncidentId]);

  const selectedIncident = envIncidents.find(
    (i) => i.id === selectedIncidentId
  );

  const envStatuses = useMemo(() => {
    if (deployments?.environments?.length) {
      return deployments.environments;
    }
    // Fallback to the flat keys if the richer view is unavailable
    if (deployments) {
      return ["dev", "prod"].map((name) => ({
        name,
        health: deployments[name] === "Running" ? "Healthy" : "Unknown",
        syncStatus: "Unknown",
      }));
    }
    return [];
  }, [deployments]);

  const analyzeIncident = async () => {
    const issue =
      selectedIncident?.type ||
      selectedIncident?.title ||
      "Unknown incident";

    const payload = { environment, issue };

    try {
      setAnalyzing(true);
      Toastex.info("Sending incident to AI for analysis...");

      const res = await axios.post(`${API_URL}/api/analyze`, payload);

      setAnalysis(res.data);
      Toastex.success("AI analysis completed successfully!");
    } catch (err) {
      Toastex.warning(
        "AI service did not respond. The AI service may be down or overloaded."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container">
      <h1>CloudPulse AI</h1>

      <p className="subtitle">
        AI-Powered DevOps Incident Intelligence Platform
      </p>

      <div className="grid">
        {/* Environment / GitOps visibility */}
        <div className="card">
          <h2>Environment Health</h2>

          {envStatuses.length > 0 ? (
            envStatuses.map((env, idx) => (
              <div key={env.name}>
                {idx > 0 && <hr />}
                <h3>{env.name.toUpperCase()}</h3>
                <p>Health: {env.health}</p>
                <p>Sync Status: {env.syncStatus}</p>
                {env.argoApp && <p>ArgoCD App: {env.argoApp}</p>}
              </div>
            ))
          ) : (
            <p>Loading environment status...</p>
          )}

          <hr />
          <p>
            <strong>GitOps:</strong> {deployments?.gitops || "Managed by ArgoCD"}
          </p>
          <p>
            <strong>Cluster:</strong> {deployments?.cluster || "AKS"}
          </p>
        </div>

        {/* Incident selection */}
        <div className="card">
          <h2>Incident Detection</h2>

          <label>
            <strong>Environment</strong>
          </label>

          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          >
            <option value="dev">DEV</option>
            <option value="prod">PROD</option>
          </select>

          <label>
            <strong>Incident</strong>
          </label>

          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: "5px",
              marginBottom: "15px",
            }}
          >
            {envIncidents.length === 0 && (
              <option value="">No open incidents</option>
            )}
            {envIncidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                [{incident.service}] {incident.title}
              </option>
            ))}
          </select>

          {selectedIncident && (
            <p style={{ color: "#94a3b8", marginTop: 0 }}>
              {selectedIncident.id} · restarts: {selectedIncident.restartCount} ·{" "}
              {selectedIncident.status}
            </p>
          )}

          <button onClick={analyzeIncident} disabled={analyzing}>
            {analyzing ? "Analyzing..." : "Analyze with AI"}
          </button>
        </div>

        {/* AI analysis result */}
        <div className="card wide">
          <h2>AI Recommendation</h2>

          {analysis ? (
            <>
              <p>
                <strong>Environment:</strong> {analysis.environment}
              </p>
              {analysis.category && (
                <p>
                  <strong>Category:</strong> {analysis.category}
                </p>
              )}
              <p>
                <strong>Severity:</strong> {analysis.severity}
              </p>
              <p>
                <strong>Root Cause:</strong> {analysis.rootCause}
              </p>
              <p>
                <strong>Recommendation:</strong> {analysis.recommendation}
              </p>

              {Array.isArray(analysis.remediationSteps) &&
                analysis.remediationSteps.length > 0 && (
                  <>
                    <p>
                      <strong>Remediation Steps:</strong>
                    </p>
                    <ol>
                      {analysis.remediationSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </>
                )}

              {typeof analysis.confidence === "number" && (
                <p>
                  <strong>Confidence:</strong>{" "}
                  {Math.round(analysis.confidence * 100)}%
                </p>
              )}
            </>
          ) : (
            <p>No analysis yet.</p>
          )}
        </div>

        {/* Platform status */}
        <div className="card">
          <h2>Platform Status</h2>

          <p>
            <strong>Backend</strong>
          </p>
          <p>Status: {health.status || "Loading..."}</p>
          <p>Service: {health.service || "Loading..."}</p>

          <hr />

          <p>
            <strong>AI Service:</strong> Available
          </p>
          <p>
            <strong>ArgoCD:</strong> Synced
          </p>
          <p>
            <strong>Grafana:</strong> Healthy
          </p>
          <p>
            <strong>Prometheus:</strong> Healthy
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
