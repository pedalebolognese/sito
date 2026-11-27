// Funzioni comuni per i file iCal (.ics): il calendario completo (/calendario.ics)
// e il file della singola uscita (/uscite/<uscita>.ics, "Aggiungi al calendario").
import { site } from '../config/site';
import type { Evento } from './google';

export const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
export const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const giorno = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(d).replace(/-/g, '');
const giornoDopo = (d: Date) => giorno(new Date(d.getTime() + 864e5));

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

/** Il blocco VEVENT di un'uscita. */
export function vevent(e: Evento, base: string, stamp = utc(new Date())) {
  const url = `${base}${e.href ?? '/calendario/'}`;
  const descr = [e.tipo, ...(e.dettagli ?? []), url].filter(Boolean).join('\n');
  return [
    'BEGIN:VEVENT',
    `UID:${e.id}@pedalebolognese.it`,
    `DTSTAMP:${stamp}`,
    ...(e.allDay
      ? [`DTSTART;VALUE=DATE:${giorno(e.start)}`, `DTEND;VALUE=DATE:${giornoDopo(e.start)}`]
      : [`DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end ?? e.start)}`]),
    `SUMMARY:${esc((e.annullata ? 'ANNULLATA – ' : '') + e.title)}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    `DESCRIPTION:${esc(descr)}`,
    `URL:${url}`,
    `STATUS:${e.annullata ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
  ];
}

/** Un file .ics completo con gli eventi indicati. */
export function calendarioIcs(eventi: Evento[], base: string, abbonamento = true) {
  const stamp = utc(new Date());
  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pedale Bolognese//Calendario uscite//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(abbonamento
      ? [
          `X-WR-CALNAME:${esc(site.breve)} – uscite`,
          'X-WR-TIMEZONE:Europe/Rome',
          'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
          'X-PUBLISHED-TTL:PT12H',
        ]
      : []),
    ...eventi.flatMap((e) => vevent(e, base, stamp)),
    'END:VCALENDAR',
  ];
  return new Response(righe.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}

/** Link "Aggiungi a Google Calendar" per una singola uscita. */
export function linkGoogleCalendar(e: Evento, base: string) {
  const date = e.allDay ? `${giorno(e.start)}/${giornoDopo(e.start)}` : `${utc(e.start)}/${utc(e.end ?? e.start)}`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${site.breve} – ${e.title}`,
    dates: date,
    details: [e.tipo, ...(e.dettagli ?? []), `${base}${e.href ?? '/calendario/'}`].filter(Boolean).join('\n'),
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
