import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { generateDemo } from './demo-data';
import { apiData, errorResponse } from '../apps/cms/src/api';
const data = await generateDemo();
const repo = {
  stories: async () => data.stories,
  homes: async () => data.homes,
  tags: async () => data.tags,
};
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url!, 'http://localhost:3001');
    if (url.pathname.startsWith('/media/')) {
      const item = data.assets.get(decodeURIComponent(url.pathname.slice(7)));
      if (!item) {
        res.writeHead(404);
        res.end();
        return;
      }
      const b = await readFile(item.file);
      res.setHeader('Content-Type', item.asset.mime);
      res.setHeader('Accept-Ranges', 'bytes');
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
      if (range) {
        const start = Number(range[1]),
          end = range[2]
            ? Math.min(Number(range[2]), b.length - 1)
            : b.length - 1;
        if (start > end) {
          res.writeHead(416);
          res.end();
          return;
        }
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${b.length}`,
          'Content-Length': end - start + 1,
        });
        res.end(b.subarray(start, end + 1));
      } else res.end(b);
      return;
    }
    const result = await apiData(
      url.pathname.replace('/api/v1/', ''),
      url,
      repo,
      {
        country: process.env.DEV_COUNTRY ?? 'US',
        channel: 'web',
        premium: process.env.DEV_PREMIUM === 'true',
      },
    );
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: result }));
  } catch (e) {
    const r = errorResponse(e);
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    res.end(await r.text());
  }
}).listen(3001, '127.0.0.1', () =>
  console.log(
    'Fixture API: http://localhost:3001/api/v1 — original demo media is public; not a production server.',
  ),
);
