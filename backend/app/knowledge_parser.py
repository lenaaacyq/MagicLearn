from __future__ import annotations

import io
import json
import os
import re
import time
import urllib.request
import urllib.error
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


def _contains_cjk(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def _word_count(text: str) -> int:
    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text or "")
    return len(words)


def _infer_requested_count(text: str) -> int | None:
    if not text:
        return None
    match = re.search(r"(\d+)\s*(?:道|题|questions?)", text, re.I)
    if match:
        value = int(match.group(1))
        return min(10, max(1, value))
    numeral_map = {"一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
    match = re.search(r"([一二两三四五六七八九十])\s*(?:道|题)", text)
    if match:
        value = numeral_map.get(match.group(1))
        if value:
            return value
    return None


def _build_generation_prompt(
    strict_english: bool,
    input_text: str,
    count: int | None,
    forced_type: str | None = None,
) -> str:
    strict_note = (
        "\n\n严格英文输出要求（必须满足）："
        "\n- 任何字段都不能出现中文字符。"
        "\n- 如果输入是中文需求，先翻译为英文，再输出英文题目。"
        "\n- 禁止输出中文标题、中文注释、中文标点说明。"
    )
    count_note = f"\n- 本次生成数量：{count} 道，必须严格等于该数量。" if count else "\n- 若用户有明确数量要求，必须严格遵守；否则生成 5-8 道。"
    forced_note = (
        f"\n- 仅生成 {forced_type} 题目；type 必须为 {forced_type}。"
        if forced_type
        else ""
    )
    return (
        "你是英语中考题目生成与抽取助手。请根据输入文本做两种情况判断："
        "\n1) 如果文本已经是题目或包含题干/选项/空格/题号，请抽取为题目记录；"
        "\n2) 如果文本是需求、关键词或说明，请生成 5-8 道题目记录。"
        "\n\n统一风格（必须执行）："
        "\n- 所有输出必须体现“魔法学院/魔法课堂/城堡校园”的 IP 氛围，但只做轻量换头：人名/地点/事物替换为魔法学院语境。"
        "\n- 禁止出现任何中文，所有题干/选项/阅读材料/听力稿必须是英文。"
        "\n- 难度控制在初中英语范围（CEFR A2-B1），词汇简单，避免生僻咒语专有名词。"
        + (strict_note if strict_english else "")
        + count_note
        + forced_note
        + "\n\n输出要求："
        "\n- 只输出 JSON 数组，不要输出 Markdown、解释、代码块。"
        "\n- 必须包含字段：text, focus, difficulty, type, answer, tags, notes, options。允许额外字段 material。"
        "\n- options 必须是字符串数组，长度为 4；answer 必须是 A/B/C/D。"
        "\n- type 只能是 grammar / reading / listening 之一；无法判断就填 grammar。"
        "\n- difficulty 必须是 1-5 的整数；无法判断就填 3。"
        "\n- tags 必须是字符串数组；没有就填 []。"
        "\n- text 只包含“一道题”的题干与选项结构（不要包含多题序号），用换行分隔。"
        "\n  选项格式严格使用：A) ...\\nB) ...\\nC) ...\\nD) ..."
        "\n- answer 输出选项字母 A/B/C/D。无法判断就留空字符串。"
        "\n\n题型额外规则："
        "\n- grammar：题干为一句或两句英语，围绕语法点设置空格或选择；保持题目简洁。"
        "\n- reading：必须提供 material 字段，格式："
        '\n  {"kind":"reading","text":"<English passage>"}'
        "\n  material.text 必须是英文阅读文章，词数不少于 40，符合英语中考书写规范（段落清晰、标点正确、无中式英文）。"
        "\n  text 是围绕该文章的一道四选一题目（细节/推断/主旨等）。"
        "\n- listening：必须提供 material 字段，格式："
        '\n  {"kind":"listening","transcript":"<English dialogue>", "dialogue":[{"role":"W","text":"..."},{"role":"M","text":"..."}]}'
        "\n  material.transcript 必须是英文对话稿，长度 2-6 句，角色仅 W/M，且 dialogue 至少两句并同时包含 W 与 M。"
        "\n  text 是围绕该对话的一道四选一听力题。"
        "\n\n示例输出："
        '\n[{"text":"In Arcane Academy, Lily found her wand was missing. What should she do?\\nA) Ask the librarian for help.\\nB) Leave the castle at once.\\nC) Throw the wand away.\\nD) Sleep all day.","focus":"情态动词","difficulty":3,"type":"grammar","answer":"A","tags":["modal verbs"],"notes":"","material":null}]'
        f"\n\n输入：\n{input_text}"
    )


def debug_generate_output(text: str) -> dict[str, Any]:
    api_key = os.environ.get("MOONSHOT_API_KEY", "").strip()
    base_url = os.environ.get("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")
    cleaned = text.strip()
    if not cleaned:
        return {"error": "empty"}
    if not api_key:
        return {"error": "missing_key"}
    requested_count = _infer_requested_count(cleaned)
    cleaned_for_generation = cleaned
    translated_input: str | None = None
    if _contains_cjk(cleaned):
        try:
            translation = call_kimi(
                base_url,
                api_key,
                "请把下面的中文需求翻译成简洁、准确的英文，不要输出中文，不要解释：\n"
                + cleaned,
            )
            translated = translation.strip()
            if translated and not _contains_cjk(translated):
                translated_input = translated
                cleaned_for_generation = translated
        except Exception as exc:
            return {"error": "translate_error", "detail": str(exc)}
    prompt = _build_generation_prompt(False, cleaned_for_generation, requested_count)
    start = time.time()
    try:
        response = call_kimi(base_url, api_key, prompt)
    except Exception as exc:
        return {"error": "request_error", "detail": str(exc)}
    duration_ms = int((time.time() - start) * 1000)
    return {
        "requested_count": requested_count,
        "translated_input": translated_input,
        "prompt": prompt,
        "response": response,
        "duration_ms": duration_ms,
    }


def _safe_json_array(raw: str) -> list[dict[str, Any]] | None:
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else None
    except Exception:
        pass
    repaired = raw.replace('""', '"')
    if repaired != raw:
        try:
            data = json.loads(repaired)
            return data if isinstance(data, list) else None
        except Exception:
            return None
    return None


def _repair_json_with_model(raw: str, base_url: str, api_key: str) -> list[dict[str, Any]] | None:
    prompt = (
        "请把下面内容修正为严格 JSON 数组，只输出 JSON。"
        "字段仅允许：text, focus, difficulty, type, answer, tags, notes, options, material。"
        "若缺失 options 或 answer，必须补齐 options(4 项) 并给出正确 answer(A/B/C/D)。"
        "如果 type=listening，material.dialogue 必须至少 2 句且包含 W 与 M。"
        "不要输出中文。\n\n内容：\n"
        + raw
    )
    try:
        response = call_kimi(base_url, api_key, prompt)
    except Exception:
        return None
    match = re.search(r"\[.*\]", response, re.S)
    if not match:
        return None
    return _safe_json_array(match.group())


def _is_valid_generated_record(record: dict[str, Any]) -> bool:
    text = str(record.get("text", "") or "").strip()
    if not text or _contains_cjk(text):
        return False
    record_type = str(record.get("type", "") or "").strip().lower()
    answer = str(record.get("answer", "") or "").strip().upper()
    options = record.get("options")
    material = record.get("material")
    if record_type == "reading":
        if not isinstance(material, dict):
            return False
        passage = str(material.get("text", "") or "").strip()
        if not passage or _contains_cjk(passage) or _word_count(passage) < 40:
            return False
    if record_type == "listening":
        if not isinstance(material, dict):
            return False
        transcript = str(material.get("transcript", "") or "").strip()
        if not transcript or _contains_cjk(transcript):
            return False
        dialogue = material.get("dialogue")
        if not isinstance(dialogue, list) or len(dialogue) < 2:
            return False
        roles = {
            str(item.get("role", "") or "").strip().upper()
            for item in dialogue
            if isinstance(item, dict)
        }
        if not {"W", "M"}.issubset(roles):
            return False
    if record_type in {"grammar", "reading", "listening"}:
        if not isinstance(options, list):
            return False
        cleaned = [str(item).strip() for item in options if str(item).strip()]
        if len(cleaned) != 4:
            return False
        if answer not in {"A", "B", "C", "D"}:
            return False
    return True


def _extract_options_from_text(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    options: list[str] = []
    for line in lines:
        match = re.match(r"^[A-D][).:：]\s*(.+)$", line, re.I)
        if match:
            options.append(match.group(1).strip())
    return options


def _extract_answer_from_text(text: str) -> str | None:
    for line in text.splitlines():
        match = re.match(r"^\s*(answer|答案|correct answer)\s*[:：]\s*([A-D])\b", line, re.I)
        if match:
            return match.group(2).upper()
    return None


def normalize_record(record: dict[str, Any]) -> dict[str, Any] | None:
    record_type = resolve_type(record.get("type"))
    if record_type is None:
        return None
    focus_value = record.get("focus", "")
    if isinstance(focus_value, list):
        focus_value = "、".join([str(item).strip() for item in focus_value if str(item).strip()])
    answer_value = record.get("answer", "")
    if isinstance(answer_value, list):
        answer_value = "\n".join([str(item).strip() for item in answer_value if str(item).strip()])
    normalized: dict[str, Any] = {
        "text": str(record.get("text", "")).strip(),
        "focus": str(focus_value or "").strip(),
        "difficulty": normalize_difficulty(record.get("difficulty")),
        "type": record_type,
        "answer": str(answer_value or "").strip(),
        "tags": normalize_tags(record.get("tags")),
        "notes": str(record.get("notes", "")).strip(),
    }
    options = record.get("options")
    if isinstance(options, list):
        cleaned_options = []
        for item in options:
            text = str(item).strip()
            if not text:
                continue
            text = re.sub(r"^[A-D][).:：]\s*", "", text, flags=re.IGNORECASE)
            cleaned_options.append(text)
        normalized["options"] = cleaned_options
    if "options" not in normalized:
        extracted = _extract_options_from_text(normalized["text"])
        if extracted:
            normalized["options"] = extracted
    if not normalized["answer"]:
        detected_answer = _extract_answer_from_text(normalized["text"])
        if detected_answer:
            normalized["answer"] = detected_answer
    material = record.get("material")
    if isinstance(material, dict):
        normalized["material"] = material
    return normalized


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
        if not record.get("text"):
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
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8") if exc.fp else ""
        raise RuntimeError(f"kimi http {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"kimi url error: {exc}") from exc


def parse_records_with_source(text: str) -> tuple[list[dict[str, Any]], str]:
    api_key = os.environ.get("MOONSHOT_API_KEY", "").strip()
    base_url = os.environ.get("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")
    if api_key:
        prompt = (
            "你是结构化抽取助手。请把下面的原始文本抽取成“题目记录 JSON 数组”。"
            "只输出 JSON 数组，不要输出 Markdown、解释、代码块。"
            "\n\n要求："
            "\n- 输出为 JSON 数组，每个元素是对象。"
            "\n- 字段固定为：text, focus, difficulty, type, answer, tags, notes。不要额外字段。"
            "\n- type 只能是 grammar / reading / listening 之一；无法判断就填 grammar。"
            "\n- difficulty 必须是 1-5 的整数；无法判断就填 3。"
            "\n- tags 必须是字符串数组；没有就填 []。"
            "\n- text 里要保留题干的结构（段落、题号、选项 A-D 等），但去掉无关页眉页脚。"
            "\n- answer 尽量输出选项字母（如 A/B/C/D）或准确答案；没有就留空字符串。"
            "\n- 如果是“单项选择题”并且有多道题，请拆成多条记录，每条只含一道题与其选项。"
            "\n- 如果是阅读完形/完形填空，有一段文章+多个空+统一选项列表："
            "\n  - 合并为 1 条记录，text 保留完整文章与所有空号及选项列表。"
            "\n  - type 设为 reading，notes 可写 'cloze'。"
            "\n\n示例输出："
            '\n[{"text":"(1) ...\\nA) ...\\nB) ...","focus":"时态","difficulty":3,"type":"grammar","answer":"B","tags":["时态"],"notes":""}]'
            f"\n\n原始文本：\n{text}"
        )
        try:
            response = call_kimi(base_url, api_key, prompt)
            match = re.search(r"\[.*\]", response, re.S)
            if match:
                data = json.loads(match.group())
                if isinstance(data, list):
                    records = [normalize_record(item) for item in data if isinstance(item, dict)]
                    filtered = [
                        record
                        for record in records
                        if record and record.get("text") and len(str(record.get("text", "")).strip()) >= 8
                    ]
                    if filtered:
                        return filtered, "moonshot"
        except Exception:
            pass
    return parse_blocks(text), "rules"


def parse_records_from_text(text: str) -> list[dict[str, Any]]:
    records, _source = parse_records_with_source(text)
    return records


def parse_records_from_text_input(
    text: str, forced_type: str | None = None
) -> tuple[list[dict[str, Any]], str, str | None]:
    api_key = os.environ.get("MOONSHOT_API_KEY", "").strip()
    base_url = os.environ.get("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")
    cleaned = text.strip()
    if not cleaned:
        return [], "empty", "empty"
    requested_count = _infer_requested_count(cleaned)
    failure_reason: str | None = None
    failure_stage: str | None = None
    if api_key:
        cleaned_for_generation = cleaned
        if _contains_cjk(cleaned):
            try:
                translation = call_kimi(
                    base_url,
                    api_key,
                    "请把下面的中文需求翻译成简洁、准确的英文，不要输出中文，不要解释：\n"
                    + cleaned,
                )
                translated = translation.strip()
                if translated and not _contains_cjk(translated):
                    cleaned_for_generation = translated
            except Exception as exc:
                failure_reason = "translate_error"
                failure_stage = "translate"
                pass
        prompt = _build_generation_prompt(False, cleaned_for_generation, requested_count, forced_type)
        try:
            response = call_kimi(base_url, api_key, prompt)
            match = re.search(r"\[.*\]", response, re.S)
            if not match:
                failure_reason = "no_json"
                failure_stage = "generate"
            else:
                raw_json = match.group()
                data = _safe_json_array(raw_json)
                repaired = None if data is not None else _repair_json_with_model(raw_json, base_url, api_key)
                data = data or repaired
                if not isinstance(data, list):
                    failure_reason = "invalid_json"
                    failure_stage = "generate"
                else:
                    records = [normalize_record(item) for item in data if isinstance(item, dict)]
                    filtered = [
                        record
                        for record in records
                        if record and record.get("text") and len(str(record.get("text", "")).strip()) >= 8
                    ]
                    validated = [record for record in filtered if _is_valid_generated_record(record)]
                    if validated:
                        return validated, "moonshot-text", None
                    if repaired is None:
                        repaired = _repair_json_with_model(raw_json, base_url, api_key)
                        if isinstance(repaired, list):
                            repaired_records = [
                                normalize_record(item) for item in repaired if isinstance(item, dict)
                            ]
                            repaired_filtered = [
                                record
                                for record in repaired_records
                                if record and record.get("text") and len(str(record.get("text", "")).strip()) >= 8
                            ]
                            repaired_validated = [
                                record for record in repaired_filtered if _is_valid_generated_record(record)
                            ]
                            if repaired_validated:
                                return repaired_validated, "moonshot-text-repair", None
                    failure_reason = "validation_failed"
                    failure_stage = "generate"
        except Exception as exc:
            failure_reason = "request_error"
            failure_stage = "generate"
            pass
        strict_prompt = _build_generation_prompt(True, cleaned_for_generation, requested_count, forced_type)
        try:
            response = call_kimi(base_url, api_key, strict_prompt)
            match = re.search(r"\[.*\]", response, re.S)
            if not match:
                failure_reason = "no_json"
                failure_stage = "strict"
            else:
                raw_json = match.group()
                data = _safe_json_array(raw_json)
                repaired = None if data is not None else _repair_json_with_model(raw_json, base_url, api_key)
                data = data or repaired
                if not isinstance(data, list):
                    failure_reason = "invalid_json"
                    failure_stage = "strict"
                else:
                    records = [normalize_record(item) for item in data if isinstance(item, dict)]
                    filtered = [
                        record
                        for record in records
                        if record and record.get("text") and len(str(record.get("text", "")).strip()) >= 8
                    ]
                    validated = [record for record in filtered if _is_valid_generated_record(record)]
                    if validated:
                        return validated, "moonshot-text-strict", None
                    if repaired is None:
                        repaired = _repair_json_with_model(raw_json, base_url, api_key)
                        if isinstance(repaired, list):
                            repaired_records = [
                                normalize_record(item) for item in repaired if isinstance(item, dict)
                            ]
                            repaired_filtered = [
                                record
                                for record in repaired_records
                                if record and record.get("text") and len(str(record.get("text", "")).strip()) >= 8
                            ]
                            repaired_validated = [
                                record for record in repaired_filtered if _is_valid_generated_record(record)
                            ]
                            if repaired_validated:
                                return repaired_validated, "moonshot-text-strict-repair", None
                    failure_reason = "validation_failed"
                    failure_stage = "strict"
        except Exception as exc:
            failure_reason = "request_error"
            failure_stage = "strict"
            pass
        if _contains_cjk(cleaned):
            detail = f"{failure_reason}:{failure_stage}" if failure_reason else None
            return [], "moonshot-failed", detail
    if _contains_cjk(cleaned):
        return [], "missing-moonshot-key", "missing_key"
    return parse_blocks(cleaned), "rules-text", None
