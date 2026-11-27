const fmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
const fmtMese = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
const fmtBreve = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' });
const fmtOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

/** "22 ottobre 2026" */
export const data = (d?: Date | null) => (d ? fmt.format(d) : '');
/** "ottobre 2026" */
export const mese = (d?: Date | null) => (d ? fmtMese.format(d) : '');
/** Data completa, o solo mese/anno se il giorno non è noto (1° del mese o data incerta). */
export const dataSmart = (d?: Date | null, certa = true) =>
  !d ? '' : !certa || d.getUTCDate() === 1 ? mese(d) : data(d);
/** "dom 3 nov" */
export const giorno = (d: Date) => fmtBreve.format(d);
export const ora = (d: Date) => fmtOra.format(d);
export const iso = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : '');
export const anno = (d?: Date | null) => (d ? d.getUTCFullYear() : 0);

/** Ordina per data decrescente (le date mancanti in fondo). */
export const byDateDesc = <T extends { data: { date?: Date | null } }>(a: T, b: T) =>
  (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0);

/** Nelle build di produzione nasconde le bozze. */
export const pubblicato = <T extends { data: { bozza?: boolean } }>(e: T) =>
  import.meta.env.DEV || !e.data.bozza;
