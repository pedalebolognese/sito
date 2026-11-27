// Lettura delle tracce GPX durante la build: km, dislivello, punti per la mappa
// e profilo altimetrico. I file caricati dal pannello stanno in public/uploads/.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export type Traccia = {
  km: number;
  dislivello: number;            // metri di salita (D+)
  discesa: number;               // metri di discesa (D-)
  quotaMin: number;
  quotaMax: number;
  linea: [number, number][];     // [lat, lon] semplificati per la mappa
  profilo: [number, number][];   // [km, quota] per il grafico
};

type Punto = { lat: number; lon: number; ele?: number };

const cache = new Map<string, Traccia | null>();

/** Legge e analizza un GPX ("/uploads/uscite/giro.gpx"). Restituisce null se manca o non è valido. */
export function leggiGpx(percorso?: string | null): Traccia | null {
  if (!percorso || !/\.gpx$/i.test(percorso)) return null;
  if (cache.has(percorso)) return cache.get(percorso)!;
  const file = join(process.cwd(), 'public', decodeURI(percorso.replace(/^\/+/, '')));
  let t: Traccia | null = null;
  if (existsSync(file)) {
    try {
      t = analizza(estraiPunti(readFileSync(file, 'utf8')));
    } catch (err) {
      console.warn(`[gpx] ${percorso}: file non leggibile (${(err as Error).message})`);
    }
  } else {
    console.warn(`[gpx] ${percorso}: file non trovato in public/`);
  }
  cache.set(percorso, t);
  return t;
}

function estraiPunti(xml: string): Punto[] {
  // tracce (trkpt) o, in mancanza, percorsi pianificati (rtept)
  for (const tag of ['trkpt', 'rtept']) {
    const re = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'g');
    const punti: Punto[] = [];
    for (const m of xml.matchAll(re)) {
      const lat = Number(/lat\s*=\s*["']([^"']+)/.exec(m[1])?.[1]);
      const lon = Number(/lon\s*=\s*["']([^"']+)/.exec(m[1])?.[1]);
      const eleTxt = m[2] && /<ele>\s*([^<]+)<\/ele>/.exec(m[2])?.[1];
      const ele = eleTxt ? Number(eleTxt) : undefined;
      if (Number.isFinite(lat) && Number.isFinite(lon)) punti.push({ lat, lon, ele: Number.isFinite(ele) ? ele : undefined });
    }
    if (punti.length >= 2) return punti;
  }
  throw new Error('nessun punto traccia');
}

const R = 6371008.8;
const rad = (g: number) => (g * Math.PI) / 180;
function distanza(a: Punto, b: Punto) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function analizza(punti: Punto[]): Traccia {
  // distanza progressiva
  const prog = [0];
  for (let i = 1; i < punti.length; i++) prog.push(prog[i - 1] + distanza(punti[i - 1], punti[i]));
  const totale = prog.at(-1)!;

  // quote: media mobile su ~100 m per togliere il "rumore" del GPS,
  // poi si conta la salita solo oltre una soglia di 4 m (come fanno Strava/Garmin, circa)
  const conQuota = punti.every((p) => p.ele !== undefined);
  let dislivello = 0, discesa = 0, quotaMin = 0, quotaMax = 0;
  let quote: number[] = [];
  if (conQuota) {
    const grezze = punti.map((p) => p.ele!);
    quote = grezze.map((_, i) => {
      let s = 0, n = 0;
      for (let j = i; j >= 0 && prog[i] - prog[j] <= 50; j--) { s += grezze[j]; n++; }
      for (let j = i + 1; j < grezze.length && prog[j] - prog[i] <= 50; j++) { s += grezze[j]; n++; }
      return s / n;
    });
    let rif = quote[0];
    for (const q of quote) {
      if (q - rif >= 4) { dislivello += q - rif; rif = q; }
      else if (rif - q >= 4) { discesa += rif - q; rif = q; }
    }
    quotaMin = Math.min(...grezze);
    quotaMax = Math.max(...grezze);
  }

  // linea per la mappa: un punto ogni ~25 m basta e alleggerisce la pagina
  const linea: [number, number][] = [];
  let ultimo = -Infinity;
  punti.forEach((p, i) => {
    if (prog[i] - ultimo >= 25 || i === punti.length - 1) {
      linea.push([+p.lat.toFixed(5), +p.lon.toFixed(5)]);
      ultimo = prog[i];
    }
  });

  // profilo: ~250 campioni
  const profilo: [number, number][] = [];
  if (conQuota) {
    const passo = totale / 250;
    let prossimo = 0;
    prog.forEach((d, i) => {
      if (d >= prossimo || i === prog.length - 1) {
        profilo.push([+(d / 1000).toFixed(2), Math.round(quote[i])]);
        prossimo += passo;
      }
    });
  }

  return {
    km: Math.round(totale / 100) / 10,
    dislivello: Math.round(dislivello / 10) * 10,
    discesa: Math.round(discesa / 10) * 10,
    quotaMin: Math.round(quotaMin),
    quotaMax: Math.round(quotaMax),
    linea,
    profilo,
  };
}
