package com.cloudpulse.backend;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Map;

@WebMvcTest(CloudPulseController.class)
class CloudpulseBackendApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CloudPulseController controller;

    private RestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        restTemplate = Mockito.mock(RestTemplate.class);
        // Inject the mock into the controller's private final field
        ReflectionTestUtils.setField(controller, "restTemplate", restTemplate);
    }

    // ----------------------------------------------------------------
    // GET /api/health
    // ----------------------------------------------------------------

    @Test
    void health_shouldReturnStatusUp() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("backend"))
                .andExpect(jsonPath("$.platform").value("CloudPulse AI"));
    }

    @Test
    void health_shouldReturnJsonContentType() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    // ----------------------------------------------------------------
    // GET /api/incidents
    // ----------------------------------------------------------------

    @Test
    void incidents_shouldReturnOpenIncidentDetails() throws Exception {
        mockMvc.perform(get("/api/incidents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.environment").value("dev"))
                .andExpect(jsonPath("$.service").value("backend"))
                .andExpect(jsonPath("$.incident").value("CrashLoopBackOff detected"))
                .andExpect(jsonPath("$.restartCount").value(5))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void incidents_shouldReturnJsonContentType() throws Exception {
        mockMvc.perform(get("/api/incidents"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    // ----------------------------------------------------------------
    // GET /api/deployments
    // ----------------------------------------------------------------

    @Test
    void deployments_shouldReturnRunningEnvironments() throws Exception {
        mockMvc.perform(get("/api/deployments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dev").value("Running"))
                .andExpect(jsonPath("$.prod").value("Running"))
                .andExpect(jsonPath("$.gitops").value("Managed by ArgoCD"))
                .andExpect(jsonPath("$.cluster").value("AKS"));
    }

    @Test
    void deployments_shouldReturnJsonContentType() throws Exception {
        mockMvc.perform(get("/api/deployments"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    // ----------------------------------------------------------------
    // POST /api/analyze
    // ----------------------------------------------------------------

    @Test
    void analyze_shouldForwardRequestToAiServiceAndReturnResponse() throws Exception {
        Map<String, Object> aiResponse = Map.of(
                "recommendation", "Increase memory limits",
                "severity", "HIGH"
        );

        when(restTemplate.postForObject(anyString(), any(), eq(Object.class)))
                .thenReturn(aiResponse);

        String requestBody = """
                {
                    "incident": "CrashLoopBackOff detected",
                    "restartCount": "5"
                }
                """;

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recommendation").value("Increase memory limits"))
                .andExpect(jsonPath("$.severity").value("HIGH"));
    }

    @Test
    void analyze_shouldReturnNullWhenAiServiceReturnsNull() throws Exception {
        when(restTemplate.postForObject(anyString(), any(), eq(Object.class)))
                .thenReturn(null);

        String requestBody = """
                {
                    "incident": "OOMKilled"
                }
                """;

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk());
    }

    @Test
    void analyze_shouldReturn4xxForMissingContentType() throws Exception {
        mockMvc.perform(post("/api/analyze")
                        .content("{\"incident\": \"test\"}"))
                .andExpect(status().is4xxClientError());
    }
}
