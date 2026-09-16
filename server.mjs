import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const useDist = args.includes('--dist');
const portFlag = args.indexOf('--port');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), useDist ? 'dist' : '.');
const port = Number(portFlag !== -1 ? args[portFlag + 1] : process.env.PORT) || 5173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function cacheControl(file, url) {
  const ext = path.extname(file);
  if (ext === '.html') {
    return 'no-cache, must-revalidate';
  }
  if (url.includes('?v=') || url.includes('?v%3D')) {
    return 'public, max-age=31536000, immutable';
  }
  if (['.js', '.mjs', '.css', '.svg', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.webp', '.ico'].includes(ext)) {
    return 'public, max-age=86400';
  }
  return 'public, max-age=300';
}

const server = http.createServer((req, res) => {
  const raw = req.url || '/';
  const qIndex = raw.indexOf('?');
  const urlPath = decodeURIComponent(qIndex === -1 ? raw : raw.slice(0, qIndex));

  const relative =
    urlPath === '/'
      ? 'index.html'
      : urlPath === '/ar' || urlPath === '/ar/'
        ? 'ar/index.html'
        : urlPath === '/services' || urlPath === '/services/'
          ? 'services/index.html'
          : urlPath === '/ar/services' || urlPath === '/ar/services/'
            ? 'ar/services/index.html'
            : urlPath === '/work' || urlPath === '/work/'
              ? 'work/index.html'
              : urlPath === '/ar/work' || urlPath === '/ar/work/'
                ? 'ar/work/index.html'
                : urlPath === '/about' || urlPath === '/about/'
                  ? 'about/index.html'
                  : urlPath === '/ar/about' || urlPath === '/ar/about/'
                    ? 'ar/about/index.html'
                    : urlPath === '/contact' || urlPath === '/contact/'
                      ? 'contact/index.html'
                      : urlPath === '/ar/contact' || urlPath === '/ar/contact/'
                        ? 'ar/contact/index.html'
                        : urlPath.replace(/^\/+/, '');
  const file = path.normalize(path.join(root, relative));

  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': types[path.extname(file)] || 'application/octet-stream',
      'cache-control': cacheControl(file, raw),
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`QIRAM studio running at http://localhost:${port}`);
});
