import { NextResponse } from "next/server";

export async function GET() {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasPexels = Boolean(process.env.PEXELS_API_KEY);

  let ollamaModels: string[] = [];
  try {
    const res = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      ollamaModels = data.models?.map((m: { name: string }) => m.name) || [];
    }
  } catch {
    // Offline
  }

  return NextResponse.json({
    scripting: [
      {
        id: "ollama",
        name: "Ollama (Local Offline)",
        available: ollamaModels.length > 0,
        defaultModel: process.env.OLLAMA_MODEL || "qwen2.5:3b",
        models: ollamaModels,
      },
      {
        id: "manual",
        name: "Manual Script Paste",
        available: true,
      },
      {
        id: "groq",
        name: "Groq (Cloud Optional)",
        available: hasGroq,
      },
    ],
    voices: [
      { id: "af_heart", name: "Heart (American Female)", provider: "kokoro", default: true },
      { id: "am_michael", name: "Michael (American Male)", provider: "kokoro" },
      { id: "af_bella", name: "Bella (American Female)", provider: "kokoro" },
      { id: "am_adam", name: "Adam (American Male)", provider: "kokoro" },
    ],
    rendering: [
      {
        id: "hyperframes-local",
        name: "HyperFrames Local (Zero-Key)",
        available: true,
        default: true,
      },
      {
        id: "short-video-maker",
        name: "Stock Video Maker (Docker + Pexels)",
        available: hasPexels,
      },
    ],
  });
}

