# Privacy & Data Protection Policy

**Last Updated:** September 2026

EcoScout is designed with a **Privacy-First** architecture. We believe that helping users recycle right should never require sacrificing personal privacy.

---

## 1. Information We Process

When you use EcoScout, the application processes only the minimal data required to determine local recycling guidelines:

- **Uploaded Waste Photo**: Transmitted securely to AWS Rekognition solely to identify the object (e.g. plastic bottle, aluminum can).
- **Detected Labels & City**: Sent to the Google Gemini API to generate city-based disposal guidance. The uploaded photo itself is not sent to Gemini.

---

## 2. Information We DO NOT Collect or Store

- **No User Accounts or Login**: You can use EcoScout without creating an account or logging in.
- **No EcoScout Database**: We do not maintain an EcoScout user database or profile history.
- **No Precise Location**: We do not request or track device GPS coordinates. The city you enter is sent to Gemini with detected item labels.
- **No Third-Party Advertising Trackers**: No tracking cookies or advertising pixels are used.

---

## 3. Image Handling & Data Retention

- **Ephemeral Processing**: Photos uploaded to EcoScout are stored in a temporary AWS S3 bucket solely for label analysis.
- **Image Handling**: Uploaded images are sent to Rekognition for label detection and are not sent to Gemini. They are not stored permanently by EcoScout.
- **Automatic Cleanup**: Temporary upload objects are automatically deleted.

---

## 4. Third-Party Infrastructure Services

EcoScout uses AWS infrastructure and the Google Gemini API:
- **AWS Rekognition**: Image label detection.
- **Google Gemini API**: Uses detected labels and the supplied city to generate advice.
- **AWS API Gateway & Lambda**: Serverless backend execution.

The Gemini request contains detected labels and city, but not the uploaded image. Gemini API data handling differs by billing tier: on Google's unpaid tier, submitted prompts and responses may be used to improve Google services and may be reviewed by humans. Review [Google's Gemini API terms](https://ai.google.dev/gemini-api/terms) before using real user data. Requests are sent from the backend over HTTPS; the API key is stored in AWS Secrets Manager and is never sent to the browser.

---

## 5. Contact & Questions

For questions regarding privacy or data handling, please review our open-source codebase on GitHub or submit an inquiry via our repository issue tracker.
