package com.cloudpulse.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class CloudPulseController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "UP",
                "service", "backend",
                "platform", "CloudPulse AI"
        );
    }

    @GetMapping("/incidents")
    public Map<String, Object> incidents() {
        return Map.of(
                "environment", "dev",
                "service", "backend",
                "incident", "CrashLoopBackOff detected",
                "restartCount", 5,
                "status", "OPEN"
        );
    }

    @PostMapping("/analyze")
    public Object analyze(@RequestBody Map<String, String> request) {
        return restTemplate.postForObject(
                aiServiceUrl + "/analyze",
                request,
                Object.class
        );
    }

    @GetMapping("/deployments")
    public Map<String, Object> deployments() {
        return Map.of(
                "dev", "Running",
                "prod", "Running",
                "gitops", "Managed by ArgoCD",
                "cluster", "AKS"
        );
    }
}