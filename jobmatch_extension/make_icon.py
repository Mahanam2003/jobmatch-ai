"""
Run this once before loading the extension:
    python make_icon.py

Generates icon.png — a 128x128 indigo square — using only Python stdlib.
No Pillow required.
"""
import struct
import zlib
from pathlib import Path


def make_solid_png(width: int, height: int, r: int, g: int, b: int) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))

    # Each scanline: 1 filter byte (0 = None) + RGB * width
    scanline = bytes([0]) + bytes([r, g, b] * width)
    idat = chunk(b'IDAT', zlib.compress(scanline * height, level=9))
    iend = chunk(b'IEND', b'')

    return signature + ihdr + idat + iend


if __name__ == '__main__':
    out = Path(__file__).parent / 'icon.png'
    # Indigo-500 (#6366f1) — matches the extension's accent colour
    png = make_solid_png(128, 128, 99, 102, 241)
    out.write_bytes(png)
    print(f'Created {out}  ({len(png)} bytes)')
