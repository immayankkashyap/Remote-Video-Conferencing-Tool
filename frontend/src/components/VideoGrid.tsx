"use client";

import { useEffect, useRef } from "react";

type VideoGridProps = {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerNames: Map<string, string>;
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
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/60 backdrop-blur-md">
        <p className="text-sm font-semibold text-zinc-200">{label}</p>
        <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
          {stream ? "Live" : "Pending"}
        </span>
      </div>

      <div className="relative aspect-video bg-zinc-950">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoGrid({ localStream, remoteStreams, peerNames }: VideoGridProps) {
  const totalCount = 1 + remoteStreams.size;

  // Determine grid columns dynamically based on total participant count
  let gridLayout = "grid-cols-1 max-w-3xl";
  if (totalCount === 2) {
    gridLayout = "grid-cols-1 md:grid-cols-2 max-w-5xl";
  } else if (totalCount >= 3 && totalCount <= 4) {
    gridLayout = "grid-cols-2 max-w-5xl";
  } else if (totalCount >= 5) {
    gridLayout = "grid-cols-2 md:grid-cols-3 max-w-6xl";
  }

  // Convert remoteStreams map entries to a readable array
  const remoteEntries = Array.from(remoteStreams.entries());

  return (
    <section className={`grid gap-6 w-full mx-auto transition-all duration-500 ${gridLayout}`}>
      {/* Local Video panel */}
      <VideoPanel
        label="You"
        stream={localStream}
        muted
        placeholder="Requesting media tracks..."
      />

      {/* Remote Video panels */}
      {remoteEntries.map(([peerSocketId, stream]) => {
        const username = peerNames.get(peerSocketId) || "Guest";
        return (
          <VideoPanel
            key={peerSocketId}
            label={username}
            stream={stream}
            placeholder={`Awaiting track transmission from ${username}...`}
          />
        );
      })}
    </section>
  );
}
