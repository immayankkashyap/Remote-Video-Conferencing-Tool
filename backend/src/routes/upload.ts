import { Router } from "express";
import { supabase, SUPABASE_BUCKET_NAME } from "../config/supabase";

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

    // Generate unique key for Supabase Storage
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const key = `${timestamp}-${randomId}.${ext}`;

    // Create a signed upload URL that expires in 15 minutes (900 seconds)
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .createSignedUploadUrl(key);

    if (error) {
      throw error;
    }

    if (!data || !data.signedUrl) {
      throw new Error("Failed to retrieve signed upload URL from Supabase Storage");
    }

    console.log(`[backend] Generated Supabase signed upload URL for key: ${key}`);
    res.json({ uploadUrl: data.signedUrl, key });
  } catch (error: any) {
    console.error("[backend] Error generating signed upload URL:", error);
    res.status(500).json({
      error: "Failed to generate signed upload URL",
      details: error.message || error,
    });
  }
});
