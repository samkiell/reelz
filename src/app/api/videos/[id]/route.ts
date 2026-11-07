import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { VideoPatchInputSchema } from "@/lib/schemas";
import { deleteVideoStorage } from "@/lib/storage";

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
    include: {
      renderJobs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ video });
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.video.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (existing.status === "rendering" || existing.status === "narrating") {
    return NextResponse.json(
      { error: "Cannot edit video while render is in progress" },
      { status: 409 }
    );
  }

  try {
    const body = await req.json();
    const input = VideoPatchInputSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (input.title) updateData.title = input.title;
    if (input.targetSeconds) updateData.targetSeconds = input.targetSeconds;
    if (input.voice) updateData.voice = input.voice;
    if (input.script) {
      updateData.scriptJson = JSON.stringify(input.script);
      if (!input.title && input.script.title) {
        updateData.title = input.script.title;
      }
    }

    const updated = await db.video.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ video: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await db.video.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Delete project from database and safe storage cleanup
  await db.video.delete({ where: { id } });
  await deleteVideoStorage(id);

  return NextResponse.json({ success: true });
}

