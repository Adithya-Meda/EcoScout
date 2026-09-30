# 🌿 EcoScout — Scan Trash. Recycle Right.

> **AWS Builder Center — Zero to Shipped Hackathon Project (Climate Resilience & Social Good)**

EcoScout removes the guesswork from recycling by combining computer vision AI with generative AI to deliver city-based waste sorting guidance.

---

## 🛠️ AWS Services Utilized

EcoScout is built using a serverless architecture powered by 5 core AWS services:

1. **Amazon S3 (`Amazon Simple Storage Service`)**: Staging ground for uploaded photos with server-side encryption (SSE-S3), strict bucket policies, and ephemeral 1-day lifecycle expiration.
2. **AWS Rekognition**: Computer vision service used for automated object detection, multi-label extraction, and confidence scoring.
3. **Google Gemini API**: Gemini 3.5 Flash-Lite generates contextual recycling guidance from Rekognition labels and the user's city.
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
  └── 3. Rule Reasoning ────────► Google Gemini API (Gemini 3.5 Flash-Lite)
```

---

## ✨ Features

- 👁️ **Multi-Modal AI Vision**: Identifies items instantly using computer vision label detection.
- 🧠 **Hyper-Local Rule Reasoning**: Gemini uses recognized item labels and location to provide practical municipal recycling guidance.
- 📍 **City-Based Guidance**: Uses the city you enter to provide general local recycling guidance without requesting device GPS access.
- ⚡ **Out-Of-The-Box Visual UX**: 3D flip myth cards, typewriter AI text streaming, floating particle canvas background, cursor spotlight glow, HUD target overlays, and 1-click quick demo chips.
- 🔒 **Privacy-conscious**: No EcoScout user accounts or database; photos are staged temporarily in S3. Gemini receives item labels and city, not the photo. Provider data handling depends on the Gemini API billing tier.

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
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

### Gemini API Key Setup
1. Create a Gemini API key in Google AI Studio and restrict it to the Gemini API.
2. In AWS Secrets Manager in `us-east-1`, create a secret named `ecoscout/gemini-api-key` containing the key as its secret value. Do not put the key in frontend config or source control.
3. Gemini API usage is billed by Google, separately from AWS credits. On Google's free tier, submitted prompts and responses may be used to improve Google services and may be reviewed; these prompts include detected labels and city. Review [Google's Gemini API terms](https://ai.google.dev/gemini-api/terms) before using real user data.

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
