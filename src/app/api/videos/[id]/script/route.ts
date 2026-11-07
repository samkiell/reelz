import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { generateOllamaScript } from "@/integrations/ollama/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.topic || video.topic || video.title;

    const scriptDoc = await generateOllamaScript({
      topic,
      targetSeconds: video.targetSeconds,
    });

    const updated = await db.video.update({
      where: { id },
      data: {
        title: scriptDoc.title,
        topic,
        scriptJson: JSON.stringify(scriptDoc),
        status: "script_ready",
      },
    });

    return NextResponse.json({ video: updated, script: scriptDoc });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

