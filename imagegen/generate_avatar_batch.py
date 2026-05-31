from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "imagegen" / "avatar_promos.json"
CLI = Path(
    os.environ.get(
        "IMAGE_GEN_CLI",
        "/Users/juricaseparovic/.codex/skills/.system/imagegen/scripts/image_gen.py",
    )
)
OUTPUT_DIR = ROOT / "website" / "assets" / "player-promos"
MAX_ATTEMPTS = 3


def resolve_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


def read_manifest(path: Path) -> tuple[dict[str, str], list[dict[str, str]]]:
    if path.suffix == ".jsonl":
        rows = [
            json.loads(line)
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        return {
            "quality": "medium",
            "size": "1024x1536",
            "output_format": "png",
            "output_dir": str(OUTPUT_DIR),
        }, rows

    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("defaults", {}), data["players"]


def row_matches(row: dict[str, str], filters: list[str]) -> bool:
    if not filters:
        return True

    haystack = " ".join(
        str(row.get(key, "")) for key in ("slug", "name", "out")
    ).casefold()
    return any(item.casefold() in haystack for item in filters)


def get_images(row: dict[str, str]) -> list[str]:
    images = row.get("images")
    if images:
        return list(images)
    return [row["image"]]


def get_prompt_args(row: dict[str, str]) -> list[str]:
    if row.get("prompt_file"):
        return ["--prompt-file", str(resolve_path(row["prompt_file"]))]
    return ["--prompt", row["prompt"]]


def run_job(row: dict[str, str], defaults: dict[str, str], dry_run: bool = False) -> bool:
    output_dir = resolve_path(row.get("output_dir") or defaults.get("output_dir", str(OUTPUT_DIR)))
    out_path = output_dir / row["out"]
    cmd = ["python", str(CLI), "edit"]

    for image in get_images(row):
        cmd.extend(["--image", str(resolve_path(image))])

    cmd.extend(get_prompt_args(row))
    cmd.extend(
        [
            "--quality",
            row.get("quality") or defaults.get("quality", "medium"),
            "--size",
            row.get("size") or defaults.get("size", "1024x1536"),
            "--output-format",
            row.get("output_format") or defaults.get("output_format", "png"),
            "--force",
            "--out",
            str(out_path),
        ]
    )

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"RUN {row.get('slug', out_path.name)} {out_path} attempt={attempt}", flush=True)
        if dry_run:
            print("DRY_RUN " + " ".join(cmd), flush=True)
            return True
        result = subprocess.run(cmd, cwd=ROOT)
        if result.returncode == 0:
            print(f"OK {out_path}", flush=True)
            return True
        if attempt < MAX_ATTEMPTS:
            time.sleep(3)

    print(f"FAIL {out_path}", flush=True)
    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="Generate only rows matching this slug, name, or output filename. Can be passed more than once.",
    )
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = Path(args.manifest)
    defaults, rows = read_manifest(manifest)
    rows = [row for row in rows if row_matches(row, args.only)]
    if not rows:
        print("No matching avatar jobs.", flush=True)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []
    for row in rows:
        if not run_job(row, defaults, dry_run=args.dry_run):
            failures.append(row["out"])

    print("SUMMARY_START", flush=True)
    for item in failures:
        print(item, flush=True)
    print("SUMMARY_END", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
