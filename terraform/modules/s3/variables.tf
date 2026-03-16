variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "frontend_domain" {
  type = string
}

variable "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution (for S3 bucket policy OAC condition)"
  type        = string
}
