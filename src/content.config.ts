// Struttura dei contenuti. Ogni collezione corrisponde a una cartella in
// src/content/ e a una sezione del pannello /admin/ (public/admin/config.yml):
// se si aggiunge un campo qui, va aggiunto anche lì.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const md = (dir: string) => glob({ pattern: '**/*.md', base: `./src/content/${dir}` });

/** Pagine fisse: Società, Regolamento, Contatti... */
const pagine = defineCollection({
  loader: md('pagine'),
  schema: z.object({
    title: z.string(),
    descrizione: z.string().optional(),
  }),
});

/** Notizie / diario del gruppo */
const notizie = defineCollection({
  loader: md('notizie'),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    cover: z.string().optional(),
    sommario: z.string().optional(),
    galleria: z.string().optional(),      // slug di una galleria collegata
    bozza: z.boolean().default(false),
  }),
});

/** Comunicati ufficiali (di solito un PDF) */
const comunicati = defineCollection({
  loader: md('comunicati'),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    pdf: z.string().optional(),
    immagine: z.string().optional(),
    bozza: z.boolean().default(false),
  }),
});

/** Gallerie fotografiche */
const gallerie = defineCollection({
  loader: md('gallerie'),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().nullable().optional(),
    data_certa: z.boolean().default(true),
    cover: z.string().nullable().optional(),
    photos: z.array(z.string()).default([]),
    bozza: z.boolean().default(false),
  }),
});

/** Uscite e gite: generano il calendario e il file calendario.ics */
const uscite = defineCollection({
  loader: md('uscite'),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    ora: z.string().regex(/^\d{1,2}[:.]\d{2}$/, 'Ora nel formato 08:30').optional(),
    tipo: z.string().default('Gita domenicale'),
    ritrovo: z.string().optional(),
    percorsi: z
      .array(
        z.object({
          nome: z.string().optional(),
          km: z.coerce.number().optional(),
          dislivello: z.coerce.number().optional(),
          gpx: z.string().optional(),
          link: z.string().optional(),
        }),
      )
      .default([]),
    campionato: z.boolean().default(false),
    annullata: z.boolean().default(false),
    galleria: z.string().optional(),
    bozza: z.boolean().default(false),
  }),
});

export const collections = { pagine, notizie, comunicati, gallerie, uscite };
