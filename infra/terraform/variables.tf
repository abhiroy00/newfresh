variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "app_name" {
  description = "Application name used as a prefix for all resources"
  type        = string
  default     = "freshdirect"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain (e.g. freshdirect.in) — must already exist in Route53"
  type        = string
}

variable "admin_subdomain" {
  description = "Subdomain for the admin panel"
  type        = string
  default     = "admin"
}

variable "api_subdomain" {
  description = "Subdomain for the backend API"
  type        = string
  default     = "api"
}

# ── VPC ───────────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

# ── RDS ───────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  type    = string
  default = "db.t3.small"
}

variable "db_name" {
  type    = string
  default = "freshdirect"
}

variable "db_username" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

# ── ElastiCache ───────────────────────────────────────────────────────────────

variable "redis_node_type" {
  type    = string
  default = "cache.t3.micro"
}

# ── ECS ───────────────────────────────────────────────────────────────────────

variable "api_task_cpu" {
  type    = number
  default = 1024   # 1 vCPU
}

variable "api_task_memory" {
  type    = number
  default = 2048   # 2 GB
}

variable "api_min_capacity" {
  type    = number
  default = 1
}

variable "api_max_capacity" {
  type    = number
  default = 4
}

variable "github_actions_role_arn" {
  description = "ARN of the IAM role GitHub Actions assumes via OIDC"
  type        = string
  default     = ""
}
