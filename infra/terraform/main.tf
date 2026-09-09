terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }

  # Remote state in S3 — create this bucket manually once before first apply:
  #   aws s3 mb s3://freshdirect-tfstate --region ap-south-1
  #   aws dynamodb create-table --table-name freshdirect-tflock \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST --region ap-south-1
  backend "s3" {
    bucket         = "freshdirect-tfstate"
    key            = "production/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "freshdirect-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Provider in us-east-1 — ACM certs for CloudFront must be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── Locals ────────────────────────────────────────────────────────────────────

locals {
  name_prefix  = "${var.app_name}-${var.environment}"
  admin_fqdn   = "${var.admin_subdomain}.${var.domain_name}"
  api_fqdn     = "${var.api_subdomain}.${var.domain_name}"
}

# ── Data sources ─────────────────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}
