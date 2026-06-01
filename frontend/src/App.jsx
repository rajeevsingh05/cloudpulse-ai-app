import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9090";

function App() {
  const [health, setHealth] = useState({});
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/health`)
      .then(res => setHealth(res.data))
      .catch(() => setHealth({ status: "Backend not reachable" }));
  }, []);

  const analyzeIncident = async () => {
    const payload = {
      environment: "dev",
      issue: "Backend pod is in CrashLoopBackOff with high restart count"
    };

    const res = await axios.post(`${API_URL}/api/analyze`, payload);
    setAnalysis(res.data);
  };

  return (
    <div className="container">
      <h1>CloudPulse AI</h1>
      <p className="subtitle">AI-Powered DevOps Incident Intelligence Platform</p>

      <div className="grid">
        <div className="card">
          <h2>Environment Health</h2>
          <p>Status: {health.status || "Loading..."}</p>
          <p>Service: {health.service || "backend-api"}</p>
        </div>

        <div className="card">
          <h2>Incident Detection</h2>
          <p>Issue: CrashLoopBackOff detected in dev environment</p>
          <button onClick={analyzeIncident}>Analyze with AI</button>
        </div>

        <div className="card wide">
          <h2>AI Recommendation</h2>
          {analysis ? (
            <>
              <p><b>Severity:</b> {analysis.severity}</p>
              <p><b>Root Cause:</b> {analysis.rootCause}</p>
              <p><b>Recommendation:</b> {analysis.recommendation}</p>
            </>
          ) : (
            <p>No analysis yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;