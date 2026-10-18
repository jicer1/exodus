"""Local-only development server for the extracted Huerta application."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import math
import webbrowser
import urllib.request
from threading import Lock

ROOT = Path(__file__).resolve().parent
DATA_LOCK = Lock()

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__huerta_health__':
            body = json.dumps({'application':'huerta-babylon', 'local_only':True,
                               'storage_version':2, 'root':str(ROOT)}).encode()
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path not in ('/__huerta_save_markers__', '/__huerta_save_walls__',
                             '/__huerta_save_layers__', '/__huerta_save_workspace__'):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 0 or length > 1048576:
                raise ValueError('fichier trop volumineux')
            data = json.loads(self.rfile.read(length).decode('utf-8'))
            if self.path == '/__huerta_save_workspace__':
                def valid_point(point):
                    return (isinstance(point, dict) and
                            all(isinstance(point.get(axis), (int, float)) and
                                not isinstance(point.get(axis), bool) and
                                math.isfinite(point[axis]) for axis in ('lat', 'lon')) and
                            -90 <= point['lat'] <= 90 and -180 <= point['lon'] <= 180)

                def valid_named(item):
                    return (isinstance(item, dict) and isinstance(item.get('name'), str) and
                            item['name'].strip() and len(item['name']) <= 120)

                def valid_object(item):
                    if not valid_named(item):
                        return False
                    if item.get('type') == 'marker':
                        return valid_point(item)
                    return (item.get('type') == 'line' and isinstance(item.get('points'), list) and
                            2 <= len(item['points']) <= 1000 and
                            all(valid_point(point) for point in item['points']))

                if (not isinstance(data, dict) or set(data) != {'parideras', 'murs', 'calques'} or
                        not isinstance(data['parideras'], list) or
                        not all(valid_named(item) and valid_point(item) for item in data['parideras']) or
                        not isinstance(data['murs'], list) or
                        not all(valid_named(item) and isinstance(item.get('points'), list) and
                                2 <= len(item['points']) <= 1000 and
                                all(valid_point(point) for point in item['points']) for item in data['murs']) or
                        not isinstance(data['calques'], list) or len(data['calques']) > 100 or
                        not all(valid_named(layer) and isinstance(layer.get('objects'), list) and
                                len(layer['objects']) <= 2000 and
                                all(valid_object(item) for item in layer['objects'])
                                for layer in data['calques'])):
                    raise ValueError('format de projet de calques invalide')
                target = ROOT / 'assets' / 'parideras_edit.json'
                with DATA_LOCK:
                    temporary = target.with_suffix('.json.tmp')
                    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                    temporary.replace(target)
                body = json.dumps({'saved': True,
                                   'count': len(data['parideras']) + len(data['murs']) + len(data['calques'])}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if self.path == '/__huerta_save_layers__':
                def valid_point(point):
                    return (isinstance(point, dict) and
                            all(isinstance(point.get(axis), (int, float)) and
                                not isinstance(point.get(axis), bool) and
                                math.isfinite(point[axis]) for axis in ('lat', 'lon')) and
                            -90 <= point['lat'] <= 90 and -180 <= point['lon'] <= 180)

                def valid_item(item, layer_type):
                    if (not isinstance(item, dict) or
                            not isinstance(item.get('name'), str) or
                            not item['name'].strip() or len(item['name']) > 120):
                        return False
                    if layer_type == 'markers':
                        return valid_point(item)
                    return (isinstance(item.get('points'), list) and
                            2 <= len(item['points']) <= 1000 and
                            all(valid_point(point) for point in item['points']))

                if (not isinstance(data, list) or len(data) > 100 or any(
                        not isinstance(layer, dict) or
                        not isinstance(layer.get('name'), str) or
                        not layer['name'].strip() or len(layer['name']) > 120 or
                        layer.get('type') not in ('markers', 'lines') or
                        not isinstance(layer.get('items'), list) or
                        len(layer['items']) > 2000 or
                        not all(valid_item(item, layer['type']) for item in layer['items'])
                        for layer in data)):
                    raise ValueError('format de calques invalide')
                section = 'calques'
            elif self.path == '/__huerta_save_walls__':
                def valid_point(point):
                    return (isinstance(point, dict) and
                            all(isinstance(point.get(axis), (int, float)) and
                                not isinstance(point.get(axis), bool) and
                                math.isfinite(point[axis]) for axis in ('lat', 'lon')) and
                            -90 <= point['lat'] <= 90 and -180 <= point['lon'] <= 180)

                if (not isinstance(data, list) or len(data) > 500 or any(
                        not isinstance(item, dict) or
                        not isinstance(item.get('name'), str) or
                        not item['name'].strip() or len(item['name']) > 120 or
                        not isinstance(item.get('points'), list) or
                        not 2 <= len(item['points']) <= 1000 or
                        not all(valid_point(point) for point in item['points'])
                        for item in data)):
                    raise ValueError('format de tracés Mur invalide')
                section = 'murs'
            else:
                if not isinstance(data, list) or any(
                        not isinstance(item, dict) or
                        not isinstance(item.get('name'), str) or
                        not isinstance(item.get('lat'), (int, float)) or
                        not isinstance(item.get('lon'), (int, float)) or
                        not math.isfinite(item['lat']) or
                        not math.isfinite(item['lon'])
                        for item in data):
                    raise ValueError('format de marqueurs invalide')
                section = 'parideras'
            target = ROOT / 'assets' / 'parideras_edit.json'
            with DATA_LOCK:
                existing = json.loads(target.read_text(encoding='utf-8')) if target.exists() else []
                if isinstance(existing, list):
                    combined = {'parideras': existing, 'murs': [], 'calques': []}
                elif (isinstance(existing, dict) and
                      isinstance(existing.get('parideras'), list) and
                      isinstance(existing.get('murs'), list)):
                    combined = existing
                else:
                    raise ValueError('format du fichier actuel invalide')
                if 'calques' not in combined:
                    combined['calques'] = []
                combined[section] = data
                temporary = target.with_suffix('.json.tmp')
                temporary.write_text(json.dumps(combined, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                temporary.replace(target)
            body = json.dumps({'saved': True, 'count': len(data)}).encode('utf-8')
            self.send_response(200)
        except Exception as error:
            body = json.dumps({'saved': False, 'error': str(error)}).encode('utf-8')
            self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        # .gz terrain tiles are decompressed by the application worker.
        # Do not set Content-Encoding on these binary files.
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8766)
    parser.add_argument('--open',action='store_true')
    args = parser.parse_args()
    try:
        server = ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT)))
    except OSError as error:
        if args.open:
            try:
                with urllib.request.urlopen('http://127.0.0.1:'+str(args.port)+'/__huerta_health__',timeout=1) as response:
                    status=json.load(response)
                if status.get('application')=='huerta-babylon' and Path(status.get('root','')).resolve()==ROOT:
                    webbrowser.open('http://127.0.0.1:'+str(args.port)+'/')
                    raise SystemExit('Le serveur Huerta est deja ouvert. Utiliser sa fenetre pour l\'arreter.')
            except (OSError,ValueError):
                pass
        raise SystemExit('Impossible de demarrer le serveur local. Le port est peut-etre deja utilise : '+str(error))
    url = 'http://127.0.0.1:'+str(args.port)+'/'
    print('Huerta Babylon.js : '+url,flush=True)
    print('Garder cette fenetre ouverte. Ctrl+C arrete le serveur.',flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServeur arrete.')
    finally:
        server.server_close()
