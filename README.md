# CloudPulse AI — Application Repository

This repository contains the application source code, Dockerfiles, CI/CD workflows, and Terraform infrastructure code for **CloudPulse AI** — a cloud-native microservices platform for real-time Kubernetes incident analysis.

> For full project documentation, architecture diagrams, deployment guides, and GitOps configuration, see the [cloudpulse-ai-gitops](https://github.com/rajeevsingh05/cloudpulse-ai-gitops) repository.

---

## Repository Structure

```
cloudpulse-ai/
├── frontend/               React (Vite) frontend application
├── backend/                Java Spring Boot REST API
├── ai-service/             Python FastAPI AI engine
├── terraform/              Terraform infrastructure as code
└── .github/
    ├── workflows/          GitHub Actions CI/CD pipelines
    └── actions/            Reusable composite actions
```
---

## Services

### Frontend

| Property | Value |
|---|---|
| Framework | React 18 + Vite |
| Build output | `dist/` |
| Container port | 80 |
| Dockerfile | `frontend/Dockerfile` |
| Test command | `npm test` |

The frontend provides a web interface for submitting Kubernetes incident descriptions and viewing AI-generated root-cause analysis and remediation steps.

### Backend API

| Property | Value |
|---|---|
| Framework | Java 21 + Spring Boot 3 |
| Build tool | Maven |
| Container port | 9090 |
| Dockerfile | `backend/Dockerfile` |
| Test command | `mvn test` |
| Metrics endpoint | `/actuator/prometheus` |
| Health endpoint | `/actuator/health` |

The backend is a Spring Boot REST API that receives incident reports from the frontend and proxies them to the AI service. It exposes Prometheus metrics via Spring Boot Actuator.

### AI Service

| Property | Value |
|---|---|
| Framework | Python 3.11 + FastAPI |
| Container port | 8000 |
| Dockerfile | `ai-service/Dockerfile` |
| Test command | `pytest` |
| Metrics endpoint | `/metrics` |

The AI service is a rule-based incident classification engine. It accepts an environment and incident description, matches against a knowledge base of Kubernetes failure patterns, and returns structured analysis including severity, root cause, and step-by-step remediation.

**Supported incident categories:** CrashLoopBackOff, ImagePullBackOff, OOMKilled, Pending/Unschedulable, Readiness Probe Failure, ConfigMap/Secret issues, High CPU, Network Policy issues, Ingress misconfiguration, Node Not Ready, and more.

---

## Dockerfiles

Each service has a multi-stage Dockerfile:

| Service | Dockerfile |
|---|---|
| Frontend | `frontend/Dockerfile` — Node build stage + Nginx serve stage |
| Backend | `backend/Dockerfile` — Maven build stage + JRE runtime stage |
| AI Service | `ai-service/Dockerfile` — Python slim runtime |

Images are tagged as `{env}-{github_run_number}` (e.g., `dev-42`, `prod-17`) and pushed to Azure Container Registry.

---

## CI Workflow

File: `.github/workflows/application-ci.yml`

Triggered on push/PR to `develop` and `main` branches (when application files change).

| Stage | Description |
|---|---|
| **prepare** | Determines environment (`dev`/`prod`/`pr`) and image tag |
| **build-test** | Builds frontend, backend, AI service; runs all unit tests |
| **docker-validation** | Validates Docker image builds (without pushing) |
| **sonarqube** | SonarCloud static analysis + quality gate (PR + main only) |

---

## CD Workflow

File: `.github/workflows/application-cd.yml`

Triggered automatically when CI succeeds. Runs only for `develop` and `main` branches.

| Stage | Description |
|---|---|
| **check-ci** | Fails immediately if CI did not succeed |
| **prepare** | Sets environment and image tag from CI run number |
| **docker-push** | Builds and pushes all 3 Docker images to ACR |
| **trivy** | Scans all images for vulnerabilities |
| **verify** | Confirms images exist in ACR with the correct tag |
| **update-gitops** | Commits updated image tag to `cloudpulse-ai-gitops` repo |

After the image tag is committed to the GitOps repo, ArgoCD automatically syncs the new version to AKS.

---

## Testing

| Service | Test Framework | Coverage |
|---|---|---|
| Frontend | Vitest | Component tests |
| Backend | JUnit 5 + JaCoCo | Unit + integration tests |
| AI Service | pytest + pytest-cov | Unit tests for incident rules |

Coverage reports are uploaded as GitHub Actions artifacts and consumed by SonarCloud.

---

## SonarCloud

SonarCloud code quality analysis runs on:
- Every pull request targeting `develop` or `main`
- Every push to `main`

The quality gate checks code coverage, bugs, vulnerabilities, and code smells. The pipeline fails if the quality gate does not pass.

---

## Image Build and Push

Docker images are built and pushed to Azure Container Registry (`rajeevcloudpulseacr01`) by the CD pipeline:

```
rajeevcloudpulseacr01.azurecr.io/cloudpulse-frontend:{tag}
rajeevcloudpulseacr01.azurecr.io/cloudpulse-backend:{tag}
rajeevcloudpulseacr01.azurecr.io/cloudpulse-ai-service:{tag}
```

Authentication uses **Azure Managed Identity** — no static credentials or image pull secrets required.

---

## Terraform Infrastructure

The `terraform/` directory contains modular Terraform code for all Azure resources:

- **Resource Group** — `rajeevsingh`
- **Virtual Network and Subnet** — AKS node pool network
- **Azure Kubernetes Service** — `cloudpulse-aks` (Central India)
- **Azure Container Registry** — `rajeevcloudpulseacr01`
- **Log Analytics Workspace** — AKS diagnostics
- **Azure Key Vault** — runtime secrets

Infrastructure is provisioned via the **Terraform Infrastructure** GitHub Actions workflow (manual trigger).

---

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev        # dev server on http://localhost:5173
npm test           # run tests
```

### Backend
```bash
cd backend
mvn spring-boot:run    # runs on http://localhost:9090
mvn test               # run tests
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload   # runs on http://localhost:8000
pytest                       # run tests
```

---

## Related Links

- [Full Documentation (GitOps Repo)](https://github.com/rajeevsingh05/cloudpulse-ai-gitops)
- [Solution Architecture](https://github.com/rajeevsingh05/cloudpulse-ai-gitops/blob/main/docs/02-architecture.md)
- [Deployment Guide](https://github.com/rajeevsingh05/cloudpulse-ai-gitops/blob/main/docs/06-deployment-guide.md)
- [CI/CD Workflow](https://github.com/rajeevsingh05/cloudpulse-ai-gitops/blob/main/docs/04-cicd-workflow.md)
