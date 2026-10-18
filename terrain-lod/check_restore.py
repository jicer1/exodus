"""Dry-run restoration to a temporary directory; never overwrites the application."""
import hashlib
import json
from pathlib import Path
import tempfile
import zipfile
from secure import ROOT, DEST, digest

manifest = json.loads((DEST / 'manifest.json').read_text(encoding='utf-8'))
with tempfile.TemporaryDirectory(prefix='exodus-restore-') as temp:
    with zipfile.ZipFile(DEST / 'working-copy.zip') as archive:
        archive.extractall(temp)
    for name, record in manifest['archived'].items():
        assert digest(Path(temp) / name) == record['sha256'], name
        assert digest(ROOT / name) == record['sha256'], 'Original changed: ' + name
for name, record in manifest['shared_unchanged_originals'].items():
    assert digest(ROOT / name) == record['sha256'], 'Shared original changed: ' + name
print('Restoration dry-run passed; all original application files and shared assets unchanged.')
