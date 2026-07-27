import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env.js';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     env.r2AccessKeyId,
    secretAccessKey: env.r2SecretAccessKey,
  },
});

/**
 * Upload a buffer to Cloudflare R2.
 * @param {string} key - Object key (path in bucket)
 * @param {Buffer} body - File content
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL
 */
export async function uploadToR2(key, body, contentType = 'audio/webm') {
  await r2.send(new PutObjectCommand({
    Bucket:      env.r2BucketName,
    Key:         key,
    Body:        body,
    ContentType: contentType,
  }));
  return `${env.r2PublicUrl}/${key}`;
}

export default r2;
