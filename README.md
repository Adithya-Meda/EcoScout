# 🌿 EcoScout — Scan Trash. Recycle Right.

> **AWS Builder Center — Zero to Shipped Hackathon Project (Climate Resilience & Social Good)**

EcoScout removes the guesswork from recycling by combining computer vision AI with generative AI to deliver hyper-local, municipal-specific waste sorting guidance based on your city and PIN/ZIP code.

---

## 🛠️ AWS Services Utilized

EcoScout is built using a serverless architecture powered by 5 core AWS services:

1. **Amazon S3 (`Amazon Simple Storage Service`)**: Staging ground for uploaded photos with server-side encryption (SSE-S3), strict bucket policies, and ephemeral 1-day lifecycle expiration.
2. **AWS Rekognition**: Computer vision service used for automated object detection, multi-label extraction, and confidence scoring.
3. **Amazon Bedrock**: Generative AI service (Anthropic Claude Haiku 4.5 via the US cross-region inference profile) used for contextual reasoning against local municipal solid waste rules.
4. **AWS Lambda**: Serverless Node.js 20 execution environment running payload validation, vision AI integration, and prompt orchestration.
5. **Amazon API Gateway**: Secure REST API Gateway enforcing TLS 1.3 encryption, CORS origins, rate limiting/throttling, usage plans, API keys, and OWASP security headers.

---

## 🏗️ Architecture Diagram

```
User Browser (AWS Amplify Hosting)
  │
  ▼
Amazon API Gateway (REST API / CORS Locked / API Key Throttled)
  │
  ▼
AWS Lambda (Node.js 20 Serverless Handler)
  ├── 1. Upload Staging ────────► Amazon S3 (Private, Encrypted, Auto-Expire)
  ├── 2. Vision Labeling ───────► AWS Rekognition (DetectLabels API)
  └── 3. Rule Reasoning ────────► Amazon Bedrock (Claude 3 / Nova Models)
```

---

## ✨ Features

- 👁️ **Multi-Modal AI Vision**: Identifies items instantly using computer vision label detection.
- 🧠 **Hyper-Local Rule Reasoning**: Amazon Bedrock matches municipal solid waste rules (e.g. Indian Solid Waste Management Rules 2016 BBMP/BMC/MCD bin colors vs. US curbside single-stream).
- 📍 **PIN / ZIP Code Location Lookup**: Accepts 6-digit Indian PIN codes (e.g. `560001`, `110001`, `400018`) and 5-digit US ZIP codes (e.g. `78701`, `94103`) without requiring device GPS access.
- ⚡ **Out-Of-The-Box Visual UX**: 3D flip myth cards, typewriter AI text streaming, floating particle canvas background, cursor spotlight glow, HUD target overlays, and 1-click quick demo chips.
- 🔒 **Zero-Knowledge Privacy**: Ephemeral S3 storage, no user accounts, no database, and no stored PII.

---

## 📁 Repository Structure

```
├── frontend/               # Glassmorphic Static Frontend Web Application
│   ├── index.html          # Main Web Application & UI Structure
│   ├── style.css           # Custom Design Tokens, Glassmorphism & Animations
│   ├── app.js              # Application Logic & API Gateway Integration
│   └── config.example.js   # Configuration Template for API Gateway Endpoints
├── backend/                # AWS Serverless SAM Backend
│   ├── src/                # Lambda Handlers, Validation, & SDK v3 Clients
│   └── template.yaml       # AWS SAM Infrastructure-as-Code Specification
├── SECURITY.md             # Security Policy & Vulnerability Disclosure
├── PRIVACY.md              # Privacy & Ephemeral Data Processing Policy
├── LICENSE                 # MIT Open Source License
└── CODE_OF_CONDUCT.md      # Contributor Covenant Code of Conduct
```

---

## 🚀 Deployment Guide

### Prerequisites
- [AWS CLI](https://aws.amazon.com/cli/) configured with deployment credentials.
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
- Amazon Bedrock access to the Claude Haiku 4.5 US inference profile (`us.anthropic.claude-haiku-4-5-20251001-v1:0`) in `us-east-1`.

### 1. Backend Deployment (AWS SAM)
```bash
cd backend
sam build
sam deploy --guided
```

### 2. Frontend Configuration
Copy `frontend/config.example.js` to `frontend/config.js` and paste your deployed `ApiUrl` and `ApiKey`:
```javascript
window.ECOScoutConfig = {
  apiUrl: "https://<your-api-id>.execute-api.us-east-1.amazonaws.com/Prod/analyze",
  apiKey: "YOUR_API_KEY_HERE"
};
```

---

## ⚖️ License
This project is open-source under the [MIT License](LICENSE).
