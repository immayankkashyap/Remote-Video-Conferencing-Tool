"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const createRoomId = () => crypto.randomUUID().slice(0, 8);

export default function LobbyPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const navigateToRoom = (nextRoomId: string) => {
    const normalizedRoomId = nextRoomId.trim();

    if (!normalizedRoomId) {
      return;
    }

    router.push(`/room/${normalizedRoomId}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/30">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
          Riverside Clone
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Join a room</h1>
        <p className="mt-3 text-base text-slate-300">
          Phase 1 focuses only on two-person real-time audio and video using
          WebRTC with Socket.io signaling.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">
              Room ID
            </span>
            <input
              type="text"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="Enter an existing room ID"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigateToRoom(createRoomId())}
              className="flex-1 rounded-xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => navigateToRoom(roomId)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-medium text-slate-100 transition hover:border-slate-500"
            >
              Join Room
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
