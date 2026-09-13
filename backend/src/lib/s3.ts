import { S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.B2_REGION || 'us-west-001',
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Required for Backblaze B2
})

export { s3Client }
