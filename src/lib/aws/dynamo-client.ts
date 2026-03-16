import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const globalForDynamo = globalThis as unknown as { dynamoClient: DynamoDBDocumentClient };

// Use explicit credentials if provided via env vars (.env.local, CI/CD, Vercel).
// Otherwise fall back to default credential chain (~/.aws/credentials, IAM roles).
const dynamoConfig = process.env.AWS_ACCESS_KEY_ID
  ? {
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }
  : { region: process.env.AWS_REGION ?? 'us-east-1' };

const baseClient = new DynamoDBClient(dynamoConfig);

export const dynamoClient =
  globalForDynamo.dynamoClient ??
  DynamoDBDocumentClient.from(baseClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDynamo.dynamoClient = dynamoClient;
}
