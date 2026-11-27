// Dati presi da Google al momento della build (il sito si ricostruisce ogni notte):
//  - Calendario uscite: Google Calendar, link iCal (GOOGLE_CALENDAR_ICS)
//  - Archivio percorsi: Google Fogli "Pubblica sul web" in CSV (PERCORSI_CSV)
// Se le variabili non sono impostate, le pagine mostrano un messaggio e il sito funziona lo stesso.
import { romeToDate, oggi } from './tempo';

export type Evento = {
  id?: string;
  title: string;
  href?: string;          // pagina interna (uscite del pannello)
  tipo?: string;
  annullata?: boolean;
  dettagli?: string[];    // es. "Lungo 78 km · 1100 m"
  galleria?: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  location?: string;
  description?: string;
  url?: string;
};

function parseIcsDate(params: string, value: string): { date: Date; allDay: boolean } | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h || /VALUE=DATE(?!-)/.test(params)) return { date: romeToDate(+y, +mo, +d, 12), allDay: true };
  if (z) return { date: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)), allDay: false };
  return { date: romeToDate(+y, +mo, +d, +h, +mi, +s), allDay: false };   // TZID o ora "floating"
}

const unescape = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();

export function parseIcs(text: string): Evento[] {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const events: Evento[] = [];
  let cur: Record<string, { params: string; value: string }> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT' && cur) {
      const st = cur.DTSTART && parseIcsDate(cur.DTSTART.params, cur.DTSTART.value);
      if (st && cur.STATUS?.value !== 'CANCELLED') {
        const en = cur.DTEND && parseIcsDate(cur.DTEND.params, cur.DTEND.value);
        events.push({
          title: unescape(cur.SUMMARY?.value ?? 'Uscita'),
          start: st.date,
          end: en?.date,
          allDay: st.allDay,
          location: cur.LOCATION ? unescape(cur.LOCATION.value) : undefined,
          description: cur.DESCRIPTION ? unescape(cur.DESCRIPTION.value) : undefined,
          url: cur.URL?.value,
        });
      }
      cur = null;
    } else if (cur) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const [name, ...params] = line.slice(0, i).split(';');
      cur[name.toUpperCase()] = { params: params.join(';'), value: line.slice(i + 1) };
    }
  }
  return events;
}

let cacheEventi: Promise<Evento[]> | null = null;

/** Prossimi eventi del calendario (da oggi in poi). */
export async function prossimiEventi(limite = 50): Promise<Evento[]> {
  const url = import.meta.env.GOOGLE_CALENDAR_ICS;
  if (!url) return [];
  cacheEventi ??= fetch(url)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(parseIcs)
    .catch((e) => {
      console.warn(`[calendario] non riesco a leggere il calendario: ${e.message}`);
      return [];
    });
  const da = oggi();
  return (await cacheEventi)
    .filter((e) => (e.end ?? e.start) >= da)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limite);
}

/** CSV con virgolette, virgole e a capo dentro i campi. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export type Tabella = { intestazioni: string[]; righe: string[][] };

/** Tabella percorsi dal foglio Google (prima riga = intestazioni). */
export async function percorsi(): Promise<Tabella | null> {
  const url = import.meta.env.PERCORSI_CSV;
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const [intestazioni = [], ...righe] = parseCsv(await r.text());
    return { intestazioni, righe };
  } catch (e) {
    console.warn(`[percorsi] non riesco a leggere il foglio: ${(e as Error).message}`);
    return null;
  }
}
