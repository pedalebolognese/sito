export const TZ = 'Europe/Rome';

/** Ora locale di Roma -> Date (UTC), gestendo l'ora legale. */
export function romeToDate(y: number, mo: number, d: number, h = 0, mi = 0, s = 0) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(guess));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asRome = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'));
  return new Date(guess - (asRome - guess));
}

/** Inizio della giornata di oggi (ora di Roma). */
export function oggi() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()).split('-').map(Number);
  return romeToDate(p[0], p[1], p[2]);
}
