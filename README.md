# EcoScout

Production-ready photo-to-recycling advisor for the AWS Zero to Shipped hackathon (Social Good / Climate Resilience). Users photograph a waste item; Amazon Rekognition identifies it; Amazon Bedrock (Claude 3 Haiku) writes hyper-local recycling advice; the UI awards eco-points.

## Architecture

```
Browser (Amplify)
  -> Amazon API Gateway REST (API key + usage plan, CORS locked to one origin)
    -> AWS Lambda (Node.js 20)
      -> Amazon S3 (SSE-S3, private, versioned, 1-day expiry)
      -> Amazon Rekognition DetectLabels
      -> Amazon Bedrock Converse (Claude 3 Haiku)
      -> S3 DeleteObject
```

No AWS credentials sit in the frontend. The browser only calls API Gateway with an API key (a usage-plan identifier, visible in DevTools by design). IAM credentials stay on Lambda.

## Repository layout

```
frontend/          Amplify static site
backend/src/      Lambda handlers and AWS SDK v3 clients
backend/template.yaml
docs/proof.md
amplify.yml
```

## Prerequisites

- AWS account with CLI credentials
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20+ (for local `npm install` if you inspect `backend/src`)
- Bedrock model access enabled in the **same Region** you deploy to: Amazon Bedrock console → Model access → Anthropic Claude 3 Haiku (`anthropic.claude-3-haiku-20240307-v1:0`)
- Rekognition and S3 available in that Region (image Region must match Rekognition)

Suggested Region: `us-east-1`.

## Deploy the backend

```bash
cd backend
sam build
sam deploy --guided
```

When prompted:

| Parameter | What to enter |
| --- | --- |
| Stack name | `ecoscout` |
| AWS Region | `us-east-1` (or your Bedrock Region) |
| AllowedOrigin | `http://localhost:5500` first, then your Amplify origin (`https://main.dxxxxx.amplifyapp.com`) with **no trailing slash** |
| BedrockModelId | `anthropic.claude-3-haiku-20240307-v1:0` |
| BedrockInferenceProfileArn | leave empty unless your account requires an inference profile |

After deploy, copy outputs:

```bash
aws cloudformation describe-stacks --stack-name ecoscout --query "Stacks[0].Outputs"
aws apigateway get-api-key --api-key <ApiKeyId> --include-value --query "value" --output text
```

Create `frontend/config.js` from the example:

```bash
cp frontend/config.example.js frontend/config.js
```

Set `apiUrl` to the `ApiUrl` output and `apiKey` to the retrieved key value.

Redeploy the SAM stack when the Amplify URL is known so CORS matches that origin exactly (`AllowedOrigin` is not `*`).

## Host the frontend

1. Push this repo (keep `frontend/config.js` out of git; add it in the Amplify console as a build step or commit it only in a private fork).
2. AWS Amplify Hosting → connect the repo → app root can stay the repository root; [`amplify.yml`](amplify.yml) publishes `frontend/**`.
3. Ensure `frontend/config.js` exists in the artifact (copy it in `amplify.yml` `preBuild` if you inject secrets from Amplify environment variables).

Example `amplify.yml` snippet if you store values as Amplify env vars:

```bash
printf 'window.ECOScoutConfig = { apiUrl: "%s", apiKey: "%s" };\n' "$API_URL" "$API_KEY" > frontend/config.js
```

## Local preview

From `frontend/` (with `config.js` filled in):

```bash
npx --yes serve -l 5500
```

Open `http://localhost:5500`. AllowedOrigin must include that origin.

## Security controls

- REST API requires `x-api-key`
- Usage plan: **100 requests / day** and 10 req/s (burst 20) **per API key**, not per IP. API Gateway usage plans cannot quota by client IP. True per-IP daily caps need WAF (5-minute windows) or an application counter.
- Lambda IAM: S3 only on `uploads/*`; Bedrock only on the Haiku foundation-model ARN (plus optional inference profile); Rekognition `DetectLabels` and X-Ray require `Resource: "*"` because those APIs do not support resource-level IAM
- S3: block public access, versioning, SSE-S3, TLS-only bucket policy, lifecycle expire 1 day
- Images deleted after analysis
- Input validation: JPEG/PNG magic bytes, 5 MB max, city and US ZIP
- CORS and CSP on API responses; CSP + frame deny on Amplify responses

## Limits

- Rekognition image APIs accept JPEG and PNG only (no WebP)
- API Gateway payload cap is 10 MB; EcoScout rejects decoded images over 5 MB
- Drop-off locations are **mock data** keyed by ZIP prefix
- Community stats are **mock counters**
- Eco-points persist in `localStorage` on the device

## Demo script

See [docs/proof.md](docs/proof.md).
