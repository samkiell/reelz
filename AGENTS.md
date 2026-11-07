# AGENTS.md — Reelz Engineering Rules

These rules apply to Claude, Antigravity, Codex and any other coding agent contributing to Reelz.

## Source of truth

1. `PRD.md`: product goals, scope, acceptance criteria.
2. `ARCHITECTURE.md`: module boundaries, contracts, local runtime.
3. `TASKS.md`: implementation order and test gates.
4. `SETUP.md`: commands and environment expectations.
5. Existing working code in `samkiell/Generate-Videos-with-HTML`; inspect it before reimplementing features.

## Mission

Ship a **real local MP4 generator**, not just a dashboard. By the first milestone, users can enter a topic or paste a script, run Ollama locally, create Kokoro narration, generate a vertical video without an API key, preview and download it.

## Non-negotiable

- $0 paid APIs, $0 hosting. Never add a required proprietary service, credit card, remote inference or recurring fee.
- No GPU assumption; optimize for 16 GB Windows 11 EliteBooks, WSL2/Docker where appropriate.
- `qwen2.5:3b` is the default Ollama model because the user already has it. Verify `ollama list`; fallback to manual input when unavailable.
- Groq (not Grok) is an OPTIONAL provider, never the default dependency. Keep API keys strictly server-side.
- Do NOT build or train a cinematic video diffusion model.
- The default video renderer must work with **no Pexels key and no runtime CDN dependency**, because new key issuance is paused and baseline operation must work offline after setup. `short-video-maker` is optional, not required.
- Reuse and legally attribute files copied from upstream repositories, preserve LICENSE notices and check third-party license terms.
- Prefer incremental integration and actual smoke tests. Avoid over-scaffolding, placeholders, fake data and premature abstractions.
- No gradients in app UI, keep interface clean and readable. Avoid emojis in source-code comments.
- No hardcoded passwords or secrets; `.env` and local storage ignored by Git.
- No force pushes, history rewrites, or destructive cleanup. Do not push to GitHub unless expressly approved by the user. Do not create PRs unless requested.
- Keep git changes scoped; use small commits. If parallel agents are used, assign disjoint files and reconcile before merging.
- When running external programs (ffmpeg/renderers), pass argument arrays, never build shells from arbitrary user text.
- Never publish to YouTube without review and explicit confirmation.

## Working procedure

1. Inspect actual repository tree and code before editing or choosing dependencies.
2. Document existing dependencies, whether they need Pexels/Claude, and local compatibility.
3. Choose a minimal vertical slice; implement **script → Kokoro → keyless render → MP4 preview/download**.
4. Build the UI around verified API routes; do not fabricate success statuses.
5. Write unit tests for schemas/jobs and one integration smoke test that generates a playable local video.
6. Run formatting, lint, typechecking and tests; fix actual failures.
7. Update docs with exact run steps, known limitations, actual tested features, and next tasks.
8. Report final changed files, commands, passes/failures, whether an MP4 was truly rendered, and any blockers.

## Definition of done

A real H.264 MP4 exists, playable in browser and downloadable. Script can be edited. Video files persist across restart. Secrets and internet access aren't required for baseline operation. Authentication prevents arbitrary LAN users from accessing the app.

## Scope guardrail

If timeline slips, remove secondary UI polish and publishing. **Do not remove the working local render path.** Do not claim YouTube OAuth is finished without a real upload test.
