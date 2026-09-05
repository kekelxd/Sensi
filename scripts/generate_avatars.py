"""Generate deterministic XENSI avatar assets from the original photocards.

The source artwork is not a regular sprite grid. Each crop below was measured
individually so a generated file never includes pixels from a neighboring pose.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "avatars"
OUTPUT_DIR = SOURCE_DIR / "individual"
OUTPUT_SIZE = 512
CONTENT_SIZE = 472
BACKGROUND = (7, 7, 8)

# (source filename, left, top, right, bottom)
CROPS = {
    "cat-happy": ("xensi-cats.png", 470, 35, 830, 467),
    "cat-playful": ("xensi-cats.png", 845, 95, 1254, 460),
    "cat-sleeping": ("xensi-cats.png", 20, 485, 415, 815),
    "cat-box": ("xensi-cats.png", 445, 475, 838, 852),
    "cat-wave": ("xensi-cats.png", 842, 450, 1254, 848),
    "cat-headset": ("xensi-cats.png", 28, 820, 415, 1210),
    "cat-back": ("xensi-cats.png", 470, 835, 805, 1215),
    "cat-relaxed": ("xensi-cats.png", 820, 895, 1254, 1225),
    "dog-peeking": ("xensi-dogs.png", 820, 45, 1245, 375),
    "dog-happy": ("xensi-dogs.png", 815, 385, 1245, 780),
    "dog-headset": ("xensi-dogs.png", 25, 795, 425, 1200),
    "dog-sleeping": ("xensi-dogs.png", 410, 850, 855, 1200),
    "dog-sitting": ("xensi-dogs.png", 845, 780, 1215, 1205),
    "hamster-gaming": ("xensi-hamsters.png", 475, 85, 835, 455),
    "hamster-looking": ("xensi-hamsters.png", 900, 85, 1235, 455),
    "hamster-sleeping": ("xensi-hamsters.png", 20, 465, 420, 800),
    "hamster-box": ("xensi-hamsters.png", 440, 470, 845, 820),
    "hamster-snack": ("xensi-hamsters.png", 905, 475, 1235, 820),
    "hamster-laptop": ("xensi-hamsters.png", 20, 835, 445, 1190),
    "hamster-focused": ("xensi-hamsters.png", 475, 830, 825, 1195),
    "hamster-happy": ("xensi-hamsters.png", 885, 850, 1240, 1190),
}


def normalized_avatar(source: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    crop = source.crop(box)
    scale = min(CONTENT_SIZE / crop.width, CONTENT_SIZE / crop.height)
    size = (round(crop.width * scale), round(crop.height * scale))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (OUTPUT_SIZE, OUTPUT_SIZE), BACKGROUND)
    position = ((OUTPUT_SIZE - crop.width) // 2, (OUTPUT_SIZE - crop.height) // 2)
    canvas.paste(crop, position)
    return canvas


def build_contact_sheet(images: list[tuple[str, Image.Image]]) -> Image.Image:
    columns = 7
    cell = 176
    label_height = 28
    rows = (len(images) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell, rows * (cell + label_height)), (11, 12, 15))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (avatar_id, avatar) in enumerate(images):
        column = index % columns
        row = index // columns
        x = column * cell
        y = row * (cell + label_height)
        preview = avatar.resize((cell, cell), Image.Resampling.LANCZOS)
        sheet.paste(preview, (x, y))
        draw.text((x + 8, y + cell + 7), avatar_id, fill=(234, 232, 226), font=font)
    return sheet


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sources: dict[str, Image.Image] = {}
    generated: list[tuple[str, Image.Image]] = []
    for avatar_id, (filename, *coordinates) in CROPS.items():
        source = sources.setdefault(filename, Image.open(SOURCE_DIR / filename).convert("RGB"))
        avatar = normalized_avatar(source, tuple(coordinates))
        avatar.save(OUTPUT_DIR / f"{avatar_id}.png", optimize=True)
        generated.append((avatar_id, avatar))
    build_contact_sheet(generated).save(SOURCE_DIR / "avatar-contact-sheet.png", optimize=True)
    print(f"Generated {len(generated)} avatars at {OUTPUT_SIZE}x{OUTPUT_SIZE}")


if __name__ == "__main__":
    main()
