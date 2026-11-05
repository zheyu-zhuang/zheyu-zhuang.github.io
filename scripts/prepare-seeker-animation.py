"""Keep the recorded Seeker GIF sequence in a compact, pausable web format."""
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'images/seeker.gif'
OUT = ROOT / 'images/research-interactions'
OUT.mkdir(exist_ok=True)
# Trim the outer white row and column, using even dimensions for H.264.
subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-i', str(SOURCE),
    '-vf', 'crop=296:294:218:168', '-an', '-c:v', 'libx264', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'seeker-zoom.mp4')
], check=True)
Image.open(SOURCE).convert('RGB').crop((218, 168, 514, 462)).save(
    OUT / 'seeker-zoom-poster.webp', lossless=True)
