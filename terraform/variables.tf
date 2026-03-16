variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "streamflow"
}

variable "frontend_domain" {
  description = "Frontend domain for CORS configuration"
  type        = string
  default     = "http://localhost:3000"
}

variable "alert_email" {
  description = "Email address for CloudWatch alarm notifications"
  type        = string
  default     = ""
}
