"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Loader2, 
  ShieldAlert, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  PhoneOff,
  Disc
} from "lucide-react";

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
        setInviteMessage({ text: "Invite sent!", type: "success" });
        setInviteEmail("");
        if (data.invitation) {
          notifyInvite(data.invitation.inviteeEmail, data.invitation);
        }
      }
    } catch (err) {
      setInviteMessage({ text: "Error sending invite.", type: "error" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleLeaveCall = () => {
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
  };

  // 1. Lobby/Preview State: standard padded centering
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

  const totalParticipants = 1 + remoteStreams.size;

  // 2. Overhauled Studio Session View: exactly 100vh, absolute overflow-hidden
  return (
    <main className="h-screen w-full flex flex-col overflow-hidden bg-zinc-950 text-white select-none">
      
      {/* Dynamic Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 h-16 shrink-0 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="border border-white/10 rounded-lg px-2.5 py-1">
            <span className="font-semibold text-xs tracking-tight text-white flex items-center gap-1.5">
              Podium
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
            </span>
          </div>
          
          {/* Participant Count Pill */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-xs text-zinc-300 font-semibold">
            <Users className="w-3.5 h-3.5 text-zinc-400" />
            <span>{totalParticipants}</span>
          </div>
        </div>

        {/* Right Section (Invite Input Box) */}
        <div className="flex items-center gap-3">
          {isHost && (
            <form onSubmit={handleInviteMember} className="relative flex items-center gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite via email..."
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs w-64 focus:border-red-500 outline-none placeholder:text-zinc-500 text-white transition-all"
              />
              <button
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-1.5 rounded-lg transition-all font-semibold disabled:opacity-50 shrink-0"
              >
                {isInviting ? "..." : "Send"}
              </button>
              {inviteMessage && (
                <span className={`absolute right-0 top-full mt-1 text-[10px] font-bold ${inviteMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
                  {inviteMessage.text}
                </span>
              )}
            </form>
          )}

          {webrtcError && (
            <div className="text-xs text-red-400 flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{webrtcError}</span>
            </div>
          )}
        </div>
      </header>

      {/* Dynamic Video Grid (Stage) */}
      <section className="flex-1 p-4 md:p-6 min-h-0 w-full h-full overflow-hidden bg-zinc-950/20">
        <VideoGrid 
          localStream={localStream} 
          remoteStreams={remoteStreams} 
          peerNames={peerNames} 
        />
      </section>

      {/* Bottom Control Bar */}
      <footer className="grid grid-cols-3 items-center px-6 py-4 bg-zinc-950 border-t border-white/5 h-20 shrink-0">
        
        {/* Left Side spacer */}
        <div />

        {/* Center Control Buttons */}
        <div className="flex items-center justify-center gap-4">
          
          {/* Record button (Host only) */}
          {isHost && (
            <button
              onClick={recordingStatus === "recording" ? handleHostStop : handleHostStart}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-lg select-none ${
                recordingStatus === "recording"
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
              }`}
            >
              <Disc className="w-4.5 h-4.5" />
              <span>{recordingStatus === "recording" ? "STOP RECORDING" : "START RECORDING"}</span>
            </button>
          )}

          {/* Toggle Mic */}
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full transition-all duration-300 border ${
              isMicEnabled
                ? "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700/60"
                : "bg-red-500/20 text-red-500 border-red-500/30"
            }`}
            title={isMicEnabled ? "Mute Mic" : "Unmute Mic"}
          >
            {isMicEnabled ? <Mic className="w-4.5 h-4.5" /> : <MicOff className="w-4.5 h-4.5" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full transition-all duration-300 border ${
              isCameraEnabled
                ? "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700/60"
                : "bg-red-500/20 text-red-500 border-red-500/30"
            }`}
            title={isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isCameraEnabled ? <VideoIcon className="w-4.5 h-4.5" /> : <VideoOff className="w-4.5 h-4.5" />}
          </button>

        </div>

        {/* Right Side Leave button */}
        <div className="flex justify-end">
          <button
            onClick={handleLeaveCall}
            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave Call</span>
          </button>
        </div>

      </footer>

    </main>
  );
}
