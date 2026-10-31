#!/usr/bin/env python3
"""Local-only static preview; supports GitHub Pages-style extensionless links."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.blocked():
            return
        super().do_GET()

    def do_HEAD(self):
        if self.blocked():
            return
        super().do_HEAD()

    def blocked(self):
        parts = Path(unquote(urlsplit(self.path).path)).parts
        if any(part.startswith('.') for part in parts if part not in ('/',)):
            self.send_error(404)
            return True
        return False

    def translate_path(self, path):
        clean = urlsplit(path).path
        root = self.directory
        if clean == '/original' or clean.startswith('/original/'):
            root = str(self.original_root)
            clean = clean[len('/original'):] or '/'
        previous = self.directory
        self.directory = root
        try:
            resolved = Path(super().translate_path(clean))
        finally:
            self.directory = previous
        if not resolved.exists() and not resolved.suffix and resolved.with_suffix('.html').is_file():
            return str(resolved.with_suffix('.html'))
        return str(resolved)

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--directory', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--original-root', type=Path, required=True)
    args = parser.parse_args()
    PreviewHandler.original_root = args.original_root.resolve()
    from functools import partial
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(PreviewHandler, directory=str(args.directory.resolve())))
    print(f'Preview ready at http://127.0.0.1:{args.port}', flush=True)
    server.serve_forever()
