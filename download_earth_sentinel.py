"""Download a bounded EOX 2016 pilot region and create a local image pyramid."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from io import BytesIO
import json
import math
import time
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'assets/earth-sentinel'
LEVEL, SIZE, BORDER = 13, 256, 2
LAT, LON = 40.827897, -2.288334
SPAN = 180 / 2 ** LEVEL
X0 = math.floor((LON + 180) / SPAN) - 3
Y0 = math.floor((90 - LAT) / SPAN) - 3
TEMPLATE = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless/default/WGS84/13/{y}/{x}.jpg'


def download(pair):
    x, y = pair
    target = OUTPUT / 'originals' / f'{x}_{y}.jpg'
    if not target.exists():
        for attempt in range(3):
            try:
                request = urllib.request.Request(TEMPLATE.format(x=x, y=y),
                                                headers={'User-Agent': 'Exodus-image-pilot/1.0'})
                with urllib.request.urlopen(request, timeout=30) as response:
                    data = response.read()
                with Image.open(BytesIO(data)) as image:
                    assert image.size == (SIZE, SIZE), 'Unexpected EOX tile dimensions'
                    image.verify()
                target.write_bytes(data)
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
    return x, y, target


def main():
    (OUTPUT / 'originals').mkdir(parents=True, exist_ok=True)
    mosaic = Image.new('RGB', (SIZE * 10, SIZE * 10))
    pairs = [(x, y) for y in range(Y0 - 1, Y0 + 9) for x in range(X0 - 1, X0 + 9)]
    with ThreadPoolExecutor(max_workers=2) as pool:
        for count, (x, y, file) in enumerate(pool.map(download, pairs), 1):
            with Image.open(file) as image:
                mosaic.paste(image, ((x - X0 + 1) * SIZE, (y - Y0 + 1) * SIZE))
            if count % 10 == 0:
                print(f'Downloaded {count}/100', flush=True)
    for z in range(4):
        side = 2 ** z
        width = SIZE * side
        # Keep real neighbouring pixels for all border samples, at every level.
        image = mosaic.resize((width * 10 // 8, width * 10 // 8), Image.Resampling.LANCZOS)
        offset = width // 8
        for x in range(side):
            folder = OUTPUT / str(z) / str(x)
            folder.mkdir(parents=True, exist_ok=True)
            for y in range(side):
                left, top = offset + x * SIZE, offset + y * SIZE
                image.crop((left - BORDER, top - BORDER, left + SIZE + BORDER,
                            top + SIZE + BORDER)).save(folder / f'{y}.jpg', quality=95, subsampling=0)
    region = {'id': 'sentinel2016-huerta', 'path': 'assets/earth-sentinel',
              'west': -180 + X0 * SPAN, 'north': 90 - Y0 * SPAN, 'span': 8 * SPAN,
              'maxLevel': 3, 'tileSize': SIZE, 'border': BORDER,
              'source': 'EOX Sentinel-2 cloudless 2016', 'licence': 'CC BY 4.0',
              'credit': 'Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH '
                        '(Contains modified Copernicus Sentinel data 2016 & 2017)',
              'sourceTemplate': TEMPLATE, 'sourceLevel': LEVEL, 'sourceTileOrigin': [X0, Y0]}
    (OUTPUT / 'manifest.json').write_text(json.dumps(region, indent=2), encoding='utf-8')
    (OUTPUT / 'sources.js').write_text('window.ExodusImageRegions = ' + json.dumps([region]) + ';\n', encoding='utf-8')
    print('Ready: 85 local image tiles, 4 levels, EOX 2016 pilot region.', flush=True)


if __name__ == '__main__':
    main()
