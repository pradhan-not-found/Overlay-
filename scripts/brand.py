"""Builds every Overlay logo file from scripts/mark-source.png (the white hexagon mark).

Run: python scripts/brand.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLUE = (0, 39, 196)

mark = Image.open(os.path.join(ROOT, 'scripts', 'mark-source.png')).convert('RGBA')
alpha = mark.split()[3]
white = Image.new('RGBA', mark.size, (255, 255, 255, 255))
white.putalpha(alpha)
white = white.crop(alpha.getbbox())


def tile(size, scale=0.56, radius=0.225, rounded=True):
    img = Image.new('RGBA', (size, size), BLUE + (255,))
    w = int(size * scale)
    h = int(white.height * w / white.width)
    m = white.resize((w, h), Image.LANCZOS)
    img.alpha_composite(m, ((size - w) // 2, (size - h) // 2))
    if rounded:
        big = size * 4
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * radius), fill=255)
        img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


icon = tile(1024)
icon.save(os.path.join(ROOT, 'build', 'icon.png'))
tile(512).save(os.path.join(ROOT, 'applogo.png'))
tile(512).save(os.path.join(ROOT, 'public', 'applogo.png'))
tile(1254, scale=0.46, rounded=False).save(os.path.join(ROOT, 'app.png'))
tile(256).save(os.path.join(ROOT, 'build', 'icon.ico'), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
# Tray: tighter mark so it reads at 16px.
tile(64, scale=0.7, radius=0.24).save(os.path.join(ROOT, 'electron', 'tray.png'))
# Bare white mark for use on dark surfaces in the UI.
white.save(os.path.join(ROOT, 'public', 'mark.png'))
print('logos written')
