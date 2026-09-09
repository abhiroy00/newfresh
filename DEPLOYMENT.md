# Freshdirect — AWS Deployment Guide

## Architecture

```
Mobile App (Expo EAS)          Admin Panel (S3 + CloudFront)
       │                                  │
       ▼                                  ▼
  app.freshdirect.in          admin.freshdirect.in (HTTPS)
                                          │
                          ┌───────────────┘
                          ▼
              api.freshdirect.in  (Route53 → ALB)
                          │
                          ▼
              ECS Fargate (FastAPI, 1-4 tasks, auto-scale)
              ├── RDS PostgreSQL  (private subnet)
              └── ElastiCache Redis  (private subnet)
```

---

## One-time AWS Setup

### 1. Bootstrap Terraform state

```bash
aws s3 mb s3://freshdirect-tfstate --region ap-south-1

aws dynamodb create-table \
  --table-name freshdirect-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### 2. Register GitHub OIDC provider (once per AWS account)

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 3. Apply Terraform infrastructure

```bash
cd infra/terraform

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
domain_name  = "freshdirect.in"     # your Route53 domain
db_username  = "freshdirect_admin"
db_password  = "CHANGE_ME_STRONG_PASSWORD"
EOF

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

After apply, note the outputs:
```bash
terraform output -json   # shows all URLs, ARNs, endpoints
```

---

## GitHub Secrets Required

Go to **GitHub → Settings → Secrets → Actions** and add:

### AWS
| Secret | Description | Where to get |
|--------|-------------|--------------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role for GitHub Actions | `terraform output github_actions_role_arn` |

### Backend
| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | `terraform output -raw database_url` |
| `REDIS_URL` | `terraform output -raw redis_url` |
| `SECRET_KEY` | Random 64-char string: `openssl rand -hex 32` |
| `RAZORPAY_KEY_ID` | Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret |
| `TWILIO_ACCOUNT_SID` | Twilio console |
| `TWILIO_AUTH_TOKEN` | Twilio console |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |
| `FIREBASE_CREDENTIALS` | Firebase service account JSON (base64 encoded) |
| `CLOUDINARY_URL` | Cloudinary dashboard |
| `ALLOWED_ORIGINS` | `https://admin.freshdirect.in` |
| `ECS_SUBNET_IDS` | Private subnet IDs from Terraform |
| `ECS_SECURITY_GROUP` | ECS security group ID from Terraform |

### Admin panel
| Secret | Description |
|--------|-------------|
| `VITE_API_BASE_URL` | `https://api.freshdirect.in/api/v1` |
| `ADMIN_S3_BUCKET` | `terraform output -raw admin_s3_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| `ADMIN_DOMAIN` | `admin.freshdirect.in` |

### Mobile app
| Secret | Description |
|--------|-------------|
| `EXPO_TOKEN` | From expo.dev → Account → Access Tokens |
| `EXPO_PUBLIC_API_URL` | `https://api.freshdirect.in/api/v1` |

---

## CI/CD Pipelines

Three GitHub Actions workflows trigger on push to `main`:

| Workflow | Trigger path | Steps |
|----------|-------------|-------|
| `backend.yml` | `freshdirect-backend/**` | lint → test → build Docker → push ECR → migrate DB → deploy ECS |
| `admin.yml` | `admin/**` | type-check → build Vite → sync S3 → invalidate CloudFront |
| `mobile.yml` | `freshdirect/**` | type-check → EAS build (Android + iOS) → OTA update |

### Manual trigger

Any workflow can be triggered manually:
```
GitHub → Actions → Select workflow → Run workflow
```

---

## First Deployment Checklist

- [ ] Domain registered and Route53 hosted zone exists
- [ ] `terraform apply` completed successfully
- [ ] All GitHub Secrets added
- [ ] Push to `main` to trigger all three pipelines
- [ ] Verify `https://api.freshdirect.in/health` returns `{"status":"healthy"}`
- [ ] Verify `https://admin.freshdirect.in` loads the admin login page
- [ ] Run seed script once: `docker run --env-file .env <ecr-image> python scripts/seed.py`
- [ ] Create admin user via API or directly in RDS

---

## Useful Commands

```bash
# View ECS service logs (last 100 lines)
aws logs tail /ecs/freshdirect-production-api --follow --region ap-south-1

# Force new ECS deployment (redeploy same image)
aws ecs update-service \
  --cluster freshdirect-production-cluster \
  --service freshdirect-production-api-service \
  --force-new-deployment \
  --region ap-south-1

# Connect to RDS via bastion (or use AWS Session Manager)
aws ssm start-session --target <ec2-bastion-id>

# Scale ECS service manually
aws ecs update-service \
  --cluster freshdirect-production-cluster \
  --service freshdirect-production-api-service \
  --desired-count 2
```
