import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export async function privateObjectURL(filename: string) {
  const client = new S3Client({
    region: process.env.S3_REGION ?? 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: filename }),
    { expiresIn: 120 },
  );
}
