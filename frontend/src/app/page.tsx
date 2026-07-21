"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ArrowRight, 
  Video, 
  Layers, 
  Zap, 
  Cpu, 
  HardDrive, 
  ExternalLink,
  Shield,
  Smartphone,
  Lock,
  Globe
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [studioCode, setStudioCode] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  const handleEnterStudio = (e: React.FormEvent) => {
    e.preventDefault();
    if (studioCode.trim()) {
      router.push(`/room/${studioCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-red-500/30 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-red-500/5 blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-[60vh] right-1/4 translate-x-1/2 w-[600px] h-[600px] rounded-full bg-red-600/5 blur-[160px] pointer-events-none z-0" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-zinc-950/60 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              Podium
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300">
              How It Works
            </a>
            <a href="#tech-stack" className="text-sm text-zinc-400 hover:text-white transition-colors duration-300">
              Tech Stack
            </a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-300 flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Right CTA */}
          <button 
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-white/10 hover:border-red-500/50 hover:bg-red-500/10 text-white text-sm font-semibold px-5 py-2 transition-all duration-300 active:scale-95"
          >
            Login / Sign up
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">

        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[75vh]">
          {/* Hero Left: Typography & CTA */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            
            {/* Local-First Badge Tag */}
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-full px-3.5 py-1.5 w-fit mb-6">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
                Local-First Remote Studio
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]">
              Studio-Quality Podcasts. <br className="hidden md:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
                Recorded Locally.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-zinc-400 text-lg md:text-xl mb-8 max-w-xl leading-relaxed">
              Bypass bad internet. Podium captures uncompressed 4K video and isolated audio tracks directly in your browser, syncing seamlessly to the cloud.
            </p>

            {/* Interactive CTA Box */}
            <form onSubmit={handleEnterStudio} className="bg-zinc-900 border border-white/10 rounded-full flex items-center p-1.5 w-full max-w-lg shadow-2xl focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/30 transition-all duration-300">
              <input 
                type="text" 
                required
                placeholder="Enter Studio Code..."
                value={studioCode}
                onChange={(e) => setStudioCode(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white px-4 py-2 placeholder-zinc-500 text-sm md:text-base"
              />
              <button 
                type="submit"
                className="bg-red-500 text-white text-sm md:text-base font-semibold px-6 py-2.5 rounded-full hover:bg-red-600 transition-colors duration-200 active:scale-95 flex items-center gap-1.5 shrink-0 shadow-lg shadow-red-500/20"
              >
                Enter Studio <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Dashboard Quick Link */}
            <p className="mt-4 text-xs text-zinc-500 pl-4">
              Hosting a show?{" "}
              <span 
                onClick={() => router.push("/dashboard")}
                className="text-red-400 hover:text-red-300 font-semibold cursor-pointer underline transition-colors"
              >
                Create a new studio room in your Dashboard
              </span>
            </p>

          </div>

          {/* Hero Right: Visual Mockup */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="w-full max-w-md aspect-[4/3] bg-zinc-900/40 rounded-3xl border border-white/10 p-4 backdrop-blur-sm relative overflow-hidden shadow-2xl group hover:border-white/20 transition-all duration-500">
              
              {/* Internal Mockup Frame */}
              <div className="h-full w-full bg-zinc-950/80 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between p-4">
                
                {/* Mockup Header: Live Badge */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 bg-zinc-900/80 border border-white/5 rounded-full px-2.5 py-1">
                    <span className="text-[10px] font-mono text-zinc-400">SESSION: #weekly-pod</span>
                  </div>
                  
                  {/* Glowing Live/REC Badge */}
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-wider">
                      REC
                    </span>
                  </div>
                </div>

                {/* Mockup Center: Camera/Avatar Placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-500">
                    <Video className="w-8 h-8 text-zinc-400" />
                  </div>
                  <span className="text-xs text-zinc-500 font-medium mt-4">Local Camera Stream</span>
                </div>

                {/* Mockup Footer: Metrics & Details */}
                <div className="flex items-end justify-between z-10 w-full">
                  {/* Audio waveform visualization placeholder */}
                  <div className="flex gap-0.5 items-end h-5">
                    <span className="w-0.5 h-3 bg-red-500 rounded-full animate-[pulse_1s_infinite_100ms]" />
                    <span className="w-0.5 h-4 bg-red-500 rounded-full animate-[pulse_1s_infinite_200ms]" />
                    <span className="w-0.5 h-5 bg-red-500 rounded-full animate-[pulse_1s_infinite_300ms]" />
                    <span className="w-0.5 h-2 bg-red-500 rounded-full animate-[pulse_1s_infinite_400ms]" />
                    <span className="w-0.5 h-3 bg-red-500 rounded-full animate-[pulse_1s_infinite_500ms]" />
                  </div>

                  {/* Quality indicators */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded">
                      4K WebM
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-white/5 px-2 py-0.5 rounded">
                      Local Rec: ON
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* Floating Feature Bar */}
        <section id="features" className="scroll-mt-20">
          <div className="bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-full py-4 px-8 flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto gap-4 md:gap-0 shadow-lg shadow-black/40">
            <div className="flex items-center gap-2 font-medium text-sm text-zinc-300 w-full justify-center md:w-auto">
              <span className="text-red-500 font-bold">01</span>
              <span>4K Local Track</span>
            </div>
            <div className="hidden md:block h-4 border-l border-white/10" />
            <div className="flex items-center gap-2 font-medium text-sm text-zinc-300 w-full justify-center md:w-auto">
              <span className="text-red-500 font-bold">02</span>
              <span>Zero Compression</span>
            </div>
            <div className="hidden md:block h-4 border-l border-white/10" />
            <div className="flex items-center gap-2 font-medium text-sm text-zinc-300 w-full justify-center md:w-auto">
              <span className="text-red-500 font-bold">03</span>
              <span>WebRTC P2P</span>
            </div>
            <div className="hidden md:block h-4 border-l border-white/10" />
            <div className="flex items-center gap-2 font-medium text-sm text-zinc-300 w-full justify-center md:w-auto">
              <span className="text-red-500 font-bold">04</span>
              <span>Instant Uploads</span>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="mt-32 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
              How Podium Bypasses Network Flaws
            </h2>
            <p className="text-zinc-400">
              Unlike zoom or meet, Podium saves your primary video and audio stream locally before any encoding loss or network dropout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Lobby Join</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Connect via WebRTC. Enter the studio code, customize your settings, and start chatting immediately with near-zero latency.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Dual Stream Capture</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Podium shows a compression-friendly WebRTC stream to your peer while locally saving raw 4K WebM video blocks into your browser storage.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Incremental Cloud Sync</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                As you talk and immediately when recording ends, Podium uploads the local raw chunks securely to Supabase Storage in the background.
              </p>
            </div>
          </div>
        </section>

        {/* Tech Stack Grid Section */}
        <section id="tech-stack" className="mt-32 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
              Built for Performance
            </h2>
            <p className="text-zinc-400">
              Powered by a reliable modern tech stack designed for high throughput and low-latency synchronization.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            
            {/* Card 1: Next.js */}
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6 hover:bg-zinc-900/80 hover:border-red-500/30 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-52">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Next.js</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  App Router & Server Actions for blazing fast page loads and optimized serverless API execution.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-red-400 font-semibold mt-4">
                <span>Frontend Framework</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>

            {/* Card 2: WebRTC */}
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6 hover:bg-zinc-900/80 hover:border-red-500/30 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-52">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 text-red-400">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">WebRTC</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Mesh peer-to-peer connection for immediate, uncompressed video exchange directly between browsers.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-red-400 font-semibold mt-4">
                <span>P2P Networking</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>

            {/* Card 3: Socket.io */}
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6 hover:bg-zinc-900/80 hover:border-red-500/30 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-52">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 text-red-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Socket.io</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Bidirectional real-time signaling backend connection to orchestrate and align calls and recording status.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-red-400 font-semibold mt-4">
                <span>Real-time Signaling</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>

            {/* Card 4: Supabase */}
            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6 hover:bg-zinc-900/80 hover:border-red-500/30 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-52">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-4 text-red-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Supabase</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  High-speed PostgreSQL storage database along with secure Service-Role Storage Bucket uploads.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-red-400 font-semibold mt-4">
                <span>Database & File Bucket</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </div>

          </div>
        </section>

        {/* Footer section */}
        <footer className="mt-32 pt-8 border-t border-white/5 text-center text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Podium. Designed for pixel-perfect, uncompressed remote capture.</p>
        </footer>

      </main>
    </div>
  );
}
