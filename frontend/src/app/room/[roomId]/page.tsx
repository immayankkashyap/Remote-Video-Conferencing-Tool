"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

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

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="flex h-60 w-full max-w-md items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-sm text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
          <span>Starting camera preview...</span>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="h-60 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 object-cover shadow-inner"
    />
  );
};

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;
  const { data: session } = useSession();

  const [isHost, setIsHost] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [roomName, setRoomName] = useState(roomId);

  // Lobby/Guest States
  const [hasEnteredLobby, setHasEnteredLobby] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [copied, setCopied] = useState(false);

  // Invite States
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);

  useEffect(() => {
    // Fetch room details
    fetch(`/api/rooms/${roomId}/details`)
      .then((res) => res.json())
      .then((data) => {
        if (data.room) {
          setRoomName(data.room.name);
          setIsHost(data.isHost);
          
          if (data.isHost) {
            // Create a CallSession
            fetch(`/api/rooms/${roomId}/session`, { method: "POST" })
              .then((res) => res.json())
              .then((sData) => {
                if (sData.sessionId) {
                  setSessionId(sData.sessionId);
                }
              });
          }
        }
      })
      .catch(console.error);
  }, [roomId]);

  // Bypass lobby if owner (Host)
  useEffect(() => {
    if (isHost) {
      setHasEnteredLobby(true);
    }
  }, [isHost]);

  // Pre-fill guest name if logged in (but not the host)
  useEffect(() => {
    if (!isHost && session?.user) {
      setGuestName(session.user.name || session.user.email || "");
    }
  }, [isHost, session]);

  const {
    localStream,
    remoteStream,
    connectionStatus,
    isMicEnabled,
    isCameraEnabled,
    roomFull,
    error: webrtcError,
    peerName,
    toggleMic,
    toggleCamera,
    hostStartRecording,
    hostStopRecording,
    notifyInvite,
  } = useWebRTC(
    roomId,
    hasEnteredLobby,
    isHost ? (session?.user?.name || "Host") : guestName,
    (incomingSessionId) => {
      if (isHost) return;
      // triggered by host on socket
      setSessionId(Number(incomingSessionId));
      startRecording();
    },
    () => {
      if (isHost) return;
      // triggered by host on socket
      stopRecording();
    }
  );

  const {
    recordingStatus,
    error: recorderError,
    uploadedKey,
    startRecording,
    stopRecording,
  } = useRecorder(
    localStream,
    sessionId,
    isHost ? (session?.user?.name || "Host") : guestName
  );

  const handleHostStart = () => {
    if (!session?.user?.id || !sessionId) return;
    hostStartRecording(session.user.id, sessionId.toString());
    startRecording();
  };

  const handleHostStop = () => {
    if (!session?.user?.id) return;
    hostStopRecording(session.user.id);
    stopRecording();
  };

  const handleJoinStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setHasEnteredLobby(true);
  };

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteMessage(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, email: inviteEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteMessage({ text: data.error || "Failed to send invite", type: "error" });
      } else {
        setInviteMessage({ text: "Invite sent successfully!", type: "success" });
        setInviteEmail("");
        if (data.invitation) {
          notifyInvite(data.invitation.inviteeEmail, data.invitation);
        }
      }
    } catch (err) {
      setInviteMessage({ text: "An unexpected error occurred.", type: "error" });
    } finally {
      setIsInviting(false);
    }
  };

  // If Guest hasn't clicked 'Join Studio', show Lobby/Preview View
  if (!hasEnteredLobby) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-12">
        {/* Background decorative gradients */}
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

        <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/50 transition-all duration-300 flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
              Studio Lobby
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Join "{roomName}"</h1>
            <p className="mt-1 text-sm text-slate-400">Verify your camera and choose a display name.</p>
          </div>

          <VideoPreview stream={localStream} />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!localStream}
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                isMicEnabled 
                  ? "border-slate-700 hover:border-slate-500 text-slate-300 bg-slate-950/20" 
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              {isMicEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!localStream}
              className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                isCameraEnabled 
                  ? "border-slate-700 hover:border-slate-500 text-slate-300 bg-slate-950/20" 
                  : "border-rose-500/30 bg-rose-500/10 text-rose-400"
              }`}
            >
              {isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            </button>
          </div>

          <form onSubmit={handleJoinStudio} className="w-full space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Display Name
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter display name to join..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={!guestName.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] disabled:opacity-50"
            >
              Join Studio
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              Studio
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{roomName}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {roomFull ? "This room already has two peers." : statusLabels[connectionStatus]}
            </p>
            {webrtcError ? <p className="mt-2 text-sm text-rose-300">{webrtcError}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isHost ? (
              <RecordButton
                recordingStatus={recordingStatus}
                error={recorderError}
                uploadedKey={uploadedKey}
                onStart={handleHostStart}
                onStop={handleHostStop}
              />
            ) : (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400">
                {recordingStatus === "recording" 
                  ? "Recording in progress" 
                  : "Waiting for host to record"}
              </div>
            )}
            
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
            >
              {copied ? "Copied Link!" : "Copy Invite Link"}
            </button>

            {isHost && (
              <form onSubmit={handleInviteMember} className="relative flex items-center">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite by email..."
                  className="w-48 rounded-l-xl border border-r-0 border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="rounded-r-xl border border-l-0 border-cyan-500 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500 hover:text-slate-950 disabled:opacity-50"
                >
                  {isInviting ? "..." : "Send"}
                </button>
                {inviteMessage && (
                  <div className={`absolute -bottom-8 left-0 text-xs font-medium ${inviteMessage.type === "success" ? "text-emerald-400" : "text-rose-400"}`}>
                    {inviteMessage.text}
                  </div>
                )}
              </form>
            )}

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
              onClick={() => {
                if (
                  isHost &&
                  (recordingStatus === "recording" || recordingStatus === "uploading")
                ) {
                  if (
                    !window.confirm(
                      "A recording is currently in progress or uploading. If you leave now, the recording might be lost. Are you sure you want to leave?"
                    )
                  ) {
                    return;
                  }
                }
                router.push("/");
              }}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-white"
            >
              Leave Room
            </button>
          </div>
        </div>

        <VideoGrid localStream={localStream} remoteStream={remoteStream} peerName={peerName} />
      </div>
    </main>
  );
}
