import { s3Client } from './s3.js'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

const BUCKET_NAME = process.env.B2_BUCKET_NAME

if (!BUCKET_NAME) {
  throw new Error('B2_BUCKET_NAME environment variable is required')
}

/**
 * Generate a presigned URL for downloading an audio file
 * URL expires in 1 hour by default
 */
export async function getPresignedDownloadUrl(
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}
