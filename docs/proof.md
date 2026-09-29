# EcoScout — hackathon proof pack

Category: **Social Good / Climate Resilience**  
App: photo in → item identity + local recycling advice + eco-points.

Use this file as the judging narrative. Replace bracketed items with screenshots and stack outputs after you deploy.

## One-sentence pitch

EcoScout tells people whether a photographed piece of trash is recyclable **where they live**, using Rekognition, Bedrock, and a locked-down serverless API.

## Architecture (what to screenshot)

1. Amplify Hosting console — live URL
2. API Gateway REST API — `/analyze` POST, API key required, usage plan 100/day
3. Lambda `ecoscout-analyze` — Node.js 20, 29s timeout, tracing
4. S3 bucket — Block Public Access on, versioning on, default encryption AES-256
5. IAM role — inline statements scoped to `uploads/*`, the inference profile, and its regional model ARNs
6. Bedrock model access — Claude Haiku 4.5 US inference profile active
7. CloudWatch log group `/aws/lambda/ecoscout-analyze`

Paste stack outputs here:

- API URL:
- API key id:
- Bucket name:
- Region:

## Security mapping

| Requirement | Implementation |
| --- | --- |
| API key + usage plan | SAM `Auth.ApiKeyRequired` and `UsagePlan` quota 100/DAY, throttle 10/20 |
| 100 req/day per IP | **Not native to usage plans.** Quota is per API key. Documented in README. |
| Least-privilege Lambda | S3 object prefix `uploads/*`; Bedrock inference profile and matching regional foundation-model ARNs; Rekognition DetectLabels (service requires `*`) |
| Input validation | MIME + magic bytes, 5 MB, city regex, US ZIP |
| Temp S3 + SSE-S3 | `ServerSideEncryption: AES256` on PutObject; bucket default encryption |
| Block public access + versioning | Bucket properties in `backend/template.yaml` |
| CORS not `*` | `AllowedOrigin` parameter; Lambda echoes that origin |
| No IAM secrets in frontend | Only `apiUrl` + API key; AWS SDK only in Lambda |
| CSP | API JSON responses + Amplify `customHeaders` + HTML meta |
| Rate limit | Usage plan + stage `MethodSettings` throttling |

## Demo script (3 minutes)

1. Open the Amplify URL on a phone (or Chrome device toolbar at 320px).
2. Enter city **Austin** and ZIP **78701**.
3. Photograph an empty aluminum can (or upload a JPEG).
4. Confirm preview, tap **Analyze item**, wait for the spinner.
5. Show item name, recyclability badge, advice, mock drop-off, amber eco-points chip.
6. Scroll to community stats and show count-up animation.
7. Optional fail path: upload a 6 MB file or a `.gif` and show the inline error.

## Screenshots checklist

- [ ] Hero + upload on a 320px viewport
- [ ] Camera capture control on iOS/Android
- [ ] Successful result glass card
- [ ] Validation error (wrong type or oversize)
- [ ] API Gateway usage plan quota
- [ ] S3 public-access block
- [ ] IAM policy JSON (no S3 `*` objects)
- [ ] Bedrock Converse call in CloudWatch / X-Ray

## AWS services used

- Amazon API Gateway (REST)
- AWS Lambda (Node.js 20)
- Amazon S3
- Amazon Rekognition
- Amazon Bedrock (Claude Haiku 4.5 US inference profile, Converse API)
- AWS Amplify Hosting
- AWS IAM, CloudWatch Logs, AWS X-Ray
- AWS SAM / CloudFormation

## Honest limitations for judges

- Drop-off sites and community totals are mock data.
- Eco-points are per-browser, not a global leaderboard.
- Usage-plan quotas apply to the shared frontend API key, not each visitor IP.
- Photos must be JPEG or PNG (Rekognition constraint).
