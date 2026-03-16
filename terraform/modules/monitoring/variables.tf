variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "lambda_function_name" {
  type = string
}

variable "alert_email" {
  type    = string
  default = ""
}
