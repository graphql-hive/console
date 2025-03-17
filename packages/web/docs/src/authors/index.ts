import type { StaticImageData } from 'next/image';
import saihajPhoto from './saihaj.webp';

export const AvatarFromGitHub = Symbol();
export type AvatarFromGitHub = typeof AvatarFromGitHub;

export type Author =
  | {
      name: string;
      link: `https://${string}`;
      github?: string;
      twitter?: string;
      avatar: string | StaticImageData;
    }
  | {
      name: string;
      link: `https://${string}`;
      github: string;
      twitter?: string;
      avatar: AvatarFromGitHub;
    };

export const authors = {
  kamil: {
    name: 'Kamil Kisiela',
    link: 'https://x.com/kamilkisiela',
    github: 'kamilkisiela',
    avatar: AvatarFromGitHub,
  },
  laurin: {
    name: 'Laurin Quast',
    link: 'https://x.com/n1rual',
    github: 'n1ru4l',
    avatar: AvatarFromGitHub,
  },
  arda: {
    name: 'Arda Tanrikulu',
    link: 'https://twitter.com/ardatanrikulu',
    github: 'ardatan',
    avatar: AvatarFromGitHub,
  },
  aleksandra: {
    name: 'Aleksandra Sikora',
    link: 'https://x.com/aleksandrasays',
    github: 'beerose',
    avatar: AvatarFromGitHub,
  },
  jiri: {
    name: 'Jiri Spac',
    link: 'https://x.com/capajj',
    github: 'capaj',
    avatar: AvatarFromGitHub,
  },
  dimitri: {
    name: 'Dimitri Postolov',
    link: 'https://x.com/dimaMachina_',
    github: 'dimaMachina',
    avatar: AvatarFromGitHub,
  },
  denis: {
    name: 'Denis Badurina',
    link: 'https://github.com/enisdenjo',
    github: 'enisdenjo',
    avatar: AvatarFromGitHub,
  },
  dotan: {
    name: 'Dotan Simha',
    link: 'https://github.com/dotansimha',
    github: 'dotansimha',
    avatar: AvatarFromGitHub,
  },
  jdolle: {
    name: 'Jeff Dolle',
    link: 'https://github.com/jdolle',
    github: 'jdolle',
    avatar: AvatarFromGitHub,
  },
  jason: {
    name: 'Jason Kuhrt',
    link: 'https://github.com/jasonkuhrt',
    github: 'jasonkuhrt',
    avatar: AvatarFromGitHub,
  },
  valentin: {
    name: 'Valentin Cocaud',
    link: 'https://github.com/EmrysMyrddin',
    github: 'EmrysMyrddin',
    avatar: AvatarFromGitHub,
  },
  tuval: {
    name: 'Tuval Simha',
    link: 'https://github.com/tuvalsimha',
    github: 'tuvalsimha',
    avatar: AvatarFromGitHub,
  },
  uri: {
    name: 'Uri Goldshtein',
    link: 'https://github.com/Urigo',
    github: 'Urigo',
    avatar: AvatarFromGitHub,
  },
  gil: {
    name: 'Gil Gardosh',
    link: 'https://github.com/gilgardosh',
    github: 'gilgardosh',
    avatar: AvatarFromGitHub,
  },
  saihaj: {
    name: 'Saihajpreet Singh',
    link: 'https://github.com/saihaj',
    github: 'saihaj',
    avatar: saihajPhoto,
  },
} satisfies Record<string, Author>;

export type AuthorId = keyof typeof authors;
