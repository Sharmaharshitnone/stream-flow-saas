# ── Origin Access Control ──────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.project_name}-oac-${var.environment}"
  description                       = "OAC for processed video bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Cache Policy: Short TTL for HLS playlists ─────────────────────

resource "aws_cloudfront_cache_policy" "playlist" {
  name        = "${var.project_name}-playlist-policy-${var.environment}"
  default_ttl = 5
  max_ttl     = 60
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    headers_config {
      header_behavior = "none"
    }
    cookies_config {
      cookie_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# ── CloudFront Distribution ───────────────────────────────────────

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "StreamFlow CDN - ${var.environment}"
  default_root_object = ""
  price_class         = "PriceClass_100" # US, Canada, Europe only (cheapest)

  origin {
    domain_name              = var.processed_bucket_domain
    origin_id                = "S3-processed"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # Default: cache aggressively (thumbnails, etc.)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-processed"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 24 hours
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  # HLS segments (.ts) — cache for 1 year (immutable)
  ordered_cache_behavior {
    path_pattern     = "*.ts"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-processed"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000
    max_ttl                = 31536000
    compress               = false # Video segments don't compress well
  }

  # HLS playlists (.m3u8) — short TTL
  ordered_cache_behavior {
    path_pattern     = "*.m3u8"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-processed"

    cache_policy_id = aws_cloudfront_cache_policy.playlist.id

    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
