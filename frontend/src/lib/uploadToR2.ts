const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Orchestrates the direct-to-R2 upload process.
 * 
 * 1. Requests a presigned PUT URL from the backend based on the file type.
 * 2. Uploads the Blob binary payload directly to Cloudflare R2 via HTTP PUT.
 * 
 * Bypassing the backend server for the file upload ensures no server CPU, memory,
 * or network congestion when processing large media recordings.
 */
export async function uploadRecording(blob: Blob, mimeType: string): Promise<{ key: string }> {
  // Step 1: Request presigned URL from the backend
  const urlParams = new URLSearchParams({ fileType: mimeType });
  const getUrlResponse = await fetch(`${API_URL}/api/upload-url?${urlParams.toString()}`);

  if (!getUrlResponse.ok) {
    const errorData = await getUrlResponse.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to fetch presigned URL (Status: ${getUrlResponse.status})`
    );
  }

  const { uploadUrl, key } = await getUrlResponse.json();

  if (!uploadUrl || !key) {
    throw new Error("Invalid response received from the signaling backend (missing uploadUrl or key)");
  }

  // Step 2: PUT the blob directly to Cloudflare R2
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": mimeType,
    },
  });

  if (!putResponse.ok) {
    throw new Error(
      `Direct Cloudflare R2 upload failed (Status: ${putResponse.status} - ${putResponse.statusText})`
    );
  }

  return { key };
}
