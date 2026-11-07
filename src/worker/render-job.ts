import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { ScriptDocument, ScriptDocumentSchema } from "@/lib/schemas";
import { ensureVideoDir, getVideoOutputPath, getVideoStorageDir } from "@/lib/storage";
import { generateKokoroAudio } from "@/integrations/kokoro/runner";
import { compileHyperframesComposition } from "@/integrations/hyperframes/compiler";
import { renderHyperframesVideo } from "@/integrations/hyperframes/renderer";

let isProcessing = false;
let hasRecovered = false;

export async function recoverStaleJobs(): Promise<void> {
  if (hasRecovered) return;
  hasRecovered = true;

  try {
    const staleJobs = await db.renderJob.findMany({
      where: {
        status: { in: ["narrating", "rendering"] },
      },
    });

    for (const job of staleJobs) {
      await db.renderJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: "Render job interrupted by server restart.",
          finishedAt: new Date(),
        },
      });

      await db.video.update({
        where: { id: job.videoId },
        data: {
          status: "failed",
          errorText: "Render interrupted by restart. Click Generate Video to retry.",
        },
      });
    }
  } catch {
    // Database might not be initialized yet during early boot
  }
}

export async function enqueueRenderJob(videoId: string): Promise<string> {
  await recoverStaleJobs();

  // Create or reset render job
  const job = await db.renderJob.create({
    data: {
      videoId,
      status: "queued",
      attempts: 1,
      startedAt: new Date(),
    },
  });

  await db.video.update({
    where: { id: videoId },
    data: {
      status: "queued",
      errorText: null,
    },
  });

  // Trigger processing asynchronously without awaiting
  setImmediate(() => {
    processQueue().catch((err) => {
      console.error("[Worker] Unhandled queue error:", err);
    });
  });

  return job.id;
}

export async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const nextJob = await db.renderJob.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    include: { video: true },
  });

  if (!nextJob) return;

  isProcessing = true;
  const { video } = nextJob;

  try {
    const videoDir = await ensureVideoDir(video.id);
    const outputPath = getVideoOutputPath(video.id);

    // 1. Parse Script Document
    const rawScript = JSON.parse(video.scriptJson);
    const scriptDoc: ScriptDocument = ScriptDocumentSchema.parse(rawScript);

    // Save script files in project directory
    const scriptText = scriptDoc.scenes.map((s) => s.narration).join("\n\n");
    await fs.writeFile(path.join(videoDir, "script.txt"), scriptText, "utf-8");
    await fs.writeFile(
      path.join(videoDir, "script.json"),
      JSON.stringify(scriptDoc, null, 2),
      "utf-8"
    );

    // 2. State: NARRATING
    await db.renderJob.update({
      where: { id: nextJob.id },
      data: { status: "narrating" },
    });
    await db.video.update({
      where: { id: video.id },
      data: { status: "narrating" },
    });

    console.log(`[Worker] Generating Kokoro narration for video ${video.id}...`);
    const kokoroResult = await generateKokoroAudio(videoDir, {
      voice: video.voice || "af_heart",
      shorts: true,
    });

    // 3. State: RENDERING
    await db.renderJob.update({
      where: { id: nextJob.id },
      data: { status: "rendering" },
    });
    await db.video.update({
      where: { id: video.id },
      data: { status: "rendering" },
    });

    console.log(`[Worker] Compiling HyperFrames composition for video ${video.id}...`);
    await compileHyperframesComposition({
      projectDir: videoDir,
      script: scriptDoc,
      transcript: kokoroResult.transcript,
      audioDuration: kokoroResult.durationSeconds,
    });

    console.log(`[Worker] Rendering MP4 for video ${video.id}...`);
    const renderResult = await renderHyperframesVideo(videoDir, outputPath);

    // 4. State: READY
    await db.video.update({
      where: { id: video.id },
      data: {
        status: "ready",
        latestOutputPath: renderResult.outputPath,
        durationSeconds: renderResult.durationSeconds,
        fileSizeBytes: renderResult.bytes,
        errorText: null,
      },
    });

    await db.renderJob.update({
      where: { id: nextJob.id },
      data: {
        status: "ready",
        finishedAt: new Date(),
        logText: renderResult.logText,
      },
    });

    console.log(`[Worker] Video ${video.id} successfully rendered to ${outputPath}!`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Worker] Job ${nextJob.id} failed:`, errorMsg);

    await db.video.update({
      where: { id: video.id },
      data: {
        status: "failed",
        errorText: errorMsg,
      },
    });

    await db.renderJob.update({
      where: { id: nextJob.id },
      data: {
        status: "failed",
        errorMessage: errorMsg,
        finishedAt: new Date(),
      },
    });
  } finally {
    isProcessing = false;
    // Check if there are other jobs waiting in queue
    setImmediate(() => {
      processQueue().catch((err) => {
        console.error("[Worker] Error processing next job:", err);
      });
    });
  }
}

