output "table_name" {
  value = aws_dynamodb_table.videos.name
}

output "table_arn" {
  value = aws_dynamodb_table.videos.arn
}

output "stream_arn" {
  value = aws_dynamodb_table.videos.stream_arn
}
