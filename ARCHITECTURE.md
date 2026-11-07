# Reelz — Architecture & API Contracts

## Priorities

1. **Local-only, zero API-key render must always work.**
2. Avoid rewriting working third-party libraries.
3. Small amount of code; one background worker; SQLite; explicit provider interfaces.
4. Windows + Docker Desktop / WSL2 compatibility; nothing assumes Linux-only host paths.

## Runtime topology

```text
Browser on PC A/B (authenticated)
         |
         v
Next.js server (PC A: localhost:3000 / LAN IP:3000)
         |             \
         |              SQLite + local storage
         v
Persistent worker (PC A, max renders=1)
         |--- ScriptProvider -> Ollama localhost:11434 (default)
         |                   -> Groq HTTPS (optional P1)
         |                   -> Manual input
         |--- Local TTS: Kokoro (from existing repo)
         |--- RendererAdapter -> HyperFrames templates + FFmpeg (P0 no-key)
         |                    -> short-video-maker Docker :3123 (P1, requires Pexels)
         |--- Local MP4 output + previews
         |--- YouTube OAuth upload (P1, requires Internet)
```

For day one, keep all processes on PC A. PC B may browse via LAN. Only move Ollama to PC B **after** proving one-PC operation and measuring resource usage. Prefer encrypted tunnelling/SSH or restrictive LAN firewall for remote inference; don't advertise an unprotected raw Ollama service.

## Code structure (guideline, adjust to actual upstream code)

```text
reelz/
├── apps/web/                 # Next.js App Router UI + API routes
│   ├── app/(auth)/login/
│   ├── app/(studio)/create/
│   ├── app/(studio)/videos/[id]/
│   └── app/api/
├── services/worker/         # poll persistent jobs or simple persistent queue
├── packages/shared/         # zod, common interfaces, schemas
├── integrations/
│   ├── ollama/
│   ├── groq/                # P1
│   ├── kokoro/
│   ├── hyperframes/
│   ├── short-video-maker/   # P1
│   └── youtube/             # P1
├── templates/               # legally reusable local templates
├── prisma/                  # SQLite schema + migrations
├── storage/                 # ignored except .gitkeep
├── docs/                    # move these docs here if desired
├── .env.example
├── AGENTS.md
├── CLAUDE.md
├── PRD.md
└── README.md
```

Avoid scattering integration code across UI components. The worker can initially be a standalone Node process. Use one persistent DB-backed job queue (transactional claim + idempotent processing) instead of adding Redis/BullMQ on day one.

## Domain types

```ts
type ScriptProvider = 'manual' | 'ollama' | 'groq';
type RendererProvider = 'hyperframes-local' | 'short-video-maker';
type VideoStatus =
  | 'draft' | 'scripting' | 'script_ready' | 'queued'
  | 'narrating' | 'rendering' | 'ready' | 'failed'
  | 'uploading' | 'uploaded' | 'scheduled' | 'published';

type Scene = {
  id: string;
  order: number;
  narration: string;
  onScreenText: string;
  mediaKeywords: string[];
  assetPath?: string; // validated local path, P1
};

type ScriptDocument = {
  title: string;
  description: string;
  hook: string;
  scenes: Scene[];
  hashtags: string[];
};
```

Duration is a *target*, not guaranteed output; measure voice narration length and adapt visual sequence. Validation with Zod: 1–10 scenes; no blank narration; title <=100 chars where relevant for YouTube; sanitise any HTML/ASS render interpolation.

## Persistent data model (minimal)

```text
User(id, displayName, username, passwordHash, role, createdAt)
Video(id, ownerId, title, topic, provider, model, targetSeconds,
      scriptJson, status, createdAt, updatedAt, latestOutputPath?, errorText?)
RenderJob(id, videoId, status, attempts, startedAt?, finishedAt?,
          errorCode?, errorMessage?, workerHeartbeatAt?)
Asset(id, ownerId, path, licenseType, sourceUrl?, attribution?, createdAt)
YouTubeAccount(id, ownerId, channelId, encryptedRefreshToken,
               tokenExpiresAt?, connectedAt)  # only P1
Upload(id, videoId, accountId, youtubeVideoId?, status, privacy,
       scheduledAt?, errorText?, createdAt)  # only P1
```

Store UUIDs and safe paths. Use password hashing (Argon2 or bcrypt) and secure signed sessions; user provisioning via local setup CLI or one-time initial admin setup with forced password creation, never a hardcoded default password. No passwords in `.env.example`.

## API contracts (may be adjusted during implementation)

```text
GET    /api/health
GET    /api/providers
POST   /api/videos                    Create draft from topic or script
GET    /api/videos                    List
GET    /api/videos/:id                Detail
PATCH  /api/videos/:id                Edit script/metadata while idle
DELETE /api/videos/:id                Delete with safe cleanup
POST   /api/videos/:id/script         Generate Ollama script (manual fallback)
POST   /api/videos/:id/render         Enqueue once, idempotent
GET    /api/videos/:id/job            Status/progress
GET    /api/videos/:id/stream         Authenticated local MP4 streaming
GET    /api/videos/:id/download       Content-Disposition download
POST   /api/youtube/connect           P1
POST   /api/videos/:id/upload         P1, requires approval
```

All protected routes require sessions. No raw arbitrary filesystem paths in public request bodies; no user-supplied URL passed directly to ffmpeg or a fetch call; prevent SSRF/path traversal. Avoid exposing `/storage` directly from Next.js static public files if sessions are required.

## Rendering contracts

```ts
interface ScriptAdapter {
  generate(input: { topic: string; durationSeconds: number; tone?: string }): Promise<ScriptDocument>;
}
interface RenderAdapter {
  render(job: { videoId: string; script: ScriptDocument; voice: string; targetSeconds: number; storageDir: string }): Promise<{ filePath: string; durationSeconds: number; bytes: number }>;
}
```

**P0 HyperFrames adapter:** Copy/adapt legally permitted code from own repo, starting with `templates/shorts/classic/`, `scripts/kokoro-tts.py`, `scripts/compute_timings.py`. Replace agent-authored HTML edits with structured data-driven **storytelling** templates or a safe template compiler; remove mandatory stat cards / outbound link CTAs to avoid fabricated stats. Vendor/bundle GSAP, fonts and other assets locally so runtime Internet is not required. Generate voice + transcript, produce HTML composition, run local render to MP4. For a blocker with HyperFrames CLI, implement minimal FFmpeg drawtext/ASS subtitles fallback with simple licensed local visuals; document deviation. Video output MUST exist and be playable before marking job `ready`.

**P1 short-video-maker adapter:** `POST http://127.0.0.1:3123/api/short-video` JSON `{scenes:[{text,searchTerms}],config:{orientation:'portrait',voice:'af_heart'}}`; poll `GET /api/short-video/{id}/status`; fetch `GET /api/short-video/{id}`. Needs Pexels key. Does not support user-supplied media by default. Use `gyoridavid/short-video-maker:latest-tiny` in Docker, memory >=4GB and single concurrency. Don't add it to first-day required test path.

## Offline behavior / resilience

- Manual mode + existing local template/assets + Kokoro + ffmpeg/HyperFrames => no Internet required after dependencies are installed.
- Ollama stopped => manual script and previous projects remain usable, explicit warning for AI mode.
- Interrupted render => stale job reclassified after restart; never mislabel incomplete MP4 as ready.
- Filesystem full => fail with actionable message and retain input project metadata.
- Optional API provider unavailable => no global system outage.

## Security / operations

- Bind Next dev server to localhost by default. For LAN, opt in to host `0.0.0.0` with Windows Firewall rule scoped to private network and trusted peers, plus required auth. Never port-forward router.
- Bind Docker renderer to `127.0.0.1:3123`; Ollama localhost by default.
- Store all tokens encrypted at rest (P1). Do not log generated scripts containing secrets or API tokens.
- Paths for outputs should stay within `storage/`, with size checks and escaping.
- License audit before shipping: HyperFrames Apache-2.0, copied templates attribution, Remotion use within license terms, third-party media license record. Respect YouTube's original-content expectations.

## References

- Local source code: https://github.com/samkiell/Generate-Videos-with-HTML
- Optional third-party renderer: https://github.com/gyoridavid/short-video-maker
- HyperFrames: https://github.com/heygen-com/hyperframes
- Ollama: https://ollama.com/library/qwen2.5:3b
- YouTube: https://developers.google.com/youtube/data/reference/rest/v3/videos
