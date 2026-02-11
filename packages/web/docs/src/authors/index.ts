import type { StaticImageData } from 'next/image';
import { z } from 'zod';
import saihajPhoto from './saihaj.webp';

const commonAuthorFields = z.object({
  name: z.string(),
  link: z.string().url(),
  twitter: z.string().optional(),
});

export const staticImageDataSchema = z.object({
  src: z.string(),
}) as unknown as z.ZodType<StaticImageData>;

export const Author = z.intersection(
  commonAuthorFields,
  z.union([
    z.object({
      // if we have a GitHub handle, we don't require the avatar
      avatar: z.union([z.string(), staticImageDataSchema]),
      github: z.string().optional(),
    }),
    z.object({
      github: z.string(),
      // if the author has no avatar, we'll take it from GitHub
      avatar: z.union([z.string(), staticImageDataSchema]).optional(),
    }),
  ]),
);

export type Author = z.infer<typeof Author>;

export const authors = {
  kamil: {
    name: 'Kamil Kisiela',
    link: 'https://x.com/kamilkisiela',
    github: 'kamilkisiela',
  },
  laurin: {
    name: 'Laurin Quast',
    link: 'https://twitter.com/n1rual',
    github: 'n1ru4l',
  },
  arda: {
    name: 'Arda Tanrikulu',
    link: 'https://twitter.com/ardatanrikulu',
    github: 'ardatan',
  },
  aleksandra: {
    name: 'Aleksandra Sikora',
    link: 'https://x.com/aleksandrasays',
    github: 'beerose',
  },
  jiri: {
    name: 'Jiri Spac',
    link: 'https://x.com/capajj',
    github: 'capaj',
  },
  dimitri: {
    name: 'Dimitri Postolov',
    link: 'https://x.com/dimaMachina_',
    github: 'dimaMachina',
  },
  denis: {
    name: 'Denis Badurina',
    link: 'https://github.com/enisdenjo',
    github: 'enisdenjo',
  },
  dotan: {
    name: 'Dotan Simha',
    link: 'https://github.com/dotansimha',
    github: 'dotansimha',
  },
  jdolle: {
    name: 'Jeff Dolle',
    link: 'https://github.com/jdolle',
    github: 'jdolle',
  },
  jason: {
    name: 'Jason Kuhrt',
    link: 'https://github.com/jasonkuhrt',
    github: 'jasonkuhrt',
  },
  valentin: {
    name: 'Valentin Cocaud',
    link: 'https://github.com/EmrysMyrddin',
    github: 'EmrysMyrddin',
  },
  tuval: {
    name: 'Tuval Simha',
    link: 'https://github.com/tuvalsimha',
    github: 'tuvalsimha',
  },
  uri: {
    name: 'Uri Goldshtein',
    link: 'https://github.com/Urigo',
    github: 'Urigo',
  },
  gil: {
    name: 'Gil Gardosh',
    link: 'https://github.com/gilgardosh',
    github: 'gilgardosh',
  },
  saihaj: {
    name: 'Saihajpreet Singh',
    link: 'https://github.com/saihaj',
    github: 'saihaj',
    avatar: saihajPhoto,
  },
  eytan: {
    name: 'Eytan Manor',
    link: 'https://twitter.com/eytan_manor',
    github: 'DAB0mB',
  },
  leonardo: {
    name: 'Leonardo Ascione',
    link: 'https://twitter.com/leonardfactory',
    github: 'leonardfactory',
  },
  niccolo: {
    name: 'Niccolo Belli',
    link: 'https://twitter.com/niccolobelli',
    github: 'darkbasic',
  },
  david: {
    name: 'David Yahalomi',
    link: 'https://twitter.com/DavidYahalomi',
    github: 'davidyaha',
  },
  enisdenjo: {
    name: 'Denis Badurina',
    link: 'https://twitter.com/enisdenjo',
    github: 'enisdenjo',
  },
  ephelan: {
    name: 'Enda Phelan',
    link: 'https://twitter.com/PhelanEnda',
    github: 'craicoverflow',
  },
  soichi: {
    name: 'Soichi Takamura',
    link: 'https://twitter.com/piglovesyou1',
    github: 'piglovesyou',
  },
  giladtidhar: {
    name: 'Gilad Tidhar',
    link: 'https://twitter.com/tidhar_gilad',
    github: 'giladd123',
  },
  gmac: {
    name: 'Greg MacWilliam',
    link: 'https://twitter.com/gmacwilliam',
    github: 'gmac',
  },
  croutonn: {
    name: 'Yuta Haga',
    link: 'https://twitter.com/croutnn',
    github: 'croutonn',
  },
  jycouet: {
    name: 'Jean-Yves Couët',
    link: 'https://twitter.com/jycouet',
    github: 'jycouet',
  },
  AlecAivazis: {
    name: 'Alec Aivazis',
    link: 'https://twitter.com/AlecAivazis',
    github: 'AlecAivazis',
  },
  tvvignesh: {
    name: 'Vignesh T.V.',
    link: 'https://twitter.com/techahoy',
    github: 'tvvignesh',
  },
  charlypoly: {
    name: 'Charly Poly',
    link: 'https://charlypoly.com',
    github: 'charlypoly',
  },
  maticzav: {
    name: 'Matic Zavadlal',
    link: 'https://twitter.com/maticzav',
    github: 'maticzav',
  },
  pablosz: {
    name: 'Pablo Sáez',
    link: 'https://twitter.com/PabloSz_',
    github: 'PabloSzx',
  },
  dimatill: {
    name: 'Dmitry Til',
    link: 'https://github.com/dimatill',
    github: 'dimatill',
  },
  gthau: {
    name: 'Ghislain Thau',
    link: 'https://github.com/gthau',
    github: 'gthau',
  },
  notrab: {
    name: 'Jamie Barton',
    link: 'https://graphql.wtf',
    github: 'notrab',
  },
  tuvalSimha: {
    name: 'Tuval Simha',
    link: 'https://twitter.com/SimhaTuval',
    github: 'TuvalSimha',
  },
  gabotechs: {
    name: 'Gabriel Musat',
    link: 'https://github.com/gabotechs',
    github: 'gabotechs',
  },
  shuding: {
    name: 'Shu Ding',
    link: 'https://shud.in',
    github: 'shuding',
  },
  eddeee888: {
    name: 'Eddy Nguyen',
    link: 'https://twitter.com/eddeee888',
    github: 'eddeee888',
  },
  tshedor: {
    name: 'Tim Shedor',
    link: 'https://github.com/tshedor',
    github: 'tshedor',
  },
  josiassejod1: {
    name: 'Dalvin Sejour',
    link: 'https://github.com/josiassejod1',
    github: 'josiassejod1',
  },
  warrenjday: {
    name: 'Warren Day',
    link: 'https://twitter.com/warrenjday',
    github: 'warrenjday',
  },
  jessevelden: {
    name: 'Jesse van der Velden',
    link: 'https://twitter.com/JesseVelden',
    github: 'jessevelden',
  },
  yassin: {
    name: 'Yassin Eldeeb',
    link: 'https://twitter.com/yassineldeeb7',
    github: 'yassineldeeb',
  },
  chimame: {
    name: 'Rito Tamata',
    link: 'https://twitter.com/chimame_rt',
    github: 'chimame',
  },
  nohehf: {
    name: 'Nohé Hinniger-Foray',
    link: 'https://twitter.com/NoheHf',
    github: 'nohehf',
  },
  egoodwinx: {
    name: 'Emily Goodwin',
    link: 'https://www.linkedin.com/in/emily-y-goodwin/',
    github: 'egoodwinx',
  },
  adam: {
    name: 'Adam Benhassen',
    link: 'https://github.com/adambenhassen',
    github: 'adambenhassen',
  },
  michael: {
    name: 'Michael Skorokhodov',
    link: 'https://github.com/mskorokhodov',
    github: 'mskorokhodov',
  },
  iha: {
    name: 'Iha Shin',
    link: 'https://github.com/XiNiHa',
    github: 'XiNiHa',
  },
} satisfies Record<string, Author>;

export type AuthorId = keyof typeof authors;

export const AuthorId = z.string().refine((val): val is AuthorId => val in authors, {
  message: `AuthorId must be one of: ${Object.keys(authors).join(', ')}`,
});

export const AuthorOrId = z.union([AuthorId, Author]);
export type AuthorOrId = z.infer<typeof AuthorOrId>;
