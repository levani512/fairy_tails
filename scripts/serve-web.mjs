import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('apps/client/dist');
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:8081');
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      if (extname(file)) {
        res.writeHead(404);
        res.end();
        return;
      }
      body = await readFile(resolve(root, 'index.html'));
    }
    const mime =
      {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.json': 'application/json',
      }[extname(file)] ?? 'text/html';
    res.setHeader('Content-Type', mime);
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(8081, '127.0.0.1', () =>
  console.log('Web reader: http://localhost:8081'),
);
