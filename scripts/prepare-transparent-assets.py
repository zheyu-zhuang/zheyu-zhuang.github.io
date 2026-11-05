"""Remove figure mattes without regenerating scientific content.

Originals stay in images/. Protected rectangles are in original pixel coordinates,
right/bottom exclusive. Lossless WebP keeps animation timing and loop settings.
"""
from pathlib import Path
import gc
import json
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'images/transparent'
SPECS = {
    'focuspool-teaser.png': {
        'photos': [(302,228,589,517), (847,222,1135,510), (1207,222,1495,510), (1567,222,1855,510), (1930,222,2218,510), (50,885,338,1175), (393,885,681,1175), (736,888,1024,1175), (1145,886,1434,1175), (1547,887,1835,1175), (1958,888,2247,1175), (2365,888,2653,1175)],
        'label_exclusions': [(665,132,2359,572), (0,660,2710,1236)],
    },
    'palm_teaser.png': {
        'photos': [(117,228,1201,1307), (1240,226,2324,1305), (2361,223,3444,1303), (119,1671,1558,3137), (2014,1668,3474,3143)],
        'gray_matte': True,
    },
    'task_aware_2.png': {
        'photos': [(190,103,1693,605), (190,610,1693,1113)],
        'label_exclusions': [(688,0,1775,1184)],
    },
    'robot-centric-pooling.png': {
        'photos': [(37,26,476,466), (543,41,968,466), (1035,41,1460,466), (37,603,462,1028), (536,603,961,1028), (1035,603,1460,1028)],
    },
    'seeker.gif': {'photos': [(218,168,515,463), (565,168,862,463)]},
    'robosaga.gif': {'photos': [(230,123,415,452), (447,123,633,452), (665,123,850,452)]},
    'mirrorduo.gif': {'photos': [(134,235,508,445), (581,235,955,445)]},
}


def mask_boxes(shape, boxes):
    mask = np.zeros(shape, dtype=bool)
    for x0, y0, x1, y1 in boxes:
        mask[y0:y1, x0:x1] = True
    return mask


def process(frame, spec, dark=False):
    original = np.array(frame.convert('RGBA'))
    a = original.copy()
    protected = mask_boxes(a.shape[:2], spec['photos'])
    rgb = a[:, :, :3].astype(np.int16)
    low, high = rgb.min(axis=2), rgb.max(axis=2)
    neutral = (high - low) <= 3
    white = neutral & (low >= 250) & ~protected
    a[white, 3] = 0
    # Unmatte antialiased edges near white; do not touch photo/heatmap pixels.
    near = np.array(Image.fromarray(white.astype('uint8') * 255).filter(ImageFilter.MaxFilter(5))) > 0
    edge = near & neutral & ~protected & ~white
    a[edge, 3] = np.minimum(a[edge, 3], 255 - low[edge]).astype('uint8')
    a[edge, :3] = 0
    if spec.get('gray_matte'):
        # PALM's outer and panel mattes have different pre-existing alpha values.
        gray = neutral & ~protected
        base = np.where(original[:, :, 3] < 180, 228, 208)
        coverage = np.clip(1 - low / base, 0, 1)
        a[gray, 3] = np.rint(255 * coverage[gray]).astype('uint8')
        a[gray, :3] = 0
    if dark:
        excluded = protected | mask_boxes(a.shape[:2], spec.get('label_exclusions', []))
        labels = ((high - low) <= 16) & ~excluded & (a[:, :, 3] > 0) & (a[:, :, :3].max(axis=2) < 180)
        a[labels, :3] = (246, 242, 229)
    assert np.array_equal(a[protected], original[protected]), 'Scientific pixels changed'
    return Image.fromarray(a)


def main():
    OUT.mkdir(exist_ok=True)
    report = []
    for name, spec in SPECS.items():
        source = ROOT / 'images' / name
        for dark in (False, True):
            src = Image.open(source)
            animated = getattr(src, 'n_frames', 1) > 1
            target = OUT / (source.stem + ('-dark' if dark else '') + ('.webp' if animated else '.png'))
            frames, durations = [], []
            reuse = '--resume' in sys.argv and target.exists()
            first_original = None
            protected = mask_boxes((src.height, src.width), spec['photos'])
            for i in range(getattr(src, 'n_frames', 1)):
                src.seek(i)
                durations.append(src.info.get('duration', 0))
                if reuse:
                    continue
                original = np.array(src.convert('RGBA'))
                if first_original is not None and np.array_equal(original[~protected], first_original[~protected]):
                    result = first_processed.copy()
                    result[protected] = original[protected]
                    frames.append(Image.fromarray(result))
                else:
                    frames.append(process(src, spec, dark))
                if first_original is None:
                    first_original = original
                    first_processed = np.array(frames[0])
            if animated and not reuse:
                frames[0].save(target, save_all=True, append_images=frames[1:], duration=durations,
                               loop=src.info.get('loop', 0), lossless=True, quality=100, method=0, minimize_size=False)
            elif not reuse:
                frames[0].save(target, optimize=True)
            check = Image.open(target)
            assert check.size == src.size
            # WebP coalesces identical adjacent frames; the playback timeline must match.
            if animated:
                output_duration = 0
                for i in range(check.n_frames):
                    check.seek(i)
                    check.load()
                    output_duration += check.info['duration']
                assert output_duration == sum(durations)
                assert check.info['loop'] == src.info.get('loop', 0)
            report.append({'source': name, 'output': target.name, 'source_frames': len(durations),
                           'output_frames': getattr(check, 'n_frames', 1),
                           'duration_ms': sum(durations), 'bytes': target.stat().st_size,
                           'protected_pixels_verified': True})
            print(json.dumps(report[-1]), flush=True)
            del frames
            src.close()
            check.close()
            gc.collect()
    (OUT / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
