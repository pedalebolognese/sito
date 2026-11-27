#!/usr/bin/env node
// Server locale per vedere le foto dell'archivio durante lo sviluppo,
// senza averle ancora caricate su Cloudflare R2.
//
//   npm run media            (usa ../export, porta 4322)
//   node scripts/media-server.mjs C:\percorso\export 4322
//
// Nel file .env:  PUBLIC_MEDIA_BASE=http://localhost:4322

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, '..', '..', 'export'));
const port = Number(process.argv[3] ?? 4322);

const TYPES = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.svg': 'image/svg+xml',
};

if (!fs.existsSync(root)) {
  console.error(`Cartella non trovata: ${root}`);
  process.exit(1);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.resolve(root, '.' + urlPath);
  if (!file.startsWith(root + path.sep)) {          // niente ../ fuori dalla cartella
    res.writeHead(403).end();
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' }).end('Non trovato');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => {
  console.log(`Media da ${root}`);
  console.log(`  -> http://localhost:${port}   (PUBLIC_MEDIA_BASE=http://localhost:${port})`);
});
