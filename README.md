# Reelz — Local Shorts Studio

A private, self-hosted, $0-cost YouTube Shorts studio running on local Windows 11 hardware without GPU requirements. Generates original scripts with local Ollama (`qwen2.5:3b`), speech narration and word timestamps with Kokoro TTS, and renders 1080×1920 vertical MP4 videos with HyperFrames completely offline.

---

## Verified Capabilities (P0 MVP Baseline)

- **Scripting:** Local Ollama (`qwen2.5:3b`) generates structured, validated multi-scene scripts (`title`, `hook`, `scenes`, `hashtags`), with manual script pasting and editing fallback.
- **Voiceover:** Kokoro TTS synthesizes 24 kHz normalized WAV narration and word timestamps with zero API keys.
- **Zero-Key Rendering:** Deterministic HyperFrames HTML/GSAP motion compiler with locally bundled GSAP and royalty-free SFX (zero CDN dependencies).
- **Video Output:** Broadcast-ready 1080×1920 (9:16) H.264 MP4 with AAC audio.
- **Studio UI:** Clean dark Next.js App Router dashboard (`/`, `/create`, `/videos/[id]`, `/library`, `/settings`).
- **Persistence & Queue:** SQLite database via Prisma ORM with single-concurrency background job queue and crash recovery.
- **Security:** Password-protected local authentication with signed HTTP-only cookies; scoped to localhost and trusted LAN peers.

---

## Verified Smoke Test Benchmark

- **Output File:** `storage/videos/smoke-test/final.mp4`
- **File Size:** 1.03 MB (1,081,649 bytes)
- **Duration:** 26.20 seconds
- **Dimensions:** 1080 × 1920 (9:16 vertical)
- **Codecs:** H.264 (video), AAC (audio)
- **Hardware Profile:** 16 GB Windows 11, Intel UHD Graphics 620, CPU-only inference and rendering
- **Rendering Time:** 5m 36s (786 frames rendered at 30 fps across 3 parallel CPU workers)

---

## Quickstart

### 1. Prerequisites
- Windows 11 + Node.js 22+, pnpm, Python 3.10–3.12, FFmpeg.
- Ollama running locally with `qwen2.5:3b`:
  ```powershell
  ollama list
  # If missing: ollama pull qwen2.5:3b
  ```

### 2. Configuration
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Ensure `KOKORO_PYTHON_PATH` points to your Python virtual environment with `kokoro` and `espeak-ng`.

### 3. Run Automated Tests
```powershell
pnpm test
```
Runs 14 automated unit tests verifying schema validation, password hashing, JWT sessions, and SQLite database connectivity.

### 4. Run Standalone Rendering Smoke Test
```powershell
pnpm smoke:render
```
Generates a complete 26-second vertical video end-to-end from topic to final MP4 without starting the web server.

### 5. Launch Studio Dashboard
```powershell
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. On first launch, enter your chosen username and password to initialize the primary administrator account.

For private local area network (LAN) access from a secondary laptop:
```powershell
pnpm dev --hostname 0.0.0.0
```
Open `http://<your-lan-ip>:3000` from the secondary laptop.

---

## Project Structure

```text
reelz/
├── src/
│   ├── app/                 # Next.js App Router (Studio, Create, Library, Settings, Auth, APIs)
│   ├── components/          # Navigation, player, and scene editor components
│   ├── integrations/
│   │   ├── ollama/          # Local qwen2.5:3b prompt & structured JSON client
│   │   ├── kokoro/          # Python TTS bridge & timestamp parser
│   │   └── hyperframes/     # Deterministic HTML/GSAP compiler & renderer
│   ├── lib/                 # Auth (jose, bcrypt), database (Prisma), storage, Zod schemas
│   └── worker/              # Single-concurrency transactional render queue
├── prisma/                  # SQLite schema and migrations
├── scripts/
│   ├── kokoro-tts.py        # Local Python speech synthesizer
│   ├── smoke-render.js      # P0 end-to-end video generator
│   └── test-units.js        # Automated unit test suite
├── storage/
│   └── videos/              # Video outputs, audio WAVs, transcripts, and render logs
└── templates/
    └── shorts/classic/      # Deterministic motion templates and bundled local GSAP
```

---

## Next Tasks (P1 Integrations)

- [ ] Optional Groq hosted text adapter for accelerated remote script generation.
- [ ] User media uploads with custom footage assignment per scene.
- [ ] Optional `short-video-maker` Docker adapter for users with existing Pexels API keys.
- [ ] YouTube Data API v3 OAuth integration and private test uploads with explicit user confirmation.
