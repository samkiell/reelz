# Reelz — Execution Board

**Goal:** A tested first-day local MVP, not a production SaaS.

## Phase 0: Preflight and repository assessment (Completed)

- [x] Create/clone repository `reelz`. Add PRD, architecture, agent rules, setup and `.env.example`.
- [x] Inspect own `samkiell/Generate-Videos-with-HTML` templates, Kokoro script, timing helpers and HyperFrames CLI behavior.
- [x] Inspect `gyoridavid/short-video-maker` source/API; document Pexels dependency, Docker requirements and optional nature.
- [x] Run `ollama list`; verify `qwen2.5:3b` inference on one laptop.
- [x] Check Node 22+, pnpm, Python, ffmpeg, Kokoro+espeak-ng, available disk space and WSL2/Docker setup.
- [x] Check HyperFrames licensing and template asset licenses before reusing code.

## Phase 1: First end-to-end render (Completed — P0 GATE PASSED)

- [x] Implement minimal project+scene JSON schemas in Zod.
- [x] Implement Ollama script adapter with bounded timeout, JSON validation and manual script fallback.
- [x] Implement Kokoro narration output + word/sentence timestamp handling by adapting own code.
- [x] Adapt HyperFrames Classic HTML/GSAP motion composition to accept structured scenes instead of Claude writing HTML.
- [x] Add `hyperframes-local` render command from script to real H.264/AAC MP4, metadata and error handling.
- [x] With **all API keys empty**, generate a test video and play it. Save sample under ignored storage path.
- [x] Measure duration, frame dimensions, file size, peak memory, CPU use and rendering time; record results in README.

**Gate Status: PASSED.** Playable 1080×1920 H.264 MP4 generated at `storage/videos/smoke-test/final.mp4` (1.03 MB, 26.20s).

## Phase 2: Local web UI and persistence (Completed)

- [x] Create Next.js App Router with a clean, responsive dark UI; login + seeded local account setup (no hardcoded credentials).
- [x] Add SQLite + Prisma models for users, videos, render jobs.
- [x] Add create page, manual script editing, Ollama generation button.
- [x] Wire queued job processing with single concurrency; safe restart recovery.
- [x] Add video list, status badges, meaningful failures, and authenticated preview/download.
- [x] Document and verify LAN multi-device access.

## Phase 3: Reliability and handoff (Completed)

- [x] Validate user input, file paths and credentials; enforce local media storage path.
- [x] Handle Ollama offline state with manual script fallback.
- [x] Add `.env.example`, `.gitignore`, local run commands, known limits and health check.
- [x] Run lint, typecheck, tests and at least two renders.
- [x] Record completed vs uncompleted acceptance criteria in README.

## Phase 4: Optional later work (P1 backlog)

- [ ] Groq adapter with API key optional; 429 timeout handling.
- [ ] Local media uploads, per-scene footage assignments and licenses.
- [ ] Optional `short-video-maker` adapter with an already-valid Pexels key.
- [ ] YouTube OAuth and **real private test upload** with explicit approval.
- [ ] Scheduled publishing, reconnect path, publication state checks.
- [ ] Render presets, advanced subtitle styling, video templates and content QA.

---

## Verified Smoke Test Results

- **Output File:** `storage/videos/smoke-test/final.mp4`
- **Duration:** 26.20s
- **Dimensions:** 1080 × 1920 (9:16 vertical)
- **Video Codec:** H.264
- **Audio Codec:** AAC
- **File Size:** 1.03 MB (1,081,649 bytes)
- **Unit Tests:** 14 passed, 0 failed (`pnpm test`)
- **Next.js Production Build:** 14 static/dynamic routes compiled cleanly (`pnpm build`)
