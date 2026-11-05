"""Expose PALM's existing local crops, without generating or aligning new pixels."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'images/research-interactions'
source = Image.open(ROOT / 'images/palm_teaser.png')
panels = {
    'position': {'scene': (117, 228, 1201, 1307), 'local': (338, 787, 614, 1067)},
    'viewpoint': {'scene': (1240, 226, 2324, 1305), 'local': (1731, 866, 2018, 1153)},
    'robot': {'scene': (2361, 223, 3444, 1303), 'local': (3011, 882, 3288, 1158)},
}
for name, boxes in panels.items():
    for kind, box in boxes.items():
        crop = source.crop(box)
        if kind == 'scene':
            crop.save(OUT / f'palm-{name}-zoom.webp', quality=90)
            crop.thumbnail((432, 432), Image.Resampling.LANCZOS)
        crop.save(OUT / f'palm-{name}-{kind}.webp', lossless=True)
(OUT / 'palm-comparison-sources.json').write_text(json.dumps({
    'source': 'images/palm_teaser.png', 'panels': panels,
    'processing': 'Setting panels downsampled, with full-resolution copies for scroll zoom; local views cropped directly inside existing green boxes. No synthetic alignment or redrawing.',
}, indent=2) + '\n')
