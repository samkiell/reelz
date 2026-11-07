import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.resolve(process.cwd(), process.env.STORAGE_ROOT || "./storage");

export function getVideoStorageDir(videoId: string): string {
  // Sanitize videoId to prevent path traversal
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(STORAGE_ROOT, "videos", safeId);
  return dir;
}

export function getVideoOutputPath(videoId: string): string {
  return path.join(getVideoStorageDir(videoId), "final.mp4");
}

export async function ensureVideoDir(videoId: string): Promise<string> {
  const dir = getVideoStorageDir(videoId);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(path.join(dir, "audio"), { recursive: true });
  await fs.mkdir(path.join(dir, "assets"), { recursive: true });
  return dir;
}

export async function deleteVideoStorage(videoId: string): Promise<void> {
  const dir = getVideoStorageDir(videoId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore if already deleted
  }
}

export async function getStorageStats(): Promise<{
  totalProjects: number;
  totalSizeBytes: number;
  totalSizeMb: number;
}> {
  const videosDir = path.join(STORAGE_ROOT, "videos");
  let totalProjects = 0;
  let totalSizeBytes = 0;

  try {
    const entries = await fs.readdir(videosDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        totalProjects++;
        const dirPath = path.join(videosDir, entry.name);
        totalSizeBytes += await getDirectorySize(dirPath);
      }
    }
  } catch {
    // Directory might be empty or missing
  }

  return {
    totalProjects,
    totalSizeBytes,
    totalSizeMb: Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100,
  };
}

async function getDirectorySize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        size += stat.size;
      }
    }
  } catch {
    // Ignore permissions/transient read errors
  }
  return size;
}

