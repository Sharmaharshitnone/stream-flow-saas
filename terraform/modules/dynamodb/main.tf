resource "aws_dynamodb_table" "videos" {
  name         = "${var.project_name}-videos-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # On-demand — always free tier for 25 WCU/RCU

  hash_key  = "PK"
  range_key = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # GSI: List all videos sorted by createdAt
  global_secondary_index {
    name            = "GSI-AllVideos"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
