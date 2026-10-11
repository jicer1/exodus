"""Local-only development server for the extracted Huerta application."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import json
import webbrowser
import urllib.request

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__huerta_health__':
            body = json.dumps({'application':'huerta-babylon', 'local_only':True, 'root':str(ROOT)}).encode()
            self.send_response(200)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != '/__huerta_save_markers__':
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            data = json.loads(self.rfile.read(length).decode('utf-8'))
            if not isinstance(data, list) or any(
                    not isinstance(item, dict) or
                    not isinstance(item.get('name'), str) or
                    not isinstance(item.get('lat'), (int, float)) or
                    not isinstance(item.get('lon'), (int, float))
                    for item in data):
                raise ValueError('format de marqueurs invalide')
            target = ROOT / 'assets' / 'parideras_edit.json'
            temporary = target.with_suffix('.json.tmp')
            temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
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
