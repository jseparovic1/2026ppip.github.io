from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "website" / "assets"
PLAYERS_DIR = ASSETS / "players"
CUTOUTS_DIR = ASSETS / "player-cutouts"
MATERIALS_DIR = ASSETS / "materials"
OUTPUT = ASSETS / "tournament-flyer-ppip-spring-edition.png"

WIDTH = 2400
HEIGHT = 3000


PLAYERS = [
    ("ŽELJKO BILIĆ", "ZELE", "bilic_zeljko.png", (700, 1450), 1.00, -2),
    ("MARKO DRAGUNIĆ", "DRAGUN", "dragunic_marko.png", (1230, 1450), 1.02, 3),
    ("MATEO GUGIĆ", "GUGA", "gugic_mateo.png", (390, 1620), 0.82, -5),
    ("FILIP IVIS", "IVI", "ivis_filip.png", (1580, 1600), 0.82, 4),
    ("ANTONIO JONJIĆ", "JONI", "jonjic_antonio.png", (235, 1820), 0.70, -4),
    ("BORNA KATAVIĆ", "BOKI", "katavic_borna.png", (1845, 1820), 0.70, 4),
    ("VANJA LOPUSINSKY", "LOPO", "lopusinsky_vanja.png", (90, 2020), 0.62, -4),
    ("IVAN MARTINAC", "MARTI", "martinac_ivan.png", (2050, 2020), 0.62, 5),
    ("MARKO MARTINOVIĆ", "MARKAN", "martinovic_marko.png", (470, 1990), 0.70, -2),
    ("BORNA MESIN", "MESO", "mesin_borna.png", (1620, 1990), 0.70, 2),
    ("FRANKO MIOČIĆ", "FRANK", "miocic_franko.png", (670, 1870), 0.76, 0),
    ("IAN MIOČIĆ", "IJO", "miocic_ian.png", (1380, 1870), 0.76, 0),
    ("ANTONIO RAJKOVIĆ", "RAJA", "rajkovic_antonio.png", (885, 2030), 0.70, 0),
    ("JURICA ŠEPAROVIĆ", "SEP", "separovic_jurica.png", (1160, 2030), 0.70, 0),
    ("MARIO SOCO", "SOKO", "soco_mario.png", (980, 1680), 0.80, -1),
    ("IVAN TOMIĆ", "TOMA", "tomic_ivan.png", (1470, 1680), 0.80, 2),
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def make_gradient_background() -> Image.Image:
    background = Image.new("RGBA", (WIDTH, HEIGHT), "#07141f")
    pixels = background.load()
    for y in range(HEIGHT):
      t = y / max(HEIGHT - 1, 1)
      for x in range(WIDTH):
          u = x / max(WIDTH - 1, 1)
          r = int(5 + 8 * (1 - t) + 12 * u)
          g = int(18 + 28 * (1 - t) + 18 * (1 - abs(u - 0.5) * 2))
          b = int(31 + 42 * t + 24 * (1 - u))
          pixels[x, y] = (r, g, b, 255)
    return background


def add_background_effects(image: Image.Image) -> Image.Image:
    draw = ImageDraw.Draw(image, "RGBA")

    for index, color in enumerate([(0, 210, 255, 70), (255, 155, 45, 58), (165, 255, 90, 42)]):
        layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        layer_draw = ImageDraw.Draw(layer, "RGBA")
        x0 = 220 + index * 560
        y0 = 180 + index * 240
        x1 = x0 + 900
        y1 = y0 + 900
        layer_draw.ellipse((x0, y0, x1, y1), fill=color)
        layer = layer.filter(ImageFilter.GaussianBlur(130))
        image.alpha_composite(layer)

    for offset in (-540, -140, 260, 660):
        beam = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        beam_draw = ImageDraw.Draw(beam, "RGBA")
        beam_draw.polygon(
            [
                (offset, 0),
                (offset + 220, 0),
                (offset + 980, HEIGHT),
                (offset + 760, HEIGHT),
            ],
            fill=(255, 255, 255, 24),
        )
        beam = beam.filter(ImageFilter.GaussianBlur(24))
        image.alpha_composite(beam)

    for y in range(0, HEIGHT, 120):
        draw.line((0, y, WIDTH, y), fill=(255, 255, 255, 18), width=1)
    for x in range(0, WIDTH, 120):
        draw.line((x, 0, x, HEIGHT), fill=(255, 255, 255, 14), width=1)

    return image


def add_branding(image: Image.Image) -> None:
    logo = Image.open(MATERIALS_DIR / "logo.png").convert("RGBA")
    logo.thumbnail((560, 560))
    logo.putalpha(90)
    image.alpha_composite(logo, (WIDTH - logo.width - 120, 170))

    venue = Image.open(MATERIALS_DIR / "materials_pc_dalmatia.png").convert("RGBA")
    venue.thumbnail((720, 720))
    venue.putalpha(54)
    image.alpha_composite(venue, (840, 360))

    ghost = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ghost_draw = ImageDraw.Draw(ghost, "RGBA")
    ghost_draw.rounded_rectangle((220, 510, WIDTH - 220, HEIGHT - 290), radius=36, outline=(255, 255, 255, 22), width=5)
    ghost_draw.rounded_rectangle((310, 610, WIDTH - 310, HEIGHT - 470), radius=28, outline=(0, 235, 255, 20), width=3)
    ghost = ghost.filter(ImageFilter.GaussianBlur(1))
    image.alpha_composite(ghost)


def add_title_zone(image: Image.Image) -> None:
    top = Image.new("RGBA", (WIDTH, 760), (0, 0, 0, 0))
    top_draw = ImageDraw.Draw(top, "RGBA")
    top_draw.rectangle((0, 0, WIDTH, 760), fill=(3, 10, 18, 88))
    top_draw.polygon([(0, 760), (820, 760), (1140, 440), (0, 440)], fill=(3, 10, 18, 170))
    top_draw.rectangle((100, 100, 980, 395), fill=(2, 8, 15, 165))
    top_draw.rectangle((100, 410, 1320, 560), fill=(2, 8, 15, 135))
    top = top.filter(ImageFilter.GaussianBlur(6))
    image.alpha_composite(top, (0, 0))


def trim_alpha(image: Image.Image) -> Image.Image:
    if image.mode != "RGBA":
        image = image.convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    return image.crop(bbox) if bbox else image


def add_shadow(base: Image.Image, overlay: Image.Image, x: int, y: int) -> None:
    alpha = overlay.getchannel("A")
    shadow = Image.new("RGBA", overlay.size, (0, 0, 0, 0))
    shadow.putalpha(alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    shadow = ImageChops.multiply(shadow, Image.new("RGBA", overlay.size, (16, 24, 40, 255)))
    base.alpha_composite(shadow, (x + 18, y + 28))


def paste_player(base: Image.Image, spec: tuple[str, str, str, tuple[int, int], float, int]) -> None:
    _, _, filename, (cx, baseline), scale, angle = spec
    player = trim_alpha(Image.open(CUTOUTS_DIR / filename).convert("RGBA"))

    target_h = int(1080 * scale)
    target_w = int(player.width * (target_h / player.height))
    player = player.resize((target_w, target_h), Image.Resampling.LANCZOS)

    if angle:
        player = player.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)

    x = int(cx - player.width / 2)
    y = int(baseline - player.height)

    glow = Image.new("RGBA", player.size, (0, 0, 0, 0))
    glow.putalpha(player.getchannel("A"))
    glow = glow.filter(ImageFilter.GaussianBlur(34))
    glow = ImageChops.multiply(glow, Image.new("RGBA", player.size, (0, 225, 255, 120)))
    base.alpha_composite(glow, (x, y + 10))

    add_shadow(base, player, x, y)
    base.alpha_composite(player, (x, y))


def add_bottom_band(base: Image.Image) -> None:
    band = Image.new("RGBA", (WIDTH, 460), (4, 10, 16, 0))
    band_draw = ImageDraw.Draw(band, "RGBA")
    band_draw.rectangle((0, 130, WIDTH, 460), fill=(3, 10, 18, 220))
    band_draw.rectangle((0, 0, WIDTH, 180), fill=(3, 10, 18, 95))
    band = band.filter(ImageFilter.GaussianBlur(6))
    base.alpha_composite(band, (0, HEIGHT - 460))


def draw_text(base: Image.Image) -> None:
    draw = ImageDraw.Draw(base, "RGBA")

    title_font = load_font(220, bold=True)
    subtitle_font = load_font(58, bold=True)
    body_font = load_font(42, bold=False)
    small_font = load_font(34, bold=False)
    name_font = load_font(30, bold=True)

    draw.text((130, 96), "PPiP", font=title_font, fill=(245, 248, 255, 255))
    draw.text((130, 278), "SPRING EDITION", font=title_font, fill=(121, 232, 255, 255))
    draw.text((140, 470), "Split • Padel Club Dalmatia • 13. lipnja 2026.", font=subtitle_font, fill=(216, 255, 88, 255))
    draw.text((144, 544), "Turnirski flyer u esports stilu", font=body_font, fill=(221, 232, 241, 225))

    draw.text((140, HEIGHT - 330), "16 IGRAČA", font=subtitle_font, fill=(255, 255, 255, 255))
    draw.text((140, HEIGHT - 268), "Jedan roster. Jedan dan. Puna dalmatinska buka.", font=body_font, fill=(190, 206, 220, 240))

    name_positions = [
        (1360, HEIGHT - 355), (1360, HEIGHT - 312), (1360, HEIGHT - 269), (1360, HEIGHT - 226),
        (1760, HEIGHT - 355), (1760, HEIGHT - 312), (1760, HEIGHT - 269), (1760, HEIGHT - 226),
    ]
    labels = [
        "ZELE", "DRAGUN", "GUGA", "IVI",
        "JONI", "BOKI", "LOPO", "MARTI",
        "MARKAN", "MESO", "FRANK", "IJO",
        "RAJA", "SEP", "SOKO", "TOMA",
    ]
    for idx, label in enumerate(labels):
        x, y = name_positions[idx % 8]
        row_offset = 0 if idx < 8 else 86
        draw.text((x, y + row_offset), label, font=name_font, fill=(232, 239, 246, 235))

    draw.text((140, HEIGHT - 120), "PPiP 2026", font=small_font, fill=(143, 170, 192, 220))
    draw.text((WIDTH - 660, HEIGHT - 120), "Padel Club Dalmatia", font=small_font, fill=(143, 170, 192, 220))


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    base = make_gradient_background()
    base = add_background_effects(base)
    add_branding(base)
    add_title_zone(base)

    for spec in PLAYERS:
        paste_player(base, spec)

    add_bottom_band(base)
    draw_text(base)
    base.save(OUTPUT)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    build()
