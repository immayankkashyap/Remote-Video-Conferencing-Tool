"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { io, type Socket } from "socket.io-client";

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

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-6 py-12">
      {/* Background decorative gradients */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {isLoading ? (
        <div className="relative flex justify-center py-6 z-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-400" />
        </div>
      ) : !isAuthenticated ? (
        <section className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-black/50 transition-all duration-300">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
              Riverside Clone
            </p>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            Sign in to get started
          </h1>
          <p className="mt-3 text-base text-slate-400 leading-relaxed">
            Record high quality remote video interviews straight from your browser.
          </p>

          <div className="mt-8 space-y-6">
            {/* Tabs switcher */}
            <div className="flex border-b border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setAuthError("");
                  setAuthSuccess("");
                }}
                className={`flex-1 pb-3 text-center text-sm font-semibold transition ${
                  !isSignUp
                    ? "border-b-2 border-cyan-400 text-white"
                    : "text-slate-500 hover:text-slate-300"
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
                className={`flex-1 pb-3 text-center text-sm font-semibold transition ${
                  isSignUp
                    ? "border-b-2 border-cyan-400 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                  {authSuccess}
                </div>
              )}

              {isSignUp && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="johndoe"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-4 py-3.5 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition duration-200 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>Processing...</span>
                  </div>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section className="relative z-10 w-full max-w-6xl flex flex-col gap-10 transition-all duration-300 pt-8">
          
          {/* Pending Invites Notification Center */}
          {pendingInvites.length > 0 && (
            <div className="flex flex-col gap-4">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 shadow-lg shadow-cyan-900/20 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">
                        <span className="font-semibold text-white">{invite.sender?.name || "A user"}</span> has invited you to join <span className="font-semibold text-white">{invite.room?.name || "a studio"}</span>
                      </p>
                      <p className="text-xs text-slate-500">{new Date(invite.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRespondToInvite(invite.id, "DECLINED")}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-200"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespondToInvite(invite.id, "ACCEPTED")}
                      className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dashboard Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
                Studio Dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome back, {session?.user?.name?.split(" ")[0] || "Creator"}!</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-950/80 py-1.5 pl-2.5 pr-4">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 rounded-full border border-cyan-400/30"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-400 to-violet-500" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                    {session?.user?.name || "User"}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {session?.user?.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-rose-400 transition hover:border-rose-500/50 hover:bg-rose-500/10"
              >
                Sign Out
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column: Studios */}
            <div className="flex flex-col gap-8 lg:col-span-1">
              {/* Create Studio */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-semibold text-white">Create New Studio</h2>
                <p className="mt-1 text-sm text-slate-400">Give your room a persistent name.</p>
                <form onSubmit={handleCreateStudio} className="mt-4 space-y-3">
                  <input
                    type="text"
                    required
                    value={newStudioName}
                    onChange={(e) => setNewStudioName(e.target.value)}
                    placeholder="e.g. Weekly Podcast"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingStudio}
                    className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isCreatingStudio ? "Creating..." : "Create Studio"}
                  </button>
                </form>
              </div>

              {/* Your Studios */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl flex-1">
                <h2 className="text-lg font-semibold text-white mb-4">Your Studios</h2>
                {isFetchingRooms ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 border-dashed py-8 text-center">
                    <p className="text-sm text-slate-500">You don't have any studios yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {rooms.map((room) => (
                      <div key={room.id} className="group flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-slate-700 hover:bg-slate-900/80">
                        <div>
                          <h3 className="font-medium text-slate-200">{room.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">ID: {room.slug}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push(`/room/${room.slug}`)}
                            className="flex-1 rounded-lg bg-slate-800 py-2 text-xs font-semibold text-cyan-400 transition hover:bg-slate-700 group-hover:bg-cyan-500 group-hover:text-slate-950"
                          >
                            Enter Studio
                          </button>
                          <button
                            onClick={() => handleCopyInvite(room.slug)}
                            className="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-750 hover:text-slate-200 hover:bg-slate-900/50 flex items-center justify-center gap-1.5"
                            title="Copy Invite Link"
                          >
                            {copiedSlug === room.slug ? (
                              <span className="text-[10px] text-emerald-450 font-semibold">Copied!</span>
                            ) : (
                              <>
                                <svg className="h-3.5 w-3.5 text-slate-550" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l1.644-.822a1 1 0 011.171.186l1.414 1.414a1 1 0 01.186 1.171l-.822 1.644m-4.9-4.9l1.644-.822a1 1 0 011.17 1.17l-.822 1.644" />
                                </svg>
                                <span className="text-[10px]">Invite</span>
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

            {/* Right Column: Recordings */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl lg:col-span-2 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Past Recording Sessions</h2>
                {allRecordings.length > 4 && (
                  <button
                    onClick={() => setShowAllRecordings(!showAllRecordings)}
                    className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {showAllRecordings ? "Show Less" : `View All (${allRecordings.length})`}
                  </button>
                )}
              </div>
              
              {isFetchingRooms ? (
                <div className="flex justify-center py-12 flex-1 items-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
                </div>
              ) : allRecordings.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 rounded-xl border border-slate-800 border-dashed py-16 px-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-slate-300">No recordings yet</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-sm">
                    Create a studio, invite a guest, and start recording to see your files here!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 overflow-y-auto pr-2 custom-scrollbar">
                  {displayedRecordings.map((rec: any) => (
                    <div key={rec.id} className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 transition hover:border-slate-700 hover:bg-slate-900/80">
                      <a href={`/api/recordings/${rec.id}/download`} target="_blank" className="relative block aspect-video w-full bg-black">
                        <video
                          src={`/api/recordings/${rec.id}/download`}
                          preload="metadata"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLVideoElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <svg className="h-12 w-12 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                             <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </a>
                      
                      <div className="flex flex-col gap-3 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-slate-200 line-clamp-1">{rec.roomName}</h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {new Date(rec.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(rec.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-300 ring-1 ring-inset ring-slate-700/50">
                            {rec.participantName}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={`/api/recordings/${rec.id}/download?action=download`}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500 hover:text-slate-950"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </a>
                          <button
                            onClick={() => handleDeleteRecording(rec.id)}
                            className="flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-rose-400 transition hover:bg-rose-500 hover:text-slate-950"
                            title="Delete Recording"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
