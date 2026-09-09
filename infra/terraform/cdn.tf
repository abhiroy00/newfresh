# ── S3 Bucket for Admin Panel ─────────────────────────────────────────────────

resource "aws_s3_bucket" "admin" {
  bucket        = "${local.name_prefix}-admin-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
  tags          = { Name = "${local.name_prefix}-admin" }
}

resource "aws_s3_bucket_versioning" "admin" {
  bucket = aws_s3_bucket.admin.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "admin" {
  bucket = aws_s3_bucket.admin.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access — CloudFront uses OAC instead
resource "aws_s3_bucket_public_access_block" "admin" {
  bucket                  = aws_s3_bucket.admin.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── ACM Certificate for Admin (must be in us-east-1 for CloudFront) ───────────

resource "aws_acm_certificate" "admin" {
  provider          = aws.us_east_1
  domain_name       = local.admin_fqdn
  validation_method = "DNS"

  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "admin_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.admin.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "admin" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.admin.arn
  validation_record_fqdns = [for r in aws_route53_record.admin_cert_validation : r.fqdn]
}

# ── CloudFront Origin Access Control ─────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "admin" {
  name                              = "${local.name_prefix}-admin-oac"
  description                       = "OAC for admin panel S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront Distribution ───────────────────────────────────────────────────

resource "aws_cloudfront_distribution" "admin" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [local.admin_fqdn]
  price_class         = "PriceClass_All"
  http_version        = "http2and3"
  wait_for_deployment = false

  origin {
    domain_name              = aws_s3_bucket.admin.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.admin.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.admin.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-${aws_s3_bucket.admin.id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf" # Managed-CORS-S3Origin

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # Short cache for HTML
  ordered_cache_behavior {
    path_pattern           = "*.html"
    target_origin_id       = "S3-${aws_s3_bucket.admin.id}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.admin.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  custom_error_response {
    error_code            = 403
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 0
  }

  tags = { Name = "${local.name_prefix}-admin-cf" }
}

# ── CloudFront Function for SPA routing ──────────────────────────────────────

resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${local.name_prefix}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true

  code = <<-EOF
    async function handler(event) {
      const request = event.request;
      const uri = request.uri;
      // If the path has no file extension, serve index.html (SPA routing)
      if (!uri.includes('.')) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOF
}

# ── S3 bucket policy — allow CloudFront OAC ──────────────────────────────────

resource "aws_s3_bucket_policy" "admin" {
  bucket = aws_s3_bucket.admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.admin.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.admin.arn
        }
      }
    }]
  })
}

# ── Route53 → CloudFront ──────────────────────────────────────────────────────

resource "aws_route53_record" "admin" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.admin_fqdn
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.admin.domain_name
    zone_id                = "Z2FDTNDATAQYW2"   # CloudFront hosted zone (constant)
    evaluate_target_health = false
  }
}
