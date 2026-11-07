import { NextResponse } from "next/server";
import { getStorageStats } from "@/lib/storage";

export async function GET() {
  const stats = await getStorageStats();

  let ollamaOk = false;
  try {
    const res = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(3000),
    });
    ollamaOk = res.ok;
  } catch {
    ollamaOk = false;
  }

  return NextResponse.json({
    status: "healthy",
    uptime: process.uptime(),
    platform: process.platform,
    node: process.version,
    ollama: {
      available: ollamaOk,
      endpoint: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
      model: process.env.OLLAMA_MODEL || "qwen2.5:3b",
    },
    tts: {
      engine: "kokoro",
      pythonPath:
        process.env.KOKORO_PYTHON_PATH ||
        "c:\\Users\\SAMKIEL\\CODEX\\Tools\\hyperframes-ai-video-generation\\.venv-tts\\Scripts\\python.exe",
    },
    renderer: {
      engine: "hyperframes-local",
      zeroKeyMode: true,
    },
    storage: stats,
  });
}

