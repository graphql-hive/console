import { useId } from 'react';
import {
  CallToAction,
  cn,
  ContactButton,
  DecorationIsolation,
  Heading,
} from '@theguild/components';

/**
 * This component differs from the `GetYourAPIGameRightSection`
 * from `@theguild/components` by having a list of items.
 */
export function GetYourAPIGameRightList({ className }: { className?: string }) {
  return (
    <section className={cn(className, 'bg-primary relative overflow-hidden rounded-3xl')}>
      <DecorationIsolation>
        <StrokeDecoration className="absolute right-0 top-[-184px] max-md:size-[312px] max-md:rotate-90 max-md:-scale-y-100 md:bottom-0 lg:right-[696px]" />
      </DecorationIsolation>
      <div className="flex items-stretch justify-between gap-x-8 gap-y-10 px-4 py-6 max-lg:flex-col md:items-center md:p-24 md:px-12 xl:px-[120px]">
        <Heading
          as="h2"
          size="md"
          className="text-[40px] leading-[1.2] tracking-[-0.2px] max-sm:text-balance max-sm:text-center max-sm:text-[32px]/[1.25] md:text-[56px] md:leading-[1.142586] md:tracking-[-0.56px]"
        >
          Get your
          <br className="max-lg:hidden" /> API game right.
        </Heading>
        <div>
          <ul className="flex shrink-0 flex-col gap-6 font-medium md:whitespace-nowrap xl:text-xl">
            <li className="flex gap-2 md:items-center">
              <CheckmarkCircle />
              Built by engineers to improve developer experience
            </li>
            <li className="flex gap-2 md:items-center">
              <CheckmarkCircle />
              Driven by customers
            </li>
            <li className="flex gap-2 md:items-center">
              <CheckmarkCircle />
              No vendor lock-in
            </li>
          </ul>
          <div className="mt-8 flex gap-x-4 gap-y-2 whitespace-pre max-sm:flex-col">
            <CallToAction variant="secondary-inverted" href="https://app.graphql-hive.com/">
              Get started for free
            </CallToAction>
            <ContactButton variant="tertiary">Talk to us</ContactButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckmarkCircle() {
  return (
    <div className="h-min grow-0 rounded-full border p-[3px] max-md:mt-px">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 17"
        fill="currentColor"
        className="translate-y-[0.5px]"
      >
        <path d="M6.66668 10.163L12.7947 4.03564L13.7373 4.97831L6.66668 12.049L2.42401 7.80631L3.36668 6.86364L6.66668 10.163Z" />
      </svg>
    </div>
  );
}

function StrokeDecoration(props: React.SVGAttributes<SVGSVGElement>) {
  const id = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="492"
      height="409"
      viewBox="0 0 492 409"
      {...props}
    >
      <path
        d="M475.973 311.082C485.909 301.145 491.5 287.658 491.5 273.616L491.5 0.5L389.821 0.499999L389.821 309.081C389.821 353.676 353.676 389.821 309.081 389.821L0.500001 389.821L0.5 491.5L273.616 491.5C287.658 491.5 301.145 485.909 311.082 475.973L388.967 398.088L398.088 388.967L475.973 311.082Z"
        stroke={`url(#${id})`}
        fill="none"
      />
      <defs>
        <linearGradient
          id={id}
          x1="246"
          y1="234.671"
          x2="476.625"
          y2="483.908"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A2C1C4" stopOpacity="0" />
          <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
