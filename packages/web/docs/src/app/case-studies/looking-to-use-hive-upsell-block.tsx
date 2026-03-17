import { cn, ContactButton, DecorationIsolation, Heading } from '@theguild/components';

export function LookingToUseHiveUpsellBlock({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        'text-green-1000 bg-primary dark:bg-primary/95 absolute rounded-2xl p-6',
        className,
      )}
    >
      <Heading as="h3" size="md">
        Looking to use Hive?
      </Heading>
      <DecorationIsolation>
        <Decoration className="absolute bottom-0 right-0" />
      </DecorationIsolation>
      <ContactButton
        variant="secondary-inverted"
        className="relative mt-[72px] dark:[&>div]:border-[#89A09E]"
        style={{ width: '100%' }}
      >
        Talk to us
      </ContactButton>
    </article>
  );
}

function Decoration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      {...props}
    >
      <path
        d="M5.45059 59.0739C2.2825 62.242 0.499999 66.5421 0.499999 71.0193L0.499998 159.5L32.8917 159.5L32.8917 59.4857C32.8917 44.797 44.797 32.8917 59.4857 32.8917L159.5 32.8917L159.5 0.500002L71.0193 0.500001C66.5421 0.500001 62.242 2.2825 59.0739 5.45059L33.7452 30.7792L30.7792 33.7452L5.45059 59.0739Z"
        stroke="url(#paint0_linear_3240_2323)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_3240_2323"
          x1="80"
          y1="83.6842"
          x2="5.00002"
          y2="2.63157"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#A2C1C4" stopOpacity="0" />
          <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
