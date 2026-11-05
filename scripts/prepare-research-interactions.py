"""Extract recorded scientific images without changing their contents.

Run with the bundled Python environment (Pillow).
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'images/research-interactions'
OUT.mkdir(exist_ok=True)
FOCUS = Path('/Users/zheyu/Desktop/FocusPool_CoRL_2026/figs/real/activation_coffee_focuspool.png')

def strip(frames, name):
    width, height = frames[0].size
    assert all(im.size == (width, height) for im in frames)
    canvas = Image.new('RGB', (width * len(frames), height))
    for index, frame in enumerate(frames):
        canvas.paste(frame, (index * width, 0))
    canvas.save(OUT / name, lossless=True, format='WEBP', method=6)
    decoded = Image.open(OUT / name).convert('RGB')
    assert decoded.tobytes() == canvas.tobytes()

# Six 256px snapshots separated by 16px white gutters in the supplied montage.
focus = Image.open(FOCUS).convert('RGB')
assert focus.size == (1616, 256)
strip([focus.crop((i * 272, 0, i * 272 + 256, 256)) for i in range(6)], 'focuspool-attention.webp')
(OUT / 'sources.json').write_text(json.dumps({
    'focuspool': {'source': str(FOCUS), 'frames': 6, 'description': 'Recorded real-robot Coffee Transport attention overlays, left to right.'},
    'processing': 'Original pixels extracted into lossless WebP strips; no redrawing or generated attention.'
}, indent=2) + '\n')
print('Prepared 6 FocusPool snapshots; lossless pixels verified.')
