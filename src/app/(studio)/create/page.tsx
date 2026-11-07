"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, FileText, ArrowRight, Clock, Mic, AlignLeft } from "lucide-react";

export default function CreateShortPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ollama" | "manual">("ollama");
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [targetSeconds, setTargetSeconds] = useState<30 | 45 | 60>(30);
  const [voice, setVoice] = useState("af_heart");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: mode,
          topic: mode === "ollama" ? topic : "Pasted Script",
          script: mode === "manual" ? script : undefined,
          targetSeconds,
          voice,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create short");
      }

      router.push(`/videos/${data.video.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setLoading(false);
    }
  }

  const voiceOptions = [
    { id: "af_heart", name: "Heart (American Female)", desc: "Warm, natural pacing — recommended" },
    { id: "am_michael", name: "Michael (American Male)", desc: "Authoritative, clear broadcast tone" },
    { id: "af_bella", name: "Bella (American Female)", desc: "Energetic, dynamic YouTube style" },
    { id: "am_adam", name: "Adam (American Male)", desc: "Deep, narrative documentary tone" },
  ];

  return (
    <div className="max-w-3xl mx-auto py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">Create YouTube Short</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Configure topic or paste a prepared script. Review and edit scenes before rendering.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Mode Selection Tabs */}
      <div className="grid grid-cols-2 gap-3 mb-8 bg-[#121826] p-1.5 rounded-xl border border-[#232D42]">
        <button
          type="button"
          onClick={() => setMode("ollama")}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
            mode === "ollama"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Topic → Ollama AI Script</span>
        </button>

        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
            mode === "manual"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#94A3B8] hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Paste Prepared Script</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === "ollama" ? (
          <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-bold text-white">
              What topic should Ollama write about?
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why Roman concrete lasts 2,000 years"
              className="w-full bg-[#0A0D14] border border-[#232D42] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-[#475569]"
            />
            <p className="text-xs text-[#94A3B8]">
              Powered by local <code className="text-blue-400">qwen2.5:3b</code>. No internet connection required.
            </p>
          </div>
        ) : (
          <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-bold text-white">
              Paste your script (separate scenes with blank lines)
            </label>
            <textarea
              required
              rows={6}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Hook sentence here.&#10;&#10;Second scene explaining the discovery.&#10;&#10;Third scene detailing how it works.&#10;&#10;Conclusion and final takeaway."
              className="w-full bg-[#0A0D14] border border-[#232D42] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-[#475569] font-mono leading-relaxed"
            />
            <p className="text-xs text-[#94A3B8]">
              Each blank line creates a distinct animated visual scene in the video composition.
            </p>
          </div>
        )}

        {/* Duration Selector */}
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6">
          <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Target Duration</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[30, 45, 60].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTargetSeconds(sec as 30 | 45 | 60)}
                className={`py-3 px-4 rounded-xl border text-center font-bold text-sm transition-all ${
                  targetSeconds === sec
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-[#0A0D14] border-[#232D42] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <div>~{sec} seconds</div>
                <div className="text-[11px] font-normal text-[#64748B] mt-0.5">
                  {sec === 30 ? "4 scenes" : sec === 45 ? "5 scenes" : "6 scenes"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Kokoro Voice Selector */}
        <div className="bg-[#121826] border border-[#232D42] rounded-2xl p-6">
          <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Kokoro Voiceover</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voiceOptions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVoice(v.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  voice === v.id
                    ? "bg-emerald-950/30 border-emerald-500 text-white"
                    : "bg-[#0A0D14] border-[#232D42] text-[#94A3B8] hover:border-[#334155]"
                }`}
              >
                <div className="font-bold text-sm text-white">{v.name}</div>
                <div className="text-xs text-[#64748B] mt-0.5">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl text-base transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Generating Project...</span>
          ) : (
            <>
              <span>Proceed to Studio Editor</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

