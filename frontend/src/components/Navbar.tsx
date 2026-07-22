"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, LogOut, Calendar } from "lucide-react";
import { io, type Socket } from "socket.io-client";

type InviteData = {
  id: string;
  roomId: string;
  createdAt: string;
  sender?: {
    name?: string;
    email: string;
  };
  room?: {
    name: string;
    slug: string;
  };
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const userName = session?.user?.name || "Mayank";
  const userEmail = session?.user?.email || "mayank@example.com";
  
  // Extract first letter of name
  const avatarLetter = userName.charAt(0).toUpperCase() || "M";

  // Notifications State
  const [invites, setInvites] = useState<InviteData[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const isAuthenticated = status === "authenticated";

  // 1. Fetch initial invitations and establish real-time socket connections
  useEffect(() => {
    if (!isAuthenticated || !session?.user?.email) return;

    // Fetch pending invites
    fetch("/api/invitations")
      .then((res) => res.json())
      .then((data) => {
        if (data.invitations) {
          setInvites(data.invitations);
        }
      })
      .catch((err) => console.error("Error fetching invitations in Navbar:", err));

    // Connect to WebSocket Server
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Navbar socket] connected:", socket.id);
      if (session?.user?.email) {
        socket.emit("dashboard-connect", { email: session.user.email });
      }
    });

    socket.on("incoming-invite", (inviteData: InviteData) => {
      console.log("[Navbar socket] incoming-invite:", inviteData);
      setInvites((prev) => [inviteData, ...prev]);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, session?.user?.email]);

  // 2. Respond to incoming/database invites
  const handleRespondToInvite = async (inviteId: string, actionStatus: "ACCEPTED" | "DECLINED") => {
    try {
      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        // Remove processed invitation from state
        setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
        
        // If accepted, redirect to room
        if (actionStatus === "ACCEPTED" && data.invitation?.room?.slug) {
          router.push(`/room/${data.invitation.room.slug}`);
        }
      }
    } catch (err) {
      console.error("Error responding to invitation:", err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-zinc-950/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left Brand Logo */}
        <div 
          onClick={() => router.push("/dashboard")} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="border border-white/10 hover:border-red-500 rounded-lg px-3 py-1.5 transition-all duration-300">
            <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              Podium
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </span>
          </div>
        </div>

        {/* Right Actions & Navigation */}
        <div className="flex items-center gap-6">
          
          {/* Nav Links */}
          <nav className="flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard")}
              className={`text-xs uppercase font-bold tracking-wider transition-colors duration-300 ${
                pathname === "/dashboard" ? "text-red-500" : "text-zinc-400 hover:text-white"
              }`}
            >
              dashboard
            </button>
            
            <button
              onClick={() => router.push("/rooms")}
              className={`text-xs uppercase font-bold tracking-wider transition-colors duration-300 ${
                pathname === "/rooms" ? "text-red-500" : "text-zinc-400 hover:text-white"
              }`}
            >
              Rooms
            </button>
          </nav>

          {/* Notification Bell (With Hover Dropdown) */}
          <div className="relative group/bell py-2">
            <button className="h-9 w-9 relative flex items-center justify-center rounded-full bg-zinc-900/60 border border-white/5 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all cursor-pointer">
              <Bell className="h-4.5 w-4.5" />
              {invites.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Hover Dropdown Panel (Using hidden group-hover:block with padding bridge) */}
            <div className="absolute right-0 top-full pt-2 w-80 hidden group-hover/bell:block z-50">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-3 border-b border-white/10 bg-zinc-950/20">
                  Notifications
                </div>
                
                {invites.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-zinc-500">
                    No active invites
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col">
                    {invites.map((invite) => {
                      const roomLabel = invite.room?.name || "a studio";
                      const senderLabel = invite.sender?.name || invite.sender?.email || "Someone";
                      return (
                        <div key={invite.id} className="flex flex-col gap-2.5 p-4 border-b border-white/5 hover:bg-zinc-800/20 transition-colors">
                          <div className="text-xs text-zinc-300 leading-normal">
                            Invite to join <span className="font-bold text-white">{roomLabel}</span> from <span className="text-zinc-400 font-medium">{senderLabel}</span>
                          </div>
                          
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => handleRespondToInvite(invite.id, "ACCEPTED")}
                              className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex-1 text-center"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondToInvite(invite.id, "DECLINED")}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Avatar Group Hover Dropdown */}
          <div className="relative group/avatar py-2">
            <button className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 hover:border-red-500/80 text-white flex items-center justify-center font-bold text-sm transition-colors shadow-md">
              {avatarLetter}
            </button>

            {/* Hover Dropdown */}
            <div className="absolute right-0 top-full pt-2 w-56 hidden group-hover/avatar:block z-50">
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl flex flex-col">
                <div className="flex flex-col mb-3.5 border-b border-zinc-800/60 pb-3">
                  <span className="text-sm font-bold text-white truncate">{userName}</span>
                  <span className="text-[10px] text-zinc-400 truncate mt-0.5">{userEmail}</span>
                </div>
                
                <button
                  onClick={() => signOut()}
                  className="w-full rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
