from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "imagegen" / "avatar_promos_ready.jsonl"
CLI = Path("/Users/juricaseparovic/.codex/skills/.system/imagegen/scripts/image_gen.py")
OUTPUT_DIR = ROOT / "website" / "assets" / "player-promos"
MAX_ATTEMPTS = 3


def run_job(row: dict[str, str]) -> bool:
    out_path = OUTPUT_DIR / row["out"]
    cmd = [
        "python",
        str(CLI),
        "edit",
        "--image",
        row["image"],
        "--prompt",
        row["prompt"],
        "--quality",
        "medium",
        "--input-fidelity",
        "high",
        "--size",
        "1024x1536",
        "--force",
        "--out",
        str(out_path),
    ]

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"RUN {out_path} attempt={attempt}", flush=True)
        result = subprocess.run(cmd, cwd=ROOT)
        if result.returncode == 0:
            print(f"OK {out_path}", flush=True)
            return True
        if attempt < MAX_ATTEMPTS:
            time.sleep(3)

    print(f"FAIL {out_path}", flush=True)
    return False


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if not run_job(row):
            failures.append(row["out"])

    print("SUMMARY_START", flush=True)
    for item in failures:
        print(item, flush=True)
    print("SUMMARY_END", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
