import { mediaUrl } from '../../scripts/media-url.mjs';

const BASE = (import.meta.env.PUBLIC_MEDIA_BASE ?? '').replace(/\/$/, '');

/** Foto ottimizzata (o file caricato dal pannello). */
export const full = (p?: string | null) => mediaUrl(p ?? '', BASE, 'full');
/** Miniatura per le griglie. */
export const thumb = (p?: string | null) => mediaUrl(p ?? '', BASE, 'thumb');
/** File originale (PDF, video...). */
export const original = (p?: string | null) => mediaUrl(p ?? '', BASE, 'original');
