"""Generate Kokoro TTS narration and word-level alignment for Reelz video projects.

Local, offline, zero API-key speech synthesis with 24 kHz WAV output and
word-level timestamp extraction.

Usage:
  python scripts/kokoro-tts.py <project_dir> [--shorts] [--voice NAME] [--lang CODE] [--speed NUM]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

KOKORO_SAMPLE_RATE = 24_000
PHASE_BREAK_SECONDS = 0.4

_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_BREAK_TAG_RE = re.compile(r"<break\s[^>]*/?>", re.IGNORECASE)
_SCENE_TAG_RE = re.compile(r"\[SCENE:[^\]]*\]\s*\n?", re.IGNORECASE)
_LETTER_OR_DIGIT_RE = re.compile(r"[A-Za-z0-9]")


def strip_markup(text: str) -> str:
    cleaned = _HTML_COMMENT_RE.sub("", text)
    cleaned = _BREAK_TAG_RE.sub("", cleaned)
    cleaned = _SCENE_TAG_RE.sub("", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def split_phases(text: str) -> list[str]:
    return [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]


def is_real_word(token_text: str) -> bool:
    return bool(_LETTER_OR_DIGIT_RE.search(token_text))


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Kokoro narration + word timestamps.")
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--shorts", action="store_true", help="Use faster speed for shorts.")
    parser.add_argument("--voice", type=str, default=None, help="Voice name (default: af_heart).")
    parser.add_argument("--lang", type=str, default=None, help="Lang code (default: 'a' for American English).")
    parser.add_argument("--speed", type=float, default=None, help="Playback speed multiplier.")
    args = parser.parse_args()

    project = args.project_dir.resolve()
    script_path = project / "script.txt"
    audio_dir = project / "audio"
    narration_wav = audio_dir / "narration.wav"
    transcript_json = project / "transcript.json"

    if not script_path.exists():
        print(f"ERROR: {script_path} not found", file=sys.stderr)
        return 2

    raw_text = script_path.read_text(encoding="utf-8").strip()
    if not raw_text:
        print(f"ERROR: {script_path} is empty", file=sys.stderr)
        return 2

    text = strip_markup(raw_text)
    phases = split_phases(text)
    if not phases:
        print(f"ERROR: no text content found in {script_path}", file=sys.stderr)
        return 2

    voice = args.voice or os.environ.get("KOKORO_VOICE", "af_heart")
    lang_code = args.lang or os.environ.get("KOKORO_LANG_CODE", "a")
    speed = (
        args.speed
        if args.speed is not None
        else (1.15 if args.shorts else float(os.environ.get("KOKORO_SPEED_SHORTS", "1.15")))
    )

    print(f"[kokoro] voice={voice} lang={lang_code} speed={speed} phases={len(phases)}")

    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        print(f"ERROR: missing Kokoro dependency ({exc})", file=sys.stderr)
        return 3

    pipeline = KPipeline(lang_code=lang_code)
    audio_chunks: list[np.ndarray] = []
    words: list[dict] = []
    cumulative_time = 0.0

    silence_samples = int(PHASE_BREAK_SECONDS * KOKORO_SAMPLE_RATE)
    silence_chunk = np.zeros(silence_samples, dtype=np.float32)

    for p_idx, phase_text in enumerate(phases):
        generator = pipeline(
            phase_text,
            voice=voice,
            speed=speed,
            split_pattern=r"\n+",
        )

        phase_has_audio = False
        for _, _, audio in generator:
            if audio is None or len(audio) == 0:
                continue

            chunk_len_s = len(audio) / KOKORO_SAMPLE_RATE
            phase_has_audio = True

            # Extract word approximations within chunk
            tokens = [t for t in phase_text.split() if is_real_word(t)]
            if tokens:
                token_duration = chunk_len_s / len(tokens)
                for t_idx, token in enumerate(tokens):
                    start_t = cumulative_time + (t_idx * token_duration)
                    end_t = start_t + token_duration
                    words.append({
                        "word": token,
                        "start": round(start_t, 3),
                        "end": round(end_t, 3),
                    })

            audio_chunks.append(audio)
            cumulative_time += chunk_len_s

        if phase_has_audio and p_idx < len(phases) - 1:
            audio_chunks.append(silence_chunk)
            cumulative_time += PHASE_BREAK_SECONDS

    if not audio_chunks:
        print("ERROR: no audio was generated", file=sys.stderr)
        return 4

    full_audio = np.concatenate(audio_chunks, axis=0)

    # Peak normalization
    max_val = np.max(np.abs(full_audio))
    if max_val > 0.98:
        full_audio = full_audio * (0.95 / max_val)

    audio_dir.mkdir(parents=True, exist_ok=True)
    sf.write(str(narration_wav), full_audio, KOKORO_SAMPLE_RATE)
    transcript_json.write_text(json.dumps(words, indent=2), encoding="utf-8")

    total_duration = len(full_audio) / KOKORO_SAMPLE_RATE
    print(f"[kokoro] Generated {total_duration:.2f}s audio with {len(words)} words -> {narration_wav}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

