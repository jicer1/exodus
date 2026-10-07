"""Build a geographic image pyramid; x wraps at the date line, y starts north."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'assets/earth-blue-marble-june-5400.jpg'
OUTPUT = ROOT / 'assets/earth-tiles'
SIZE, BORDER, MAX_LEVEL = 512, 2, 3


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        source = source.convert('RGB')
        source.resize((1024, 512), Image.Resampling.LANCZOS).save(OUTPUT / 'overview.jpg', quality=90)
        for level in range(MAX_LEVEL + 1):
            columns, rows = 2 ** (level + 1), 2 ** level
            image = source.resize((columns * SIZE, rows * SIZE), Image.Resampling.LANCZOS)
            for x in range(columns):
                folder = OUTPUT / str(level) / str(x)
                folder.mkdir(parents=True, exist_ok=True)
                for y in range(rows):
                    # Two extra pixels on each edge keep bilinear filtering seamless.
                    left, top = x * SIZE - BORDER, y * SIZE - BORDER
                    tile = Image.new('RGB', (SIZE + 2 * BORDER,) * 2)
                    for column in range(SIZE + 2 * BORDER):
                        sx = (left + column) % image.width
                        strip = image.crop((sx, max(0, top), sx + 1, min(image.height, top + tile.height)))
                        offset = max(0, -top)
                        tile.paste(strip, (column, offset))
                        if offset:
                            tile.paste(image.crop((sx, 0, sx + 1, 1)).resize((1, offset)), (column, 0))
                        bottom = top + tile.height - image.height
                        if bottom > 0:
                            tile.paste(image.crop((sx, image.height - 1, sx + 1, image.height)).resize((1, bottom)),
                                       (column, tile.height - bottom))
                    tile.save(folder / f'{y}.jpg', quality=92, subsampling=0)
        (OUTPUT / 'manifest.json').write_text(json.dumps({
            'projection': 'geographic', 'origin': 'north-west', 'tileSize': SIZE,
            'border': BORDER, 'maxLevel': MAX_LEVEL, 'source': SOURCE.name,
            'sourceWidth': source.width, 'sourceHeight': source.height,
            'note': 'Existing Blue Marble image, no additional source detail.'
        }, indent=2), encoding='utf-8')
    print('170 geographic tiles and overview generated.')


if __name__ == '__main__':
    main()
