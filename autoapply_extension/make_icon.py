"""Generate icon.png for the AutoApply Chrome extension.

Run once from the extension directory:
    python make_icon.py

Requires Pillow. Install with:
    pip install Pillow
"""

import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont


def make_icon(size: int = 128, path: str = "icon.png") -> None:
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded-rect background (indigo-to-violet gradient approximated as solid)
    r = size // 8
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(99, 102, 241, 255))

    # Draw a bold "A" centred on the icon
    font_size = int(size * 0.60)
    font = None
    for face in ("arialbd.ttf", "Arial Bold.ttf", "arial.ttf", "DejaVuSans-Bold.ttf", ""):
        try:
            font = ImageFont.truetype(face, font_size) if face else ImageFont.load_default()
            break
        except (IOError, OSError):
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "A"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    img.save(path)
    print(f"Saved {path}  ({size}x{size} px)")


if __name__ == "__main__":
    make_icon(128)
