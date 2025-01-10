'use client';

import { cn, DecorationIsolation, Heading, useConfig } from '@theguild/components';
import { SoundYXZLogo } from '../../components/company-logos';
import { SmallAvatar } from '../../components/small-avatar';

type Meta = {
  title: string;
  description?: string;
  authors: Author[];
};

type Author = {
  name: string;
  position?: string;
  avatar?: string;
};

const logos = {
  'sound-xyz': <SoundYXZLogo width={193} height={64} />,
};

export function CaseStudiesHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const normalizePagesResult = useConfig().normalizePagesResult;
  const metadata = normalizePagesResult.activeMetadata as Meta;

  const name = normalizePagesResult.activePath.at(-1)?.name;

  if (!name) {
    throw new Error('unexpected');
  }

  const logo = logos[name as keyof typeof logos];

  return (
    <header {...props}>
      <LogoWithDecorations className="h-[224px] w-full max-sm:mb-6 sm:w-[360px] sm:max-2xl:hidden 2xl:absolute 2xl:translate-x-[688px]">
        {logo}
      </LogoWithDecorations>
      <Heading as="h1" size="md" className="max-sm:text-[32px]">
        {metadata.title}
      </Heading>
      <Authors authors={metadata.authors} className="mt-8" />
    </header>
  );
}

function Authors({ authors, className }: { authors: Author[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-4 text-sm', className)}>
      {authors.map(author => (
        <li className="flex items-center gap-3" key={author.name}>
          {author.avatar && <SmallAvatar src={author.avatar} />}
          <span className="font-medium">{author.name}</span>
          <span>{author.position}</span>
        </li>
      ))}
    </ul>
  );
}

function LogoWithDecorations({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {children}
      <DecorationIsolation>
        <WideArchDecoration className="absolute right-0 top-0 dark:opacity-10" />
        <WideArchDecoration className="absolute bottom-0 left-0 rotate-180 dark:opacity-10" />
        <WideArchDecorationDefs />
      </DecorationIsolation>
    </div>
  );
}

function WideArchDecoration({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="162"
      height="161"
      viewBox="0 0 162 161"
      fill="none"
      className={className}
    >
      <path
        d="M161.133 160L161.133 160.133L161 160.133L112.877 160.133L112.743 160.133L112.743 160L112.743 85.7294C112.743 65.0319 95.9681 48.2566 75.2706 48.2566L1.00007 48.2566L0.866737 48.2566L0.866737 48.1233L0.866745 -2.79986e-05L0.866745 -0.133361L1.00008 -0.133361L58.6487 -0.133339C65.3279 -0.133338 71.7422 2.5257 76.468 7.25144L112.971 43.7544L117.246 48.029L153.749 84.532C158.474 89.2578 161.133 95.6722 161.133 102.351L161.133 160Z"
        fill="url(#paint0_linear_2522_12246)"
        stroke="url(#paint1_linear_2522_12246)"
        strokeWidth="0.266667"
      />
    </svg>
  );
}

function WideArchDecorationDefs() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="162"
      height="161"
      viewBox="0 0 162 161"
      fill="none"
    >
      <defs>
        <linearGradient
          id="paint0_linear_2522_12246"
          x1="143.326"
          y1="19.5349"
          x2="48.814"
          y2="126.512"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F1EEE4" stopOpacity="0" />
          <stop offset="1" stopColor="#F1EEE4" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2522_12246"
          x1="161"
          y1="0"
          x2="1"
          y2="160"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.1" />
          <stop offset="1" stopColor="white" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
