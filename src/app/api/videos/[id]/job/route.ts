import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await db.video.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      errorText: true,
      durationSeconds: true,
      fileSizeBytes: true,
      renderJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const latestJob = video.renderJobs[0] || null;

  return NextResponse.json({
    status: video.status,
    error: video.errorText,
    durationSeconds: video.durationSeconds,
    fileSizeBytes: video.fileSizeBytes,
    job: latestJob,
  });
}

