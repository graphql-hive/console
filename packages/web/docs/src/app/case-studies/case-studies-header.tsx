'use client';

import { cn, DecorationIsolation, Heading } from '@theguild/components';
import { SmallAvatar } from '../../components/small-avatar';
import { useFrontmatter } from '../../components/use-frontmatter';
import { CaseStudyAuthor, CaseStudyFrontmatter } from './case-study-types';
import { companyLogos } from './company-logos';

export function CaseStudiesHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  const { name, frontmatter } = useFrontmatter<CaseStudyFrontmatter>();

  if (!name) {
    throw new Error('unexpected');
  }

  const logo = companyLogos[name as keyof typeof companyLogos];

  return (
    <header
      {...props}
      className={cn('flex justify-between gap-8 pr-6 max-lg:flex-col lg:pr-2', props.className)}
    >
      <div className="max-w-[640px]">
        <Heading as="h1" size="md" className="max-sm:text-[32px]">
          {frontmatter.title}
        </Heading>
        <Authors authors={frontmatter.authors} className="mt-8" />
      </div>
      <LogoWithDecorations className="h-[224px] w-full max-w-[640px] shrink-0 max-lg:-order-1 max-sm:mb-6 lg:w-[320px] lg:max-xl:h-[180px] xl:w-[400px] lg:max-xl:[&>svg]:w-[140px] lg:max-xl:[&_svg]:h-[120px]">
        {logo}
      </LogoWithDecorations>
    </header>
  );
}

function Authors({ authors, className }: { authors: CaseStudyAuthor[]; className?: string }) {
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
