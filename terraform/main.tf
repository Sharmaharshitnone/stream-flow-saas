# ── Root Module ─────────────────────────────────────────────────────
# Wires together all sub-modules in dependency order.
# CloudFront depends on S3 (needs bucket domain).
# Lambda depends on S3 + DynamoDB (needs ARNs).
# S3 bucket policy depends on CloudFront (needs distribution ARN).

module "dynamodb" {
  source = "./modules/dynamodb"

  project_name = var.project_name
  environment  = var.environment
}

module "cloudfront" {
  source = "./modules/cloudfront"

  project_name            = var.project_name
  environment             = var.environment
  processed_bucket_name   = "${var.project_name}-processed-${var.environment}"
  processed_bucket_arn    = "arn:aws:s3:::${var.project_name}-processed-${var.environment}"
  processed_bucket_domain = "${var.project_name}-processed-${var.environment}.s3.${var.aws_region}.amazonaws.com"
}

module "s3" {
  source = "./modules/s3"

  project_name    = var.project_name
  environment     = var.environment
  frontend_domain = var.frontend_domain

  cloudfront_distribution_arn = module.cloudfront.distribution_arn
}

module "lambda" {
  source = "./modules/lambda"

  project_name     = var.project_name
  environment      = var.environment
  raw_bucket_name  = module.s3.raw_bucket_name
  raw_bucket_arn   = module.s3.raw_bucket_arn
  proc_bucket_name = module.s3.processed_bucket_name
  proc_bucket_arn  = module.s3.processed_bucket_arn
  dynamodb_table   = module.dynamodb.table_name
  dynamodb_arn     = module.dynamodb.table_arn
}

module "monitoring" {
  source = "./modules/monitoring"

  project_name         = var.project_name
  environment          = var.environment
  lambda_function_name = module.lambda.transcoder_function_name
  alert_email          = var.alert_email
}
