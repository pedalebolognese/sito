// Uscite inserite dal pannello (src/content/uscite) + eventuale Google Calendar,
// unite in un'unica lista di eventi.
import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../config/site';
import { pubblicato } from './format';
import { prossimiEventi, type Evento } from './google';
import { romeToDate, oggi } from './tempo';
import { leggiGpx, type Traccia } from './gpx';

type Percorso = CollectionEntry<'uscite'>['data']['percorsi'][number];

/** Percorsi dell'uscita con km e dislivello presi dalla traccia GPX, se c'è (hanno la precedenza sui numeri scritti a mano). */
export function percorsiCompleti(u: CollectionEntry<'uscite'>): (Percorso & { traccia: Traccia | null })[] {
  return u.data.percorsi.map((p) => {
    const traccia = leggiGpx(p.gpx);
    return {
      ...p,
      km: traccia?.km ? Math.round(traccia.km) : p.km,
      dislivello: traccia?.profilo.length ? traccia.dislivello : p.dislivello,
      traccia,
    };
  });
}

const DURATA_ORE = 4;   // durata indicativa di un'uscita, per i calendari dei telefoni

export function percorsoBreve(p: Percorso) {
  return [p.nome, p.km && `${p.km} km`, p.dislivello && `${p.dislivello} m D+`].filter(Boolean).join(' · ');
}

export function usciteToEvento(u: CollectionEntry<'uscite'>): Evento {
  const d = u.data.date;
  const conOra = /^\d{1,2}[:.]\d{2}$/.test(u.data.ora?.trim() ?? '');
  const [h, mi] = conOra ? u.data.ora!.trim().split(/[:.]/).map(Number) : [12, 0];
  const start = romeToDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h, mi);
  return {
    id: u.id,
    title: u.data.title,
    href: `/uscite/${u.id}/`,
    tipo: u.data.tipo,
    annullata: u.data.annullata,
    dettagli: percorsiCompleti(u).map(percorsoBreve).filter(Boolean),
    galleria: u.data.galleria,
    start,
    end: conOra ? new Date(start.getTime() + DURATA_ORE * 3600e3) : undefined,
    allDay: !conOra,
    location: u.data.ritrovo ?? site.ritrovoUscite,
  };
}

/** Tutte le uscite del pannello, in ordine di data. */
export async function tutteLeUscite(): Promise<Evento[]> {
  const uscite = await getCollection('uscite', pubblicato);
  return uscite.map(usciteToEvento).sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Prossime uscite: pannello + Google Calendar (se collegato). */
export async function prossimeUscite(limite = 50): Promise<Evento[]> {
  const da = oggi();
  const [mie, google] = await Promise.all([tutteLeUscite(), prossimiEventi(limite)]);
  return [...mie.filter((e) => (e.end ?? e.start) >= da), ...google]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limite);
}
