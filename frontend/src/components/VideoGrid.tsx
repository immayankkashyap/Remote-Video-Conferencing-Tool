"use client";

import { useEffect, useRef } from "react";

type VideoGridProps = {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

type VideoPanelProps = {
  label: string;
  stream: MediaStream | null;
  muted?: boolean;
  placeholder: string;
};

function VideoPanel({
  label,
  stream,
  muted = false,
  placeholder,
}: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
          {stream ? "Live" : "Pending"}
        </span>
      </div>

      <div className="relative aspect-video bg-slate-950">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoGrid({ localStream, remoteStream }: VideoGridProps) {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <VideoPanel
        label="You"
        stream={localStream}
        muted
        placeholder="Camera and microphone access are being requested."
      />
      <VideoPanel
        label="Peer"
        stream={remoteStream}
        placeholder="Waiting for another peer to join the room."
      />
    </section>
  );
}
