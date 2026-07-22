"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Share2, Mail, Loader2, Copy, Check, ShieldAlert } from "lucide-react";

import { RecordButton } from "@/components/RecordButton";
import { VideoGrid } from "@/components/VideoGrid";
import { useRecorder } from "@/hooks/useRecorder";
import { useWebRTC } from "@/hooks/useWebRTC";

const VideoPreview = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="flex h-60 w-full max-w-md items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-red-500" />
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
      className="h-60 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 object-cover shadow-inner"
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
    remoteStreams,
    peerNames,
    connectionStatuses,
    isMicEnabled,
    isCameraEnabled,
    roomFull,
    error: webrtcError,
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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-6 py-12 selection:bg-red-500/30 selection:text-white">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-red-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-zinc-800/5 blur-[120px] pointer-events-none" />

        <section className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/50 transition-all duration-300 flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
              Studio Lobby
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white tracking-tight">Join "{roomName}"</h1>
            <p className="mt-1.5 text-xs text-zinc-400">Verify your camera and choose a display name.</p>
          </div>

          <VideoPreview stream={localStream} />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={toggleMic}
              disabled={!localStream}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                isMicEnabled 
                  ? "border-zinc-800 hover:border-zinc-700 text-zinc-300 bg-zinc-950/20" 
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {isMicEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!localStream}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                isCameraEnabled 
                  ? "border-zinc-800 hover:border-zinc-700 text-zinc-300 bg-zinc-950/20" 
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            </button>
          </div>

          <form onSubmit={handleJoinStudio} className="w-full space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Display Name
              </label>
              <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter display name to join..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={!guestName.trim()}
              className="w-full rounded-xl bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/10 transition active:scale-[0.98] disabled:opacity-50"
            >
              Join Studio
            </button>
          </form>
        </section>
      </main>
    );
  }

  // Room view
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100 selection:bg-red-500/30 selection:text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        
        {/* Top Control Panel */}
        <div className="flex flex-col gap-4 rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-5 sm:flex-row sm:items-start sm:justify-between backdrop-blur-md">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">
              Studio Session
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white tracking-tight">{roomName}</h1>
            <p className="mt-2 text-xs text-zinc-400">
              {roomFull ? "This room is full." : `Active Peers: ${1 + remoteStreams.size}`}
            </p>
            {webrtcError ? (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {webrtcError}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* ONLY the host gets access to recording actions. Guests do not see recording info. */}
            {isHost && (
              <RecordButton
                recordingStatus={recordingStatus}
                error={recorderError}
                uploadedKey={uploadedKey}
                onStart={handleHostStart}
                onStop={handleHostStop}
              />
            )}
            
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Invite Link</span>
                </>
              )}
            </button>

            {isHost && (
              <form onSubmit={handleInviteMember} className="relative flex items-center">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite by email..."
                  className="w-48 rounded-l-xl border border-r-0 border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs text-white outline-none transition focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="rounded-r-xl border border-l-0 border-red-500 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50 flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" />
                  <span>{isInviting ? "..." : "Send"}</span>
                </button>
                {inviteMessage && (
                  <div className={`absolute -bottom-6 left-0 text-[10px] font-semibold ${inviteMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                    {inviteMessage.text}
                  </div>
                )}
              </form>
            )}

            <button
              type="button"
              onClick={toggleMic}
              disabled={!localStream}
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 transition"
            >
              {isMicEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!localStream}
              className="rounded-xl border border-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 transition"
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
                router.push("/dashboard");
              }}
              className="rounded-xl bg-zinc-100 hover:bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Leave Room
            </button>
          </div>
        </div>

        {/* Upgraded Video Grid: dynamic multiple peers layout */}
        <VideoGrid 
          localStream={localStream} 
          remoteStreams={remoteStreams} 
          peerNames={peerNames} 
        />
      </div>
    </main>
  );
}
