import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { TranscriptWord, TranscriptWordSchema } from "@/lib/schemas";

export interface KokoroGenerateOptions {
  voice?: string;
  lang?: string;
  speed?: number;
  shorts?: boolean;
}

export interface KokoroResult {
  audioPath: string;
  transcriptPath: string;
  transcript: TranscriptWord[];
  durationSeconds: number;
  wordCount: number;
}

export async function generateKokoroAudio(
  projectDir: string,
  options: KokoroGenerateOptions = {}
): Promise<KokoroResult> {
  const pythonPath =
    process.env.KOKORO_PYTHON_PATH ||
    "c:\\Users\\SAMKIEL\\CODEX\\Tools\\hyperframes-ai-video-generation\\.venv-tts\\Scripts\\python.exe";

  const scriptPath = path.resolve(process.cwd(), "scripts", "kokoro-tts.py");
  const resolvedProject = path.resolve(projectDir);

  const args = [scriptPath, resolvedProject, "--shorts"];
  if (options.voice) {
    args.push("--voice", options.voice);
  }
  if (options.lang) {
    args.push("--lang", options.lang);
  }
  if (options.speed) {
    args.push("--speed", options.speed.toString());
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonPath, args, {
      cwd: process.cwd(),
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Kokoro TTS failed with exit code ${code}:\n${stderr || stdout}`)
        );
      }

      try {
        const transcriptPath = path.join(resolvedProject, "transcript.json");
        const audioPath = path.join(resolvedProject, "audio", "narration.wav");

        const rawTranscript = await fs.readFile(transcriptPath, "utf-8");
        const parsedTranscript = JSON.parse(rawTranscript);
        const transcript: TranscriptWord[] = parsedTranscript.map((item: unknown) =>
          TranscriptWordSchema.parse(item)
        );

        // Approximate duration from last word timestamp + margin or 0
        const lastWord = transcript[transcript.length - 1];
        const durationSeconds = lastWord ? lastWord.end + 0.5 : 0;

        resolve({
          audioPath,
          transcriptPath,
          transcript,
          durationSeconds,
          wordCount: transcript.length,
        });
      } catch (err) {
        reject(new Error(`Failed to parse Kokoro output: ${err}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn Kokoro Python process: ${err.message}`));
    });
  });
}

