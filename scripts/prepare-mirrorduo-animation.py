"""Extract the two recorded rollouts without mirroring or redrawing either one."""
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'images/mirrorduo.gif'
OUT = ROOT / 'images/research-interactions'
OUT.mkdir(exist_ok=True)
subprocess.run([
    'ffmpeg', '-v', 'error', '-y', '-i', str(SOURCE),
    '-filter_complex',
    '[0:v]split[a][b];[a]crop=374:210:134:235:exact=1,pad=422:210:0:0[left];'
    '[b]crop=374:210:581:235:exact=1[right];[left][right]hstack[out]',
    '-map', '[out]', '-an', '-c:v', 'libx264', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    str(OUT / 'mirrorduo-rollouts.mp4')
], check=True)
frame = Image.open(SOURCE).convert('RGB')
poster = Image.new('RGB', (796, 210))
poster.paste(frame.crop((134, 235, 508, 445)), (0, 0))
poster.paste(frame.crop((581, 235, 955, 445)), (422, 0))
poster.save(OUT / 'mirrorduo-rollouts-poster.webp', lossless=True)
