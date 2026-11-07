import { ScriptDocument, ScriptDocumentSchema } from "@/lib/schemas";

export interface GenerateScriptOptions {
  topic: string;
  targetSeconds?: number;
  tone?: string;
}

export async function generateOllamaScript(
  options: GenerateScriptOptions
): Promise<ScriptDocument> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "qwen2.5:3b";
  const duration = options.targetSeconds || 30;
  const tone = options.tone || "informative and engaging";

  const numScenes = duration <= 30 ? 4 : duration <= 45 ? 5 : 6;

  const systemPrompt = `You are a viral YouTube Shorts scriptwriter and director.
Create a high-retention, original vertical video script about: "${options.topic}".
Target duration: ~${duration} seconds.
Tone: ${tone}.

Requirements:
1. Return STRICT valid JSON only. No markdown fences, no conversational preamble.
2. Hook must be arresting in the first 2 seconds.
3. Provide exactly ${numScenes} distinct scenes.
4. Each scene must have:
   - "id": unique string like "scene_1"
   - "order": integer (1 to ${numScenes})
   - "narration": 1-2 punchy spoken sentences for text-to-speech (NO brackets, NO URLs)
   - "onScreenText": 3-6 bold punchy words displayed on screen
   - "mediaKeywords": 2-3 visual keywords (e.g. ["honey jar", "ancient tomb"])
5. Final scene must act as a clear takeaway or conclusion with a memorable final thought.

JSON structure:
{
  "title": "Short punchy YouTube title (max 70 chars)",
  "description": "Engaging 1-2 sentence description",
  "hook": "Spoken hook sentence",
  "scenes": [
    {
      "id": "scene_1",
      "order": 1,
      "narration": "Spoken line for scene 1",
      "onScreenText": "BOLD ON SCREEN TEXT",
      "mediaKeywords": ["keyword1", "keyword2"]
    }
  ],
  "hashtags": ["#shorts", "#topic"]
}`;

  const requestBody = {
    model,
    prompt: systemPrompt,
    stream: false,
    format: "json",
    options: {
      temperature: 0.7,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3 minutes timeout for CPU load

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const rawResponse = data.response;

    return parseAndValidateScript(rawResponse, options.topic);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Ollama request timed out after 180 seconds. Check if Ollama is running at ${baseUrl}`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseAndValidateScript(rawJson: string, fallbackTopic: string): ScriptDocument {
  let cleaned = rawJson.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error(`Ollama returned malformed JSON: ${parseErr}\nRaw: ${cleaned.substring(0, 200)}...`);
  }

  const result = ScriptDocumentSchema.safeParse(parsed);
  if (!result.success) {
    // Attempt schema normalization if fields are slightly off
    const raw = parsed as Record<string, unknown>;
    const scenesRaw = Array.isArray(raw?.scenes) ? raw.scenes : [];

    const normalizedDoc = {
      title: typeof raw?.title === "string" ? raw.title : `Short: ${fallbackTopic}`,
      description: typeof raw?.description === "string" ? raw.description : "",
      hook: typeof raw?.hook === "string" ? raw.hook : fallbackTopic,
      scenes: scenesRaw.map((s: Record<string, unknown>, idx: number) => ({
        id: typeof s?.id === "string" ? s.id : `scene_${idx + 1}`,
        order: idx + 1,
        narration: typeof s?.narration === "string" ? s.narration : String(s?.text || ""),
        onScreenText:
          typeof s?.onScreenText === "string"
            ? s.onScreenText
            : typeof s?.caption === "string"
            ? s.caption
            : "SCENE " + (idx + 1),
        mediaKeywords: Array.isArray(s?.mediaKeywords) ? s.mediaKeywords : [],
      })),
      hashtags: Array.isArray(raw?.hashtags) ? raw.hashtags : ["#shorts"],
    };

    const recheck = ScriptDocumentSchema.safeParse(normalizedDoc);
    if (!recheck.success) {
      throw new Error(`Failed to validate script document schema: ${JSON.stringify(result.error.issues)}`);
    }
    return recheck.data;
  }

  return result.data;
}

