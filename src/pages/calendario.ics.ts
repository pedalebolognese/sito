// Genera /calendario.ics con le uscite inserite dal pannello.
// I soci lo aggiungono al calendario del telefono e lo vedono aggiornarsi da solo.
import type { APIRoute } from 'astro';
import { site } from '../config/site';
import { tutteLeUscite } from '../lib/uscite';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const giorno = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d).replace(/-/g, '');

/** Le righe iCal non devono superare 75 byte: quelle lunghe vanno "piegate". */
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
    }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export const GET: APIRoute = async ({ site: siteUrl }) => {
  const base = siteUrl?.href.replace(/\/$/, '') ?? '';
  const dalAnnoScorso = new Date(Date.now() - 365 * 864e5);
  const uscite = (await tutteLeUscite()).filter((e) => e.start >= dalAnnoScorso);
  const stamp = utc(new Date());

  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pedale Bolognese//Calendario uscite//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(site.breve)} – uscite`,
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];
  for (const e of uscite) {
    const descr = [e.tipo, ...(e.dettagli ?? []), `${base}${e.href ?? '/calendario/'}`].filter(Boolean).join('\n');
    righe.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@pedalebolognese.it`,
      `DTSTAMP:${stamp}`,
      ...(e.allDay
        ? [`DTSTART;VALUE=DATE:${giorno(e.start)}`]
        : [`DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end ?? e.start)}`]),
      `SUMMARY:${esc((e.annullata ? 'ANNULLATA – ' : '') + e.title)}`,
      ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
      `DESCRIPTION:${esc(descr)}`,
      `URL:${base}${e.href ?? '/calendario/'}`,
      `STATUS:${e.annullata ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    );
  }
  righe.push('END:VCALENDAR');

  return new Response(righe.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
