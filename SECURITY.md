# Security Policy

## Security Overview

EcoScout is built with a **Security-by-Design** and **Zero-Trust Privacy** philosophy. As a public repository and serverless application, we prioritize protection against credentials leaks, data exposure, and web vulnerabilities.

---

## Supported Versions

| Version | Supported          | Security Updates |
| ------- | ------------------ | ---------------- |
| 1.0.x   | :white_check_mark: | Active           |

---

## Security Architecture & Controls

### 1. Zero Persistent Storage & Data Minimization
- **No User Database**: EcoScout operates without a database (no SQL, DynamoDB, or user tables).
- **Ephemeral S3 Storage**: Uploaded image files are processed strictly for label detection and immediately scoped within temporary bucket paths.
- **No PII Collection**: No passwords, personal identifying information (PII), or precise GPS coordinates are collected or stored.

### 2. AWS Identity & IAM Security
- **Least-Privilege Roles**: AWS Lambda execution roles are scoped exclusively to required actions (`rekognition:DetectLabels`, `bedrock:InvokeModel`, `s3:PutObject`).
- **No Hardcoded Credentials**: API Keys, AWS Access Keys, and secret tokens are strictly passed via environment variables or deployment secrets and excluded from git tracking (`.gitignore`).

### 3. Web & API Security Controls
- **Content Security Policy (CSP)**: Strict headers configured via API Gateway and HTML meta tags.
- **Cross-Origin Resource Sharing (CORS)**: Access restricted to configured application origins.
- **Payload Validation**: Input validation enforces MIME type checks (JPEG/PNG), strict payload size limits (5 MB max), and string length caps via `validator.js`.
- **API Rate Limiting**: AWS API Gateway throttling and usage plans prevent abuse and denial-of-service (DoS) attacks.

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in EcoScout, please report it privately:

1. **Email**: Open a security inquiry or email the maintainers directly.
2. **Details to Include**:
   - Description of the vulnerability and potential impact.
   - Step-by-step proof-of-concept (PoC) or command to reproduce.
   - Affected component (Frontend, Lambda Handler, AWS SAM configuration).
3. **Response Timeline**:
   - **Initial Acknowledgement**: Within 24 hours.
   - **Assessment & Fix**: Within 72 hours for critical vulnerabilities.

*Please do NOT create public GitHub issues for unpatched security vulnerabilities.*

---

## License & Compliance

EcoScout is open-source software provided under the [MIT License](LICENSE).
