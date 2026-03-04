from __future__ import annotations

import importlib
import json
import os
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "data.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
USE_POSTGRES = bool(DATABASE_URL)


def _placeholder() -> str:
    return "%s" if USE_POSTGRES else "?"


def _placeholders(count: int) -> str:
    return ", ".join([_placeholder()] * count)


def _load_psycopg():
    psycopg = importlib.import_module("psycopg")
    rows = importlib.import_module("psycopg.rows")
    return psycopg, rows.dict_row


def get_connection():
    if USE_POSTGRES:
        psycopg, dict_row = _load_psycopg()
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        cursor = connection.cursor()
        if USE_POSTGRES:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    focus TEXT,
                    difficulty TEXT,
                    "type" TEXT,
                    answer TEXT,
                    tags TEXT,
                    notes TEXT
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ip_content (
                    id SERIAL PRIMARY KEY,
                    source_id INTEGER NOT NULL REFERENCES knowledge_base (id),
                    ip_text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS tts_jobs (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    voice TEXT,
                    format TEXT,
                    status TEXT NOT NULL,
                    audio_url TEXT,
                    provider TEXT,
                    provider_job_id TEXT,
                    error TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        else:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    focus TEXT,
                    difficulty TEXT,
                    "type" TEXT,
                    answer TEXT,
                    tags TEXT,
                    notes TEXT
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ip_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_id INTEGER NOT NULL,
                    ip_text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_id) REFERENCES knowledge_base (id)
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS tts_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    voice TEXT,
                    format TEXT,
                    status TEXT NOT NULL,
                    audio_url TEXT,
                    provider TEXT,
                    provider_job_id TEXT,
                    error TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
        connection.commit()


def insert_knowledge(records: list[dict[str, Any]]) -> list[int]:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        ids: list[int] = []
        for record in records:
            tags = record.get("tags")
            tags_payload = json.dumps(tags, ensure_ascii=False) if tags is not None else None
            values = (
                record.get("text", ""),
                record.get("focus"),
                record.get("difficulty"),
                record.get("type"),
                record.get("answer"),
                tags_payload,
                record.get("notes"),
            )
            if USE_POSTGRES:
                cursor.execute(
                    f"""
                    INSERT INTO knowledge_base (text, focus, difficulty, "type", answer, tags, notes)
                    VALUES ({_placeholders(7)})
                    RETURNING id
                    """,
                    values,
                )
                row = cursor.fetchone()
                if row and row.get("id") is not None:
                    ids.append(int(row["id"]))
            else:
                cursor.execute(
                    f"""
                    INSERT INTO knowledge_base (text, focus, difficulty, "type", answer, tags, notes)
                    VALUES ({_placeholders(7)})
                    """,
                    values,
                )
                if cursor.lastrowid is not None:
                    ids.append(int(cursor.lastrowid))
        connection.commit()
        return ids


def list_knowledge() -> list[dict[str, Any]]:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM knowledge_base ORDER BY id DESC")
        rows = cursor.fetchall()
        results: list[dict[str, Any]] = []
        for row in rows:
            tags = json.loads(row["tags"]) if row["tags"] else []
            results.append(
                {
                    "id": row["id"],
                    "text": row["text"],
                    "focus": row["focus"],
                    "difficulty": row["difficulty"],
                    "type": row["type"],
                    "answer": row["answer"],
                    "tags": tags,
                    "notes": row["notes"],
                }
            )
        return results


def list_untransformed_knowledge(limit: int | None = None) -> list[dict[str, Any]]:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        sql = """
        SELECT kb.*
        FROM knowledge_base kb
        WHERE NOT EXISTS (
            SELECT 1 FROM ip_content ip WHERE ip.source_id = kb.id
        )
        ORDER BY kb.id DESC
        """
        params: list[Any] = []
        if limit is not None:
            sql += f" LIMIT {_placeholder()}"
            params.append(int(limit))
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        results: list[dict[str, Any]] = []
        for row in rows:
            tags = json.loads(row["tags"]) if row["tags"] else []
            results.append(
                {
                    "id": row["id"],
                    "text": row["text"],
                    "focus": row["focus"],
                    "difficulty": row["difficulty"],
                    "type": row["type"],
                    "answer": row["answer"],
                    "tags": tags,
                    "notes": row["notes"],
                }
            )
        return results


def upsert_ip_content(pairs: list[dict[str, Any]]) -> int:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        for pair in pairs:
            cursor.execute(
                f"""
                DELETE FROM ip_content
                WHERE source_id = {_placeholder()}
                """,
                (pair["source_id"],),
            )
            cursor.execute(
                f"""
                INSERT INTO ip_content (source_id, ip_text)
                VALUES ({_placeholders(2)})
                """,
                (pair["source_id"], pair["ip_text"]),
            )
        connection.commit()
        return len(pairs)


def list_comparison() -> list[dict[str, Any]]:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            SELECT kb.id, kb.text, kb.tags, kb.focus, kb.difficulty, kb."type", kb.answer, kb.notes,
                   ip.ip_text
            FROM knowledge_base kb
            LEFT JOIN ip_content ip ON ip.source_id = kb.id
            ORDER BY kb.id DESC
            """
        )
        rows = cursor.fetchall()
        results: list[dict[str, Any]] = []
        for row in rows:
            tags = json.loads(row["tags"]) if row["tags"] else []
            results.append(
                {
                    "id": row["id"],
                    "text": row["text"],
                    "ip_text": row["ip_text"],
                    "focus": row["focus"],
                    "difficulty": row["difficulty"],
                    "type": row["type"],
                    "answer": row["answer"],
                    "tags": tags,
                    "notes": row["notes"],
                }
            )
        return results


def create_tts_job(
    text: str,
    voice: str | None,
    audio_format: str | None,
    provider: str | None,
) -> int:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        if USE_POSTGRES:
            cursor.execute(
                f"""
                INSERT INTO tts_jobs (text, voice, format, status, provider)
                VALUES ({_placeholders(5)})
                RETURNING id
                """,
                (text, voice, audio_format, "processing", provider),
            )
            row = cursor.fetchone()
            connection.commit()
            if not row or row.get("id") is None:
                raise RuntimeError("failed to create tts job")
            return int(row["id"])
        cursor.execute(
            f"""
            INSERT INTO tts_jobs (text, voice, format, status, provider)
            VALUES ({_placeholders(5)})
            """,
            (text, voice, audio_format, "processing", provider),
        )
        connection.commit()
        lastrowid = cursor.lastrowid
        if lastrowid is None:
            raise RuntimeError("failed to create tts job")
        return int(lastrowid)


def update_tts_job(job_id: int, updates: dict[str, Any]) -> None:
    if not updates:
        return
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        fields = []
        values: list[Any] = []
        for key, value in updates.items():
            fields.append(f"{key} = {_placeholder()}")
            values.append(value)
        values.append(job_id)
        cursor.execute(
            f"""
            UPDATE tts_jobs
            SET {", ".join(fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = {_placeholder()}
            """,
            values,
        )
        connection.commit()


def get_tts_job(job_id: int) -> dict[str, Any] | None:
    init_db()
    with get_connection() as connection:
        cursor = connection.cursor()
        cursor.execute(
            f"SELECT * FROM tts_jobs WHERE id = {_placeholder()}",
            (job_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "text": row["text"],
            "voice": row["voice"],
            "format": row["format"],
            "status": row["status"],
            "audio_url": row["audio_url"],
            "provider": row["provider"],
            "provider_job_id": row["provider_job_id"],
            "error": row["error"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
