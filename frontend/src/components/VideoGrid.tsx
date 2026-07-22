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
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-lg group transition-all duration-300">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted={muted}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-zinc-500 font-medium">
          {placeholder}
        </div>
      )}

      {/* Nametag Overlay */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white z-10 border border-white/5">
        {label}
      </div>
    </div>
  );
}

export function VideoGrid({ localStream, remoteStreams, peerNames }: VideoGridProps) {
  const totalCount = 1 + remoteStreams.size;

  // Determine Riverside.fm style grids based on total participant count
  let gridLayout = "grid-cols-1";
  if (totalCount === 2) {
    gridLayout = "grid-cols-2";
  } else if (totalCount === 3) {
    gridLayout = "grid-cols-3";
  } else if (totalCount === 4) {
    gridLayout = "grid-cols-2 grid-rows-2";
  } else if (totalCount >= 5) {
    gridLayout = "grid-cols-3 grid-rows-2";
  }

  // Convert remoteStreams map entries to a readable array
  const remoteEntries = Array.from(remoteStreams.entries());

  return (
    <section className={`grid gap-4 w-full h-full ${gridLayout}`}>
      {/* Local Video panel */}
      <VideoPanel
        label="You"
        stream={localStream}
        muted
        placeholder="Connecting to media devices..."
      />

      {/* Remote Video panels */}
      {remoteEntries.map(([peerSocketId, stream]) => {
        const username = peerNames.get(peerSocketId) || "Guest";
        return (
          <VideoPanel
            key={peerSocketId}
            label={username}
            stream={stream}
            placeholder={`Awaiting track from ${username}...`}
          />
        );
      })}
    </section>
  );
}
