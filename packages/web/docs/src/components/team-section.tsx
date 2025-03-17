import Image from 'next/image';
import { CallToAction, cn, Heading } from '@theguild/components';
import { Author, authors, AvatarFromGitHub } from '../authors';
import { ArrowIcon } from './arrow-icon';

export function TeamSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'isolate max-w-full rounded-3xl bg-blue-400 px-4 py-6 lg:px-8 lg:py-16 xl:px-16 xl:py-[120px] [@media(min-width:1358px)]:px-24',
        className,
      )}
    >
      <div className="mx-auto flex max-w-full flex-col flex-wrap justify-center gap-x-2 lg:max-xl:w-max xl:h-[476px]">
        <Heading as="h3" size="md" className="text-green-1000 max-w-full text-balance xl:w-[468px]">
          Built by The Guild. Industry Veterans.
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
          className={cn(
            'max-xl:-mx-4 max-xl:max-w-[calc(100%-1rem)] max-xl:px-4 max-xl:py-6 max-lg:max-w-[calc(100%+2rem)] xl:ml-auto',
            teamMembers.length === 12 ? 'xl:w-[628px]' : 'xl:w-[664px]',
          )}
        />
      </div>
    </section>
  );
}

const teamMembers: Author[] = [
  authors.denis,
  authors.dotan,
  authors.gil,
  authors.kamil,
  authors.laurin,
  authors.saihaj,
  authors.tuval,
  authors.uri,
  authors.valentin,
  authors.jason,
  authors.arda,
  authors.jdolle,
];

function TeamGallery(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <ul
      {...props}
      className={cn(
        'nextra-scrollbar flex shrink-0 grid-cols-5 flex-row items-stretch justify-items-stretch gap-2 [scrollbar-color:#00000029_transparent] [scrollbar-width:auto] max-lg:overflow-auto lg:flex-wrap lg:gap-6 lg:max-xl:grid',
        '[--size:120px]',
        teamMembers.length <= 12 && 'grid-cols-6 xl:[&>:nth-child(8n-7)]:ml-[calc(var(--size)/2)]',
        teamMembers.length === 13 &&
          'grid-cols-5 xl:[--size:112px] xl:[&>:nth-child(9n-8)]:ml-[calc(var(--size)/2)]',
        teamMembers.length > 13 && 'nextra-scrollbar size-full flex-col p-1 xl:overflow-scroll',
        props.className,
      )}
    >
      {teamMembers.map((member, i) => (
        <li key={i}>
          <TeamAvatar data={member} />
        </li>
      ))}
    </ul>
  );
}

function TeamAvatar({ data: { name, avatar, link, github } }: { data: Author }) {
  return (
    <a
      className="group relative flex flex-col focus-visible:outline-none focus-visible:ring-transparent focus-visible:ring-offset-transparent"
      href={link}
      target="_blank"
      rel="noreferrer"
    >
      <div className="relative aspect-square min-h-[var(--size)] w-auto min-w-[var(--size)] flex-1 overflow-hidden rounded-2xl mix-blend-multiply ring-blue-500/0 ring-offset-2 transition-all hover:ring-4 hover:ring-blue-500/15 group-focus:ring-blue-500/40 group-focus-visible:ring-4 xl:w-[var(--size)]">
        <div className="firefox:hidden absolute inset-0 size-full bg-blue-100" />
        <Image
          alt=""
          className="firefox:bg-blend-multiply firefox:![filter:grayscale(1)] rounded-2xl bg-black brightness-100 grayscale transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
          {...(avatar === AvatarFromGitHub
            ? { src: `https://avatars.githubusercontent.com/${github}?v=4&s=180` }
            : typeof avatar === 'string'
              ? { src: avatar }
              : { blurDataURL: avatar.blurDataURL, src: avatar.src })}
          width={180}
          height={180}
        />
        <div className="absolute inset-0 size-full bg-blue-500 opacity-10 transition-all group-hover:opacity-20" />
      </div>
      <span className="text-green-1000 mt-2 block text-sm font-medium leading-5 lg:max-xl:block lg:max-xl:text-base">
        {name}
      </span>
    </a>
  );
}
