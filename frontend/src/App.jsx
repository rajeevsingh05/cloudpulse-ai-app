import React from "react";
import { useEffect, useState } from "react";
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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9090";

function App() {
  const [health, setHealth] = useState({});
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/health`)
      .then((res) => {
        setHealth(res.data);
        Toastex.success("Backend is healthy and reachable!");
      })
      .catch(() => {
        setHealth({ status: "Backend not reachable" });
        Toastex.error("Backend is not running or unreachable. Please check the service.");
      });
  }, []);

  const analyzeIncident = async () => {
    const payload = {
      environment: "dev",
      issue: "Backend pod is in CrashLoopBackOff with high restart count",
    };

    try {
      Toastex.info("Sending incident to AI for analysis...");
      const res = await axios.post(`${API_URL}/api/analyze`, payload);
      setAnalysis(res.data);
      Toastex.success("AI analysis completed successfully!");
    } catch (err) {
      Toastex.warning("AI service did not respond. The AI service may be down or overloaded.");
    }
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