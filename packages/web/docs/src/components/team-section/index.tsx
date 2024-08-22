import Image, { StaticImageData } from 'next/image';
import { GlobeIcon } from '@radix-ui/react-icons';
import { DiscordIcon, GitHubIcon, TwitterIcon } from '@theguild/components';
import { cn } from '../../lib';
import { ArrowIcon } from '../arrow-icon';
import { CallToAction } from '../call-to-action';
import { Heading } from '../heading';
import dimaPhoto from './dima.webp';
import noamPhoto from './noam.webp';
import saihajPhoto from './saihaj.webp';

export function TeamSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'rounded-3xl bg-blue-400 px-4 py-6 lg:px-8 lg:py-16 xl:px-16 xl:py-[120px] [@media(min-width:1358px)]:px-24',
        className,
      )}
    >
      <div className="mx-auto flex grid-cols-1 flex-col flex-wrap justify-center lg:max-xl:w-max xl:h-[476px]">
        <Heading as="h3" size="md" className="text-green-1000 max-w-full text-balance xl:w-[468px]">
          Built by The Guild. Industry veterans.
        </Heading>

        <p className="mt-4 w-[468px] max-w-full text-green-800 lg:mt-6">
          Contrary to most, we believe in long-term sight, not temporary growth. We believe in
          extreme quality, not scrappy pivots. We believe in open, not locked. We fight for a world
          where software liberates, not confines — ensuring technology serves, not subjugates.
        </p>

        <CallToAction
          variant="secondary-inverted"
          href="https://the-guild.dev/"
          target="_blank"
          rel="noreferrer"
          className="max-xl:order-1 max-md:w-full xl:mt-12"
        >
          Visit The Guild
          <ArrowIcon />
        </CallToAction>

        <TeamGallery
          className="max-xl:-mx-4 max-xl:max-w-[calc(100%-1rem)] max-xl:px-4 max-xl:py-6 max-lg:max-w-[calc(100%+2rem)] xl:w-[664px]"
          style={{
            '--size': '120px',
          }}
        />
      </div>
    </section>
  );
}

type TeamMember = [name: string, avatar: string | StaticImageData, social: string];
const team: TeamMember[] = [
  [
    'Denis Badurina',
    'https://avatars.githubusercontent.com/enisdenjo?v=4&s=180',
    'https://github.com/enisdenjo',
  ],
  ['Dimitri Postolov', dimaPhoto, 'https://github.com/dimaMachina'],
  [
    'Dotan Simha',
    'https://avatars.githubusercontent.com/dotansimha?v=4&s=180',
    'https://github.com/dotansimha',
  ],
  [
    'Gil Gardosh',
    'https://avatars.githubusercontent.com/gilgardosh?v=4&s=180',
    'https://github.com/gilgardosh',
  ],

  [
    'Kamil Kisiela',
    'https://avatars.githubusercontent.com/kamilkisiela?v=4&s=180',
    'https://github.com/kamilkisiela',
  ],
  [
    'Laurin Quast',
    'https://avatars.githubusercontent.com/n1ru4l?v=4&s=180',
    'https://github.com/n1ru4l',
  ],
  ['Noam Malka', noamPhoto, 'https://noam-malka.com/'],
  ['Saihajpreet Singh', saihajPhoto, 'https://github.com/saihaj'],

  [
    'Tuval Simha',
    'https://avatars.githubusercontent.com/tuvalsimha?v=4&s=180',
    'https://github.com/tuvalsimha',
  ],
  [
    'Uri Goldshtein',
    'https://avatars.githubusercontent.com/Urigo?v=4&s=180',
    'https://github.com/Urigo',
  ],
  [
    'Valentin Cocaud',
    'https://avatars.githubusercontent.com/EmrysMyrddin?v=4&s=180',
    'https://github.com/EmrysMyrddin',
  ],
  [
    'Yassin Eldeeb',
    'https://avatars.githubusercontent.com/YassinEldeeb?v=4&s=180',
    'https://github.com/YassinEldeeb',
  ],
  [
    'Arda Tanrikulu',
    'https://avatars.githubusercontent.com/ardatan?v=4&s=180',
    'https://github.com/ardatan',
  ],
];

function TeamGallery(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <ul
      {...props}
      className={cn(
        'flex flex-row gap-2 max-lg:overflow-auto lg:flex-wrap lg:gap-4' +
          ' shrink-0 xl:[&>:nth-child(9n-8)]:ml-[calc(var(--size)/2)]' +
          ' grid-cols-5 items-stretch justify-items-stretch lg:max-xl:grid',
        props.className,
      )}
    >
      {team.map((member, i) => (
        <TeamAvatar key={i} data={member} />
      ))}
    </ul>
  );
}

function TeamAvatar({ data: [name, avatar, social] }: { data: TeamMember }) {
  return (
    <div className="flex flex-col">
      <a
        className={
          'absolute right-0 top-0 rounded-2xl border-2 bg-[#222530] p-[9px] text-white hover:border-blue-400 xl:rounded-full' +
          ' border-transparent xl:-translate-y-1/2 xl:translate-x-1/2' +
          ' max-xl:min-size-[var(--size)] ease duration-250 z-10 transition-colors max-xl:opacity-0'
        }
        href={social}
      >
        {social.startsWith('https://github.com') ? (
          <GitHubIcon className="size-[14px]" />
        ) : social.startsWith('https://discord.com') ? (
          <DiscordIcon className="size-[14px]" />
        ) : social.startsWith('https://twitter.com') ? (
          <TwitterIcon className="size-[14px]" />
        ) : (
          <GlobeIcon className="size-[14px]" />
        )}
      </a>
      <div className="relative aspect-square min-h-[var(--size)] w-auto min-w-[var(--size)] flex-1 overflow-hidden rounded-2xl mix-blend-multiply xl:w-[var(--size)]">
        <div className="absolute inset-0 size-full bg-blue-200" />
        <Image
          alt=""
          className="rounded-2xl bg-black grayscale"
          {...(typeof avatar === 'string' ? { src: avatar } : avatar)}
          width={180}
          height={180}
        />
      </div>
      <span className="text-green-1000 mt-2 block text-sm font-medium leading-5 lg:max-xl:block lg:max-xl:text-base">
        {name}
      </span>
    </div>
  );
}
