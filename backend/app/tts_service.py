from __future__ import annotations

import base64
import json
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Tuple
from urllib.request import Request, urlopen

AUDIO_DIR = Path(__file__).resolve().parent / "static" / "tts_audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class SubmitResult:
    status: str
    provider_job_id: Optional[str] = None
    audio_url: Optional[str] = None
    error: Optional[str] = None


@dataclass
class PollResult:
    status: str
    audio_url: Optional[str] = None
    error: Optional[str] = None


def save_audio_bytes(audio: bytes, audio_format: Optional[str]) -> str:
    return _save_audio_bytes(audio, audio_format)


def synthesize_dialogue_bytedance_bytes(
    dialogue: list[dict[str, Any]], audio_format: Optional[str]
) -> Tuple[Optional[bytes], Optional[str]]:
    encoding = (audio_format or os.environ.get("TTS_ENCODING", "mp3")).strip().lower()
    if encoding != "mp3":
        return None, "dialogue tts only supports mp3"
    combined = b""
    for entry in dialogue:
        if not isinstance(entry, dict):
            continue
        text = str(entry.get("text", "") or "").strip()
        if not text:
            continue
        role = str(entry.get("role", "") or "").strip().lower()
        female = os.environ.get("TTS_VOICE_TYPE_FEMALE")
        male = os.environ.get("TTS_VOICE_TYPE_MALE")
        voice: Optional[str]
        if role.startswith("w"):
            voice = female
        elif role.startswith("m"):
            voice = male
        else:
            voice = None
        if not voice:
            return None, f"missing voice for role: {entry.get('role')}"
        audio_bytes, error = synthesize_bytedance_bytes(text, voice, encoding)
        if error or not audio_bytes:
            return None, error or "TTS failed"
        combined += audio_bytes
    if not combined:
        return None, "empty dialogue"
    return combined, None


def submit_tts_job(text: str, voice: Optional[str], audio_format: Optional[str]) -> SubmitResult:
    if _is_bytedance_enabled():
        return _submit_bytedance(text, voice, audio_format)
    submit_url = os.environ.get("TTS_SUBMIT_URL")
    if not submit_url:
        return SubmitResult(status="failed", error="TTS_SUBMIT_URL not configured")
    payload = {"text": text, "voice": voice, "format": audio_format}
    extra_payload = os.environ.get("TTS_SUBMIT_EXTRA_JSON")
    if extra_payload:
        payload.update(json.loads(extra_payload))
    data = _request_json("POST", submit_url, payload)
    if not isinstance(data, dict):
        return SubmitResult(status="failed", error="TTS submit response invalid")
    audio_url = _find_value(data, ["audio_url", "url", "audioUrl"])
    if isinstance(audio_url, str) and audio_url:
        return SubmitResult(status="completed", audio_url=audio_url)
    audio_b64 = _find_value(data, ["audio_base64", "audio", "audioData"])
    if isinstance(audio_b64, str) and audio_b64:
        try:
            audio_bytes = base64.b64decode(audio_b64)
        except ValueError:
            return SubmitResult(status="failed", error="audio base64 decode failed")
        local_url = _save_audio_bytes(audio_bytes, audio_format)
        return SubmitResult(status="completed", audio_url=local_url)
    job_id = _find_value(data, ["job_id", "task_id", "id"])
    if isinstance(job_id, str) and job_id:
        return SubmitResult(status="processing", provider_job_id=job_id)
    return SubmitResult(status="failed", error="TTS submit response missing job or audio")


def poll_tts_job(provider_job_id: str, audio_format: Optional[str]) -> PollResult:
    query_url = os.environ.get("TTS_QUERY_URL")
    if not query_url:
        return PollResult(status="processing", error="TTS_QUERY_URL not configured")
    if "{job_id}" in query_url:
        query_url = query_url.format(job_id=provider_job_id)
    data = _request_json("GET", query_url, None)
    if not isinstance(data, dict):
        return PollResult(status="processing", error="TTS query response invalid")
    status = _normalize_status(_find_value(data, ["status", "state", "job_status"]))
    if status == "completed":
        audio_url = _find_value(data, ["audio_url", "url", "audioUrl"])
        if isinstance(audio_url, str) and audio_url:
            return PollResult(status="completed", audio_url=audio_url)
        audio_b64 = _find_value(data, ["audio_base64", "audio", "audioData"])
        if isinstance(audio_b64, str) and audio_b64:
            try:
                audio_bytes = base64.b64decode(audio_b64)
            except ValueError:
                return PollResult(status="failed", error="audio base64 decode failed")
            local_url = _save_audio_bytes(audio_bytes, audio_format)
            return PollResult(status="completed", audio_url=local_url)
        return PollResult(status="failed", error="TTS completed without audio")
    if status == "failed":
        error = _find_value(data, ["error", "message", "detail"])
        return PollResult(status="failed", error=str(error) if error else "TTS failed")
    return PollResult(status="processing")


def _request_json(method: str, url: str, payload: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    headers = {"Content-Type": "application/json"}
    api_key = os.environ.get("TTS_API_KEY")
    api_key_header = os.environ.get("TTS_API_KEY_HEADER", "Authorization")
    if api_key:
        if api_key_header.lower() == "authorization":
            headers[api_key_header] = f"Bearer {api_key}"
        else:
            headers[api_key_header] = api_key
    extra_headers = os.environ.get("TTS_EXTRA_HEADERS_JSON")
    if extra_headers:
        headers.update(json.loads(extra_headers))
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=data, method=method)
    for key, value in headers.items():
        request.add_header(key, value)
    with urlopen(request, timeout=60) as response:
        raw = response.read()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))


def _find_value(data: dict[str, Any], keys: list[str]) -> Any:
    if not isinstance(data, dict):
        return None
    candidates = [data]
    nested = data.get("data")
    if isinstance(nested, dict):
        candidates.append(nested)
    nested = data.get("result")
    if isinstance(nested, dict):
        candidates.append(nested)
    for candidate in candidates:
        for key in keys:
            if key in candidate:
                return candidate[key]
    return None


def _normalize_status(raw: Any) -> str:
    if not raw:
        return "processing"
    value = str(raw).lower()
    if value in {"completed", "succeeded", "success", "done"}:
        return "completed"
    if value in {"failed", "error", "canceled"}:
        return "failed"
    return "processing"


def _save_audio_bytes(audio: bytes, audio_format: Optional[str]) -> str:
    extension = (audio_format or "mp3").strip().lstrip(".")
    filename = f"{uuid.uuid4().hex}.{extension}"
    path = AUDIO_DIR / filename
    path.write_bytes(audio)
    return f"/static/tts_audio/{filename}"


def _is_bytedance_enabled() -> bool:
    provider = os.environ.get("TTS_PROVIDER", "").lower().strip()
    if provider == "bytedance":
        return True
    if os.environ.get("TTS_APP_ID") and os.environ.get("TTS_ACCESS_TOKEN"):
        return True
    return False


def _submit_bytedance(text: str, voice: Optional[str], audio_format: Optional[str]) -> SubmitResult:
    encoding = audio_format or os.environ.get("TTS_ENCODING", "mp3")
    audio_bytes, error = synthesize_bytedance_bytes(text, voice, encoding)
    if audio_bytes:
        local_url = _save_audio_bytes(audio_bytes, encoding)
        return SubmitResult(status="completed", audio_url=local_url)
    return SubmitResult(status="failed", error=error)


def synthesize_bytedance_bytes(
    text: str, voice: Optional[str], audio_format: Optional[str]
) -> Tuple[Optional[bytes], Optional[str]]:
    appid = os.environ.get("TTS_APP_ID")
    access_token = os.environ.get("TTS_ACCESS_TOKEN")
    cluster = os.environ.get("TTS_CLUSTER")
    voice_type = (
        voice
        or os.environ.get("TTS_VOICE_TYPE")
        or os.environ.get("TTS_VOICE_TYPE_FEMALE")
        or os.environ.get("TTS_VOICE_TYPE_MALE")
    )
    if not appid or not access_token or not cluster or not voice_type:
        return None, "TTS credentials not configured"
    submit_url = os.environ.get("TTS_SUBMIT_URL", "https://openspeech.bytedance.com/api/v1/tts")
    encoding = audio_format or os.environ.get("TTS_ENCODING", "mp3")
    speed_ratio = _float_env("TTS_SPEED_RATIO", 1.0)
    volume_ratio = _float_env("TTS_VOLUME_RATIO", 1.0)
    pitch_ratio = _float_env("TTS_PITCH_RATIO", 1.0)
    uid = os.environ.get("TTS_UID", "388808087185088")
    text_type = os.environ.get("TTS_TEXT_TYPE", "plain")
    operation = os.environ.get("TTS_OPERATION", "query")
    with_frontend = int(os.environ.get("TTS_WITH_FRONTEND", "1"))
    frontend_type = os.environ.get("TTS_FRONTEND_TYPE", "unitTson")
    request_json = {
        "app": {"appid": appid, "token": access_token, "cluster": cluster},
        "user": {"uid": uid},
        "audio": {
            "voice_type": voice_type,
            "encoding": encoding,
            "speed_ratio": speed_ratio,
            "volume_ratio": volume_ratio,
            "pitch_ratio": pitch_ratio,
        },
        "request": {
            "reqid": str(uuid.uuid4()),
            "text": text,
            "text_type": text_type,
            "operation": operation,
            "with_frontend": with_frontend,
            "frontend_type": frontend_type,
        },
    }
    extra_payload = os.environ.get("TTS_SUBMIT_EXTRA_JSON")
    if extra_payload:
        request_json.update(json.loads(extra_payload))
    data = _request_json_with_headers(
        submit_url,
        request_json,
        {"Authorization": f"Bearer;{access_token}"},
    )
    if not isinstance(data, dict):
        return None, "TTS submit response invalid"
    audio_b64 = data.get("data")
    if isinstance(audio_b64, str) and audio_b64:
        try:
            return base64.b64decode(audio_b64), None
        except ValueError:
            return None, "audio base64 decode failed"
    message = data.get("message") or data.get("error") or data.get("detail")
    return None, str(message) if message else "TTS submit failed"


def _request_json_with_headers(url: str, payload: dict[str, Any], headers: dict[str, str]) -> Optional[dict[str, Any]]:
    data = json.dumps(payload).encode("utf-8")
    request = Request(url, data=data, method="POST")
    request.add_header("Content-Type", "application/json")
    for key, value in headers.items():
        request.add_header(key, value)
    extra_headers = os.environ.get("TTS_EXTRA_HEADERS_JSON")
    if extra_headers:
        extra = json.loads(extra_headers)
        for key, value in extra.items():
            request.add_header(key, value)
    with urlopen(request, timeout=60) as response:
        raw = response.read()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))


def _float_env(name: str, default: float) -> float:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default
