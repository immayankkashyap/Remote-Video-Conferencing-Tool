"use client";

import { useParams, useRouter } from "next/navigation";

import { RecordButton } from "@/components/RecordButton";
import { VideoGrid } from "@/components/VideoGrid";
import { useRecorder } from "@/hooks/useRecorder";
import { useWebRTC } from "@/hooks/useWebRTC";

const statusLabels = {
  waiting: "Waiting for peer to join...",
  connecting: "Connecting...",
  connected: "Connected",
  disconnected: "Disconnected",
};

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const {
    localStream,
    remoteStream,
    connectionStatus,
    isMicEnabled,
    isCameraEnabled,
    roomFull,
    error: webrtcError,
    toggleMic,
    toggleCamera,
  } = useWebRTC(roomId);

  const {
    recordingStatus,
    error: recorderError,
    uploadedKey,
    startRecording,
    stopRecording,
  } = useRecorder(localStream);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              Room
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{roomId}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {roomFull ? "This room already has two peers." : statusLabels[connectionStatus]}
            </p>
            {webrtcError ? <p className="mt-2 text-sm text-rose-300">{webrtcError}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <RecordButton
              recordingStatus={recordingStatus}
              error={recorderError}
              uploadedKey={uploadedKey}
              onStart={startRecording}
              onStop={stopRecording}
            />
            <button
              type="button"
              onClick={toggleMic}
              disabled={!localStream}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMicEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!localStream}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-white"
            >
              Leave Room
            </button>
          </div>
        </div>

        <VideoGrid localStream={localStream} remoteStream={remoteStream} />
      </div>
    </main>
  );
}

