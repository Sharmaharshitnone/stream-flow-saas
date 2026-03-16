output "transcoder_function_name" {
  value = aws_lambda_function.transcoder.function_name
}

output "transcoder_function_arn" {
  value = aws_lambda_function.transcoder.arn
}

output "transcoder_invoke_arn" {
  value = aws_lambda_function.transcoder.invoke_arn
}

output "dlq_arn" {
  value = aws_sqs_queue.transcoder_dlq.arn
}
