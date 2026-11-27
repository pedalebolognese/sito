// Dati generali del sito e menu. Si modificano qui (o dal pannello, in futuro).

export const site = {
  nome: 'A.S.D. Pedale Bolognese',
  breve: 'Pedale Bolognese',
  fondazione: 1922,
  motto: 'Pedaliamo insieme dal 1922',
  descrizione:
    'Associazione sportiva dilettantistica di ciclismo amatoriale a Bologna dal 1922: uscite domenicali, gite sociali, campionato e tanta compagnia.',
  logo: '/media/2017/05/cropped-logopedalebolognese.png',
  indirizzo: ['Viale Felsina, 52 – 40139 Bologna', 'c/o Circolo “Il Fossolo” a.s.d. (primo piano, sala 2a)'],
  ritrovo: 'Ritrovo soci: tutti i martedì dalle 20.30 alle 23.30',
  // luogo di partenza predefinito delle uscite (si può cambiare uscita per uscita)
  ritrovoUscite: 'Circolo Il Fossolo, Viale Felsina 52, Bologna',
  email: 'info@pedalebolognese.it',
  social: [] as { nome: string; url: string }[],   // es. { nome: 'Facebook', url: 'https://...' }
};

export type VoceMenu = { label: string; href?: string; children?: VoceMenu[] };

export const menu: VoceMenu[] = [
  {
    label: 'Chi siamo',
    children: [
      { label: 'Società', href: '/societa/' },
      { label: 'Consiglio direttivo', href: '/consiglio-direttivo/' },
      { label: 'Regolamento', href: '/regolamento/' },
      { label: 'La storia', href: '/la-storia/' },
      { label: 'Il fondatore', href: '/il-fondatore/' },
      { label: 'Lo statuto del 1922', href: '/lo-statuto-del-15-aprile-1922/' },
      { label: 'I libri', href: '/i-libri/' },
      { label: 'Rassegna stampa', href: '/rassegna-stampa/' },
    ],
  },
  {
    label: 'Attività',
    children: [
      { label: 'Notizie', href: '/notizie/' },
      { label: 'Comunicati', href: '/comunicati/' },
      { label: 'Calendario uscite', href: '/calendario/' },
      { label: 'Programma ciclistico', href: '/programma-ciclistico/' },
      { label: 'Percorsi', href: '/percorsi/' },
      { label: 'Gite sociali', href: '/gite-sociali/' },
    ],
  },
  {
    label: 'Classifiche',
    children: [
      { label: 'Campionato sociale', href: '/campionato-sociale/' },
      { label: 'Memorial', href: '/memorial/' },
      { label: 'Albo d’oro', href: '/albo-doro/' },
    ],
  },
  { label: 'Foto', href: '/foto/' },
  { label: 'Abbigliamento', href: '/abbigliamento/' },
  { label: 'Contatti', href: '/contatti/' },
];

export const menuSecondario: VoceMenu[] = [
  { label: 'ACSI', href: 'https://www.myacsiciclismo.it/' },
  { label: 'Area riservata', href: 'https://www.office.com/' },
];

export const iscriviti = { label: 'Iscriviti', href: '/pagina-iscrizioni/' };
