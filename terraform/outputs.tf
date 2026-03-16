output "raw_bucket_name" {
  value = module.s3.raw_bucket_name
}

output "processed_bucket_name" {
  value = module.s3.processed_bucket_name
}

output "dynamodb_table_name" {
  value = module.dynamodb.table_name
}

output "cloudfront_domain" {
  value = module.cloudfront.distribution_domain
}

output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "lambda_transcoder_arn" {
  value = module.lambda.transcoder_function_arn
}

output "aws_region" {
  value = var.aws_region
}
