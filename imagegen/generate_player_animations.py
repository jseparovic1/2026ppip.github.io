from __future__ import annotations

import argparse
import json
import os
import re
import textwrap
import time
import unicodedata
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "imagegen" / "avatar_promos.json"
PLAYER_DATA = ROOT / "website" / "player-data.js"
OUTPUT_DIR = ROOT / "website" / "assets" / "player-avatar-animations"
ANIMATION_DATA = ROOT / "website" / "player-animations.js"
MODEL = "kwaivgi/kling-v3-video"
MAX_ATTEMPTS = 2

DEFAULT_PROMPT = (
    "Animate this esports-style padel player avatar as a premium Dota 2 style hero selector idle preview. "
    "The player holds a confident heroic pose with subtle breathing, a tiny shoulder shift, and steady eye contact. "
    "Camera slowly pushes in with gentle parallax. Cinematic arena light sweeps across the scene, faint accent-color "
    "energy particles drift in the background, with a restrained game-hero aura. Keep the original face, outfit, "
    "framing, and identity stable. No talking, no text, no logo, no extra people, no distorted hands. Dramatic but "
    "controlled, designed as a looping website hero preview."
)
DEFAULT_NEGATIVE_PROMPT = (
    "talking, lip movement, new person, extra people, text, logo, watermark, distorted face, identity change, "
    "extra limbs, distorted hands, heavy camera shake, fast action, full body walking, scene change"
)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug


def player_slug_from_prompt(prompt: str, fallback: str) -> str:
    match = re.search(r" for ([^,]+), nickname ", prompt)
    if not match:
        return fallback
    return slugify(match.group(1))


def read_rows(limit: int | None, slug: str | None = None) -> list[dict[str, str]]:
    if PLAYER_DATA.exists():
        rows = read_player_data_rows()
        if slug is not None:
            rows = [row for row in rows if row.get("slug") == slug]
        return rows[:limit] if limit is not None else rows

    rows: list[dict[str, str]] = json.loads(MANIFEST.read_text(encoding="utf-8"))["players"]
    filtered_rows: list[dict[str, str]] = []
    for row in rows:
        if slug is not None:
            image = row.get("image") or row.get("images", [""])[0]
            prompt = row.get("prompt") or f" for {row.get('name', '')}, nickname "
            image_path = ROOT / image
            row_slug = row.get("slug") or player_slug_from_prompt(
                prompt,
                image_path.stem.replace("_", "-"),
            )
            if row_slug != slug:
                continue
        filtered_rows.append(row)
        if limit is not None and len(filtered_rows) >= limit:
            break
    return filtered_rows


def read_player_data_rows() -> list[dict[str, str]]:
    content = PLAYER_DATA.read_text(encoding="utf-8")
    players_block = re.search(r"var players = \[(.*)\];", content, re.DOTALL)
    if not players_block:
        raise RuntimeError(f"Could not find players array in {PLAYER_DATA}")

    object_blocks = re.findall(r"\{\s*(.*?)\n    \}", players_block.group(1), re.DOTALL)
    rows: list[dict[str, str]] = []
    for block in object_blocks:
        name_match = re.search(r'name: "([^"]+)"', block)
        nickname_match = re.search(r'nickname: "([^"]+)"', block)
        image_match = re.search(r'image: "([^"]+)"', block)
        active_match = re.search(r"active: false", block)
        if not name_match or not image_match or active_match:
            continue

        name = name_match.group(1)
        nickname = nickname_match.group(1) if nickname_match else name
        image = image_match.group(1).removeprefix("./")
        rows.append(
            {
                "image": f"website/{image}",
                "name": name,
                "slug": slugify(name),
                "prompt": f"Use the current esports avatar as the start image for {name}, nickname {nickname}.",
            }
        )

    return rows


def output_to_bytes(output: Any) -> bytes:
    if isinstance(output, list):
        if not output:
            raise RuntimeError("Replicate returned an empty output list")
        output = output[0]

    if hasattr(output, "read"):
        return output.read()

    output_url = getattr(output, "url", None)
    if callable(output_url):
        output_url = output_url()

    if output_url is None and isinstance(output, str):
        output_url = output

    if not output_url:
        raise RuntimeError(f"Unsupported Replicate output: {output!r}")

    with urllib.request.urlopen(output_url) as response:
        return response.read()


def run_prediction(replicate: Any, input_data: dict[str, Any]) -> Any:
    prediction = replicate.predictions.create(model=MODEL, input=input_data)
    print(f"PREDICTION {prediction.id} status={prediction.status}", flush=True)
    prediction.wait()
    print(f"PREDICTION {prediction.id} status={prediction.status}", flush=True)

    if prediction.status != "succeeded":
        error = getattr(prediction, "error", None) or "unknown Replicate error"
        raise RuntimeError(f"Replicate prediction {prediction.id} {prediction.status}: {error}")

    return prediction.output


def write_animation_data(animation_map: dict[str, str]) -> None:
    body = textwrap.indent(json.dumps(animation_map, ensure_ascii=False, indent=2, sort_keys=True), "  ")
    ANIMATION_DATA.write_text(
        "/* global window */\n"
        "(function () {\n"
        f"  window.PPIP_PLAYER_ANIMATIONS = {body.lstrip()};\n"
        "})();\n",
        encoding="utf-8",
    )


def load_existing_animation_data() -> dict[str, str]:
    if not ANIMATION_DATA.exists():
        return {}

    content = ANIMATION_DATA.read_text(encoding="utf-8")
    match = re.search(r"window\.PPIP_PLAYER_ANIMATIONS\s*=\s*(\{.*?\});", content, re.DOTALL)
    if not match:
        return {}
    return json.loads(match.group(1))


def run_job(replicate: Any, row: dict[str, str], args: argparse.Namespace) -> tuple[str, str]:
    image = row.get("image") or row.get("images", [""])[0]
    image_path = ROOT / image
    prompt = row.get("prompt") or f"Use the current esports avatar as the start image for {row.get('name', image_path.stem)}."
    player_slug = row.get("slug") or player_slug_from_prompt(prompt, image_path.stem.replace("_", "-"))
    output_path = OUTPUT_DIR / f"{player_slug}.mp4"

    if output_path.exists() and not args.force:
        print(f"SKIP existing {output_path}", flush=True)
        return player_slug, f"./assets/player-avatar-animations/{output_path.name}"

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"RUN {output_path.name} attempt={attempt} mode={args.mode}", flush=True)
        try:
            with image_path.open("rb") as image_file:
                input_data: dict[str, Any] = {
                    "mode": args.mode,
                    "start_image": image_file,
                    "prompt": args.prompt or DEFAULT_PROMPT,
                    "duration": args.duration,
                    "generate_audio": args.generate_audio,
                    "negative_prompt": args.negative_prompt,
                }

                output = run_prediction(replicate, input_data)

            output_path.write_bytes(output_to_bytes(output))
            print(f"OK {output_path}", flush=True)
            return player_slug, f"./assets/player-avatar-animations/{output_path.name}"
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {output_path.name}: {exc}", flush=True)
            if attempt < MAX_ATTEMPTS:
                time.sleep(5)

    raise RuntimeError(f"Could not generate {output_path.name}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate PPiP player idle animations with Replicate Kling v3 image-to-video.")
    parser.add_argument(
        "--mode",
        choices=["standard", "pro", "4k"],
        default="pro",
        help="Kling generation mode. Use standard for cheaper drafts, pro for final-quality clips.",
    )
    parser.add_argument("--duration", type=int, default=5, choices=range(3, 16), metavar="[3-15]", help="Clip duration in seconds.")
    parser.add_argument("--generate-audio", action="store_true", help="Generate native audio. Usually leave off for UI idle loops.")
    parser.add_argument("--limit", type=int, default=None, help="Generate only the first N rows for testing.")
    parser.add_argument("--slug", default=None, help="Generate only one player by slug, for parallel workers.")
    parser.add_argument("--force", action="store_true", help="Regenerate clips that already exist.")
    parser.add_argument("--no-data-update", action="store_true", help="Write only the MP4 file; do not update player-animations.js.")
    parser.add_argument("--prompt", default=None, help="Override the default hero-selector idle prompt.")
    parser.add_argument(
        "--negative-prompt",
        default=DEFAULT_NEGATIVE_PROMPT,
        help="Override the default negative prompt.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not os.environ.get("REPLICATE_API_TOKEN"):
        print("Set REPLICATE_API_TOKEN before running this script.", flush=True)
        return 1

    try:
        import replicate
    except ImportError:
        print("Install the Replicate Python package first: python -m pip install replicate", flush=True)
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    animation_map = load_existing_animation_data()
    failures: list[str] = []

    for row in read_rows(args.limit, args.slug):
        try:
            slug, animation_path = run_job(replicate, row, args)
            if not args.no_data_update:
                animation_map[slug] = animation_path
                write_animation_data(animation_map)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{row.get('image', 'unknown')}: {exc}")

    print("SUMMARY_START", flush=True)
    for failure in failures:
        print(failure, flush=True)
    print("SUMMARY_END", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
