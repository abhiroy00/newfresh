#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Freshdirect — ALB + ACM HTTPS Setup
#  Run in AWS CloudShell (ap-south-1)
#  Result: https://api.gmartfresh.com → EC2:8000
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

REGION="ap-south-1"
DOMAIN="api.gmartfresh.com"
EMAIL="gmart1.india@gmail.com"
INSTANCE_ID="i-044e42853cbb4d3fa"
APP="freshdirect"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   ALB + HTTPS Setup for $DOMAIN      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Discover VPC + Subnets ────────────────────────────────
echo "▶ Discovering network..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region $REGION)

# ALB needs 2 subnets in different AZs
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text --region $REGION | tr '\t' ' ')
SUBNET_ARR=($SUBNET_IDS)
SUBNET_1=${SUBNET_ARR[0]}
SUBNET_2=${SUBNET_ARR[1]}
echo "  VPC: $VPC_ID"
echo "  Subnets: $SUBNET_1 $SUBNET_2"

# ── 2. Get security group attached to EC2 instance ──────────
EC2_SG=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID --region $REGION \
  --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" --output text)
echo "  EC2 SG: $EC2_SG"

# ── 3. ACM Certificate ───────────────────────────────────────
echo ""
echo "▶ Requesting ACM certificate for $DOMAIN..."
CERT_ARN=$(aws acm request-certificate \
  --domain-name $DOMAIN \
  --validation-method DNS \
  --region $REGION \
  --query "CertificateArn" --output text)
echo "  Cert ARN: $CERT_ARN"

# Wait a moment for cert details to be available
echo "  Waiting for validation record..."
sleep 8

# Get DNS validation CNAME
CNAME_NAME=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN --region $REGION \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord.Name" \
  --output text)
CNAME_VALUE=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN --region $REGION \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord.Value" \
  --output text)
echo "  Validation CNAME: $CNAME_NAME → $CNAME_VALUE"

# ── 4. Add validation CNAME to Route 53 ─────────────────────
echo ""
echo "▶ Adding ACM validation CNAME to Route 53..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?contains(Name,'gmartfresh')].Id" \
  --output text | sed 's|/hostedzone/||')
echo "  Hosted Zone: $HOSTED_ZONE_ID"

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"$CNAME_NAME\",
        \"Type\": \"CNAME\",
        \"TTL\": 300,
        \"ResourceRecords\": [{\"Value\": \"$CNAME_VALUE\"}]
      }
    }]
  }" > /dev/null
echo "  Validation CNAME added ✓"

# ── 5. ALB Security Group ────────────────────────────────────
echo ""
echo "▶ Creating ALB security group..."
ALB_SG=$(aws ec2 create-security-group \
  --group-name "${APP}-alb-sg" \
  --description "${APP} ALB - allow 80 and 443" \
  --vpc-id $VPC_ID --region $REGION \
  --query "GroupId" --output text)

aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80  --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION > /dev/null

# Allow ALB SG to reach EC2 on port 8000
aws ec2 authorize-security-group-ingress \
  --group-id $EC2_SG \
  --ip-permissions "IpProtocol=tcp,FromPort=8000,ToPort=8000,UserIdGroupPairs=[{GroupId=${ALB_SG}}]" \
  --region $REGION > /dev/null
echo "  ALB SG: $ALB_SG ✓"

# ── 6. Target Group ──────────────────────────────────────────
echo ""
echo "▶ Creating target group..."
TG_ARN=$(aws elbv2 create-target-group \
  --name "${APP}-api-tg" \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $REGION \
  --query "TargetGroups[0].TargetGroupArn" --output text)

aws elbv2 register-targets \
  --target-group-arn $TG_ARN \
  --targets Id=$INSTANCE_ID \
  --region $REGION
echo "  Target Group: $TG_ARN ✓"

# ── 7. Create ALB ────────────────────────────────────────────
echo ""
echo "▶ Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name "${APP}-api-alb" \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --region $REGION \
  --query "LoadBalancers[0].LoadBalancerArn" --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN --region $REGION \
  --query "LoadBalancers[0].DNSName" --output text)

ALB_ZONE=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN --region $REGION \
  --query "LoadBalancers[0].CanonicalHostedZoneId" --output text)

echo "  ALB DNS: $ALB_DNS"
echo "  Waiting for ALB to become active..."
aws elbv2 wait load-balancer-available --load-balancer-arns $ALB_ARN --region $REGION
echo "  ALB active ✓"

# ── 8. Wait for cert to be issued ───────────────────────────
echo ""
echo "▶ Waiting for ACM cert to be issued (up to 5 mins)..."
aws acm wait certificate-validated --certificate-arn $CERT_ARN --region $REGION
echo "  Certificate issued ✓"

# ── 9. HTTPS Listener (443) ──────────────────────────────────
echo ""
echo "▶ Creating HTTPS listener..."
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $REGION > /dev/null

# ── 10. HTTP → HTTPS redirect (80) ───────────────────────────
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region $REGION > /dev/null
echo "  Listeners created (443 HTTPS + 80→443 redirect) ✓"

# ── 11. Update Route 53 A record → ALB alias ─────────────────
echo ""
echo "▶ Updating Route 53 api.gmartfresh.com → ALB..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch "{
    \"Changes\": [{
      \"Action\": \"UPSERT\",
      \"ResourceRecordSet\": {
        \"Name\": \"$DOMAIN\",
        \"Type\": \"A\",
        \"AliasTarget\": {
          \"HostedZoneId\": \"$ALB_ZONE\",
          \"DNSName\": \"$ALB_DNS\",
          \"EvaluateTargetHealth\": true
        }
      }
    }]
  }" > /dev/null
echo "  Route 53 updated ✓"

# ── 12. Done ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                        ALL DONE ✓                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  API HTTPS URL : https://$DOMAIN"
echo "  ALB DNS       : $ALB_DNS"
echo "  Cert ARN      : $CERT_ARN"
echo ""
echo "  Test (wait ~2 mins for DNS to propagate):"
echo "  curl https://$DOMAIN/health"
echo ""
echo "  Update these in your app:"
echo "  VITE_API_BASE_URL = https://$DOMAIN/api/v1"
echo "  ALLOWED_ORIGINS   = [\"https://gmartfresh.com\",\"https://www.gmartfresh.com\"]"
