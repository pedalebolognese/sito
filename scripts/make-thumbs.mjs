#!/usr/bin/env node
// Crea le miniature (480 px, WebP) da export/media_web in export/thumbs.
// Servono per le griglie delle gallerie: caricano ~30 KB invece di ~250 KB.
//
//   npm run thumbs                         (usa ../export)
//   node scripts/make-thumbs.mjs C:\percorso\export
//
// Si può rilanciare: le miniature già fatte vengono saltate.

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const exportDir = path.resolve(process.argv[2] ?? path.join(here, '..', '..', 'export'));
const src = path.join(exportDir, 'media_web');
const dst = path.join(exportDir, 'thumbs');
const WIDTH = 480;

async function* walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.toLowerCase().endsWith('.webp')) yield p;
  }
}

const files = [];
for await (const f of walk(src)) files.push(f);
console.log(`Miniature per ${files.length} immagini in ${dst}`);

let done = 0, made = 0, errors = 0;
const queue = [...files];
const worker = async () => {
  while (queue.length) {
    const f = queue.shift();
    const out = path.join(dst, path.relative(src, f));
    try {
      await fs.access(out);
    } catch {
      try {
        await fs.mkdir(path.dirname(out), { recursive: true });
        await sharp(f).resize({ width: WIDTH, height: WIDTH, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 70 }).toFile(out);
        made++;
      } catch (e) {
        errors++;
        console.error(`  ! ${f}: ${e.message}`);
      }
    }
    if (++done % 250 === 0 || done === files.length) console.log(`  ${done}/${files.length}`);
  }
};
await Promise.all(Array.from({ length: Math.max(2, os.cpus().length - 1) }, worker));
console.log(`Fatto: ${made} nuove, ${errors} errori.`);
