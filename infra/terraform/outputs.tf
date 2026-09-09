output "api_url" {
  description = "Backend API URL"
  value       = "https://${local.api_fqdn}"
}

output "admin_url" {
  description = "Admin panel URL"
  value       = "https://${local.admin_fqdn}"
}

output "ecr_repository_url" {
  description = "ECR repository URL for Docker pushes"
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.api.name
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "admin_s3_bucket" {
  description = "S3 bucket name for admin panel files"
  value       = aws_s3_bucket.admin.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.admin.id
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions (set as AWS_DEPLOY_ROLE_ARN secret)"
  value       = aws_iam_role.github_actions.arn
}

output "database_url" {
  description = "Full DATABASE_URL for the backend (store in SSM/GitHub Secrets)"
  value       = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
  sensitive   = true
}

output "redis_url" {
  description = "Full REDIS_URL for the backend (store in SSM/GitHub Secrets)"
  value       = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379/0"
  sensitive   = true
}
