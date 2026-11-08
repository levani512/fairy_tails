import { createServer, request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter(
    (a) =>
      a?.family === 'IPv4' &&
      !a.internal &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address),
  );
const host = process.env.LAN_HOST ?? addresses[0]?.address;
if (!host || !addresses.some((a) => a.address === host))
  throw new Error('Set LAN_HOST to this computer’s private IPv4 address.');
const port = 8082;
const origin = `http://${host}:${port}`;
const backend = 'http://localhost:3000';
const cmsOrigin = process.env.LAN_CMS_CLIENT_ORIGIN ?? 'http://localhost:8081';
const root = resolve('apps/client/dist');
function rewrite(value) {
  if (
    typeof value === 'string' &&
    (value.startsWith(`${backend}/`) ||
      value.startsWith('http://127.0.0.1:3000/'))
  )
    return value.replace(/^http:\/\/(localhost|127\.0\.0\.1):3000/, origin);
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewrite(v)]),
    );
  return value;
}
const types = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};
createServer(async (req, res) => {
  if (
    req.headers.host !== `${host}:${port}` ||
    (req.headers.origin && req.headers.origin !== origin)
  ) {
    res
      .writeHead(403)
      .end('Use the local Wi-Fi address printed by the server.');
    return;
  }
  const url = new URL(req.url ?? '/', origin);
  if (/^\/api\/(v1|parent)(\/|$)/.test(url.pathname)) {
    const headers = {
      ...req.headers,
      host: 'localhost:3000',
      'accept-encoding': 'identity',
    };
    if (headers.origin) headers.origin = cmsOrigin;
    const upstream = request(
      `${backend}${url.pathname}${url.search}`,
      { method: req.method, headers },
      (response) => {
        const outgoing = { ...response.headers };
        delete outgoing['access-control-allow-origin'];
        if (outgoing.location) outgoing.location = rewrite(outgoing.location);
        if (String(outgoing['content-type']).includes('application/json')) {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            try {
              const body = Buffer.from(
                JSON.stringify(
                  rewrite(JSON.parse(Buffer.concat(chunks).toString())),
                ),
              );
              delete outgoing['transfer-encoding'];
              delete outgoing['content-encoding'];
              delete outgoing.etag;
              outgoing['content-length'] = String(body.length);
              res.writeHead(response.statusCode ?? 502, outgoing).end(body);
            } catch {
              res.writeHead(502).end('Invalid API response.');
            }
          });
        } else {
          res.writeHead(response.statusCode ?? 502, outgoing);
          response.pipe(res);
        }
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end('Start the CMS on port 3000.');
    });
    req.pipe(upstream);
    return;
  }
  // The admin and unrelated backend routes remain local to the computer.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    res.writeHead(404).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  try {
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    let body;
    try {
      body = await readFile(file);
    } catch {
      if (extname(file)) {
        res.writeHead(404).end();
        return;
      }
      file = resolve(root, 'index.html');
      body = await readFile(file);
    }
    res.setHeader(
      'Content-Type',
      types[extname(file)] ?? 'application/octet-stream',
    );
    res.setHeader('Cache-Control', 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res
      .writeHead(500)
      .end('Unable to load the reader. Build it with pnpm build:web.');
  }
}).listen(port, host, () =>
  console.log(
    `Wi-Fi reader: ${origin}\nKeep this computer running; connect your phone/tablet to the same local network.`,
  ),
);
