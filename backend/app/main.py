import os
import time
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional

from .content_transformer import transform_records
from .db import create_tts_job, get_tts_job, init_db, insert_knowledge, list_comparison, update_tts_job
from .knowledge_parser import (
    extract_image_text,
    extract_pdf_ocr_text,
    extract_pdf_text,
    parse_records_from_text,
    parse_records_with_source,
)
from .tts_service import poll_tts_job, submit_tts_job

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
