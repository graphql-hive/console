import { ArchDecoration, cn, DecorationIsolation, Heading } from '@theguild/components';

export function BlogPageHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-beige-200 relative isolate flex max-w-[90rem] flex-col items-center justify-center gap-8 overflow-hidden rounded-3xl px-4 py-6 max-md:min-h-[240px] sm:py-12 lg:py-24 dark:bg-neutral-900',
        className,
      )}
    >
      <DecorationIsolation className="dark:opacity-85">
        <ArchDecoration className="pointer-events-none absolute -top-64 left-[-60px] rotate-180 max-md:-left-64" />
        <ArchDecoration className="pointer-events-none absolute -bottom-64 right-0 max-md:-right-64" />
        <svg width="432" height="432" viewBox="0 0 432 432" className="absolute -z-10">
          <defs>
            <linearGradient
              id="arch-decoration-a"
              x1="48.5"
              y1="53.5"
              x2="302.5"
              y2="341"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" stopOpacity="0.3" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <linearGradient
              id="arch-decoration-b"
              x1="1"
              y1="1"
              x2="431"
              y2="431"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </DecorationIsolation>
      <Heading
        as="h1"
        size="xl"
        className="text-green-1000 z-0 mx-auto max-w-3xl text-center max-md:!text-5xl dark:text-white"
      >
        GraphQL Stories
      </Heading>
      <p className="z-0 mx-auto max-w-[80%] text-center leading-6 text-green-800 dark:text-white/80">
        Explore insights on managing and optimizing your GraphQL APIs
      </p>
    </div>
  );
}
