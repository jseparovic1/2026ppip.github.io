from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps
from rembg import remove


ROOT = Path(__file__).resolve().parents[1]
PLAYERS = ROOT / "players"
OUTPUT = ROOT / "website" / "assets" / "player-cutouts"

SOURCES = {
    "bilic_zeljko.png": PLAYERS / "bilic_zeljko" / "zele.jpeg",
    "dragunic_marko.png": PLAYERS / "dragunic_marko" / "krsni.jpeg",
    "gugic_mateo.png": PLAYERS / "gugic_mateo" / "gugic_1.jpeg",
    "ivis_filip.png": PLAYERS / "ivis_filip" / "ivis.jpeg",
    "jonjic_antonio.png": PLAYERS / "jonjic_antonio" / "jonjic.png",
    "katavic_borna.png": PLAYERS / "katavic_borna" / "katavic.jpeg",
    "lopusinsky_vanja.png": PLAYERS / "lopusinsky_vanja" / "vanja.jpeg",
    "martinac_ivan.png": PLAYERS / "martinac_ivan" / "martinac.jpg",
    "martinovic_marko.png": PLAYERS / "martinovic_marko" / "markan.jpeg",
    "mesin_borna.png": PLAYERS / "mesin_borna" / "meso.jpeg",
    "miocic_franko.png": PLAYERS / "miocic_franko" / "franko.jpeg",
    "miocic_ian.png": PLAYERS / "miocic_ian" / "ian.jpeg",
    "rajkovic_antonio.png": PLAYERS / "rajković_antonio" / "rajkovic.jpg",
    "separovic_jurica.png": PLAYERS / "separovic_jurica" / "separovic.jpeg",
    "soco_mario.png": PLAYERS / "soco_mario" / "soco.jpeg",
    "tomic_ivan.png": PLAYERS / "tomic_ivan" / "tomic.jpeg",
}


def export_cutout(src: Path, out: Path) -> None:
    original = ImageOps.exif_transpose(Image.open(src)).convert("RGBA")
    payload = BytesIO()
    original.save(payload, format="PNG")

    cutout_bytes = remove(payload.getvalue())
    cutout = Image.open(BytesIO(cutout_bytes)).convert("RGBA")

    max_dim = 1900
    if max(cutout.size) > max_dim:
        ratio = max_dim / max(cutout.size)
        cutout = cutout.resize(
            (int(cutout.width * ratio), int(cutout.height * ratio)),
            Image.Resampling.LANCZOS,
        )

    out.parent.mkdir(parents=True, exist_ok=True)
    cutout.save(out)
    print(f"Wrote {out}")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for filename, source in SOURCES.items():
        export_cutout(source, OUTPUT / filename)


if __name__ == "__main__":
    main()
