# Using local state for simplicity in dev.
# For team/production use, switch to S3 backend:
#
# terraform {
#   backend "s3" {
#     bucket         = "streamflow-terraform-state"
#     key            = "state/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "streamflow-terraform-locks"
#     encrypt        = true
#   }
# }
