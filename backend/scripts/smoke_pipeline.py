from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.content_transformer import build_prompt, compose_system_prompt
from app.knowledge_parser import parse_records_with_source


SAMPLE_TEXT = """
题干: Choose the correct answer.
考点: 一般过去时
难度: 3
题型: 语法
正文:
Yesterday, Tom ____ to the library after class.
A: go
B: went
C: goes
D: going
答案: B
标签: 时态, 动词
""".strip()


def main() -> None:
    records, source = parse_records_with_source(SAMPLE_TEXT)
    print("source:", source)
    print("records:", json.dumps(records, ensure_ascii=False, indent=2))
    if not records:
        return
    config = {
        "persona": "mentor",
        "tone": "warm",
        "scene": "great_hall",
        "ritual": "quest",
    }
    system_prompt = compose_system_prompt(config)
    messages = build_prompt(system_prompt, records[0])
    print("system_prompt:", system_prompt)
    print("messages:", json.dumps(messages, ensure_ascii=False, indent=2))
    print("MOONSHOT_BASE_URL:", os.environ.get("MOONSHOT_BASE_URL", ""))
    print("MOONSHOT_API_KEY_set:", bool(os.environ.get("MOONSHOT_API_KEY", "").strip()))


if __name__ == "__main__":
    main()
