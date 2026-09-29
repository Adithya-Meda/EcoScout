# Privacy & Data Protection Policy

**Last Updated:** September 2026

EcoScout is designed with a **Privacy-First** architecture. We believe that helping users recycle right should never require sacrificing personal privacy.

---

## 1. Information We Process

When you use EcoScout, the application processes only the minimal data required to determine local recycling guidelines:

- **Uploaded Waste Photo**: Transmitted securely to AWS Rekognition solely to identify the object (e.g. plastic bottle, aluminum can).
- **City & Postal/PIN Code**: Used to query municipal solid waste rules (e.g. BBMP Bengaluru 3-bin rules vs US curbside rules).

---

## 2. Information We DO NOT Collect or Store

- **No User Accounts or Login**: You can use EcoScout without creating an account or logging in.
- **No Database Storage**: We do not maintain any user database, tracking logs, or profile history.
- **No Precise GPS Location**: We do not request or track device GPS coordinates.
- **No Third-Party Advertising Trackers**: No tracking cookies or advertising pixels are used.

---

## 3. Image Handling & Data Retention

- **Ephemeral Processing**: Photos uploaded to EcoScout are stored in a temporary AWS S3 bucket solely for label analysis.
- **No AI Model Training on User Images**: Uploaded images are not used to train AI models or stored permanently.
- **Automatic Cleanup**: Temporary upload objects are automatically deleted.

---

## 4. Third-Party Infrastructure Services

EcoScout utilizes enterprise AWS cloud services:
- **AWS Rekognition**: Image label detection.
- **Amazon Bedrock**: Generative AI contextual reasoning.
- **AWS API Gateway & Lambda**: Serverless backend execution.

All data transmission between the user's browser and AWS is encrypted in transit using **TLS 1.3 / HTTPS**.

---

## 5. Contact & Questions

For questions regarding privacy or data handling, please review our open-source codebase on GitHub or submit an inquiry via our repository issue tracker.
