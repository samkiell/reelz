"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Play,
  Download,
  Trash2,
  Save,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Film,
  Layers,
} from "lucide-react";
import { Scene, ScriptDocument } from "@/lib/schemas";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VideoDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const [video, setVideo] = useState<{
    id: string;
    title: string;
    topic: string;
    status: string;
    durationSeconds?: number;
    fileSizeBytes?: number;
    voice: string;
    targetSeconds: number;
    errorText?: string;
  } | null>(null);

  const [scriptDoc, setScriptDoc] = useState<ScriptDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadVideo() {
    try {
      const res = await fetch(`/api/videos/${id}`);
      if (!res.ok) throw new Error("Video not found");
      const data = await res.json();
      setVideo(data.video);

      if (data.video.scriptJson) {
        setScriptDoc(JSON.parse(data.video.scriptJson));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVideo();
  }, [id]);

  // Polling while job is active
  useEffect(() => {
    if (!video) return;
    const active = ["queued", "narrating", "rendering"].includes(video.status);
    if (!active) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/videos/${id}/job`);
        if (res.ok) {
          const jobData = await res.json();
          setVideo((prev) => (prev ? { ...prev, ...jobData } : null));

          if (jobData.status === "ready" || jobData.status === "failed") {
            clearInterval(interval);
            loadVideo();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [id, video?.status]);

  async function handleSaveScript() {
    if (!scriptDoc) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptDoc, title: scriptDoc.title }),
      });

      if (!res.ok) throw new Error("Failed to save changes");
      setMessage("Script saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch {
      alert("Failed to save script changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateScript() {
    if (!confirm("Regenerate scenes using Ollama? Your current edits will be overwritten.")) return;
    setRegenerating(true);

    try {
      const res = await fetch(`/api/videos/${id}/script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: video?.topic || video?.title }),
      });

      if (!res.ok) throw new Error("Ollama generation failed");
      const data = await res.json();
      setScriptDoc(data.script);
      setVideo((prev) => (prev ? { ...prev, title: data.script.title, status: "script_ready" } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to regenerate script");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleTriggerRender() {
    setRendering(true);
    try {
      const res = await fetch(`/api/videos/${id}/render`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start render");

      setVideo((prev) => (prev ? { ...prev, status: "queued", errorText: undefined } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to trigger render");
    } finally {
      setRendering(false);
    }
  }

  function updateScene(idx: number, field: keyof Scene, value: string) {
    if (!scriptDoc) return;
    const nextScenes = [...scriptDoc.scenes];
    nextScenes[idx] = { ...nextScenes[idx], [field]: value };
    setScriptDoc({ ...scriptDoc, scenes: nextScenes });
  }

  function addScene() {
    if (!scriptDoc) return;
    const newIdx = scriptDoc.scenes.length + 1;
    const newScene: Scene = {
      id: `scene_${newIdx}`,
      order: newIdx,
      narration: "Spoken line for this new scene.",
      onScreenText: "NEW KEY POINT",
      mediaKeywords: [],
    };
    setScriptDoc({ ...scriptDoc, scenes: [...scriptDoc.scenes, newScene] });
  }

  function removeScene(idx: number) {
    if (!scriptDoc || scriptDoc.scenes.length <= 1) return;
    const nextScenes = scriptDoc.scenes.filter((_, i) => i !== idx);
    setScriptDoc({ ...scriptDoc, scenes: nextScenes });
  }

  if (loading || !video) {
    return <div className="p-12 text-center text-[#94A3B8]">Loading studio workstation...</div>;
  }

  const isJobActive = ["queued", "narrating", "rendering"].includes(video.status);

  return (
    <div className="space-y-6">
      {/* Back and Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#232D42] pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg bg-[#121826] border border-[#232D42] text-[#94A3B8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">{video.title}</h1>
            <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-0.5">
              <span>Voice: <strong className="text-white">{video.voice}</strong></span>
              <span>Target: <strong className="text-white">~{video.targetSeconds}s</strong></span>
              <span className="capitalize">Status: <strong className="text-blue-400">{video.status}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {message}
            </span>
          )}

          <button
            onClick={handleSaveScript}
            disabled={saving || isJobActive}
            className="inline-flex items-center gap-2 bg-[#1E293B] hover:bg-[#2B3950] text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Script"}</span>
          </button>

          <button
            onClick={handleRegenerateScript}
            disabled={regenerating || isJobActive}
            className="inline-flex items-center gap-2 bg-[#121826] border border-[#232D42] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            title="Regenerate with Ollama"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{regenerating ? "Regenerating..." : "Rewrite AI"}</span>
          </button>
        </div>
      </div>

      {video.errorText && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Render Error</div>
            <div className="text-xs mt-0.5">{video.errorText}</div>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Script & Scene Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Storyboard & Scenes ({scriptDoc?.scenes.length || 0})</span>
            </h2>
            <button
              onClick={addScene}
              disabled={isJobActive}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Scene</span>
            </button>
          </div>

          <div className="space-y-4">
            {scriptDoc?.scenes.map((scene, idx) => (
              <div
                key={scene.id || idx}
                className="bg-[#121826] border border-[#232D42] rounded-xl p-5 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                    Scene {String(idx + 1).padStart(2, "0")}
                  </span>
                  {scriptDoc.scenes.length > 1 && !isJobActive && (
                    <button
                      onClick={() => removeScene(idx)}
                      className="text-xs text-[#64748B] hover:text-red-400 transition-colors"
                      title="Remove scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
                    Spoken Narration (Kokoro Voice)
                  </label>
                  <textarea
                    rows={2}
                    value={scene.narration}
                    disabled={isJobActive}
                    onChange={(e) => updateScene(idx, "narration", e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#232D42] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
                    On-Screen Headline (Bold Motion Card)
                  </label>
                  <input
                    type="text"
                    value={scene.onScreenText}
                    disabled={isJobActive}
                    onChange={(e) => updateScene(idx, "onScreenText", e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#232D42] rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-blue-500 uppercase tracking-wide disabled:opacity-60"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Preview & Render Controller (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 shadow-md">
            <h2 className="text-base font-bold text-white mb-4">Video Output (9:16)</h2>

            {video.status === "ready" ? (
              <div className="space-y-4">
                <div className="relative mx-auto w-full max-w-[280px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-[#232D42] shadow-2xl">
                  <video
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    src={`/api/videos/${id}/stream`}
                  />
                </div>

                <div className="bg-[#0A0D14] border border-[#232D42] rounded-xl p-4 space-y-2 text-xs text-[#94A3B8]">
                  <div className="flex justify-between">
                    <span>Resolution:</span>
                    <strong className="text-white">1080 × 1920</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <strong className="text-white">{video.durationSeconds?.toFixed(1)}s</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>File Size:</span>
                    <strong className="text-white">
                      {video.fileSizeBytes
                        ? `${(video.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                        : "N/A"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Codecs:</span>
                    <strong className="text-white">H.264 / AAC</strong>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`/api/videos/${id}/download`}
                    download
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download MP4</span>
                  </a>

                  <button
                    onClick={handleTriggerRender}
                    disabled={rendering}
                    className="bg-[#1E293B] hover:bg-[#2B3950] text-[#CBD5E1] font-medium py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Regenerate video from edited script"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-render</span>
                  </button>
                </div>
              </div>
            ) : isJobActive ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto"></div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {video.status === "queued" && "Queued in Pipeline..."}
                    {video.status === "narrating" && "Generating Kokoro Narration..."}
                    {video.status === "rendering" && "Rendering 1080x1920 MP4..."}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-xs mx-auto">
                    Executing offline motion composition. Please do not close this window.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-24 rounded-xl bg-[#0A0D14] border border-[#232D42] flex items-center justify-center mx-auto text-[#475569]">
                  <Film className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Ready to Generate</h3>
                  <p className="text-xs text-[#94A3B8] mt-1 max-w-xs mx-auto">
                    Review your scenes on the left, then click below to render your 9:16 vertical MP4.
                  </p>
                </div>

                <button
                  onClick={handleTriggerRender}
                  disabled={rendering}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Generate Video (Zero-Key Local)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

