import {
  CallToAction,
  cn,
  ContactButton,
  DecorationIsolation,
  Heading,
} from '@theguild/components';

const GRADIENT_ID = 'arch-gradient-g7x9p2';

/**
 * This could be a `colorScheme="white"` or `variant="tertiary"` version of GetYourAPIGameRight
 * in an ideal world, but their decorations are different enough to warrant a separate one.
 */
export function GetYourAPIGameWhite(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...props}
      className={cn('relative mx-auto my-24 h-[348px] max-w-[90rem]', props.className)}
    >
      <div className="flex h-full flex-col items-center justify-center gap-10">
        <Heading size="lg" as="h2" className="text-green-1000 dark:text-white">
          Get your API game right.
        </Heading>
        <div className="flex gap-4">
          <CallToAction href="https://app.graphql-hive.com/" variant="secondary-inverted">
            Get started for free
          </CallToAction>
          <ContactButton variant="tertiary">Talk to us</ContactButton>
        </div>
      </div>
      <DecorationIsolation>
        <ArchDecoration className="top-6" />
        <ArchDecoration className="right-0 top-6 rotate-180" />
        <GradientDefs />
      </DecorationIsolation>
    </section>
  );
}

function ArchDecoration({ className }: { className?: string }) {
  return (
    <svg
      width="348"
      height="301"
      viewBox="0 0 348 301"
      fill="none"
      className={cn('absolute', className)}
    >
      <path
        d="M14.1268 159.403C5.40655 168.123 0.500031 179.959 0.500032 192.284L0.500013 299.875L89.7312 299.875L89.7312 161.118C89.7312 121.896 121.521 90.1062 160.743 90.1062L347.5 90.1061L347.5 0.87501L191.909 0.874992C179.584 0.874992 167.748 5.78152 159.028 14.5018L90.5847 82.9449L82.5699 90.9597L14.1268 159.403Z"
        stroke={`url(#${GRADIENT_ID})`}
      />
    </svg>
  );
}

export function GradientDefs() {
  return (
    <svg width="348" height="301" viewBox="0 0 348 301" fill="none" className="size-0">
      <defs>
        <linearGradient
          id={GRADIENT_ID}
          x1="186"
          y1="181.934"
          x2="9.37509"
          y2="5.30912"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A2C1C4" stopOpacity="0" />
          <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
