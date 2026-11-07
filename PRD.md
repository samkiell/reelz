# Reelz — Product Requirements Document

**Version:** 0.1 (implementation baseline)  
**Date:** 2026-11-07  
**Status:** Ready for implementation  
**Product:** Reelz, a two-person, LAN-first YouTube Shorts production studio  
**Primary platform:** Windows 11 + WSL2/Docker Desktop (HP EliteBook 830 G6, 16 GB RAM, 512 GB SSD)  
**Secondary platform:** Brother's HP EliteBook x360 1040 G4, 16 GB RAM, 512 GB SSD

## 1. Purpose

Create original, narrated, captioned vertical Shorts from topics or pasted scripts without paying for a hosted video generator, server, speech API, or text model. Runs on one PC initially, optionally accessed from another PC over the local network. Online access is **optional for rendering** and **necessary for optional Groq, sourcing footage online, or YouTube uploads**.

**Non-goal:** Compete with Higgsfield, Sora, Kling, or text-to-video diffusion models. We assemble motion templates, narration, and optionally licensed media. No GPU dependency.

## 2. Users and jobs

- **Creator:** brother selects topic, reviews script, chooses voice/visual style, generates, approves, downloads or uploads.
- **Developer/admin:** sets up models, tracks render jobs, configures keys, diagnoses failures, manages media, backups and storage.
- **Scale:** 2 named local accounts; 1 render at a time; 1–5 Shorts per day initially.

## 3. Hard constraints

1. $0 software and paid API requirement. Local-first operation must work with **zero keys**. Internet access and electricity/data are not free; no paid trial dependency.
2. CPU-only support on 16 GB Windows laptops. No CUDA/NVIDIA assumption; Docker/WSL2 memory limits must be considered.
3. Use known repositories; don't blindly copy an entire agent framework or build another text-to-video model.
4. Avoid services that require Pexels credentials on the critical path; new Pexels API keys are paused as of 2026-11-07.
5. **No auto-publication without explicit user review and approval** (at least for v1).
6. Isolated, secured LAN; no public port forwarding or open Ollama endpoints.
7. Keep local file inputs under configured storage root, validate paths, escape text before inclusion in render templates, and log errors without secrets.

## 4. Scope and milestones

### P0 — One-day vertical slice (required)

- **P0.1** Next.js dashboard with password-protected local access, desktop responsive layout.
- **P0.2** Create project with title/topic, duration 30 / 45 / 60 seconds, orientation 9:16 (1080 x 1920 output target), and script provider selection.
- **P0.3** Script options: Ollama local `qwen2.5:3b` (confirmed on user's Ollama screenshot, verify with `ollama list`), and **paste/edit script**. Generated text is editable before rendering.
- **P0.4** Ollama returns structured, validated scenes: `title`, `description`, `hook`, `scenes` (narration, on-screen copy, optional media keywords), `hashtags`; retry invalid JSON once, then present editable failure state. Don't hallucinate verification: flag factual claims for human review.
- **P0.5** Narration: reusable Kokoro script from `samkiell/Generate-Videos-with-HTML/scripts/kokoro-tts.py`; choose among available local voices; save WAV and transcript timings.
- **P0.6** **Guaranteed no-key render path:** adapt the existing HyperFrames Classic template into a deterministic JSON-driven **general storytelling** renderer (hook → scenes → conclusion); remove required stat rows and topic-derived URLs so it never invents figures or links. Bundle GSAP and any fonts/assets locally, avoiding runtime CDN calls. Render animated text/title-card scenes plus narration/captions, using local visuals only. Do not require Pexels, Groq, ElevenLabs, or Claude authentication to render. An FFmpeg-based local background/video assembly path is an acceptable fallback if integration is blocked. Confirm outputs with real playback.
- **P0.7** Persistent local jobs and progress: queued → scripting → script_ready → voice → rendering → ready or failed. Only **one** active render; no UI timeout while rendering. Job retries, meaningful error messages.
- **P0.8** MP4 preview and download, saved under `storage/videos/<id>/final.mp4` (or documented equivalent). Show duration, size, created date and status.
- **P0.9** Local library: list, open, delete projects and clear temp files; maintain safe cleanup.
- **P0.10** `pnpm dev` or one documented Docker+app workflow on Windows, plus README installation, health checks and `.env.example`.

**P0 exit test:** With *no external API keys*, enter a topic OR paste a prepared script, generate a narrated captioned 30-second vertical MP4, preview it, download it, and repeat after a restart. Brother can open the dashboard over trusted LAN with authentication. Tests and logs do not contain secrets.

### P1 — Next integration (after P0 is green)

- **P1.1** Optional Groq hosted text adapter. API key stays server-side; provider switch persists with project; graceful 429/rate-limit fallback to Ollama/manual script.
- **P1.2** Bring in `gyoridavid/short-video-maker:latest-tiny` as an **optional** stock-footage rendering adapter when a valid **existing** Pexels API key is available. Its API accepts scene texts and `searchTerms`; it does **not** natively accept user-uploaded footage. Do not imply otherwise. Verify small Docker smoke test before integrating.
- **P1.3** Local asset library + visual selection (upload, license/source metadata, scene association). If video-template composition cannot use custom clips with existing tool, implement a separate local FFmpeg/HyperFrames adapter; do not hack vendor API assumptions.
- **P1.4** YouTube OAuth connection, user-selected channel, resumable private upload, upload progress, and stored YouTube video ID/URL. Publisher must be explicitly approved before upload.
- **P1.5** Future scheduling via `privacyStatus=private` plus `publishAt` with correct timezone conversion; ensure the YouTube API accepts state and scheduling rules. Reconnect gracefully if OAuth refresh token expires.

### P2 — Later, explicitly out of day one

- Bulk/topic calendars, fully unattended publishing, analytics, voice cloning, multiple stock sources, cinematic text-to-video, advanced timeline editor, multi-channel SaaS, subscriptions, public hosting, AI-generated thumbnails.

## 5. Detailed user flow

1. Sign in on local network; dashboard loads recent projects.
2. Click **Create Short**; choose `Topic → Ollama` or `Paste script`; enter topic / script, duration, tone, voice, template.
3. Generate script (if Ollama), review and edit. User can alter claims and wording.
4. Click **Generate Video**; create persisted render job, not a long synchronous HTTP request. Worker creates narration, captions/transcript, composition then renders output.
5. Poll for status; display friendly progress, logs/error. Ready video playable in browser; download MP4.
6. User can regenerate from changed script, preserving the prior output until replacement succeeds.
7. P1 only: connect YouTube, edit title/description, approve upload and confirm privacy/scheduling.

## 6. Requirements by area

### Scripting
- Providers: `manual`, `ollama`, then optional `groq`. Groq ≠ Grok.
- Ollama default `http://127.0.0.1:11434`, model env `OLLAMA_MODEL=qwen2.5:3b`.
- If remote LAN Ollama is enabled later, require restricted firewall rule and server authentication/tunnel; don't expose raw Ollama on the public network.
- Generate 4–8 scenes, 1–3 sentences each, target length estimated from speaking speed; enforce duration after TTS and allow scene trimming.
- Validate JSON with Zod; store raw response for diagnostics locally without secrets.
- Fact checking is editorial, not guaranteed by an offline LLM. Provide warning on current events, medical, financial or legal claims.

### Voice and captions
- English-first, Kokoro local, no clone voices by default.
- Output WAV and timestamps in same shape as existing HyperFrames helper.
- Caption styles: start with one tested readable style; don't promise word-perfect sync if timestamp generation fails. Provide sentence-based fallback.
- Normalize audio and keep it below distortion threshold. Music off by default (copyright-safe).

### Rendering
- Vertical 9:16, target 1080x1920, H.264 MP4 + AAC audio; lower-res draft permitted if under CPU pressure.
- Pure local motion-template mode must not call a stock API.
- Storytelling quality: dynamic visual progression every few seconds, don't depend only on unreadable static text. Include at least one non-template variation or editable media option.
- No surprise background fetches of stock assets in keyless mode.
- Failed job must retain diagnostics and recover cleanly without deleting previous successful output.

### Library and storage
- Store media and outputs on disk, metadata in SQLite.
- Never write MP4 blobs to SQLite, track files by safe relative path.
- Storage limits / cleanup policies configurable; don't automatically delete final approved renders.
- Show attribution and source details for external assets; support creator-supplied licensed content.

### Publishing (P1)
- Use the official YouTube Data API v3 via OAuth 2.0, not automated website clicking or password storage.
- Default upload privacy **private**, never public by omission. Confirm title, description and audience settings.
- Store encrypted OAuth credentials, no tokens on client or Git. Use offline access and handle Google external Testing seven-day refresh token expiry.
- Preserve explicit user approval for upload/publish; no automatic mass posting.

## 7. UX / routes

- `/login` — local login
- `/` — overview, jobs, recent projects
- `/create` — creation form
- `/videos/[id]` — edit script, job status, player, download, metadata
- `/library` — filter/list existing videos
- `/settings` — local model, renderer health, optional Groq and YouTube status (never display secrets)

Design: clean dark UI, near-black backgrounds, restrained accent, no gradients, accessible contrast, responsive. Prefer simple form and task states over complex animation.

## 8. Acceptance criteria

1. CI/local checks for typecheck and lint pass; targeted tests for Ollama provider, schema, job state transitions and renderer adapter.
2. Fresh checkout + documented setup runs without paid service/API key.
3. Ollama `qwen2.5:3b` generates a valid editable scenes JSON; manual input works with Ollama offline or stopped.
4. Kokoro outputs playable voice and timestamps.
5. One 30-second video generated and playable at approximately 1080x1920; output path persists across restart and a second run.
6. Invalid topic, bad JSON, busy worker, insufficient disk space, missing Ollama and missing renderer show clear actionable errors.
7. Concurrent requests do not trigger two heavy renders; no hung UI.
8. No unprotected remote access, secrets in logs or committed secrets.
9. Source licenses tracked for third-party templates/assets.
10. Optional YouTube integration is not claimed complete until a genuine private upload is verified on a test channel.

## 9. Risks / mitigations

| Risk | Mitigation |
| --- | --- |
| Existing `short-video-maker` requires Pexels and does not accept custom clips | Keep it optional; guaranteed keyless HyperFrames/local render first |
| 16 GB laptops and CPU-only | One render at a time; render 720x1280 draft if needed; WSL2/Docker memory tuning; separate Ollama to second PC later |
| Power or internet outages | Persist job state; gracefully mark interrupted jobs; manual retry; localhost workflow works offline |
| Ollama 3B factual errors and bland scripts | Script review, editable output, structured prompt, seeded examples |
| Copyright / monetization | Only licensed user-provided footage and original scripts; review before publication; source provenance; review Qwen2.5 3B model usage license for monetized output |
| Google OAuth expired / misconfigured | Private upload as separate phase; refresh/reconnect handling and tests |
| Timeline overrun | Ship smallest end-to-end slice, not a complete YouTube SaaS, on day one |

## 10. Definition of done

P0 is done only after running a real local job and producing an actual playable MP4, not after drawing UI mockups or writing TODO stubs. Include exact reproduction steps, known limitations and tests in the implementation report.

## 11. References

- Existing workflow: https://github.com/samkiell/Generate-Videos-with-HTML
- Renderer: https://github.com/gyoridavid/short-video-maker
- HyperFrames: https://github.com/heygen-com/hyperframes
- Ollama model: https://ollama.com/library/qwen2.5:3b
- Groq chat API: https://console.groq.com/docs/api-reference
- YouTube OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- YouTube upload: https://developers.google.com/youtube/v3/docs/videos/insert
- Pexels key pause: https://help.pexels.com/hc/en-us/articles/900004904026-How-do-I-get-an-API-key
