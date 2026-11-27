#!/usr/bin/env node
// Importa i contenuti esportati dal vecchio WordPress (cartella export/) dentro
// src/content/, nel formato usato dal sito e dal pannello Sveltia.
//
//   npm run import                          (usa ../export)
//   node scripts/import-export.mjs C:\percorso\export
//   node scripts/import-export.mjs --pulisci   (svuota prima le cartelle importate)
//
// Va lanciato una volta (o di nuovo se si riesporta): dopo, i contenuti si
// modificano dal pannello /admin/ e questo script non serve più.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeMediaPath } from './media-url.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const pulisci = args.includes('--pulisci');
const exportDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(here, '..', '..', 'export'));
const contentDir = path.join(here, '..', 'src', 'content');

// Pagine del vecchio sito che nel nuovo sono generate automaticamente
const SKIP_PAGES = new Set(['home', 'foto', 'comunicati']);

// ------------------------------------------------------------------ utilità
/** Front matter scritto dall'exporter: `chiave: valore-JSON` e liste `  - "x"`. */
function parseMd(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      data[listKey].push(parseValue(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    if (kv[2] === '') {
      listKey = kv[1];
      data[listKey] = [];
    } else {
      listKey = null;
      data[kv[1]] = kv[2] === '[]' ? [] : parseValue(kv[2]);
    }
  }
  return { data, body: m[2] };
}

function parseValue(v) {
  v = v.trim();
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  try { return JSON.parse(v); } catch { return v; }
}

function toYaml(data) {
  const out = ['---'];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      out.push(`${k}:`);
      for (const x of v) out.push(`  - ${JSON.stringify(x)}`);
    } else if (typeof v === 'boolean' || typeof v === 'number') {
      out.push(`${k}: ${v}`);
    } else {
      out.push(`${k}: ${JSON.stringify(String(v))}`);   // stringa JSON = YAML valido
    }
  }
  out.push('---', '');
  return out.join('\n');
}

const fixBody = (body) =>
  body
    .replace(/https?:\/\/(?:www\.)?pedalebolognese\.it\/wp-content\/uploads\//gi, '/media/')
    .replace(/https?:\/\/(?:www\.)?pedalebolognese\.it(\/[^\s)"']*)/gi, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';

/** "2026/10/22 – La Porchettata del Pedale –" -> "La Porchettata del Pedale" */
function cleanGalleryTitle(t) {
  const s = String(t ?? '')
    .replace(/^[\s\d/\-.]+(?:[–—-]\s*)?/, '')   // data iniziale
    .replace(/[\s–—-]+$/, '')                    // trattini finali
    .replace(/\s+/g, ' ')
    .trim();
  return s.length >= 3 ? s : String(t ?? '').trim();
}

/** "2023-11-26-Convocazione-Assemblea-STR" -> "Convocazione Assemblea STR" */
function titleFromFile(name) {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

async function readDir(dir) {
  try { return (await fs.readdir(dir)).filter((f) => f.endsWith('.md')); }
  catch { return []; }
}

async function prepare(name) {
  const dir = path.join(contentDir, name);
  if (pulisci) await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function write(file, text) {
  await fs.writeFile(file, text.replace(/\r\n/g, '\n'), 'utf8');
}

// ------------------------------------------------------------------ import
try {
  await fs.access(path.join(exportDir, 'pagine'));
} catch {
  console.error(`Non trovo l'export in ${exportDir}\nUso: node scripts/import-export.mjs <cartella export>`);
  process.exit(1);
}
console.log(`Importo da ${exportDir}`);

// 1. Pagine
const pagineDir = await prepare('pagine');
let nPagine = 0;
for (const f of await readDir(path.join(exportDir, 'pagine'))) {
  const slug = f.replace(/\.md$/, '');
  if (SKIP_PAGES.has(slug)) continue;
  const { data, body } = parseMd(await fs.readFile(path.join(exportDir, 'pagine', f), 'utf8'));
  await write(path.join(pagineDir, f), toYaml({ title: data.title ?? slug }) + fixBody(body));
  nPagine++;
}

// 2. Gallerie
const gallDir = await prepare('gallerie');
let nGall = 0, nFoto = 0;
for (const f of await readDir(path.join(exportDir, 'gallerie'))) {
  const { data, body } = parseMd(await fs.readFile(path.join(exportDir, 'gallerie', f), 'utf8'));
  const photos = (data.photos ?? []).map(normalizeMediaPath);
  nFoto += photos.length;
  nGall++;
  await write(path.join(gallDir, f), toYaml({
    title: cleanGalleryTitle(data.title),
    date: data.date,
    data_certa: data.date_certa === false ? false : undefined,
    cover: normalizeMediaPath(data.cover ?? photos[0]),
    photos,
  }) + (body.trim() ? fixBody(body) : ''));
}

// 3. Comunicati: dalla vecchia pagina "Comunicati" (un PDF per riga)
const comDir = await prepare('comunicati');
let nCom = 0;
try {
  const { body } = parseMd(await fs.readFile(path.join(exportDir, 'pagine', 'comunicati.md'), 'utf8'));
  const seen = new Set();
  for (const m of fixBody(body).matchAll(/\]\((\/media\/(\d{4})\/(\d{2})\/([^)]+?\.pdf))\)/gi)) {
    const [, pdf, y, mo, file] = m;
    if (seen.has(pdf)) continue;
    seen.add(pdf);
    const d = file.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = d ? `${d[1]}-${d[2]}-${d[3]}` : `${y}-${mo}-01`;
    const title = titleFromFile(file);
    await write(path.join(comDir, `${date}-${slugify(title)}.md`), toYaml({ title, date, pdf }));
    nCom++;
  }
} catch (e) {
  console.warn('  (nessuna pagina comunicati da convertire)', e.message);
}

console.log(`Fatto: ${nPagine} pagine, ${nGall} gallerie (${nFoto} foto), ${nCom} comunicati.`);
console.log('Controlla le date dei comunicati: sono quelle di caricamento del PDF.');
