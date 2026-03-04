import os
import time
import re
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, Any

from .content_transformer import transform_records
from .db import create_tts_job, get_tts_job, init_db, insert_knowledge, list_comparison, update_tts_job
from .knowledge_parser import (
    extract_image_text,
    extract_pdf_ocr_text,
    extract_pdf_text,
    debug_generate_output,
    parse_records_from_text,
    parse_records_from_text_input,
    parse_records_with_source,
)
from .tts_service import poll_tts_job, save_audio_bytes, submit_tts_job, synthesize_dialogue_bytedance_bytes

app = FastAPI(title="EduPal Agent API")
raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").strip()
parsed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
use_wildcard = any(origin == "*" for origin in parsed_origins)
allowed_origins = ["*"] if use_wildcard else parsed_origins
allow_credentials = False if use_wildcard else True
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)
static_root = Path(__file__).resolve().parent / "static"
static_root.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_root), name="static")


def _normalize_dialogue_from_transcript(transcript: str) -> list[dict[str, str]]:
    lines = [line.strip() for line in transcript.splitlines() if line.strip()]
    with_roles: list[dict[str, str]] = []
    has_role = False
    for line in lines:
        match = re.match(r"^(W|M)\s*[:：]\s*(.+)$", line, re.I)
        if match:
            has_role = True
            role = match.group(1).upper()
            text = match.group(2).strip()
            if text:
                with_roles.append({"role": role, "text": text})
        else:
            with_roles.append({"role": "", "text": line})
    if has_role:
        return [entry for entry in with_roles if entry.get("text")]
    parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", transcript) if part.strip()]
    if not parts:
        return []
    roles = ["W", "M"]
    return [{"role": roles[index % 2], "text": part} for index, part in enumerate(parts)]

api_key = os.environ.get("API_KEY")
api_key_header = os.environ.get("API_KEY_HEADER", "X-API-Key")
rate_limit_window = int(os.environ.get("RATE_LIMIT_WINDOW", "60"))
rate_limit_max = int(os.environ.get("RATE_LIMIT_MAX", "120"))
max_upload_mb = int(os.environ.get("MAX_UPLOAD_MB", "10"))
max_upload_bytes = max_upload_mb * 1024 * 1024
max_records = int(os.environ.get("MAX_RECORDS", "200"))
max_tts_text = int(os.environ.get("MAX_TTS_TEXT", "2000"))
rate_limits: dict[str, tuple[float, int]] = {}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


def _extract_api_key(request: Request) -> Optional[str]:
    header_value = request.headers.get(api_key_header)
    if header_value:
        return header_value.strip()
    auth = request.headers.get("authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return None


def _is_protected_path(path: str) -> bool:
    return path.startswith("/api/")


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    if api_key and _is_protected_path(path):
        provided = _extract_api_key(request)
        if not provided or provided != api_key:
            return JSONResponse(status_code=401, content={"detail": "unauthorized"})
    if _is_protected_path(path):
        now = time.time()
        key = _client_ip(request)
        window_start, count = rate_limits.get(key, (now, 0))
        if now - window_start >= rate_limit_window:
            window_start, count = now, 0
        count += 1
        rate_limits[key] = (window_start, count)
        if count > rate_limit_max:
            return JSONResponse(status_code=429, content={"detail": "rate limit exceeded"})
    return await call_next(request)


class KnowledgeUpload(BaseModel):
    records: list[dict] = Field(min_length=1, max_length=max_records)


class TransformRequest(BaseModel):
    persona: str = Field(min_length=1, max_length=200)
    tone: str = Field(min_length=1, max_length=200)
    scene: str = Field(min_length=1, max_length=200)
    ritual: str = Field(min_length=1, max_length=200)


class TextInputRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    debug: bool = False


class TTSJobRequest(BaseModel):
    text: str = Field(min_length=1, max_length=max_tts_text)
    voice: Optional[str] = Field(default=None, max_length=100)
    format: Optional[str] = Field(default="mp3", max_length=10)


@app.get("/health")
def health_check():
    init_db()
    return {"status": "ok"}


@app.post("/api/knowledge-base/upload")
def upload_knowledge(payload: KnowledgeUpload):
    ids = insert_knowledge(payload.records)
    return {"received": len(ids), "ids": ids}


@app.post("/api/knowledge-base/upload-file")
def upload_knowledge_file(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    is_pdf = filename.endswith(".pdf") or content_type == "application/pdf"
    is_image = content_type.startswith("image/") or filename.endswith((".png", ".jpg", ".jpeg"))
    if not (is_pdf or is_image):
        raise HTTPException(status_code=400, detail="仅支持 PDF / JPG / PNG 文件")
    file_bytes = file.file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="文件为空")
    if len(file_bytes) > max_upload_bytes:
        raise HTTPException(status_code=400, detail="文件过大")
    if is_pdf:
        text = extract_pdf_text(file_bytes)
        if not text:
            try:
                text = extract_pdf_ocr_text(file_bytes)
            except RuntimeError as error:
                raise HTTPException(status_code=400, detail=str(error)) from error
    else:
        try:
            text = extract_image_text(file_bytes)
        except RuntimeError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
    if not text:
        raise HTTPException(status_code=400, detail="未能解析出文本内容，请确认文件清晰可读")
    records, source = parse_records_with_source(text)
    if not records:
        raise HTTPException(status_code=400, detail="未提取到可入库的题目")
    if len(records) > max_records:
        raise HTTPException(status_code=400, detail="解析题目数量超出上限")
    ids = insert_knowledge(records)
    return {"received": len(ids), "ids": ids, "records": records, "source": source}


@app.post("/api/knowledge-base/upload-text")
def upload_knowledge_text(payload: TextInputRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="文本不能为空")
    lowered = text.lower()
    intended_type: Optional[str] = None
    if "听力" in text or "listening" in lowered:
        intended_type = "listening"
    elif "阅读" in text or "reading" in lowered:
        intended_type = "reading"
    elif "语法" in text or "grammar" in lowered:
        intended_type = "grammar"
    if payload.debug:
        debug = debug_generate_output(text)
        return {"debug": debug}
    records, source, reason = parse_records_from_text_input(text, intended_type)
    if intended_type:
        filtered = [record for record in records if record.get("type") == intended_type]
        if filtered:
            records = filtered
        else:
            raise HTTPException(status_code=400, detail=f"未生成{intended_type}题")
    if not records:
        if source == "missing-moonshot-key":
            raise HTTPException(status_code=400, detail="MOONSHOT_API_KEY 未配置，无法将中文需求转为英文题库")
        if source == "moonshot-failed":
            reason_value = reason or ""
            code = reason_value.split(":", 1)[0] if reason_value else ""
            reason_map = {
                "no_json": "模型返回不是 JSON 数组",
                "invalid_json": "模型返回格式不正确",
                "validation_failed": "模型内容未通过校验（可能词数/选项/答案不合规）",
                "request_error": "模型请求失败",
                "translate_error": "中文翻译失败",
            }
            detail = reason_map.get(code, "模型生成失败，请检查 MOONSHOT_API_KEY 或 BASE_URL 配置")
            raise HTTPException(status_code=400, detail=detail)
        raise HTTPException(status_code=400, detail="未提取到可入库的题目")
    if len(records) > max_records:
        raise HTTPException(status_code=400, detail="解析题目数量超出上限")
    for record in records:
        record_text = str(record.get("text", "") or "")
        if any("\u4e00" <= ch <= "\u9fff" for ch in record_text):
            raise HTTPException(status_code=400, detail="生成失败：必须输出英文（请用英文生成阅读/听力/语法题）")
        material_value = record.get("material")
        if isinstance(material_value, dict):
            passage = str(material_value.get("text", "") or "")
            transcript = str(material_value.get("transcript", "") or "")
            if any("\u4e00" <= ch <= "\u9fff" for ch in passage + transcript):
                raise HTTPException(status_code=400, detail="生成失败：必须输出英文（请用英文生成阅读/听力/语法题）")
    for record in records:
        if record.get("type") != "listening":
            continue
        material_value = record.get("material")
        material: dict[str, Any]
        if isinstance(material_value, dict):
            material = material_value
        else:
            material = {"kind": "listening"}
            record["material"] = material
        transcript = material.get("transcript")
        if not isinstance(transcript, str) or not transcript.strip():
            transcript = str(record.get("text", "") or "").strip()
            material["transcript"] = transcript
        dialogue_value = material.get("dialogue")
        normalized_dialogue: Optional[list[dict[str, str]]] = None
        if isinstance(dialogue_value, list) and dialogue_value:
            cleaned_dialogue: list[dict[str, str]] = []
            for entry in dialogue_value:
                if not isinstance(entry, dict):
                    continue
                role = str(entry.get("role", "") or "").strip().upper()
                text = str(entry.get("text", "") or "").strip()
                if not text:
                    continue
                cleaned_dialogue.append({"role": role, "text": text})
            roles = {item["role"] for item in cleaned_dialogue if item["role"] in {"W", "M"}}
            if len(roles) >= 2:
                normalized_dialogue = cleaned_dialogue
        if normalized_dialogue is None:
            normalized_dialogue = _normalize_dialogue_from_transcript(transcript)
        if normalized_dialogue:
            material["dialogue"] = normalized_dialogue
        audio_url: Optional[str] = None
        dialogue_value = material.get("dialogue")
        if isinstance(dialogue_value, list) and dialogue_value:
            audio_bytes, error = synthesize_dialogue_bytedance_bytes(dialogue_value, "mp3")
            if audio_bytes:
                audio_url = save_audio_bytes(audio_bytes, "mp3")
            elif error:
                audio_url = None
        if not audio_url:
            result = submit_tts_job(transcript, None, "mp3")
            if result.status != "completed" or not result.audio_url:
                raise HTTPException(status_code=500, detail=result.error or "音频生成失败")
            audio_url = result.audio_url
        material["audio"] = {"src": audio_url}
    ids = insert_knowledge(records)
    return {"received": len(ids), "ids": ids, "records": records, "source": source}


@app.post("/api/knowledge-base/transform")
def transform_knowledge(payload: TransformRequest):
    count = transform_records(payload.model_dump())
    return {"transformed": count}


@app.get("/api/knowledge-base/compare")
def compare_knowledge():
    return {"items": list_comparison()}


def process_tts_job(job_id: int, text: str, voice: Optional[str], audio_format: Optional[str]) -> None:
    result = submit_tts_job(text, voice, audio_format)
    if result.status == "completed":
        update_tts_job(
            job_id,
            {"status": "completed", "audio_url": result.audio_url, "error": None},
        )
        return
    if result.status == "processing":
        update_tts_job(
            job_id,
            {"status": "processing", "provider_job_id": result.provider_job_id},
        )
        return
    update_tts_job(job_id, {"status": "failed", "error": result.error})


@app.post("/api/tts/jobs")
def create_tts(payload: TTSJobRequest, background_tasks: BackgroundTasks):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    provider = os.environ.get("TTS_PROVIDER")
    job_id = create_tts_job(text, payload.voice, payload.format, provider)
    background_tasks.add_task(process_tts_job, job_id, text, payload.voice, payload.format)
    job = get_tts_job(job_id)
    return {"job": job}


@app.get("/api/tts/jobs/{job_id}")
def get_tts(job_id: int):
    job = get_tts_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    if job["status"] == "processing" and job.get("provider_job_id"):
        result = poll_tts_job(str(job["provider_job_id"]), job.get("format"))
        if result.status == "completed":
            update_tts_job(
                job_id,
                {"status": "completed", "audio_url": result.audio_url, "error": None},
            )
        elif result.status == "failed":
            update_tts_job(job_id, {"status": "failed", "error": result.error})
        job = get_tts_job(job_id) or job
    return {"job": job}
