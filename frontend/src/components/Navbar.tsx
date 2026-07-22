"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, LogOut } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name || "Mayank";
  const userEmail = session?.user?.email || "mayank@example.com";
  
  // Extract first letter of name
  const avatarLetter = userName.charAt(0).toUpperCase() || "M";

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

          {/* Notification Bell */}
          <button className="h-9 w-9 flex items-center justify-center rounded-full bg-zinc-900/60 border border-white/5 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all">
            <Bell className="h-4.5 w-4.5" />
          </button>

          {/* User Avatar Group Hover Dropdown */}
          <div className="relative group/avatar py-2">
            <button className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 hover:border-red-500/80 text-white flex items-center justify-center font-bold text-sm transition-colors shadow-md">
              {avatarLetter}
            </button>

            {/* Hover Dropdown */}
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-zinc-800/80 bg-zinc-900/95 p-4 shadow-2xl opacity-0 translate-y-1 scale-95 pointer-events-none group-hover/avatar:opacity-100 group-hover/avatar:translate-y-0 group-hover/avatar:scale-100 group-hover/avatar:pointer-events-auto transition-all duration-200 backdrop-blur-xl">
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
    </header>
  );
}
