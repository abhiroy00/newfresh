#!/usr/bin/env bash
# =============================================================================
# bootstrap-aws.sh
# One-time AWS setup: creates ECR repo, ECS cluster, IAM roles, SSM params.
# Run once before your first deployment.
# Usage: AWS_PROFILE=your-profile bash infra/scripts/bootstrap-aws.sh
# =============================================================================
set -euo pipefail

REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
APP="Gmart"

echo "🚀 Bootstrapping Gmart AWS infrastructure..."
echo "   Account : $ACCOUNT_ID"
echo "   Region  : $REGION"

# --- 1. ECR Repository ---
echo ""
echo "📦 Creating ECR repository..."
aws ecr create-repository \
  --repository-name $APP-backend \
  --image-scanning-configuration scanOnPush=true \
  --region $REGION 2>/dev/null || echo "   (already exists)"

# Lifecycle: keep only last 10 images
aws ecr put-lifecycle-policy \
  --repository-name $APP-backend \
  --lifecycle-policy-text '{
    "rules":[{
      "rulePriority":1,
      "selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},
      "action":{"type":"expire"}
    }]
  }' --region $REGION
echo "   ✅ ECR: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP-backend"

# --- 2. CloudWatch Log Group ---
echo ""
echo "📝 Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name /ecs/$APP-backend \
  --region $REGION 2>/dev/null || echo "   (already exists)"
aws logs put-retention-policy \
  --log-group-name /ecs/$APP-backend \
  --retention-in-days 30 \
  --region $REGION
echo "   ✅ Log group: /ecs/$APP-backend (30-day retention)"

# --- 3. ECS Cluster ---
echo ""
echo "⚙️  Creating ECS cluster..."
aws ecs create-cluster \
  --cluster-name $APP-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1 \
  --region $REGION 2>/dev/null || echo "   (already exists)"
echo "   ✅ ECS Cluster: $APP-cluster"

# --- 4. IAM Execution Role (ECS pulls image + reads SSM) ---
echo ""
echo "🔐 Creating IAM execution role..."
TRUST_ECS='{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":{"Service":"ecs-tasks.amazonaws.com"},
    "Action":"sts:AssumeRole"
  }]
}'

aws iam create-role \
  --role-name $APP-ecs-execution-role \
  --assume-role-policy-document "$TRUST_ECS" \
  --region $REGION 2>/dev/null || echo "   (already exists)"

aws iam attach-role-policy \
  --role-name $APP-ecs-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Allow reading SSM SecureString params
aws iam put-role-policy \
  --role-name $APP-ecs-execution-role \
  --policy-name SSMReadPolicy \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Action\":[\"ssm:GetParameters\",\"ssm:GetParameter\",\"kms:Decrypt\"],
      \"Resource\":\"arn:aws:ssm:$REGION:$ACCOUNT_ID:parameter/$APP/*\"
    }]
  }"
echo "   ✅ IAM execution role: $APP-ecs-execution-role"

# --- 5. IAM GitHub OIDC role (for GitHub Actions) ---
echo ""
echo "🔐 Setting up GitHub OIDC provider..."
aws iam create-openid-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  2>/dev/null || echo "   (already exists)"

# EDIT THIS: replace YOUR_GITHUB_ORG/YOUR_REPO with your actual values
GITHUB_REPO="YOUR_GITHUB_ORG/Gmart-fullStack"

aws iam create-role \
  --role-name $APP-github-actions-role \
  --assume-role-policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Principal\":{\"Federated\":\"arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com\"},
      \"Action\":\"sts:AssumeRoleWithWebIdentity\",
      \"Condition\":{\"StringLike\":{\"token.actions.githubusercontent.com:sub\":\"repo:$GITHUB_REPO:*\"}}
    }]
  }" 2>/dev/null || echo "   (already exists)"

aws iam attach-role-policy \
  --role-name $APP-github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam put-role-policy \
  --role-name $APP-github-actions-role \
  --policy-name ECSDeployPolicy \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Action\":[
        \"ecs:RegisterTaskDefinition\",\"ecs:DescribeTaskDefinition\",
        \"ecs:UpdateService\",\"ecs:DescribeServices\",\"ecs:ListTasks\",
        \"iam:PassRole\",
        \"ssm:PutParameter\",\"ssm:GetParameter\",\"ssm:GetParameters\",
        \"amplify:StartJob\",\"amplify:ListJobs\"
      ],
      \"Resource\":\"*\"
    }]
  }"

ROLE_ARN=$(aws iam get-role --role-name $APP-github-actions-role --query Role.Arn --output text)
echo "   ✅ GitHub Actions role ARN: $ROLE_ARN"
echo "   ❗  Copy this ARN → GitHub Secret: AWS_ROLE_ARN"

# --- 6. SSM placeholder params (fill values in GitHub Secrets) ---
echo ""
echo "💾 Creating SSM placeholder parameters..."
PARAMS=(DATABASE_URL REDIS_URL SECRET_KEY RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET
        RAZORPAY_WEBHOOK_SECRET TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN
        TWILIO_PHONE_NUMBER FIREBASE_CREDENTIALS CLOUDINARY_URL
        ALLOWED_ORIGINS OTP_DEMO_MODE)

for PARAM in "${PARAMS[@]}"; do
  aws ssm put-parameter \
    --name "/$APP/backend/$PARAM" \
    --value "PLACEHOLDER_UPDATE_VIA_GITHUB_SECRETS" \
    --type SecureString \
    --overwrite \
    --region $REGION \
    --no-cli-pager 2>/dev/null || true
  echo "   ✅  /$APP/backend/$PARAM"
done

echo ""
echo "====================================================="
echo "🎉 Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Add these GitHub Secrets (Settings → Secrets → Actions):"
echo "     AWS_ROLE_ARN          = $ROLE_ARN"
echo "     AWS_REGION            = $REGION"
echo "     DATABASE_URL          = your-rds-url"
echo "     REDIS_URL             = your-elasticache-url"
echo "     SECRET_KEY            = random-64-char-string"
echo "     RAZORPAY_KEY_ID       = rzp_live_..."
echo "     RAZORPAY_KEY_SECRET   = ..."
echo "     RAZORPAY_WEBHOOK_SECRET = ..."
echo "     TWILIO_ACCOUNT_SID    = AC..."
echo "     TWILIO_AUTH_TOKEN     = ..."
echo "     TWILIO_PHONE_NUMBER   = +91..."
echo "     FIREBASE_CREDENTIALS  = (base64 of service account JSON)"
echo "     CLOUDINARY_URL        = cloudinary://..."
echo "     ALLOWED_ORIGINS       = https://yourdomain.com"
echo ""
echo "  2. Update ACCOUNT_ID placeholder in infra/task-definition.json"
echo "  3. Push to main to trigger the pipeline!"
echo "====================================================="
