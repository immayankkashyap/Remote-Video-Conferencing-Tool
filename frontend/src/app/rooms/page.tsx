"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Loader2, Plus, ArrowRight, User, Mail, Lock } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function RoomsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Credentials Auth States (For unauthenticated visitors)
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active Session Manager States
  const [newStudioName, setNewStudioName] = useState("");
  const [isCreatingStudio, setIsCreatingStudio] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  // Fetch previous rooms (which have been left but are not expired yet)
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
    }
  }, [isAuthenticated, session?.user?.email]);

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
        // Immediately redirect to room slug page
        router.push(`/room/${data.room.slug}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingStudio(false);
    }
  };

  // If loading session state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-red-500" />
        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Initializing Studio Hub...</p>
      </div>
    );
  }

  // If not authenticated, show sign-in/sign-up forms
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center px-6 selection:bg-red-500/30 selection:text-white relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute -top-[30%] -left-[30%] w-[80%] h-[80%] rounded-full bg-red-500/[0.02] blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-[30%] -right-[30%] w-[80%] h-[80%] rounded-full bg-zinc-800/[0.05] blur-[140px] pointer-events-none" />

        <section className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl shadow-black/85 backdrop-blur-xl transition-all duration-300 relative z-10">
          <div className="flex flex-col items-center mb-8">
            <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Podium
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </span>
            <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-semibold">Remote recording studio</p>
          </div>

          {/* Switcher Tab */}
          <div className="flex border-b border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setAuthError("");
                setAuthSuccess("");
              }}
              className={`flex-1 pb-3 text-center text-sm font-semibold transition-all duration-200 ${
                !isSignUp ? "border-b-2 border-red-500 text-white" : "text-zinc-500 hover:text-zinc-300"
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
              className={`flex-1 pb-3 text-center text-sm font-semibold transition-all duration-200 ${
                isSignUp ? "border-b-2 border-red-500 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400">
                {authError}
              </div>
            )}
            {authSuccess && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-400">
                {authSuccess}
              </div>
            )}

            {isSignUp && (
              <>
                <div>
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
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                    />
                  </div>
                </div>
                <div>
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
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
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
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
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
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-11 pr-4 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
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
    );
  }

  // Authenticated State (Rooms list and creation Manager)
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-red-500/30 selection:text-white font-sans antialiased overflow-x-hidden flex flex-col">
      {/* Shared sticky navigation bar */}
      <Navbar />

      {/* Main Rooms Page Content */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-6 py-12 flex-1">
        
        {/* Page Titles */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
            Active Session Manager
          </h1>
          <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest font-semibold">
            Create brand new studios or rejoin left conference rooms
          </p>
        </div>

        {/* Room Creation Bar */}
        <section className="mt-10">
          <form 
            onSubmit={handleCreateStudio} 
            className="w-full flex flex-col sm:flex-row gap-4 items-center bg-zinc-900/10 border border-white/5 p-2 rounded-2xl backdrop-blur-md"
          >
            <input
              type="text"
              required
              value={newStudioName}
              onChange={(e) => setNewStudioName(e.target.value)}
              placeholder="PUT YOUR ROOM NAME HERE"
              className="flex-1 bg-zinc-900 border border-white/10 text-white text-sm rounded-xl px-5 py-4 w-full focus:border-red-500 focus:outline-none transition-all outline-none"
            />
            
            <button
              type="submit"
              disabled={isCreatingStudio || !newStudioName.trim()}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl px-8 py-4 whitespace-nowrap shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 disabled:opacity-55"
            >
              {isCreatingStudio ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>CREATING...</span>
                </>
              ) : (
                <>
                  <span>CREATE NEW ROOM</span>
                  <Plus className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </section>

        {/* Recent Rooms List */}
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/80 pb-3">
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Rooms
            </h2>
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {rooms.length}
            </span>
          </div>

          {isFetchingRooms ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/10 border-dashed py-12 text-center">
              <p className="text-xs text-zinc-500">You don't have any recent studios available to rejoin.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rooms.map((room) => (
                <div 
                  key={room.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:bg-zinc-900/60 hover:border-zinc-800 transition-all duration-300"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white font-mono tracking-wide">
                      {room.slug}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-0.5">
                      Room code identifier
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-400 font-semibold truncate max-w-[200px]" title={room.name}>
                      {room.name}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(`/room/${room.slug}`)}
                    className="border border-white/20 hover:border-red-500 bg-zinc-950/20 hover:bg-red-500/10 text-white text-xs px-5 py-2 rounded-full font-bold transition-all flex items-center gap-1 shrink-0 self-start sm:self-center"
                  >
                    <span>Rejoin</span>
                    <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
