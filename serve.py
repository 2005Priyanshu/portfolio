"""Local preview server for the portfolio.

Run:  python3 serve.py      then open http://localhost:8000
      python3 serve.py --lan    also lets phones and other computers on the same Wi-Fi open it
Unlike `python3 -m http.server`, it tells the browser never to cache files,
so Safari and others always show your latest edits. It also answers byte-range
requests, which Safari needs before it will play an audio file.
"""
import http.server, os, re, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        m = re.match(r'bytes=(\d*)-(\d*)$', self.headers.get('Range', ''))
        path = self.translate_path(self.path)
        if not m or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start, end = m.groups()
        if start:
            start, end = int(start), min(int(end) if end else size - 1, size - 1)
        else:  # suffix range: the last N bytes
            start, end = max(size - int(end or 0), 0), size - 1
        if start > end or start >= size:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        f = open(path, 'rb')
        f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        n = getattr(self, '_remaining', None)
        if n is None:
            return super().copyfile(source, outputfile)
        self._remaining = None
        while n > 0:
            chunk = source.read(min(65536, n))
            if not chunk:
                break
            outputfile.write(chunk)
            n -= len(chunk)

os.chdir(os.path.dirname(os.path.abspath(__file__)))
host = '0.0.0.0' if '--lan' in sys.argv else '127.0.0.1'
print(f'Serving on http://localhost:8000{" and on your local network" if host != "127.0.0.1" else ""} (Ctrl+C to stop)')
http.server.ThreadingHTTPServer((host, 8000), NoCache).serve_forever()
