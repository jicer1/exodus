"""Lightweight exact working-copy checkpoint; originals remain in place."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT.parent / 'Sauvegarde' / 'exodus-1.0.15-before-lod'

def digest(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def main():
    if DEST.exists():
        raise SystemExit('Checkpoint already exists; refusing overwrite')
    DEST.mkdir(parents=True)
    files = [p for p in ROOT.rglob('*') if p.is_file() and
             not any(x in {'.git', 'Sauvegarde', 'terrain-lod', '__pycache__'} for x in p.relative_to(ROOT).parts)]
    shared, archived = {}, {}
    with zipfile.ZipFile(DEST / 'working-copy.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files:
            name = p.relative_to(ROOT).as_posix()
            record = {'bytes': p.stat().st_size, 'sha256': digest(p)}
            if name.startswith(('assets/', 'vendor/')):
                shared[name] = record
            else:
                archived[name] = record
                z.write(p, name)
    for args, name in [(['status', '--porcelain'], 'git-status.txt'),
                       (['diff', '--binary', 'HEAD'], 'working-tree.patch'),
                       (['rev-parse', 'HEAD'], 'git-head.txt')]:
        result = subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, check=True)
        (DEST / name).write_bytes(result.stdout)
    # Verify archive contents by hash, not merely by presence in the manifest.
    with zipfile.ZipFile(DEST / 'working-copy.zip') as z:
        assert z.testzip() is None
        for name, record in archived.items():
            assert hashlib.sha256(z.read(name)).hexdigest() == record['sha256']
    report = {'version': '1.0.15', 'root': str(ROOT), 'archived': archived,
              'shared_unchanged_originals': shared,
              'shared_bytes': sum(r['bytes'] for r in shared.values()),
              'archive_bytes': (DEST / 'working-copy.zip').stat().st_size,
              'free_bytes': shutil.disk_usage(ROOT).free,
              'verification': 'Archive extracted in memory and SHA256 matched; originals hashed in place.'}
    (DEST / 'manifest.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k not in ('archived', 'shared_unchanged_originals')}, indent=2))

if __name__ == '__main__':
    main()
