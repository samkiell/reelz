import { z } from "zod";

export const SceneSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  order: z.number().int().min(1),
  narration: z.string().min(1, "Narration cannot be empty"),
  onScreenText: z.string().min(1, "On-screen text is required"),
  mediaKeywords: z.array(z.string()).default([]),
  assetPath: z.string().optional(),
});

export type Scene = z.infer<typeof SceneSchema>;

export const ScriptDocumentSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().default(""),
  hook: z.string().min(1),
  scenes: z.array(SceneSchema).min(1).max(10),
  hashtags: z.array(z.string()).default([]),
});

export type ScriptDocument = z.infer<typeof ScriptDocumentSchema>;

export const VideoCreateInputSchema = z.object({
  topic: z.string().optional().default(""),
  script: z.string().optional(),
  title: z.string().optional(),
  targetSeconds: z.union([z.literal(30), z.literal(45), z.literal(60)]).default(30),
  provider: z.enum(["ollama", "manual", "groq"]).default("ollama"),
  voice: z.string().default("af_heart"),
});

export type VideoCreateInput = z.infer<typeof VideoCreateInputSchema>;

export const VideoPatchInputSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  targetSeconds: z.union([z.literal(30), z.literal(45), z.literal(60)]).optional(),
  voice: z.string().optional(),
  script: ScriptDocumentSchema.optional(),
});

export type VideoPatchInput = z.infer<typeof VideoPatchInputSchema>;

export const TranscriptWordSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
  score: z.number().optional(),
});

export type TranscriptWord = z.infer<typeof TranscriptWordSchema>;

