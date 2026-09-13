import { s3Client } from './s3.js'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const BUCKET_NAME = process.env.B2_BUCKET_NAME

if (!BUCKET_NAME) {
  throw new Error('B2_BUCKET_NAME environment variable is required')
}

/**
 * Upload audio file to S3
 */
export async function uploadAudioToS3(
  audioBuffer: Buffer,
  mimeType: string,
  consultationDraftId: string
): Promise<{ s3Key: string }> {
  const extension = mimeType === 'audio/webm' ? 'webm' : 'mp3'
  const s3Key = `consultations/${consultationDraftId}/${randomUUID()}.${extension}`

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: audioBuffer,
    ContentType: mimeType,
  })

  await s3Client.send(command)

  return { s3Key }
}

/**
 * Delete audio file from S3
 */
export async function deleteAudioFromS3(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  })

  await s3Client.send(command)
}
