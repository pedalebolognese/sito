// /uscite/<uscita>.ics — il pulsante "Aggiungi al calendario" di una singola uscita
// (su iPhone apre direttamente il calendario; su Android/PC scarica il file).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { pubblicato } from '../../lib/format';
import { usciteToEvento } from '../../lib/uscite';
import { calendarioIcs } from '../../lib/ics';

export async function getStaticPaths() {
  const uscite = await getCollection('uscite', pubblicato);
  return uscite.map((u) => ({ params: { slug: u.id }, props: { u } }));
}

export const GET: APIRoute = ({ props, site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';
  return calendarioIcs([usciteToEvento(props.u)], base, false);
};
