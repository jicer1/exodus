"""Distinguish outside-footprint NoData from enclosed gaps (4-connectivity)."""
import gzip
import json
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
base = root / 'assets/marcheur_tiles'
m = json.loads((base / 'manifest.json').read_text())
invalid = np.zeros((m['height'], m['width']), dtype=bool)
for t in m['tiles']:
    a = np.frombuffer(gzip.decompress((base / t['elevationFile']).read_bytes()), dtype='<f4').reshape(t['height'], t['width'])
    invalid[t['rowOffset']:t['rowOffset']+t['height'], t['colOffset']:t['colOffset']+t['width']] = ~np.isfinite(a) | (a < -1000) | (a > 10000)

parent, counts, exterior, rows = [], [], [], []
def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i
def merge(a, b):
    a, b = find(a), find(b)
    if a != b:
        parent[b] = a
        counts[a] += counts[b]
        exterior[a] |= exterior[b]
previous = []
for y, row in enumerate(invalid):
    changes = np.diff(np.pad(row.astype(np.int8), (1, 1)))
    starts, stops = np.flatnonzero(changes == 1), np.flatnonzero(changes == -1)
    current = []
    for start, stop in zip(starts, stops):
        i = len(parent)
        parent.append(i); counts.append(int(stop-start))
        exterior.append(y in (0, m['height']-1) or start == 0 or stop == m['width'])
        current.append((int(start), int(stop), i))
        for a, b, j in previous:
            if start < b and stop > a:
                merge(i, j)
    rows.append(current)
    previous = current
components = [i for i in range(len(parent)) if find(i) == i]
internal = [i for i in components if not exterior[i]]
report = {'invalidSamples': int(invalid.sum()),
          'exteriorConnectedSamples': sum(counts[i] for i in components if exterior[i]),
          'enclosedInvalidSamples': sum(counts[i] for i in internal),
          'enclosedComponents': len(internal), 'connectivity': 4}
(root / 'terrain-lod' / 'footprint-results.json').write_text(json.dumps(report, indent=2))
rgb = np.full((*invalid.shape, 3), (62, 134, 99), dtype=np.uint8)
rgb[invalid] = (228, 230, 233)
for y, runs in enumerate(rows):
    for start, stop, i in runs:
        if not exterior[find(i)]:
            rgb[y, start:stop] = (220, 55, 55)
Image.fromarray(rgb).resize((702, 666), Image.Resampling.NEAREST).save(root / 'terrain-lod' / 'footprint.png')
print(json.dumps(report, indent=2))
