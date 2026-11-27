// Genera /calendario.ics con le uscite inserite dal pannello.
// I soci lo aggiungono al calendario del telefono e lo vedono aggiornarsi da solo.
import type { APIRoute } from 'astro';
import { tutteLeUscite } from '../lib/uscite';
import { calendarioIcs } from '../lib/ics';

export const GET: APIRoute = async ({ site: siteUrl }) => {
  const base = siteUrl?.href.replace(/\/$/, '') ?? '';
  const dalAnnoScorso = new Date(Date.now() - 365 * 864e5);
  const uscite = (await tutteLeUscite()).filter((e) => e.start >= dalAnnoScorso);
  return calendarioIcs(uscite, base);
};
