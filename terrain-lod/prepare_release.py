"""Prepare the local external-server copy and a delta; never upload anything.

The 1.0.15 source entry and version remain untouched. Run without --apply for
a read-only comparison against the current Serveur_externe copy.
"""
import argparse
import hashlib
import json
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT.parent / 'Serveur_externe'
VERSION = '2.0.1'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1048576), b''):
            h.update(block)
    return h.hexdigest()


def data(text):
    return text.encode('utf-8')


def payloads():
    # Reuse the established file list/exclusions without its version mutation.
    entries = runpy.run_path(str(ROOT / 'preparer_mise_a_jour.py'))['ENTRIES']
    result = {}
    for entry in entries:
        source = ROOT / entry
        if not source.exists():
            raise FileNotFoundError(source)
        for path in ([source] if source.is_file() else sorted(p for p in source.rglob('*') if p.is_file())):
            name = path.relative_to(ROOT).as_posix()
            if name == 'assets/Huerta_Satellite_1956_57_avant_recalage.jpg' or name.startswith('assets/pnoa2021_test/'):
                continue
            result[name] = path
    for name in ['integration.js', 'worker.js', 'geometry.js', 'dem-coverage.json',
                 'verify-lod.js', 'verify-panorama.js', 'ravine-preview.js']:
        result['terrain-lod/' + name] = ROOT / 'terrain-lod' / name
    index = (ROOT / 'index-lod.html').read_text(encoding='utf-8')
    index = index.replace('Développement LOD', 'Terrain 3D').replace(' · Développement', '')
    index = re.sub(r'([?&]v=)[^"\']+', r'\g<1>' + VERSION, index)
    result['index.html'] = data(index)
    result['index-lod.html'] = data(index)
    result['index-1.0.15.html'] = ROOT / 'index.html'
    result['version.json'] = data(json.dumps({'version': VERSION}, indent=2) + '\n')
    zone = (ROOT / 'zone.html').read_text(encoding='utf-8')
    result['zone.html'] = data(re.sub(r'([?&]v=)[^"\']+', r'\g<1>' + VERSION, zone))
    worker = (ROOT / 'exodus-sw.js').read_text(encoding='utf-8')
    result['exodus-sw.js'] = data(re.sub(r'(var EXODUS_VERSION = ")[^"]+(";)', r'\g<1>' + VERSION + r'\2', worker))
    integration = (ROOT / 'terrain-lod/integration.js').read_text(encoding='utf-8')
    result['terrain-lod/integration.js'] = data(integration.replace("version:'2.0.1-development'", "version:'2.0.1'"))
    result['terrain-lod/version.json'] = data(json.dumps({'version': VERSION, 'status': 'prepared-for-manual-transfer',
                                                        'entry': '../index.html', 'legacyEntry': '../index-1.0.15.html'}, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    for name in ['integration-results.json', 'integration-economy-results.json']:
        report = json.loads((ROOT / 'terrain-lod' / name).read_text(encoding='utf-8'))
        if report.get('status') != 'passed' or not all(row['ok'] for row in report['results']):
            raise RuntimeError('Integration checks have not passed: ' + name)
    files = payloads()
    records, changed = [], []
    for name, source in sorted(files.items()):
        sha = hashlib.sha256(source).hexdigest() if isinstance(source, bytes) else digest(source)
        size = len(source) if isinstance(source, bytes) else source.stat().st_size
        records.append({'file': name, 'bytes': size, 'sha256': sha})
        target = OUTPUT / name
        if not target.is_file() or digest(target) != sha:
            changed.append(name)
    package = OUTPUT / ('MAJ_' + VERSION)
    print(json.dumps({'version': VERSION, 'filesVerified': len(records), 'deltaFiles': len(changed),
                      'deltaBytes': sum(r['bytes'] for r in records if r['file'] in changed), 'files': changed}, ensure_ascii=False))
    if not args.apply:
        return
    if package.exists():
        raise FileExistsError('Existing release package is preserved: ' + str(package))
    # A light, exact pre-update snapshot includes only files about to be replaced
    # plus transfer metadata. Unchanged heavy assets are never duplicated.
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup = ROOT.parent / 'Sauvegarde' / ('serveur-avant-' + VERSION + '-' + stamp + '.zip')
    backup.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(backup, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(set(changed + ['manifest-courant.json', 'MISE_A_JOUR_SERVEUR.txt'])):
            old = OUTPUT / name
            if old.is_file():
                archive.write(old, name)
        archive.writestr('NOUVEAUX_FICHIERS.json', json.dumps([n for n in changed if not (OUTPUT / n).exists()], indent=2))
    package.mkdir(parents=True)
    for name in changed:
        source, target = files[name], OUTPUT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(source, bytes):
            target.write_bytes(source)
        else:
            shutil.copy2(source, target)
        destination = package / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, destination)
    for record in records:
        if digest(OUTPUT / record['file']) != record['sha256']:
            raise RuntimeError('Copy verification failed: ' + record['file'])
    manifest = {'version': VERSION, 'preparedAt': datetime.now().isoformat(timespec='seconds'), 'files': records}
    (OUTPUT / 'manifest-courant.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    instructions = '\n'.join([
        'EXODUS — MISE À JOUR ' + VERSION, '',
        'Préparée le ' + datetime.now().strftime('%d/%m/%Y à %H:%M'),
        'Copier le CONTENU de MAJ_' + VERSION + ' dans le dossier exodus du serveur externe.',
        'Conserver les sous-dossiers et remplacer les fichiers existants.',
        'Ne pas envoyer le dossier MAJ_' + VERSION + ' lui-même, ni ce document TRANSFERT.txt.',
        'Cette mise à jour complète la copie serveur 1.0.15 déjà installée.', '',
        'Terrain géométrique local à 2 m ; détails stables pendant les rotations.',
        'Petit recul près du sol : conservation des détails prêts, sans reconstruction.',
        'Vue générale conservée ; aucun changement des algorithmes du Marcheur.',
        'Entrée principale : index.html. Référence accessible : index-1.0.15.html.', '',
        'FICHIERS À COPIER :', *changed, '',
        'Les images et MNT inchangés ne sont pas inclus dans ce delta.',
        'Servir les .f32.gz comme fichiers binaires sans Content-Encoding gzip ajouté.',
        'Après transfert : Ctrl+F5, vérifier Version ' + VERSION + ', zoom, rotation et Marcheur.',
        'Contrôles complets optionnels : index.html?verify=1 (59 contrôles).',
        'Aucun transfert automatique ni publication effectués.',
        'Sauvegarde locale précédente : ' + str(backup), ''
    ])
    for path in [package / 'TRANSFERT.txt', OUTPUT / ('TRANSFERT_RECENT_' + VERSION + '.txt'), OUTPUT / 'MISE_A_JOUR_SERVEUR.txt']:
        path.write_text(instructions, encoding='utf-8')
    delta = [r for r in records if r['file'] in changed]
    (package / 'manifest-maj.json').write_text(json.dumps({'version': VERSION, 'files': delta}, indent=2), encoding='utf-8')
    archive_path = OUTPUT / ('MAJ_' + VERSION + '.zip')
    with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(p for p in package.rglob('*') if p.is_file()):
            archive.write(path, path.relative_to(package).as_posix())
    print(json.dumps({'prepared': str(package), 'zip': str(archive_path), 'backup': str(backup),
                      'zipBytes': archive_path.stat().st_size, 'remoteTransfer': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
