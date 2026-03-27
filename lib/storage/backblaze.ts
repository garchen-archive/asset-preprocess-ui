import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: `https://${process.env.BACKBLAZE_ENDPOINT}`,
  region: process.env.BACKBLAZE_REGION || "us-east-005",
  credentials: {
    accessKeyId: process.env.BACKBLAZE_KEY_ID || "",
    secretAccessKey: process.env.BACKBLAZE_APPLICATION_KEY || "",
  },
});

const BUCKET_NAME = process.env.BACKBLAZE_BUCKET_NAME || "garchen-archive";

/**
 * Generate a presigned URL for a file in Backblaze B2
 * @param key - The file path/key in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour, max: 7 days)
 * @returns Presigned URL string
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Generate presigned URLs for multiple files
 * @param keys - Array of file paths/keys
 * @param expiresIn - URL expiration time in seconds
 * @returns Map of key to presigned URL
 */
export async function getPresignedUrls(
  keys: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  await Promise.all(
    keys.map(async (key) => {
      const url = await getPresignedUrl(key, expiresIn);
      urls.set(key, url);
    })
  );

  return urls;
}
