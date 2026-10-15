// =====================================================================
// R2 utilities (server-only)
// S3-compatible client for Cloudflare R2 usando credenciales del servidor.
// =====================================================================
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/env.server";

const { r2 } = serverEnv;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
  },
});

export async function getPresignedUploadUrl(
  key: string,
  contentType?: string,
  expiresInSeconds = 300
): Promise<{ url: string; key: string }> {
  const cmd = new PutObjectCommand({
    Bucket: r2.bucketName,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(r2Client, cmd, { expiresIn: expiresInSeconds });
  return { url, key };
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: r2.bucketName,
    Key: key,
  });
  return getSignedUrl(r2Client, cmd, { expiresIn: expiresInSeconds });
}
