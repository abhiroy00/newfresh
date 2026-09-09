#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Freshdirect — AWS Infrastructure Setup
#  Run this entire script in AWS CloudShell
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# ── CHANGE THESE BEFORE RUNNING ─────────────────────────────────
DB_PASSWORD="YourStrongPassword123!"   # Must be 8+ chars, no @ or /
REGION="ap-south-1"                    # Change if you want a different region
EC2_TYPE="t3.small"                    # t2.micro = free tier (less RAM)
# ────────────────────────────────────────────────────────────────

APP="freshdirect"
DB_USER="${APP}_admin"
DB_NAME="${APP}"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Freshdirect AWS Setup — Region: $REGION   ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Default VPC ───────────────────────────────────────────────
echo "▶ Getting default VPC..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" \
  --output text --region $REGION)

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
  echo "ERROR: No default VPC found in $REGION. Go to VPC console and create a default VPC."
  exit 1
fi
echo "  VPC: $VPC_ID"

# Get all subnets in this VPC
ALL_SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" \
  --output text --region $REGION)

# Pick one subnet for EC2
SUBNET_ID=$(echo $ALL_SUBNET_IDS | awk '{print $1}')
echo "  Subnets: $ALL_SUBNET_IDS"

# ── 2. Security Group — EC2 ─────────────────────────────────────
echo ""
echo "▶ Creating EC2 security group..."
EC2_SG=$(aws ec2 create-security-group \
  --group-name "${APP}-ec2-sg" \
  --description "${APP} EC2 - allow SSH and API" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query "GroupId" --output text)

aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 22   --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 80   --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 443  --cidr 0.0.0.0/0 --region $REGION > /dev/null
aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 8000 --cidr 0.0.0.0/0 --region $REGION > /dev/null
echo "  EC2 SG created: $EC2_SG"

# ── 3. Security Group — RDS ─────────────────────────────────────
echo ""
echo "▶ Creating RDS security group..."
RDS_SG=$(aws ec2 create-security-group \
  --group-name "${APP}-rds-sg" \
  --description "${APP} RDS - only EC2 can connect" \
  --vpc-id $VPC_ID \
  --region $REGION \
  --query "GroupId" --output text)

# Only EC2 security group can reach RDS on 5432
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,UserIdGroupPairs=[{GroupId=${EC2_SG}}]" \
  --region $REGION > /dev/null
echo "  RDS SG created: $RDS_SG (only EC2 can connect)"

# ── 4. RDS Subnet Group ──────────────────────────────────────────
echo ""
echo "▶ Creating RDS subnet group..."
aws rds create-db-subnet-group \
  --db-subnet-group-name "${APP}-db-subnet-group" \
  --db-subnet-group-description "${APP} DB subnet group" \
  --subnet-ids $ALL_SUBNET_IDS \
  --region $REGION > /dev/null
echo "  RDS subnet group created"

# ── 5. Get latest PostgreSQL 16 version ─────────────────────────
echo ""
echo "▶ Finding latest PostgreSQL 16 version..."
PG_VERSION=$(aws rds describe-db-engine-versions \
  --engine postgres \
  --query "DBEngineVersions[?starts_with(EngineVersion, '16')].EngineVersion | [-1]" \
  --output text --region $REGION)
echo "  Using PostgreSQL $PG_VERSION"

# ── 6. Create RDS ───────────────────────────────────────────────
echo ""
echo "▶ Creating RDS PostgreSQL (this is async — won't wait)..."
aws rds create-db-instance \
  --db-instance-identifier "${APP}-db" \
  --db-instance-class "db.t3.micro" \
  --engine postgres \
  --engine-version "$PG_VERSION" \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASSWORD" \
  --db-name "$DB_NAME" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids $RDS_SG \
  --db-subnet-group-name "${APP}-db-subnet-group" \
  --no-multi-az \
  --publicly-accessible \
  --backup-retention-period 7 \
  --no-deletion-protection \
  --region $REGION > /dev/null
echo "  RDS creation started (takes ~5 mins)"

# ── 7. EC2 Key Pair ─────────────────────────────────────────────
echo ""
echo "▶ Creating EC2 key pair..."
KEY_FILE="${APP}-key.pem"
aws ec2 create-key-pair \
  --key-name "${APP}-key" \
  --query "KeyMaterial" \
  --output text \
  --region $REGION > "$KEY_FILE"
chmod 400 "$KEY_FILE"
echo "  Key saved: $KEY_FILE"

# ── 8. Latest Amazon Linux 2023 AMI ─────────────────────────────
echo ""
echo "▶ Getting latest Amazon Linux 2023 AMI..."
AMI_ID=$(aws ssm get-parameter \
  --name "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64" \
  --query "Parameter.Value" \
  --output text --region $REGION)
echo "  AMI: $AMI_ID"

# ── 9. EC2 User Data (install Docker on first boot) ─────────────
cat > /tmp/userdata.sh << 'USERDATA'
#!/bin/bash
exec > /var/log/userdata.log 2>&1
set -e
dnf update -y
dnf install -y docker git curl
systemctl enable --now docker
usermod -aG docker ec2-user
# Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
echo "Setup complete" >> /var/log/userdata.log
USERDATA

# ── 10. Launch EC2 ──────────────────────────────────────────────
echo ""
echo "▶ Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type $EC2_TYPE \
  --key-name "${APP}-key" \
  --security-group-ids $EC2_SG \
  --subnet-id $SUBNET_ID \
  --associate-public-ip-address \
  --user-data file:///tmp/userdata.sh \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --tag-specifications \
    "ResourceType=instance,Tags=[{Key=Name,Value=${APP}-api},{Key=App,Value=${APP}}]" \
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
  --query "Instances[0].InstanceId" \
  --output text --region $REGION)
echo "  Instance: $INSTANCE_ID"

echo "  Waiting for EC2 to start (up to 3 mins)..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
echo "  EC2 is running!"

# ── 11. Elastic IP ───────────────────────────────────────────────
echo ""
echo "▶ Allocating Elastic IP..."
ALLOC_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${APP}-api-ip}]" \
  --region $REGION \
  --query "AllocationId" --output text)

ELASTIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids $ALLOC_ID \
  --region $REGION \
  --query "Addresses[0].PublicIp" --output text)

aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOC_ID \
  --region $REGION > /dev/null
echo "  Elastic IP: $ELASTIC_IP"

# ── 12. Print everything ─────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║               SETUP DONE — COPY EVERYTHING BELOW            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  EC2 Elastic IP   : $ELASTIC_IP"
echo "  EC2 Instance ID  : $INSTANCE_ID"
echo "  RDS Identifier   : ${APP}-db"
echo "  DB Username      : $DB_USER"
echo "  DB Password      : $DB_PASSWORD"
echo "  DB Name          : $DB_NAME"
echo ""
echo "──────────────────────────────────────────────────────────────"
echo "  GitHub Secret: EC2_HOST"
echo "  Value: $ELASTIC_IP"
echo ""
echo "──────────────────────────────────────────────────────────────"
echo "  GitHub Secret: EC2_SSH_KEY"
echo "  Value: (copy the ENTIRE block below including the dashes)"
echo ""
cat "$KEY_FILE"
echo ""
echo "──────────────────────────────────────────────────────────────"
echo "  RDS endpoint (not ready yet — run this in ~5 mins):"
echo ""
echo "  aws rds describe-db-instances \\"
echo "    --db-instance-identifier ${APP}-db \\"
echo "    --query 'DBInstances[0].Endpoint.Address' \\"
echo "    --output text --region $REGION"
echo ""
echo "  Then build DATABASE_URL like this:"
echo "  postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@<PASTE_RDS_ENDPOINT>:5432/${DB_NAME}"
echo ""
echo "──────────────────────────────────────────────────────────────"
echo "  SSH into EC2 later:"
echo "  ssh -i ${KEY_FILE} ec2-user@${ELASTIC_IP}"
echo ""
echo "  ⚠  Docker install runs in background (~3 mins after SSH works)"
echo "  Check progress: sudo tail -f /var/log/userdata.log"
echo "╚══════════════════════════════════════════════════════════════╝"
