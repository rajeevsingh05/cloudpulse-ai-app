package com.cloudpulse.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CloudPulseController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${AI_SERVICE_URL:http://cloudpulse-ai-service:8000}")
    private String aiServiceUrl;

    /**
     * Open incidents the operator can choose from. In a real cluster these would
     * come from Prometheus Alertmanager / Kubernetes events; here they are seeded
     * across DEV and PROD so the platform can be demonstrated end-to-end.
     */
    private static final List<Map<String, Object>> INCIDENTS = List.of(
            Map.of(
                    "id", "INC-1001",
                    "environment", "dev",
                    "service", "backend",
                    "type", "CrashLoopBackOff",
                    "title", "CrashLoopBackOff detected",
                    "restartCount", 5,
                    "status", "OPEN"
            ),
            Map.of(
                    "id", "INC-1002",
                    "environment", "dev",
                    "service", "ai-service",
                    "type", "ImagePullBackOff",
                    "title", "ImagePullBackOff pulling ai-service image",
                    "restartCount", 0,
                    "status", "OPEN"
            ),
            Map.of(
                    "id", "INC-1003",
                    "environment", "dev",
                    "service", "frontend",
                    "type", "Readiness probe failed",
                    "title", "Readiness probe failing on frontend",
                    "restartCount", 2,
                    "status", "OPEN"
            ),
            Map.of(
                    "id", "INC-2001",
                    "environment", "prod",
                    "service", "backend",
                    "type", "OOMKilled",
                    "title", "Backend pod OOMKilled (memory limit exceeded)",
                    "restartCount", 3,
                    "status", "OPEN"
            ),
            Map.of(
                    "id", "INC-2002",
                    "environment", "prod",
                    "service", "ai-service",
                    "type", "High CPU",
                    "title", "High CPU usage / throttling on ai-service",
                    "restartCount", 0,
                    "status", "OPEN"
            ),
            Map.of(
                    "id", "INC-2003",
                    "environment", "prod",
                    "service", "backend",
                    "type", "High error rate",
                    "title", "Elevated 5xx error rate after rollout",
                    "restartCount", 0,
                    "status", "OPEN"
            )
    );

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "service", "backend",
                "platform", "CloudPulse AI"
        );
    }

    /**
     * Returns open incidents, optionally filtered by environment
     * (e.g. {@code /api/incidents?environment=prod}).
     */
    @GetMapping("/incidents")
    public List<Map<String, Object>> incidents(
            @RequestParam(value = "environment", required = false) String environment) {
        if (environment == null || environment.isBlank()) {
            return INCIDENTS;
        }
        String env = environment.toLowerCase();
        return INCIDENTS.stream()
                .filter(incident -> env.equals(incident.get("environment")))
                .toList();
    }

    @PostMapping("/analyze")
    public Object analyze(@RequestBody Map<String, String> request) {
        return restTemplate.postForObject(
                aiServiceUrl + "/analyze",
                request,
                Object.class
        );
    }

    /**
     * GitOps / environment visibility. Keeps the original flat keys for
     * backward compatibility and adds a richer per-environment view that the
     * frontend renders in the Environment Health card.
     */
    @GetMapping("/deployments")
    public Map<String, Object> deployments() {
        return Map.of(
                "dev", "Running",
                "prod", "Running",
                "gitops", "Managed by ArgoCD",
                "cluster", "AKS",
                "environments", List.of(
                        Map.of(
                                "name", "dev",
                                "health", "Healthy",
                                "syncStatus", "Synced",
                                "argoApp", "cloudpulse-dev"
                        ),
                        Map.of(
                                "name", "prod",
                                "health", "Healthy",
                                "syncStatus", "Synced",
                                "argoApp", "cloudpulse-prod"
                        )
                )
        );
    }
}
