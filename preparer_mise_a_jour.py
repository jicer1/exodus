"""Synchronise la copie web et conserve un rapport cumulatif pour le transfert manuel."""
import argparse
import hashlib
import json
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / 'Serveur_externe'
ENTRIES = ['CREDITS.txt', 'LISEZMOI.txt', 'index.html', 'zone.html', 'config.js', 'earth-search.json', 'scene-loader.js', 'runtime.js', 'verify.js',
           'app', 'assets', 'vendor', 'Marcheur_autonome']

def digest(path):
    with path.open('rb') as stream:
        h = hashlib.sha256()
        for block in iter(lambda: stream.read(1048576), b''):
            h.update(block)
    return h.hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--message', default='Vérification de la copie pour transfert manuel')
    args = parser.parse_args()
    baseline_path = OUTPUT / 'manifest-transfert.json'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    baseline = json.loads(baseline_path.read_text(encoding='utf-8')) if baseline_path.exists() else {'files': []}
    if not baseline_path.exists():
        baseline_path.write_text(json.dumps(baseline, indent=2), encoding='utf-8')
    previous = {r['file']: r for r in baseline['files']}
    records = []
    copied = []
    for entry in ENTRIES:
        source = ROOT / entry
        files = [source] if source.is_file() else sorted(p for p in source.rglob('*') if p.is_file())
        if not source.exists():
            raise FileNotFoundError(source)
        for file in files:
            relative = file.relative_to(ROOT).as_posix()
            target = OUTPUT / relative
            sha = digest(file)
            if not target.exists() or digest(target) != sha:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file, target)
                copied.append(relative)
            if digest(target) != sha:
                raise RuntimeError('Copie non conforme : ' + relative)
            records.append({'file': relative, 'bytes': file.stat().st_size, 'sha256': sha})
    current = {r['file']: r for r in records}
    changed = sorted(name for name, record in current.items()
                     if name not in previous or record['sha256'] != previous[name]['sha256'])
    removed = sorted(set(previous) - set(current))
    lines = ['EXODUS — MISE À JOUR MANUELLE',
             'Préparée le ' + datetime.now().strftime('%d/%m/%Y à %H:%M'),
             '', args.message, '',
             'DERNIÈRE PRÉPARATION — fichiers modifiés depuis la précédente copie Serveur_externe :']
    lines += sorted(copied) or ['Aucun nouveau fichier modifié lors de cette préparation.']
    lines += ['',
             'Liste cumulée depuis la préparation initiale du site.',
             'Copier les fichiers ci-dessous depuis Serveur_externe vers les mêmes chemins sur IONOS.',
             'Conserver les sous-dossiers. Aucun transfert automatique effectué.', '',
             'FICHIERS À AJOUTER OU REMPLACER :']
    lines += changed or ['Aucun changement de fichier web depuis la préparation initiale.']
    if removed:
        lines += ['', 'FICHIERS À RETIRER MANUELLEMENT DU SITE ET DE LA COPIE Serveur_externe :'] + removed
    lines += ['', 'Après le transfert, recharger le site avec Ctrl+F5 et vérifier la navigation et le marcheur.',
              'Pour une première installation, transférer tous les fichiers web, même si cette liste est vide.']
    (OUTPUT / 'MISE_A_JOUR_SERVEUR.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    (OUTPUT / 'manifest-courant.json').write_text(json.dumps({'files': records}, indent=2), encoding='utf-8')
    print(json.dumps({'verified': len(records), 'copied': copied, 'replace_on_server': changed,
                      'remove_manually': removed}, ensure_ascii=False))

if __name__ == '__main__':
    main()
