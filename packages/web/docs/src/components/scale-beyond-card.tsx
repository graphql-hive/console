import clsx from 'clsx';
import { ContactButton, DecorationIsolation, Heading } from '@theguild/components';

export function ScaleBeyondCard(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...props}
      className={clsx(
        'light bg-primary text-green-1000 dark:bg-primary/95 relative flex flex-col justify-between rounded-2xl px-6 py-8',
        props.className,
      )}
    >
      <CardDecoration />
      <Heading as="h2" size="md">
        Scale beyond Apollo
      </Heading>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="max-w-[420px] text-pretty">
          Share your stack and we’ll chart your gradual migration path so you keep shipping while
          you scale.
        </p>
        <ContactButton variant="secondary-inverted">Let's talk</ContactButton>
      </div>
    </section>
  );
}

function CardDecoration() {
  return (
    <DecorationIsolation>
      <svg width="177" height="176" className="absolute bottom-0 right-0">
        <path
          d="M120.733 0c-7.837 0-15.364 3.05743-20.9085 8.49126L56.7659 50.6867l-5.0422 4.9412L8.66503 97.8233C3.12005 103.257.00007032 110.633.00007033 118.312L-.0000038 366H56.7659V99.0984c0-24.0102 19.8584-43.4705 44.3601-43.4705H272V0H120.733Z"
          fill="url(#scale-nkjwfa)"
        />
        <defs>
          <linearGradient
            id="scale-nkjwfa"
            x1="181"
            y1="0"
            x2="44.5"
            y2="197"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#55998D" />
            <stop offset="1" stopColor="#245850" stopOpacity=".1" />
          </linearGradient>
        </defs>
      </svg>
    </DecorationIsolation>
  );
}
