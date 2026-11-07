"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Library as LibraryIcon,
  Search,
  Download,
  Trash2,
  Film,
  ExternalLink,
  PlayCircle,
  X,
} from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  topic: string;
  status: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  createdAt: string;
}

export default function LibraryPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((data) => {
        if (data.videos) setVideos(data.videos);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this video and all associated files?")) return;

    try {
      await fetch(`/api/videos/${id}`, { method: "DELETE" });
      setVideos((prev) => prev.filter((v) => v.id !== id));
      if (activeVideo?.id === id) setActiveVideo(null);
    } catch {
      alert("Failed to delete video");
    }
  }

  const filtered = videos.filter((v) => {
    const matchesQuery =
      v.title.toLowerCase().includes(query.toLowerCase()) ||
      v.topic.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filterStatus === "all" || v.status === filterStatus;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232D42] pb-5">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <LibraryIcon className="w-7 h-7 text-blue-400" />
            <span>Shorts Library</span>
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Browse, preview, and download all generated vertical MP4 videos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or topic..."
              className="bg-[#121826] border border-[#232D42] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 w-64 placeholder-[#64748B]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#121826] border border-[#232D42] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready (Playable)</option>
            <option value="draft">Draft</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#94A3B8] text-sm">Loading library...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-16 text-center">
          <Film className="w-12 h-12 text-[#475569] mx-auto mb-3" />
          <h3 className="font-bold text-white text-base">No matching videos</h3>
          <p className="text-xs text-[#94A3B8] mt-1">
            {query || filterStatus !== "all"
              ? "Try adjusting your search query or status filter."
              : "Generate your first video in the Studio to see it here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((video) => (
            <div
              key={video.id}
              className="bg-[#121826] border border-[#232D42] rounded-2xl p-5 space-y-4 hover:border-[#384A6E] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                    {video.title}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      video.status === "ready"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : video.status === "failed"
                        ? "bg-red-950 text-red-400 border border-red-800"
                        : "bg-[#1E293B] text-[#94A3B8] border border-[#334155]"
                    }`}
                  >
                    {video.status}
                  </span>
                </div>

                <p className="text-xs text-[#64748B] line-clamp-1 mb-4">
                  Topic: {video.topic || video.title}
                </p>

                <div className="bg-[#0A0D14] rounded-xl p-3 text-xs text-[#94A3B8] space-y-1.5 border border-[#1A2233]">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="text-white">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {video.durationSeconds && (
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-white">{video.durationSeconds.toFixed(1)}s</span>
                    </div>
                  )}
                  {video.fileSizeBytes && (
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="text-white">
                        {(video.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#1F293D] gap-2">
                <Link
                  href={`/videos/${video.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium py-1.5 px-2 rounded-lg hover:bg-[#1A2233] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Studio</span>
                </Link>

                <div className="flex items-center gap-1">
                  {video.status === "ready" && (
                    <>
                      <button
                        onClick={() => setActiveVideo(video)}
                        className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors"
                        title="Watch video"
                      >
                        <PlayCircle className="w-4 h-4 text-emerald-400" />
                      </button>

                      <a
                        href={`/api/videos/${video.id}/download`}
                        download
                        className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors"
                        title="Download MP4"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-1.5 text-[#94A3B8] hover:text-red-400 rounded-lg hover:bg-[#1E293B] transition-colors"
                    title="Delete video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Preview */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm truncate pr-4">
                {activeVideo.title}
              </h3>
              <button
                onClick={() => setActiveVideo(null)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-[9/16] bg-black rounded-xl overflow-hidden border border-[#232D42]">
              <video
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                src={`/api/videos/${activeVideo.id}/stream`}
              />
            </div>

            <div className="flex gap-2">
              <a
                href={`/api/videos/${activeVideo.id}/download`}
                download
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

