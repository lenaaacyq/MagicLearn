from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from .tts_service import synthesize_bytedance_bytes


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_question_bank() -> dict[str, Any]:
    path = project_root() / "frontend" / "src" / "data" / "question-bank.json"
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_audio_path(src: str) -> Path:
    cleaned = src.lstrip("/")
    return project_root() / "frontend" / "public" / cleaned


def voice_for_role(role: str) -> Optional[str]:
    role_lower = role.strip().lower()
    female = os.environ.get("TTS_VOICE_TYPE_FEMALE")
    male = os.environ.get("TTS_VOICE_TYPE_MALE")
    if role_lower.startswith("w"):
        return female
    if role_lower.startswith("m"):
        return male
    return None


def synthesize_dialogue(dialogue: list[dict[str, Any]], encoding: str) -> bytes:
    combined = b""
    for entry in dialogue:
        text = str(entry.get("text", "")).strip()
        if not text:
            continue
        role = str(entry.get("role", ""))
        voice = voice_for_role(role)
        if not voice:
            raise RuntimeError(f"missing voice for role: {role}")
        audio_bytes, error = synthesize_bytedance_bytes(text, voice, encoding)
        if error or not audio_bytes:
            raise RuntimeError(error or "TTS failed")
        combined += audio_bytes
    return combined


def synthesize_text(text: str, encoding: str) -> bytes:
    audio_bytes, error = synthesize_bytedance_bytes(text, None, encoding)
    if error or not audio_bytes:
        raise RuntimeError(error or "TTS failed")
    return audio_bytes


def main() -> None:
    encoding = os.environ.get("TTS_ENCODING", "mp3")
    data = load_question_bank()
    groups = data.get("groups", [])
    for group in groups:
        if group.get("type") != "listening":
            continue
        material = group.get("material", {})
        audio = material.get("audio", {})
        src = audio.get("src")
        if not isinstance(src, str) or not src:
            continue
        dialogue = material.get("dialogue") or []
        if isinstance(dialogue, list) and dialogue:
            audio_bytes = synthesize_dialogue(dialogue, encoding)
        else:
            transcript = str(material.get("transcript", "")).strip()
            if not transcript:
                continue
            audio_bytes = synthesize_text(transcript, encoding)
        output_path = resolve_audio_path(src)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(audio_bytes)
        print(f"saved: {src}")


if __name__ == "__main__":
    main()
