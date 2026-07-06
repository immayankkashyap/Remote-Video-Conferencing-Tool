import { S3Client } from "@aws-sdk/client-s3";

// Initialize the S3Client targeting Cloudflare R2.
// R2 implements an S3-compatible API, allowing us to use @aws-sdk/client-s3 directly.
const s3Client = new S3Client({
  region: "auto", // Cloudflare R2 requires region to be "auto"
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "riverside-clone-recordings";

export { s3Client };
