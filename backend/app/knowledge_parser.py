from __future__ import annotations

import io
import json
import os
import re
import urllib.request
from typing import Any

from pypdf import PdfReader

ALLOWED_TYPES = {"grammar", "reading", "listening"}


def extract_pdf_text(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages).strip()


def extract_image_text(image_bytes: bytes) -> str:
    try:
        from PIL import Image
        import pytesseract
    except Exception as exc:
        raise RuntimeError("OCR依赖未安装，请安装 pillow 与 pytesseract，并确保系统已安装 tesseract") from exc
    image = Image.open(io.BytesIO(image_bytes))
    text = pytesseract.image_to_string(image, lang="chi_sim+eng")
    return text.strip()


def extract_pdf_ocr_text(file_bytes: bytes) -> str:
    try:
        import fitz
        from PIL import Image
        import pytesseract
    except Exception as exc:
        raise RuntimeError("PDF OCR依赖未安装，请安装 pymupdf、pillow 与 pytesseract") from exc
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        mode = "RGBA" if pix.alpha else "RGB"
        image = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
        pages.append(pytesseract.image_to_string(image, lang="chi_sim+eng"))
    doc.close()
    return "\n".join(pages).strip()


def resolve_type(value: Any) -> str | None:
    text = str(value or "").strip().lower()
    if not text:
        return "grammar"
    if "听力" in text or "listening" in text:
        return "listening"
    if "阅读" in text or "reading" in text:
        return "reading"
    if "语法" in text or "grammar" in text:
        return "grammar"
    if text in ALLOWED_TYPES:
        return text
    return None


def normalize_tags(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in re.split(r"[,，、;；\n]", value) if item.strip()]
    return []


def normalize_difficulty(value: Any) -> int:
    if isinstance(value, (int, float)):
        number = int(value)
    else:
        match = re.search(r"\d+", str(value or ""))
        number = int(match.group()) if match else 3
    return min(5, max(1, number))


def normalize_record(record: dict[str, Any]) -> dict[str, Any] | None:
    record_type = resolve_type(record.get("type"))
    if record_type is None:
        return None
    return {
        "text": str(record.get("text", "")).strip(),
        "focus": record.get("focus", ""),
        "difficulty": normalize_difficulty(record.get("difficulty")),
        "type": record_type,
        "answer": str(record.get("answer", "")).strip(),
        "tags": normalize_tags(record.get("tags")),
        "notes": str(record.get("notes", "")).strip(),
    }


def parse_blocks(text: str) -> list[dict[str, Any]]:
    blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    results: list[dict[str, Any]] = []
    for block in blocks:
        record: dict[str, Any] = {}
        content_lines = []
        for raw_line in block.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            key_value = re.split(r"[:：]", line, maxsplit=1)
            if len(key_value) == 2:
                key, value = key_value[0].strip().lower(), key_value[1].strip()
                if key in {"题干", "正文", "文本", "text"}:
                    record["text"] = value
                    continue
                if key in {"考点", "focus"}:
                    record["focus"] = value
                    continue
                if key in {"难度", "difficulty"}:
                    record["difficulty"] = value
                    continue
                if key in {"题型", "type"}:
                    record["type"] = value
                    continue
                if key in {"答案", "answer"}:
                    record["answer"] = value
                    continue
                if key in {"标签", "tags"}:
                    record["tags"] = value
                    continue
                if key in {"备注", "notes"}:
                    record["notes"] = value
                    continue
            content_lines.append(line)
        if "text" not in record:
            record["text"] = "\n".join(content_lines).strip()
        normalized = normalize_record(record)
        if normalized:
            results.append(normalized)
    return [record for record in results if record.get("text")]


def call_kimi(base_url: str, api_key: str, prompt: str) -> str:
    url = base_url.rstrip("/") + "/chat/completions"
    payload = json.dumps(
        {
            "model": "moonshot-v1-8k",
            "messages": [
                {"role": "system", "content": "你是结构化抽取助手，输出严格 JSON。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()


def parse_records_from_text(text: str) -> list[dict[str, Any]]:
    api_key = os.environ.get("MOONSHOT_API_KEY", "").strip()
    base_url = os.environ.get("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")
    if api_key:
        prompt = (
            "请从以下文本中抽取题目记录，并输出 JSON 数组。"
            "每条记录包含字段：text, focus, difficulty, type, answer, tags, notes。"
            "type 只能是 grammar/reading/listening 之一。"
            "difficulty 为 1-5 的整数。若缺失请留空或给默认值。"
            f"\n\n文本：\n{text}"
        )
        try:
            response = call_kimi(base_url, api_key, prompt)
            match = re.search(r"\[.*\]", response, re.S)
            if match:
                data = json.loads(match.group())
                if isinstance(data, list):
                    records = [normalize_record(item) for item in data if isinstance(item, dict)]
                    filtered = [record for record in records if record and record.get("text")]
                    if filtered:
                        return filtered
        except Exception:
            pass
    return parse_blocks(text)
