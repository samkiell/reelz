import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export interface RenderResult {
  outputPath: string;
  durationSeconds: number;
  bytes: number;
  logText: string;
}

export async function renderHyperframesVideo(
  projectDir: string,
  outputMp4Path: string
): Promise<RenderResult> {
  const resolvedProject = path.resolve(projectDir);
  const resolvedOutput = path.resolve(outputMp4Path);

  await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });

  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const args = ["hyperframes", "render", resolvedProject, "-o", resolvedOutput];

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(npxCmd, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      shell: true,
    });

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      const fullLog = `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;
      const logPath = path.join(resolvedProject, "render.log");
      await fs.writeFile(logPath, fullLog, "utf-8").catch(() => {});

      if (code !== 0) {
        return reject(
          new Error(
            `HyperFrames render failed with code ${code}.\nSee ${logPath}\n${stderr || stdout}`
          )
        );
      }

      try {
        const stats = await fs.stat(resolvedOutput);
        if (stats.size === 0) {
          return reject(new Error("Render completed but output file is 0 bytes"));
        }

        const probe = await ffprobeVideo(resolvedOutput);

        resolve({
          outputPath: resolvedOutput,
          durationSeconds: probe.duration,
          bytes: stats.size,
          logText: fullLog,
        });
      } catch (statErr) {
        reject(
          new Error(
            `Render produced no output file at ${resolvedOutput}: ${statErr}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn HyperFrames CLI: ${err.message}`));
    });
  });
}

interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
}

function ffprobeVideo(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const ffprobeCmd = "ffprobe";
    const args = [
      "-v",
      "error",
      "-show_entries",
      "stream=width,height,codec_name,duration:format=duration",
      "-of",
      "json",
      filePath,
    ];

    const proc = spawn(ffprobeCmd, args);
    let output = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.on("close", () => {
      try {
        const data = JSON.parse(output);
        const formatDuration = parseFloat(data.format?.duration || "0");
        const videoStream = data.streams?.find(
          (s: Record<string, string>) => s.codec_name === "h264" || s.width
        );
        const audioStream = data.streams?.find(
          (s: Record<string, string>) => s.codec_name === "aac"
        );

        resolve({
          duration: formatDuration,
          width: videoStream?.width ? parseInt(videoStream.width) : 1080,
          height: videoStream?.height ? parseInt(videoStream.height) : 1920,
          videoCodec: videoStream?.codec_name || "h264",
          audioCodec: audioStream?.codec_name || "aac",
        });
      } catch {
        resolve({
          duration: 0,
          width: 1080,
          height: 1920,
          videoCodec: "h264",
          audioCodec: "aac",
        });
      }
    });

    proc.on("error", () => {
      resolve({
        duration: 0,
        width: 1080,
        height: 1920,
        videoCodec: "h264",
        audioCodec: "aac",
      });
    });
  });
}

