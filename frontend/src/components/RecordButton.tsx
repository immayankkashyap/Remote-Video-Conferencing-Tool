"use client";

import { useEffect, useState } from "react";
import type { RecordingStatus } from "../hooks/useRecorder";

type RecordButtonProps = {
  recordingStatus: RecordingStatus;
  error: string | null;
  uploadedKey: string | null;
  onStart: () => void;
  onStop: () => void;
};

export function RecordButton({
  recordingStatus,
  error,
  uploadedKey,
  onStart,
  onStop,
}: RecordButtonProps) {
  const [seconds, setSeconds] = useState(0);

  // Track and increment the recording elapsed timer.
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (recordingStatus === "recording") {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [recordingStatus]);

  // Formats total seconds into MM:SS.
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getButtonConfig = () => {
    switch (recordingStatus) {
      case "idle":
        return {
          text: "Record Local",
          onClick: onStart,
          disabled: false,
          className: "bg-rose-600 hover:bg-rose-500 text-white font-medium transition-all duration-200 shadow-lg shadow-rose-950/20 active:scale-95",
          dotColor: "bg-white",
          showPulse: false,
        };
      case "recording":
        return {
          text: "Stop Recording",
          onClick: onStop,
          disabled: false,
          className: "bg-slate-800 border border-slate-700 hover:bg-slate-700 text-rose-400 font-medium transition-all duration-200 active:scale-95",
          dotColor: "bg-rose-500",
          showPulse: true,
        };
      case "stopping":
        return {
          text: "Stopping...",
          onClick: () => {},
          disabled: true,
          className: "bg-slate-900 border border-slate-850 text-slate-500 font-medium cursor-not-allowed",
          dotColor: "bg-slate-600",
          showPulse: false,
        };
      case "uploading":
        return {
          text: "Uploading to R2...",
          onClick: () => {},
          disabled: true,
          className: "bg-cyan-950/50 border border-cyan-800/40 text-cyan-400 font-medium cursor-not-allowed animate-pulse",
          dotColor: "bg-cyan-400",
          showPulse: true,
        };
      case "uploaded":
      case "error":
      default:
        // Return to recording trigger state, but errors and success states remain in detail panels below
        return {
          text: "Record Local",
          onClick: onStart,
          disabled: false,
          className: "bg-rose-600 hover:bg-rose-500 text-white font-medium transition-all duration-200 shadow-lg shadow-rose-950/20 active:scale-95",
          dotColor: "bg-white",
          showPulse: false,
        };
    }
  };

  const config = getButtonConfig();

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <button
        type="button"
        onClick={config.onClick}
        disabled={config.disabled}
        className={`flex items-center justify-center gap-2.5 rounded-xl px-5 py-2.5 text-sm ${config.className}`}
      >
        <span className="relative flex h-2 w-2">
          {config.showPulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`}></span>
        </span>
        {config.text}
      </button>

      {/* State Metadata Displays */}
      {recordingStatus === "recording" && (
        <p className="text-center text-xs font-mono text-rose-500 animate-pulse">
          REC • {formatTime(seconds)}
        </p>
      )}

      {recordingStatus === "uploading" && (
        <p className="text-center text-[11px] text-cyan-400">
          Transferring raw media directly to R2...
        </p>
      )}

      {recordingStatus === "uploaded" && uploadedKey && (
        <div className="rounded-xl bg-emerald-950/20 border border-emerald-800/30 p-3 text-center text-xs text-emerald-400">
          <p className="font-medium">Recording uploaded ✓</p>
          <p className="mt-1.5 font-mono text-[10px] break-all opacity-85 select-all bg-emerald-950/50 py-1 px-2 rounded border border-emerald-800/20" title="R2 Destination Key">
            {uploadedKey}
          </p>
        </div>
      )}

      {recordingStatus === "error" && error && (
        <div className="rounded-xl bg-rose-950/20 border border-rose-800/30 p-3 text-center text-xs text-rose-400">
          <p className="font-medium">Upload failed</p>
          <p className="mt-1 text-[10px] opacity-90">{error}</p>
        </div>
      )}
    </div>
  );
}
