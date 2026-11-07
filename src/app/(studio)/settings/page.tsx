"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Cpu,
  Mic,
  Film,
  HardDrive,
  ShieldCheck,
  Network,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface HealthData {
  status: string;
  uptime: number;
  node: string;
  ollama: {
    available: boolean;
    endpoint: string;
    model: string;
  };
  tts: {
    engine: string;
    pythonPath: string;
  };
  renderer: {
    engine: string;
    zeroKeyMode: boolean;
  };
  storage: {
    totalProjects: number;
    totalSizeBytes: number;
    totalSizeMb: number;
  };
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !health) {
    return <div className="p-12 text-center text-[#94A3B8]">Loading system settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="border-b border-[#232D42] pb-5">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-blue-400" />
          <span>System Diagnostics & Settings</span>
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Monitor offline models, TTS pipelines, local storage quotas, and private LAN access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ollama Local Engine */}
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="font-bold text-white text-base">Ollama LLM Engine</h2>
            </div>
            {health.ollama.available ? (
              <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Online
              </span>
            ) : (
              <span className="text-xs text-red-400 bg-red-950/60 border border-red-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Offline
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-[#94A3B8] bg-[#0A0D14] p-3.5 rounded-xl border border-[#1A2233]">
            <div className="flex justify-between">
              <span>Endpoint:</span>
              <code className="text-white">{health.ollama.endpoint}</code>
            </div>
            <div className="flex justify-between">
              <span>Active Model:</span>
              <strong className="text-white">{health.ollama.model}</strong>
            </div>
            <div className="flex justify-between">
              <span>Inference:</span>
              <span className="text-emerald-400">100% Local CPU</span>
            </div>
          </div>
        </div>

        {/* Kokoro TTS */}
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mic className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white text-base">Kokoro Speech Engine</h2>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Installed
            </span>
          </div>

          <div className="space-y-2 text-xs text-[#94A3B8] bg-[#0A0D14] p-3.5 rounded-xl border border-[#1A2233]">
            <div className="flex justify-between">
              <span>Output Format:</span>
              <strong className="text-white">24 kHz Mono WAV + Timestamps</strong>
            </div>
            <div className="flex justify-between">
              <span>Speech Speed:</span>
              <strong className="text-white">1.15x (Optimized for Shorts)</strong>
            </div>
            <div className="flex justify-between truncate">
              <span>Python:</span>
              <span className="text-[#64748B] truncate max-w-[200px]" title={health.tts.pythonPath}>
                {health.tts.pythonPath}
              </span>
            </div>
          </div>
        </div>

        {/* HyperFrames Renderer */}
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Film className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-white text-base">HyperFrames Renderer</h2>
            </div>
            <span className="text-xs text-blue-400 bg-blue-950/60 border border-blue-800/40 px-2 py-0.5 rounded-full">
              CLI Native
            </span>
          </div>

          <div className="space-y-2 text-xs text-[#94A3B8] bg-[#0A0D14] p-3.5 rounded-xl border border-[#1A2233]">
            <div className="flex justify-between">
              <span>Target Resolution:</span>
              <strong className="text-white">1080 × 1920 (9:16)</strong>
            </div>
            <div className="flex justify-between">
              <span>Rendering Mode:</span>
              <span className="text-emerald-400">Deterministic GSAP Motion</span>
            </div>
            <div className="flex justify-between">
              <span>Zero-Key Guarantee:</span>
              <strong className="text-white">Enabled ($0 / No APIs)</strong>
            </div>
          </div>
        </div>

        {/* Local Storage Quota */}
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-base">Storage Usage</h2>
            </div>
            <span className="text-xs text-[#94A3B8]">Quota: 30 GB</span>
          </div>

          <div className="space-y-2 text-xs text-[#94A3B8] bg-[#0A0D14] p-3.5 rounded-xl border border-[#1A2233]">
            <div className="flex justify-between">
              <span>Total Video Projects:</span>
              <strong className="text-white">{health.storage.totalProjects}</strong>
            </div>
            <div className="flex justify-between">
              <span>Disk Space Used:</span>
              <strong className="text-white">{health.storage.totalSizeMb} MB</strong>
            </div>
            <div className="flex justify-between">
              <span>Storage Directory:</span>
              <code className="text-[#64748B]">./storage/videos/</code>
            </div>
          </div>
        </div>
      </div>

      {/* LAN Deployment Instructions */}
      <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Network className="w-5 h-5 text-blue-400" />
          <h2 className="font-bold text-white text-base">Private LAN Multi-Device Access</h2>
        </div>

        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Reelz is designed to run on your primary PC and be accessed from your secondary laptop over your trusted local network.
        </p>

        <div className="bg-[#0A0D14] p-4 rounded-xl border border-[#1A2233] space-y-3 text-xs">
          <div>
            <span className="font-bold text-white block mb-1">1. Run Next.js with host binding:</span>
            <code className="text-blue-400 bg-black/50 px-2 py-1 rounded block w-fit font-mono">
              pnpm dev --hostname 0.0.0.0
            </code>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">2. Access from secondary laptop:</span>
            <span className="text-[#94A3B8]">
              Run <code className="text-white">ipconfig</code> on this PC to get your IPv4 address (e.g. 192.168.1.X). Open <code className="text-blue-400">http://192.168.1.X:3000</code> on the secondary laptop.
            </span>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">3. Security rule:</span>
            <span className="text-[#94A3B8]">
              Never forward port 3000 or port 11434 on your home router to the public internet. Keep Reelz scoped strictly to your private LAN.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

