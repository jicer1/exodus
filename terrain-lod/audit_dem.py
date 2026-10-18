"""Read-only coverage audit of the existing native DEM tiles."""
import array
import gzip
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parent.parent
base = root / 'assets' / 'marcheur_tiles'
manifest = json.loads((base / 'manifest.json').read_text())
total = invalid = affected = empty = 0
details = []
for tile in manifest['tiles']:
    values = array.array('f', gzip.decompress((base / tile['elevationFile']).read_bytes()))
    assert len(values) == tile['width'] * tile['height']
    count = sum(not math.isfinite(v) or v < -1000 or v > 10000 for v in values)
    total += len(values)
    invalid += count
    affected += bool(count)
    empty += count == len(values)
    if count:
        details.append({'row': tile['row'], 'col': tile['col'], 'invalidSamples': count})
report = {'totalSamples': total, 'invalidSamples': invalid, 'invalidPercent': invalid / total * 100,
          'totalTiles': len(manifest['tiles']), 'affectedTiles': affected, 'entirelyInvalidTiles': empty,
          'affected': details,
          'note': 'Coverage of rectangular extent; missing samples may be outside the actual surveyed footprint. Do not invent elevations.'}
(root / 'terrain-lod' / 'dem-coverage.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'affected'}, indent=2))
