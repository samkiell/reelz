"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Film,
  HardDrive,
  Cpu,
  Clock,
  PlayCircle,
  Download,
  Trash2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface VideoSummary {
  id: string;
  title: string;
  topic: string;
  status: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<{
    ollama?: { available: boolean; model: string };
    storage?: { totalProjects: number; totalSizeMb: number };
  }>({});

  useEffect(() => {
    // Check auth
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));

    // Fetch videos and health
    Promise.all([
      fetch("/api/videos").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ])
      .then(([videoData, healthData]) => {
        if (videoData.videos) setVideos(videoData.videos);
        setHealth(healthData);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this video and its files?")) return;

    try {
      await fetch(`/api/videos/${id}`, { method: "DELETE" });
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch {
      alert("Failed to delete video");
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Ready
          </span>
        );
      case "rendering":
      case "narrating":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            {status === "narrating" ? "Voiceover" : "Rendering"}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#1E293B] text-[#94A3B8] border border-[#334155]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]"></span>
            Draft
          </span>
        );
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232D42] pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Production Studio</h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Generate original, narrated, captioned YouTube Shorts locally with zero external keys.
          </p>
        </div>

        <Link
          href="/create"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-md shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Short
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121826] border border-[#232D42] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Shorts</span>
            <Film className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{videos.length}</div>
        </div>

        <div className="bg-[#121826] border border-[#232D42] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Local Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {health.storage?.totalSizeMb ? `${health.storage.totalSizeMb} MB` : "0 MB"}
          </div>
        </div>

        <div className="bg-[#121826] border border-[#232D42] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ollama Model</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">
            {health.ollama?.model || "qwen2.5:3b"}
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Offline Local LLM</div>
        </div>

        <div className="bg-[#121826] border border-[#232D42] rounded-xl p-5">
          <div className="flex items-center justify-between text-[#94A3B8] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Renderer Engine</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">HyperFrames</div>
          <div className="text-[11px] text-blue-400 mt-0.5">Zero-Key Deterministic</div>
        </div>
      </div>

      {/* Recent Videos Section */}
      <div className="bg-[#121826] border border-[#232D42] rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#232D42] flex items-center justify-between">
          <h2 className="font-bold text-lg text-white">Recent Projects</h2>
          <span className="text-xs text-[#94A3B8]">{videos.length} projects</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#94A3B8] text-sm">Loading studio projects...</div>
        ) : videos.length === 0 ? (
          <div className="p-16 text-center">
            <Film className="w-12 h-12 text-[#475569] mx-auto mb-3" />
            <h3 className="font-bold text-white text-base">No video projects yet</h3>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-sm mx-auto">
              Start by typing a topic for Ollama or pasting your own script to generate your first Short.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-xs mt-4 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Create First Short
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#232D42]">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => router.push(`/videos/${video.id}`)}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#182032] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-14 rounded-lg bg-[#0A0D14] border border-[#232D42] flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-base truncate">{video.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-0.5">
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      {video.durationSeconds && (
                        <span>{video.durationSeconds.toFixed(1)}s</span>
                      )}
                      {video.fileSizeBytes && (
                        <span>{(video.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {getStatusBadge(video.status)}

                  {video.status === "ready" && (
                    <a
                      href={`/api/videos/${video.id}/download`}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#232D42] transition-colors"
                      title="Download MP4"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  <button
                    onClick={(e) => handleDelete(video.id, e)}
                    className="p-2 text-[#94A3B8] hover:text-red-400 rounded-lg hover:bg-[#232D42] transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

