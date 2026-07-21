"use client";

import { useEffect, useRef, useState } from "react";
import { uploadRecording } from "../lib/uploadToR2";

export type RecordingStatus =
  | "idle"
  | "recording"
  | "stopping"
  | "uploading"
  | "uploaded"
  | "error";

// A prioritized list of MIME types/codecs to check.
// We prefer high-quality video formats, falling back dynamically depending on browser support.
const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/webm",
  "video/mp4",
];

export const useRecorder = (
  localStream: MediaStream | null,
  sessionId: number | null,
  participantName: string = "Guest"
) => {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // NOTE ON MEMORY USAGE:
  // Recorded chunks are collected in a React useRef array to prevent unnecessary component re-renders
  // on every data flush. For very long recording sessions, buffering these chunks in memory could lead
  // to browser tab crashes (out of memory). Progressive background chunk uploading (e.g. upload to
  // indexedDB or streaming to R2 via multipart upload directly) is planned for future phases.
  const chunksRef = useRef<Blob[]>([]);

  // Detect the best supported video MIME type on client mount.
  useEffect(() => {
    if (typeof window === "undefined" || !window.MediaRecorder) {
      return;
    }

    const supported = PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    if (supported) {
      setMimeType(supported);
    } else {
      setMimeType("video/webm"); // Default fallback
    }
  }, []);

  // Safeguard: Stop the recorder on unmount if it was left running
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanups
        }
      }
    };
  }, []);

  /**
   * Starts local recording of the active local media stream.
   */
  const startRecording = () => {
    setError(null);
    setUploadedKey(null);

    if (!localStream) {
      setError("Cannot record: Local camera and microphone stream not available.");
      setRecordingStatus("error");
      return;
    }

    if (!mimeType) {
      setError("Cannot record: No supported video MIME type found in browser.");
      setRecordingStatus("error");
      return;
    }

    try {
      // Clear past chunks
      chunksRef.current = [];

      // MediaRecorder is a native browser API used to capture media streams (audio and/or video).
      const recorder = new MediaRecorder(localStream, { mimeType });
      mediaRecorderRef.current = recorder;

      // ondataavailable is fired periodically (based on the timeslice parameter passed to start()).
      // This allows us to receive video chunks increment-by-increment.
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // When stop() is triggered, we combine all stored memory chunks (Blobs) into a single Blob,
      // request a presigned URL, and upload it directly to R2.
      recorder.onstop = async () => {
        setRecordingStatus("uploading");
        try {
          // Combine chunks into a single media Blob using the detected MIME type
          const combinedBlob = new Blob(chunksRef.current, { type: mimeType });

          // Direct-to-Supabase Upload:
          // We bypass our Express backend completely when uploading the actual raw video payload.
          // Routing gigabytes of video streams through a Node server causes performance bottlenecks,
          // high network cost, and memory bloating. Instead, we perform a PUT directly to the Supabase URL.
          const { key } = await uploadRecording(combinedBlob, mimeType, participantName);
          
          if (sessionId) {
            await fetch("/api/recordings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId,
                participantName,
                fileUrl: key,
              }),
            }).catch(e => console.error("Failed to save recording to DB", e));
          }

          setUploadedKey(key);
          setRecordingStatus("uploaded");
        } catch (uploadErr: any) {
          console.error("Recording upload failed:", uploadErr);
          setError(uploadErr.message || "Failed to upload recording directly to Supabase Storage.");
          setRecordingStatus("error");
          
          // NOTE: We keep chunksRef.current intact here. In case of network failure, the blob is
          // still resident in the browser's memory, allowing future retry mechanisms if desired.
        }
      };

      // start(5000): Flush a recorded media chunk slice every 5 seconds.
      recorder.start(5000);
      setRecordingStatus("recording");
    } catch (err: any) {
      console.error("Failed to start MediaRecorder:", err);
      setError(err.message || "Could not start recording.");
      setRecordingStatus("error");
    }
  };

  /**
   * Stops the active local recording.
   */
  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    setRecordingStatus("stopping");
    mediaRecorderRef.current.stop();
  };

  return {
    recordingStatus,
    error,
    uploadedKey,
    startRecording,
    stopRecording,
  };
};
