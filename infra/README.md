# Gmart — CI/CD Setup Guide

## Architecture Overview

```
GitHub Push (main)
       │
       ├── Gmart/**  ──────────────────────────────────────────────────────────┐
       │                                                                              │
       │   GitHub Actions: frontend-cicd.yml                                         │
       │   1. TypeScript check                                                        ▼
       │   2. Trigger Amplify webhook                                    AWS Amplify (Web)
       │   3. Wait for Amplify build → ✅                                   (Expo Web build)
       │
       └── Gmart-backend/**  ─────────────────────────────────────────────────┐
                                                                                      │
           GitHub Actions: backend-cicd.yml                                           │
           1. 🧪 Run pytest (Postgres + Redis sidecar containers)                     │
           2. 🐳 docker build → push to ECR (tagged :sha + :latest)                  │
           3. 🔐 Sync GitHub Secrets → AWS SSM Parameter Store                       │
           4. 🚀 ECS render new task definition + force deploy                        ▼
                                                              ECS Fargate
                                                          ┌──────────────────┐
                                                          │ Gmart-api  │ :8000
                                                          │ Gmart-cell │ Celery worker
                                                          └──────────────────┘
                                                            secrets injected from SSM
```

## How .env values flow into Fargate

```
Your .env keys  →  GitHub Secrets  →  SSM Parameter Store  →  ECS Task Definition  →  Fargate env
```

Every push to `main`:
1. GitHub Secrets are pushed to **SSM Parameter Store** as `SecureString` (encrypted at rest)
2. The ECS task definition references SSM param ARNs under `secrets[]`
3. Fargate injects them as **environment variables** at container startup — no secrets ever in Docker image

## One-time Setup

### Step 1 — Run the bootstrap script
```bash
cd Gmart-fullStack
AWS_PROFILE=your-profile bash infra/scripts/bootstrap-aws.sh
```
This creates:
- ECR repository
- ECS Fargate cluster
- IAM roles (execution + GitHub OIDC)
- CloudWatch log group
- SSM parameter placeholders

### Step 2 — Create an ECS Service
After running bootstrap, register the task definition and create the service:
```bash
# Register task definition (after filling ACCOUNT_ID in task-definition.json)
aws ecs register-task-definition \
  --cli-input-json file://infra/task-definition.json \
  --region ap-south-1

# Create ECS Service (adjust subnet/sg IDs for your VPC)
aws ecs create-service \
  --cluster Gmart-cluster \
  --service-name Gmart-backend-service \
  --task-definition Gmart-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-XXXX],securityGroups=[sg-XXXX],assignPublicIp=ENABLED}" \
  --region ap-south-1
```

### Step 3 — Add GitHub Secrets
Go to: `GitHub → Your Repo → Settings → Secrets and variables → Actions`

Add these secrets exactly:

| Secret Name | Value |
|---|---|
| `AWS_ROLE_ARN` | ARN printed by bootstrap script |
| `AWS_REGION` | `ap-south-1` |
| `DATABASE_URL` | `postgresql+asyncpg://user:pass@your-rds-host/Gmart` |
| `REDIS_URL` | `redis://your-elasticache-host:6379/0` |
| `SECRET_KEY` | random 64-char string (`openssl rand -hex 32`) |
| `RAZORPAY_KEY_ID` | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret |
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | `+91XXXXXXXXXX` |
| `FIREBASE_CREDENTIALS` | Base64 of your Firebase service account JSON |
| `CLOUDINARY_URL` | `cloudinary://key:secret@cloud-name` |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` |

### Step 4 — Connect Frontend to Amplify
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify)
2. **New app → Host web app → GitHub**
3. Select repo `Gmart-fullStack`, branch `main`, app root `Gmart/`
4. Add environment variable: `EXPO_PUBLIC_API_URL` = `https://api.yourdomain.com`
5. Go to **App settings → Build settings → Webhooks → Create webhook**
6. Copy the webhook URL → add as GitHub Secret: `AMPLIFY_WEBHOOK_URL`
7. Add GitHub Secret: `AMPLIFY_APP_ID` = your Amplify app ID (from console URL)

### Step 5 — Push and watch it fly 🚀
```bash
git add .
git commit -m "feat: add CI/CD pipeline"
git push origin main
```

---

## File placement in your repo

```
Gmart-fullStack/
├── .github/
│   └── workflows/
│       ├── backend-cicd.yml       ← Backend: test → ECR → SSM → ECS deploy
│       └── frontend-cicd.yml      ← Frontend: lint → Amplify trigger
├── infra/
│   ├── task-definition.json       ← ECS Fargate task definition (edit ACCOUNT_ID)
│   ├── amplify.yml                ← Copy to Gmart/amplify.yml
│   ├── scripts/
│   │   └── bootstrap-aws.sh       ← One-time AWS infra setup
│   └── README.md                  ← This file
├── Gmart/
│   └── amplify.yml                ← (copy from infra/amplify.yml here)
└── Gmart-backend/
```

## Cost estimate (ap-south-1)

| Service | Config | ~Cost/month |
|---|---|---|
| ECS Fargate | 0.5 vCPU / 1GB, 1 task | ~$8 |
| ECR | 10 images stored | ~$1 |
| CloudWatch Logs | 1GB/month | ~$0.50 |
| SSM Parameter Store | SecureString params | Free tier |
| Amplify Hosting | Build minutes + hosting | ~$0–5 |
| **Total** | | **~$10–15/month** |
