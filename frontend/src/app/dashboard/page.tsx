"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { io, type Socket } from "socket.io-client";
import { 
  Video, 
  Trash2, 
  Download, 
  Plus, 
  LogOut, 
  Copy, 
  Check, 
  Bell, 
  Calendar,
  User,
  Mail,
  Lock,
  Loader2,
  Tv,
  ArrowUpRight
} from "lucide-react";

export default function LobbyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Credentials Auth States
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard States
  const [rooms, setRooms] = useState<any[]>([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  const [newStudioName, setNewStudioName] = useState("");
  const [isCreatingStudio, setIsCreatingStudio] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Invites State
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // UI States
  const [showAllRecordings, setShowAllRecordings] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);

  const handleCopyInvite = (slug: string) => {
    const inviteUrl = `${window.location.origin}/room/${slug}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  useEffect(() => {
    if (isAuthenticated && session?.user?.email) {
      setIsFetchingRooms(true);
      fetch("/api/rooms")
        .then((res) => res.json())
        .then((data) => {
          if (data.rooms) setRooms(data.rooms);
        })
        .catch(console.error)
        .finally(() => setIsFetchingRooms(false));

      fetch("/api/invitations")
        .then((res) => res.json())
        .then((data) => {
          if (data.invitations) setPendingInvites(data.invitations);
        })
        .catch(console.error);

      const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
      const newSocket = io(SOCKET_URL);
      
      const userEmail = session.user.email;
      newSocket.on("connect", () => {
        newSocket.emit("dashboard-connect", { email: userEmail });
      });

      newSocket.on("incoming-invite", (inviteData: any) => {
        setPendingInvites((prev) => [inviteData, ...prev]);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, session?.user?.email]);

  const handleRespondToInvite = async (inviteId: string, status: "ACCEPTED" | "DECLINED") => {
    try {
      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok) {
        setPendingInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        if (status === "ACCEPTED" && data.invitation?.room?.slug) {
          router.push(`/room/${data.invitation.room.slug}`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, username, email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to register.");
        }

        setAuthSuccess("Account created successfully! Please sign in.");
        setIsSignUp(false);
        setPassword("");
      } else {
        // Sign In Flow
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (res?.error) {
          throw new Error("Invalid email or password.");
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudioName.trim()) return;
    setIsCreatingStudio(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStudioName }),
      });
      const data = await res.json();
      if (data.room) {
        setRooms((prev) => [data.room, ...prev]);
        setNewStudioName("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingStudio(false);
    }
  };

  const handleDeleteRecording = async (recordingId: number) => {
    try {
      const res = await fetch(`/api/recordings/${recordingId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setRooms((prevRooms) => prevRooms.map((room) => ({
          ...room,
          callSessions: room.callSessions?.map((session: any) => ({
            ...session,
            recordings: session.recordings?.filter((r: any) => r.id !== recordingId)
          }))
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const allRecordings = rooms
    .flatMap((room) =>
      (room.callSessions || []).flatMap((session: any) =>
        (session.recordings || []).map((rec: any) => ({
          ...rec,
          roomName: room.name,
          date: session.createdAt,
        }))
      )
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayedRecordings = showAllRecordings ? allRecordings : allRecordings.slice(0, 4);
  const displayedRooms = showAllRooms ? rooms : rooms.slice(0, 5);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500/30 selection:text-white">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full bg-red-500/[0.02] blur-[150px]" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[80%] rounded-full bg-zinc-800/[0.05] blur-[150px]" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center min-h-screen">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-red-500" />
            <p className="text-zinc-500 text-sm font-medium tracking-wider">LOADING YOUR STUDIO...</p>
          </div>
        ) : !isAuthenticated ? (
          /* Authentication Screen */
          <div className="flex justify-center items-center py-10">
            <section className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-300">
              <div className="flex flex-col items-center mb-8">
                <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Podium
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </span>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">Remote recording studio</p>
              </div>

              {/* Tabs switcher */}
              <div className="flex border-b border-zinc-800 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`flex-1 pb-3 text-center text-sm font-semibold transition-all duration-350 ${
                    !isSignUp
                      ? "border-b-2 border-red-500 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className={`flex-1 pb-3 text-center text-sm font-semibold transition-all duration-350 ${
                    isSignUp
                      ? "border-b-2 border-red-500 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-medium text-red-400 leading-relaxed">
                    {authError}
                  </div>
                )}
                {authSuccess && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-400 leading-relaxed">
                    {authSuccess}
                  </div>
                )}

                {isSignUp && (
                  <>
                    <div className="relative">
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="johndoe"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-zinc-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 w-full rounded-xl bg-red-500 text-white font-semibold py-3 hover:bg-red-600 shadow-lg shadow-red-500/20 transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </section>
          </div>
        ) : (
          /* Redesigned Dashboard View */
          <div className="w-full flex flex-col gap-8">
            
            {/* Pending Invites Notification Banner */}
            {pendingInvites.length > 0 && (
              <div className="flex flex-col gap-4">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-950/10 p-5 shadow-lg shadow-red-950/5 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300">
                          <span className="font-semibold text-white">{invite.sender?.name || "A user"}</span> has invited you to join <span className="font-semibold text-white">{invite.room?.name || "a studio"}</span>
                        </p>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleRespondToInvite(invite.id, "DECLINED")}
                        className="rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-xs px-4 py-2 font-semibold transition-all"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleRespondToInvite(invite.id, "ACCEPTED")}
                        className="rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-2 font-bold transition-all shadow-md shadow-red-500/10"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dashboard Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 mb-2">
              <div>
                <p className="text-xs font-semibold text-red-500 tracking-wider uppercase">
                  STUDIO DASHBOARD
                </p>
                <h1 className="mt-1 text-3xl font-bold text-white tracking-tight">
                  Welcome back, {session?.user?.name?.split(" ")[0] || "Creator"}!
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-1.5 rounded-full text-xs font-medium max-w-[220px] truncate">
                  {session?.user?.email}
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="rounded-full border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </header>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Studio Operations (Sticky on Desktop) */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit flex flex-col gap-6">
                
                {/* Create Studio Card */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-red-500" />
                    Create New Studio
                  </h2>
                  <p className="mt-1 text-xs text-zinc-400 mb-4">Give your room a persistent name.</p>
                  <form onSubmit={handleCreateStudio} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={newStudioName}
                      onChange={(e) => setNewStudioName(e.target.value)}
                      placeholder="e.g. Weekly Podcast"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                    />
                    <button
                      type="submit"
                      disabled={isCreatingStudio}
                      className="w-full rounded-xl bg-red-500 text-white text-sm font-semibold py-2.5 hover:bg-red-600 shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isCreatingStudio ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <span>Create Studio</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* Your Studios list */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">Your Studios</h2>
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        {rooms.length}
                      </span>
                    </div>
                    {rooms.length > 5 && (
                      <button
                        onClick={() => setShowAllRooms(!showAllRooms)}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                      >
                        {showAllRooms ? "Show Less" : `View All`}
                      </button>
                    )}
                  </div>

                  {isFetchingRooms ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 border-dashed py-10 text-center">
                      <p className="text-xs text-zinc-500">You don't have any studios yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                      {displayedRooms.map((room) => (
                        <div key={room.id} className="group flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/80 p-4 transition hover:border-red-500/40">
                          <div className="flex flex-col">
                            <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">{room.name}</h3>
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {room.slug}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/room/${room.slug}`)}
                              className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1"
                            >
                              Enter Studio
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                              onClick={() => handleCopyInvite(room.slug)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                              title="Copy Invite Link"
                            >
                              {copiedSlug === room.slug ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Invite</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Past Recording Sessions */}
              <div className="lg:col-span-8 flex flex-col h-full">
                <div className="flex items-center gap-3.5 mb-5">
                  <h2 className="text-xl font-bold text-white">Past Recording Sessions</h2>
                  <span className="bg-zinc-800 text-zinc-400 border border-zinc-700/60 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    {allRecordings.length}
                  </span>
                  {allRecordings.length > 4 && (
                    <button
                      onClick={() => setShowAllRecordings(!showAllRecordings)}
                      className="ml-auto text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                      {showAllRecordings ? "Show Less" : `View All`}
                    </button>
                  )}
                </div>
                
                {isFetchingRooms ? (
                  <div className="flex justify-center py-20 flex-1 items-center bg-zinc-900/10 border border-zinc-850 rounded-2xl">
                    <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                  </div>
                ) : allRecordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 rounded-2xl border border-zinc-800 border-dashed py-20 px-6 text-center bg-zinc-900/20 backdrop-blur-md">
                    <div className="h-16 w-16 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center mb-4 text-zinc-500">
                      <Tv className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-300">No recordings yet</h3>
                    <p className="mt-2 text-xs text-zinc-500 max-w-sm leading-relaxed">
                      Create a studio, invite a guest, and start recording to see your media files here!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
                    {displayedRecordings.map((rec: any) => (
                      <div key={rec.id} className="group flex flex-col bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300">
                        
                        {/* Aspect-Video Thumbnail Container */}
                        <a 
                          href={`/api/recordings/${rec.id}/download`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="relative w-full aspect-video bg-zinc-950 overflow-hidden block"
                        >
                          <video
                            src={`/api/recordings/${rec.id}/download`}
                            preload="metadata"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLVideoElement).style.display = 'none';
                            }}
                          />
                          
                          {/* Hover Play Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="w-11 h-11 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300 shadow-red-500/30">
                              <Video className="w-5 h-5" />
                            </div>
                          </div>
                          
                          {/* Overlay Quality Badge */}
                          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md text-[10px] text-zinc-300 px-2 py-0.5 rounded-md border border-white/10 font-mono font-semibold tracking-wide">
                            4K Local Track
                          </div>
                        </a>
                        
                        {/* Metadata & Actions */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-white truncate text-sm" title={rec.roomName}>
                              {rec.roomName}
                            </h3>
                            <p className="mt-1 text-[11px] text-zinc-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>
                                {new Date(rec.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} at {new Date(rec.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </p>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between border-t border-zinc-800/40 pt-3 gap-2">
                            <span className="inline-flex items-center rounded-md bg-zinc-800/60 border border-zinc-800 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 max-w-[130px] truncate" title={`Participant: ${rec.participantName}`}>
                              Guest: {rec.participantName}
                            </span>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={`/api/recordings/${rec.id}/download?action=download`}
                                className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </a>
                              <button
                                onClick={() => handleDeleteRecording(rec.id)}
                                className="bg-zinc-800/80 border border-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 p-1.5 rounded-lg transition-all"
                                title="Delete Recording"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
