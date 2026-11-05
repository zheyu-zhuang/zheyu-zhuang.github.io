"""Prepare the three Seeker uses from supplied paper figures, without redrawing."""
from pathlib import Path
import json
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageOps
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'images/research-interactions'
SOURCE = Path('/Users/zheyu/Desktop/corl_2026_seeker/figures')
OUT.mkdir(exist_ok=True)

def images(name):
    return {im.name: im.image.convert('RGB') for im in PdfReader(SOURCE / name).pages[0].images}

def save(im, name):
    im.save(OUT / name, 'WEBP', lossless=True, method=6)

zoom = images('coffee_temporal.pdf')
save(zoom['Im25.png'], 'seeker-zoom-scene.webp')
save(zoom['Im3.png'], 'seeker-zoom-crop.webp')

# Preserve the paper's clipped montage region exactly as rendered.
with tempfile.TemporaryDirectory() as tmp:
    target = Path(tmp) / 'augmentation'
    subprocess.run(['pdftoppm', '-scale-to', '1600', '-png', '-singlefile',
                    str(SOURCE / 'augmented_samples_and_eval_envs.pdf'), str(target)], check=True)
    rendered = Image.open(str(target) + '.png').convert('RGBA')
    assert rendered.size == (1198, 1600), rendered.size
    strip = rendered.crop((0, 100, rendered.width, 460))
    pixels = np.array(strip)
    pixels[:, :, 3][np.all(pixels[:, :, :3] == 255, axis=2)] = 0
    save(Image.fromarray(pixels), 'seeker-guided-augmentation.webp')
aug = images('augmented_samples_and_eval_envs.pdf')
save(aug['Im2.png'], 'seeker-eval-square.webp')
save(aug['Im1.png'], 'seeker-eval-stack.webp')

clouds = images('seeker_pointcloud_crop.pdf')
for source, name in [('Im10.png', 'workspace'), ('Im9.png', 'filtered')]:
    rgb = np.array(clouds[source])
    ink = np.any(rgb < 250, axis=2)
    ys, xs = np.where(ink)
    cropped = clouds[source].crop((max(0, xs.min()-16), max(0, ys.min()-16),
                                   min(640, xs.max()+17), min(640, ys.max()+17)))
    canvas = ImageOps.pad(cropped, (320, 320), color='white')
    rgba = np.array(canvas.convert('RGBA'))
    # Unmatte neutral points: their original contrast becomes alpha, avoiding
    # white or black edge halos on either page background. Keep colored points.
    neutral = np.ptp(rgba[:, :, :3].astype(int), axis=2) < 12
    contrast = 255 - rgba[:, :, :3].mean(axis=2).round().astype('uint8')
    rgba[:, :, 3][neutral] = contrast[neutral]
    rgba[:, :, :3][neutral] = 0
    save(Image.fromarray(rgba), f'seeker-cloud-{name}.webp')
    dark = rgba.copy()
    dark[:, :, :3][neutral] = [246, 242, 229]
    save(Image.fromarray(dark), f'seeker-cloud-{name}-dark.webp')

(OUT / 'seeker-cases-sources.json').write_text(json.dumps({
    'zoom': 'coffee_temporal.pdf: first recorded scene (Im25) and corresponding ROI crop (Im3)',
    'augmentation': 'augmented_samples_and_eval_envs.pdf: guided third-person training examples and two evaluation environments',
    'point_cloud': 'seeker_pointcloud_crop.pdf: Coffee Preparation, workspace crop (Im10) and workspace + Seeker (Im9)',
    'processing': 'Extracted original images; point clouds trimmed and independently scaled as in the paper. White matte removed and neutral points adapted for dark mode. No generated content.'
}, indent=2) + '\n')
print('Prepared three source-backed Seeker cases.')
