data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── IAM Role for Transcoder Lambda ─────────────────────────────────

resource "aws_iam_role" "transcoder" {
  name = "${var.project_name}-transcoder-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "transcoder" {
  name = "${var.project_name}-transcoder-policy-${var.environment}"
  role = aws_iam_role.transcoder.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadRawBucket"
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "${var.raw_bucket_arn}/*"
      },
      {
        Sid    = "WriteProcessedBucket"
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "${var.proc_bucket_arn}/*"
      },
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:PutItem"
        ]
        Resource = var.dynamodb_arn
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid    = "XRayTracing"
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      },
      {
        Sid    = "DLQAccess"
        Effect = "Allow"
        Action = ["sqs:SendMessage"]
        Resource = aws_sqs_queue.transcoder_dlq.arn
      }
    ]
  })
}

# ── DLQ ────────────────────────────────────────────────────────────

resource "aws_sqs_queue" "transcoder_dlq" {
  name                      = "${var.project_name}-transcoder-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 days
}

# ── Lambda Function ────────────────────────────────────────────────

data "archive_file" "transcoder" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda/transcoder"
  output_path = "${path.module}/../../../.build/transcoder.zip"
}

resource "aws_lambda_function" "transcoder" {
  function_name = "${var.project_name}-transcoder-${var.environment}"
  filename      = data.archive_file.transcoder.output_path
  source_code_hash = data.archive_file.transcoder.output_base64sha256
  handler       = "handler.handler"
  runtime       = "python3.12"
  architectures = ["x86_64"]
  memory_size   = 3008
  timeout       = 900 # 15 min max

  ephemeral_storage {
    size = 10240 # 10 GB
  }

  role = aws_iam_role.transcoder.arn

  reserved_concurrent_executions = 10 # Cost guardrail

  environment {
    variables = {
      S3_RAW_BUCKET       = var.raw_bucket_name
      S3_PROCESSED_BUCKET = var.proc_bucket_name
      DYNAMODB_TABLE      = var.dynamodb_table
    }
  }

  tracing_config {
    mode = "Active"
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.transcoder_dlq.arn
  }

  depends_on = [
    aws_iam_role_policy.transcoder,
  ]
}

# ── S3 Trigger Permission ─────────────────────────────────────────

resource "aws_lambda_permission" "s3_trigger" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transcoder.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.raw_bucket_arn
}

# ── S3 Event Notification ─────────────────────────────────────────

resource "aws_s3_bucket_notification" "raw_upload" {
  bucket = var.raw_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.transcoder.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
  }

  depends_on = [aws_lambda_permission.s3_trigger]
}

# ── Async Invocation Config ───────────────────────────────────────

resource "aws_lambda_function_event_invoke_config" "transcoder" {
  function_name                = aws_lambda_function.transcoder.function_name
  maximum_retry_attempts       = 2
  maximum_event_age_in_seconds = 3600

  destination_config {
    on_failure {
      destination = aws_sqs_queue.transcoder_dlq.arn
    }
  }
}
