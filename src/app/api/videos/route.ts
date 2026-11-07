import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { VideoCreateInputSchema, ScriptDocument } from "@/lib/schemas";
import { generateOllamaScript } from "@/integrations/ollama/client";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = await db.video.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      renderJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ videos });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const input = VideoCreateInputSchema.parse(body);

    let scriptDoc: ScriptDocument;
    const title = input.title || input.topic || "Untitled Short";

    if (input.script && input.script.trim()) {
      // User pasted script
      const paragraphs = input.script
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const scenes = paragraphs.map((para, idx) => ({
        id: `scene_${idx + 1}`,
        order: idx + 1,
        narration: para,
        onScreenText: para.slice(0, 30).toUpperCase(),
        mediaKeywords: [input.topic || "story"],
      }));

      scriptDoc = {
        title,
        description: `Short about ${title}`,
        hook: scenes[0]?.narration || title,
        scenes,
        hashtags: ["#shorts"],
      };
    } else if (input.provider === "ollama" && input.topic) {
      // Auto-generate via Ollama
      try {
        scriptDoc = await generateOllamaScript({
          topic: input.topic,
          targetSeconds: input.targetSeconds,
        });
      } catch (ollamaErr) {
        console.warn("[Ollama fallback]", ollamaErr);
        // Fallback editable draft
        scriptDoc = {
          title,
          description: `Short about ${input.topic}`,
          hook: `Discover the untold story of ${input.topic}.`,
          scenes: [
            {
              id: "scene_1",
              order: 1,
              narration: `Did you know this about ${input.topic}?`,
              onScreenText: "DID YOU KNOW THIS?",
              mediaKeywords: [input.topic],
            },
            {
              id: "scene_2",
              order: 2,
              narration: `Here is the most surprising fact about ${input.topic}.`,
              onScreenText: "THE UNTOLD SECRET",
              mediaKeywords: [input.topic],
            },
            {
              id: "scene_3",
              order: 3,
              narration: "Subscribe and share your thoughts in the comments.",
              onScreenText: "FOLLOW FOR MORE",
              mediaKeywords: ["subscribe"],
            },
          ],
          hashtags: ["#shorts", "#facts"],
        };
      }
    } else {
      // Blank draft
      scriptDoc = {
        title,
        description: "",
        hook: "",
        scenes: [
          {
            id: "scene_1",
            order: 1,
            narration: "Enter spoken narration here.",
            onScreenText: "HEADLINE TEXT",
            mediaKeywords: [],
          },
        ],
        hashtags: ["#shorts"],
      };
    }

    const video = await db.video.create({
      data: {
        ownerId: session.userId,
        title: scriptDoc.title,
        topic: input.topic || "",
        provider: input.provider,
        targetSeconds: input.targetSeconds,
        voice: input.voice,
        scriptJson: JSON.stringify(scriptDoc),
        status: "draft",
      },
    });

    return NextResponse.json({ video }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

