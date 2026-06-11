from fastapi import FastAPI
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="CloudPulse AI Service")

Instrumentator().instrument(app).expose(app, endpoint="/metrics")


class IncidentRequest(BaseModel):
    environment: str
    issue: str


# ----------------------------------------------------------------
# Incident knowledge base
#
# Each rule is matched (in order) against the lower-cased incident
# text. The first rule whose keywords are present wins, so more
# specific signatures (e.g. OOMKilled) must come before broader
# ones (e.g. generic "memory").
# ----------------------------------------------------------------

INCIDENT_RULES = [
    {
        "match": ["crashloopbackoff", "crash loop", "restarting", "back-off restarting"],
        "category": "Workload",
        "severity": "High",
        "rootCause": "Application container is repeatedly crashing shortly after start, "
                     "so Kubernetes keeps restarting it with an exponential back-off.",
        "recommendation": "Check pod logs, environment variables, ConfigMap, Secret, "
                          "readiness/liveness probes, and resource limits.",
        "remediationSteps": [
            "kubectl logs <pod> --previous to inspect the last crash output.",
            "kubectl describe pod <pod> and review Events for the exit reason and code.",
            "Verify required ConfigMap/Secret keys and environment variables are present.",
            "Confirm liveness/readiness probe paths, ports, and timings are correct.",
            "If the exit is OOM-related, raise memory limits and re-deploy via GitOps.",
        ],
        "confidence": 0.95,
    },
    {
        "match": ["imagepullbackoff", "errimagepull", "image pull", "cannot pull image"],
        "category": "Image",
        "severity": "High",
        "rootCause": "The container image could not be pulled from the registry.",
        "recommendation": "Verify the image tag, image availability in ACR, and image-pull "
                          "permissions (imagePullSecrets / managed identity).",
        "remediationSteps": [
            "kubectl describe pod <pod> and read the Failed/Pull events for the exact error.",
            "Confirm the image:tag exists in ACR (az acr repository show-tags).",
            "Check the AKS kubelet has AcrPull on the registry, or the imagePullSecret is valid.",
            "Re-tag/re-push the image if it is missing, then let ArgoCD re-sync.",
        ],
        "confidence": 0.95,
    },
    {
        "match": ["oomkilled", "oom killed", "out of memory", "exit code 137"],
        "category": "Resources",
        "severity": "High",
        "rootCause": "The container exceeded its memory limit and was terminated "
                     "(OOMKilled) by the kernel/Kubernetes.",
        "recommendation": "Increase memory limits, fix memory leaks, and inspect Grafana "
                          "memory usage panels for the workload.",
        "remediationSteps": [
            "kubectl describe pod <pod> to confirm reason=OOMKilled and exit code 137.",
            "Review container_memory_working_set_bytes in Prometheus/Grafana over time.",
            "Raise resources.limits.memory (and requests) to a safe headroom.",
            "Profile the application for leaks if memory grows unbounded.",
        ],
        "confidence": 0.95,
    },
    {
        "match": ["pending", "unschedulable", "insufficient cpu", "insufficient memory",
                  "no nodes available", "failedscheduling"],
        "category": "Scheduling",
        "severity": "High",
        "rootCause": "Pods are stuck Pending because the scheduler cannot place them "
                     "(insufficient cluster resources, taints, or affinity constraints).",
        "recommendation": "Add node capacity (or enable cluster autoscaler), review requests, "
                          "and check taints/tolerations and node selectors.",
        "remediationSteps": [
            "kubectl describe pod <pod> and read the FailedScheduling event message.",
            "kubectl get nodes -o wide and check allocatable CPU/memory vs requests.",
            "Lower resource requests or scale the AKS node pool / enable autoscaling.",
            "Verify nodeSelector, affinity, and tolerations match available nodes.",
        ],
        "confidence": 0.9,
    },
    {
        "match": ["liveness probe", "readiness probe", "probe failed", "unhealthy",
                  "health check fail"],
        "category": "Health",
        "severity": "Medium",
        "rootCause": "A liveness/readiness probe is failing, so Kubernetes is restarting "
                     "the container or pulling it out of the Service endpoints.",
        "recommendation": "Validate the probe endpoint, port, and initialDelaySeconds/timeout, "
                          "and ensure the app is actually ready in time.",
        "remediationSteps": [
            "kubectl describe pod <pod> and review the probe failure events.",
            "curl the probe path inside the pod (kubectl exec) to confirm it responds.",
            "Increase initialDelaySeconds / periodSeconds if the app starts slowly.",
            "Fix the health endpoint if it returns non-2xx under normal load.",
        ],
        "confidence": 0.85,
    },
    {
        "match": ["5xx", "500", "502", "503", "504", "error rate", "high error",
                  "internal server error", "bad gateway"],
        "category": "Availability",
        "severity": "High",
        "rootCause": "Elevated 5xx error rate indicates the service is failing requests, "
                     "often due to a bad deployment, a downstream dependency, or saturation.",
        "recommendation": "Correlate the error spike with the latest rollout, check downstream "
                          "dependencies, and roll back via ArgoCD if a release caused it.",
        "remediationSteps": [
            "Check the Grafana error-rate / latency dashboard for the onset time.",
            "Correlate with the most recent ArgoCD sync / image rollout.",
            "Inspect application and ingress logs for the failing route.",
            "Roll back the release (argocd app rollback) or scale out if saturated.",
        ],
        "confidence": 0.85,
    },
    {
        "match": ["disk", "ephemeral storage", "no space", "diskpressure", "pvc", "volume"],
        "category": "Storage",
        "severity": "High",
        "rootCause": "The node or pod is under disk/storage pressure (full ephemeral storage, "
                     "exhausted PVC, or DiskPressure eviction).",
        "recommendation": "Free up or expand storage, rotate/ship logs off-node, and raise "
                          "ephemeral-storage limits or PVC size.",
        "remediationSteps": [
            "kubectl describe node <node> and check for DiskPressure conditions.",
            "Identify large writers (logs, temp files) and ship logs to Log Analytics.",
            "Expand the PVC or increase ephemeral-storage requests/limits.",
            "Add log rotation / retention so volumes do not fill again.",
        ],
        "confidence": 0.85,
    },
    {
        "match": ["dns", "connection refused", "timeout", "network", "unreachable",
                  "no route to host", "name resolution"],
        "category": "Networking",
        "severity": "Medium",
        "rootCause": "A networking/DNS problem is preventing the workload from reaching a "
                     "dependency (service discovery, egress, or network policy).",
        "recommendation": "Check CoreDNS, Service/Endpoints, NetworkPolicies, and egress rules "
                          "between the affected components.",
        "remediationSteps": [
            "kubectl exec into the pod and nslookup the target service name.",
            "kubectl get endpoints <svc> to confirm the Service has ready backends.",
            "Review NetworkPolicies and AKS NSG/egress rules for blocks.",
            "Check CoreDNS pod health and logs in kube-system.",
        ],
        "confidence": 0.8,
    },
    {
        "match": ["certificate", "tls", "x509", "ssl", "cert expired", "cert-manager"],
        "category": "Security",
        "severity": "High",
        "rootCause": "A TLS certificate is invalid or expired, breaking secure connections "
                     "or ingress termination.",
        "recommendation": "Renew/reissue the certificate (cert-manager), verify the secret is "
                          "mounted, and confirm the chain and SANs are correct.",
        "remediationSteps": [
            "kubectl describe certificate / certificaterequest for cert-manager status.",
            "Confirm the TLS secret exists and is referenced by the Ingress.",
            "Check the issuer (Let's Encrypt / internal CA) for rate limits or errors.",
            "Force a renewal and re-sync the ingress once the secret updates.",
        ],
        "confidence": 0.85,
    },
    {
        "match": ["cpu", "throttl", "cpu spike", "high load"],
        "category": "Resources",
        "severity": "Medium",
        "rootCause": "CPU usage is very high and the workload may be CPU-throttled, "
                     "degrading latency and throughput.",
        "recommendation": "Enable/verify the HPA, review traffic patterns, raise CPU limits, "
                          "and optimize hot code paths.",
        "remediationSteps": [
            "Inspect container_cpu_cfs_throttled_seconds in Prometheus for throttling.",
            "Confirm an HPA is configured and scaling on CPU.",
            "Raise CPU requests/limits to reduce throttling.",
            "Profile and optimize the heaviest endpoints.",
        ],
        "confidence": 0.85,
    },
    {
        "match": ["memory", "memory pressure", "memory leak"],
        "category": "Resources",
        "severity": "High",
        "rootCause": "The pod is under memory pressure and may be approaching its limit, "
                     "risking eviction or an OOMKill.",
        "recommendation": "Increase memory limits, investigate possible leaks, and inspect "
                          "Grafana memory metrics for the trend.",
        "remediationSteps": [
            "Watch container_memory_working_set_bytes vs the limit in Grafana.",
            "Raise resources.limits.memory with adequate headroom.",
            "Check for unbounded caches or leaks in the application.",
            "Add memory-based alerts so this is caught earlier.",
        ],
        "confidence": 0.85,
    },
]

UNKNOWN_RESULT = {
    "category": "Unknown",
    "severity": "Medium",
    "rootCause": "Unknown issue detected; the symptom did not match a known signature.",
    "recommendation": "Inspect application logs, Kubernetes events, and Prometheus metrics, "
                      "then correlate with the most recent deployment.",
    "remediationSteps": [
        "kubectl describe pod <pod> and review recent Events.",
        "kubectl logs <pod> (and --previous) for stack traces or fatal errors.",
        "Check Grafana dashboards for CPU/memory/error-rate anomalies.",
        "Correlate the onset with the latest ArgoCD sync / rollout.",
    ],
    "confidence": 0.4,
}


def classify(issue_text: str) -> dict:
    """Return the first matching rule for the issue, or the unknown fallback."""
    issue = issue_text.lower()
    for rule in INCIDENT_RULES:
        if any(keyword in issue for keyword in rule["match"]):
            return rule
    return UNKNOWN_RESULT


@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "ai-service"
    }


@app.post("/analyze")
def analyze_incident(request: IncidentRequest):
    result = classify(request.issue)

    return {
        "environment": request.environment,
        "issue": request.issue,
        "category": result["category"],
        "severity": result["severity"],
        "rootCause": result["rootCause"],
        "recommendation": result["recommendation"],
        "remediationSteps": result["remediationSteps"],
        "confidence": result["confidence"],
    }
