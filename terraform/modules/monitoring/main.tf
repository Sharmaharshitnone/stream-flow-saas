# ── SNS Topic for Alerts ───────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ── Lambda Error Alarm ─────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "transcoder_errors" {
  alarm_name          = "${var.project_name}-transcoder-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Lambda transcoder error detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

# ── Lambda Duration Alarm ──────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "transcoder_duration" {
  alarm_name          = "${var.project_name}-transcoder-duration-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Maximum"
  threshold           = 600000 # 10 min in ms — warn before 15 min timeout
  alarm_description   = "Lambda transcoder approaching timeout"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = var.lambda_function_name
  }
}
