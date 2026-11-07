import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { enqueueRenderJob } from "@/worker/render-job";

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

  if (video.status === "narrating" || video.status === "rendering") {
    return NextResponse.json(
      { error: "A render job is already active for this video" },
      { status: 409 }
    );
  }

  try {
    const jobId = await enqueueRenderJob(id);
    return NextResponse.json({
      success: true,
      jobId,
      message: "Render job queued successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

