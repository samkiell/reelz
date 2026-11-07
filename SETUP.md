# Reelz — Local Developer Setup (Windows)

These commands are reference preflight steps; the coding agent must verify exact installed versions and adjust for actual repository scripts.

## Requirements

- Windows 11; Node.js 22+, pnpm, Git, Python 3.10+, FFmpeg.
- Ollama app running locally.
- Windows Docker Desktop + WSL2 **only for the optional** `short-video-maker` adapter; not required for basic HyperFrames local rendering if CLI works natively.
- `espeak-ng` for Kokoro; initial model/library downloads need Internet. Subsequent baseline generation can be offline.
- Sufficient SSD space (suggest 15–30 GB free) and reasonable RAM headroom. Make one render at a time.

## 1. Check tools (PowerShell)

```powershell
node -v
pnpm -v
python --version
ffmpeg -version
ollama list
ollama show qwen2.5:3b
```

If qwen2.5:3b exists, **do not download another LLM**. If it is missing:

```powershell
ollama pull qwen2.5:3b
```

Confirm Ollama is running:

```powershell
curl.exe http://127.0.0.1:11434/api/tags
```

## 2. Environment

Copy `.env.example` to `.env`. Never commit `.env`.

```powershell
Copy-Item .env.example .env
```

Set only truly needed credentials. For the baseline, leave Groq, Pexels, YouTube blank. Set `AUTH_SECRET` to a cryptographically random value. Use a local bootstrap command for the first username/password, not hardcoded credentials.

## 3. Install/reuse video components

- Adapt `samkiell/Generate-Videos-with-HTML/scripts/kokoro-tts.py` and existing HyperFrames Classic template, including credits/LICENSE where needed.
- Install `kokoro`, `python-dotenv`, `numpy`, `soundfile`, `espeak-ng` following verified prerequisites from the existing project.
- Ensure local template renderer works without Claude, Groq, Grok, Pexels or another provider login.
- Verify that `npx hyperframes render` is compatible with the adapted composition and creates an actual MP4; document any compatibility changes.

## 4. Optional stock-video rendering (P1)

Only after you have an existing valid Pexels API key, use Docker:

```powershell
# Example smoke test, after creating/assigning $env:PEXELS_API_KEY
# The image does not support arbitrary user-uploaded video footage.
docker run --rm --name reelz-stock-renderer `
  -p 127.0.0.1:3123:3123 `
  -e PEXELS_API_KEY="$env:PEXELS_API_KEY" `
  -e CONCURRENCY=1 `
  -v reelz-stock-data:/app/data `
  gyoridavid/short-video-maker:latest-tiny
```

If Docker Desktop disallows this particular port-binding syntax, use the documented host bind syntax for your installed version. Never expose this service to the public Internet.

## 5. LAN usage

1. Run Next.js on first laptop using explicit LAN opt-in (`pnpm dev --hostname 0.0.0.0` or equivalent script).
2. Get first laptop's private IPv4 with `ipconfig`.
3. On second laptop open `http://<first-laptop-private-ip>:3000`.
4. Limit incoming Windows Firewall to the private network and trusted peer(s). Keep other services (`11434`, `3123`) bound to localhost.
5. Do not port forward the router or rely on a public Vercel deployment.

**Note:** LAN access and hostnames must be tested against actual browser security/Cookie behavior. An authentication design that works on `localhost` may need secure-but-correct local HTTP cookie configuration for a private LAN.

## 6. Troubleshooting

- Ollama fails: check service at `http://127.0.0.1:11434/api/tags` and exact `ollama list` model ID.
- Memory exhaustion: close IDE/browsers, set worker concurrency 1, cap Docker memory appropriately, run reduced draft resolution.
- Missing video output: inspect HyperFrames CLI logs and FFmpeg codec availability before touching the UI.
- No Pexels key: use **keyless HyperFrames/local mode**, not a blocking warning.
- Temporary files grow: apply retention policy and output-disk minimum safeguards.
- YouTube OAuth fails: it is P1; check scopes, localhost callback and Testing refresh token expiry, not local rendering.

## Source references

- https://github.com/samkiell/Generate-Videos-with-HTML
- https://github.com/gyoridavid/short-video-maker
- https://github.com/heygen-com/hyperframes
- https://github.com/hexgrad/kokoro
- https://developers.google.com/identity/protocols/oauth2
