import { CallToAction, cn, Heading } from '@theguild/components';

export function NewsletterFormCard(props: React.HTMLAttributes<HTMLElement>) {
  return (
    <article
      {...props}
      className={cn(
        props.className,
        'bg-primary dark:bg-primary/95 light @container/card text-green-1000 relative rounded-2xl',
      )}
    >
      <div className="p-6 pb-0">
        <Heading
          as="h3"
          size="xs"
          className="@[354px]/card:text-5xl/[56px] @[354px]/card:tracking-[-0.48px]"
        >
          Stay in the loop
        </Heading>
        <p className="mt-4">
          Get the latest insights and best practices on GraphQL API management delivered straight to
          your inbox.
        </p>
      </div>
      <form className="relative z-10 p-6">
        {/* todo: add this to theguild/components */}
        <input
          placeholder="E-mail"
          className="hive-focus hover:placeholder:text-green-1000/60 w-full rounded-lg border border-blue-400 bg-white py-3 indent-4 font-medium placeholder:text-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-800/40 focus-visible:ring-0"
        />
        <CallToAction type="submit" variant="secondary-inverted" className="mt-2 !w-full">
          Subscribe
        </CallToAction>
      </form>
      <DecorationArch color="#A2C1C4" className="absolute bottom-0 right-0" />
    </article>
  );
}

function DecorationArch({ className, color }: { className?: string; color: string }) {
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none" className={className}>
      <path
        d="M6.72485 73.754C2.74132 77.7375 0.499999 83.1445 0.499999 88.7742L0.499998 199.5L41.2396 199.5L41.2396 74.3572C41.2396 56.0653 56.0652 41.2396 74.3571 41.2396L199.5 41.2396L199.5 0.500033L88.7741 0.500032C83.1444 0.500032 77.7374 2.74135 73.7539 6.72488L42.0931 38.3857L38.3856 42.0932L6.72485 73.754Z"
        stroke="url(#paint0_linear_2735_2359)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2735_2359"
          x1="100"
          y1="104.605"
          x2="6.24999"
          y2="3.28952"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
