// Traduce i percorsi dei media nel loro indirizzo reale.
//
// Nei contenuti le foto dell'archivio sono scritte come "/media/2026/10/foto.jpg"
// (lo stesso percorso di wp-content/uploads del vecchio sito). I file veri stanno
// fuori dal repository, su Cloudflare R2 (o sul server locale in sviluppo):
//
//   MEDIA_BASE/media_web/2026/10/foto.webp   foto ottimizzata (max 1920 px)
//   MEDIA_BASE/thumbs/2026/10/foto.webp      miniatura (480 px)
//   MEDIA_BASE/media/2026/10/doc.pdf         PDF e altri file originali
//
// I file caricati dal pannello (es. "/uploads/...") stanno invece nel sito e
// vengono lasciati come sono.

const RASTER = /\.(jpe?g|png|webp)$/i;
const OLD_SITE = /^https?:\/\/(?:www\.)?pedalebolognese\.it\/wp-content\/uploads\//i;

export function normalizeMediaPath(p) {
  if (!p) return p;
  return p.replace(OLD_SITE, '/media/');
}

/**
 * @param {string} p     percorso come scritto nel contenuto
 * @param {string} base  MEDIA_BASE senza "/" finale (es. https://foto.pedalebolognese.it)
 * @param {'full'|'thumb'|'original'} kind
 */
export function mediaUrl(p, base, kind = 'full') {
  if (!p) return '';
  p = normalizeMediaPath(p);
  if (!p.startsWith('/media/')) return p;
  const rel = p.slice('/media/'.length);
  const b = (base || '').replace(/\/$/, '');
  if (kind === 'original' || !RASTER.test(rel)) return `${b}/media/${rel}`;
  const webp = rel.replace(RASTER, '.webp');
  return kind === 'thumb' ? `${b}/thumbs/${webp}` : `${b}/media_web/${webp}`;
}
