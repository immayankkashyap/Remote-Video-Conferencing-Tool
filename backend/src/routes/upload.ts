import { Router } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, R2_BUCKET_NAME } from "../config/r2";

export const uploadRouter = Router();

uploadRouter.get("/upload-url", async (req, res) => {
  try {
    const fileType = req.query.fileType as string;

    if (!fileType) {
      console.warn("[backend] /upload-url request missing fileType parameter");
      res.status(400).json({ error: "Missing query parameter: fileType" });
      return;
    }

    // Parse correct file extension from MIME type (e.g. video/webm;codecs=vp9 -> webm)
    const mimeBase = fileType.split(";")[0] || "";
    const ext = mimeBase.split("/")[1] || "webm";

    // Generate unique key for Cloudflare R2
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const key = `recordings/${timestamp}-${randomId}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    // Create a presigned PUT URL that expires in 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    console.log(`[backend] Generated presigned upload URL for key: ${key}`);
    res.json({ uploadUrl, key });
  } catch (error: any) {
    console.error("[backend] Error generating presigned upload URL:", error);
    res.status(500).json({
      error: "Failed to generate presigned upload URL",
      details: error.message || error,
    });
  }
});
