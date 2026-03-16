
# StreamFlow SaaS

StreamFlow is a full-stack, event-driven video processing platform. It utilizes a serverless architecture to decouple heavy transcoding tasks from the user interface, ensuring high application responsiveness and scalability.

## System Overview

- **Objective**: Decoupled computationally intensive video transcoding from the frontend to maintain system responsiveness during peak upload periods.
- **Impact**: Implementation of parallel processing and auto-scaling reduced processing latency for concurrent users.
- **Architecture**: Distributed serverless workflow orchestrated on AWS.

## Technical Stack

- **Frontend**: Next.js
- **Compute**: AWS Lambda (Python)
- **Storage**: Amazon S3, DynamoDB
- **Content Delivery**: AWS CloudFront
- **Infrastructure**: Terraform (Infrastructure as Code)

## Key Functionalities

- **Asynchronous Processing**: Background transcoding tasks managed via Lambda triggers.
- **Auto-Scaling Infrastructure**: Dynamic resource allocation based on demand.
- **Automated Provisioning**: Full environment setup via Terraform scripts.
- **Distributed Tracing**: Advanced debugging and monitoring of serverless execution paths.

## Deployment Instructions

1. **Infrastructure Provisioning**:
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```
2. **Application Setup**:
   ```bash
   npm install
   npm run dev
   ```

## Engineering Challenges

- Implementation of robust Infrastructure as Code (IaC) patterns.
- Resolution of complex debugging scenarios within distributed serverless architectures.
