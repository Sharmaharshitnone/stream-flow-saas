import { S3Client } from '@aws-sdk/client-s3';

const globalForS3 = globalThis as unknown as { s3Client: S3Client };

// Use explicit credentials if provided via env vars (.env.local, CI/CD, Vercel).
// Otherwise fall back to default credential chain (~/.aws/credentials, IAM roles).
const s3Config = process.env.AWS_ACCESS_KEY_ID
  ? {
      region: process.env.AWS_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }
  : { region: process.env.AWS_REGION ?? 'us-east-1' };

export const s3Client = globalForS3.s3Client ?? new S3Client(s3Config);

if (process.env.NODE_ENV !== 'production') {
  globalForS3.s3Client = s3Client;
}
