import { CallToAction, DecorationIsolation, Heading } from '@theguild/components';
import { cn } from '../lib';

export function GotAnIdeaSection({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center rounded-3xl bg-[#003834] px-4 py-6 lg:px-8 lg:py-16 xl:p-24',
        className,
      )}
    >
      <DecorationIsolation>
        <svg
          className="absolute right-[481px] top-[-29px] overflow-visible"
          width="930"
          height="373"
          viewBox="0 0 930 373"
          fill="none"
        >
          <g opacity="0.5" filter="url(#filter0_f_2003_9852)">
            <path
              d="M489.136 401C501.525 401 513.423 396.068 522.189 387.302L590.26 319.231L598.231 311.26L666.302 243.189C675.068 234.423 680 222.525 680 210.136L680 -29L590.26 -29L590.26 241.132C590.26 279.866 558.866 311.26 520.132 311.26L250 311.26L250 401L489.136 401Z"
              fill="#A2C1C4"
            />
          </g>
          <defs>
            <filter
              id="filter0_f_2003_9852"
              x="0"
              y="-279"
              width="930"
              height="930"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
              <feGaussianBlur stdDeviation="125" result="effect1_foregroundBlur_2003_9852" />
            </filter>
          </defs>
        </svg>
        <svg
          width="1392"
          height="373"
          viewBox="0 0 1392 373"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M530.948 3.83562C539.62 -4.8367 544.5 -16.6079 544.5 -28.8644L544.5 -65.5L455.76 -65.5L455.76 2.1321C455.76 41.1421 424.142 72.7599 385.132 72.7599L-39.5 72.7599L-39.5 161.5L354.136 161.5C366.392 161.5 378.163 156.62 386.836 147.948L454.906 79.8775L462.877 71.9063L530.948 3.83562Z"
            stroke="url(#paint0_linear_2003_9879)"
          />
          <path
            d="M861.052 3.83562C852.38 -4.8367 847.5 -16.6079 847.5 -28.8644L847.5 -65.5L936.24 -65.5L936.24 2.1321C936.24 41.1421 967.858 72.7599 1006.87 72.7599L1431.5 72.7599L1431.5 161.5L1037.86 161.5C1025.61 161.5 1013.84 156.62 1005.16 147.948L937.094 79.8775L929.123 71.9063L861.052 3.83562Z"
            stroke="url(#paint1_linear_2003_9879)"
          />
          <path
            d="M530.948 368.164C539.62 376.837 544.5 388.608 544.5 400.864L544.5 437.5L455.76 437.5L455.76 369.868C455.76 330.858 424.142 299.24 385.132 299.24L-39.5 299.24L-39.5 210.5L354.136 210.5C366.392 210.5 378.163 215.38 386.836 224.052L454.906 292.123L462.877 300.094L530.948 368.164Z"
            stroke="url(#paint2_linear_2003_9879)"
          />
          <path
            d="M861.052 368.164C852.38 376.837 847.5 388.608 847.5 400.864L847.5 437.5L936.24 437.5L936.24 369.868C936.24 330.858 967.858 299.24 1006.87 299.24L1431.5 299.24L1431.5 210.5L1037.86 210.5C1025.61 210.5 1013.84 215.38 1005.16 224.052L937.094 292.123L929.123 300.094L861.052 368.164Z"
            stroke="url(#paint3_linear_2003_9879)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_2003_9879"
              x1="252.5"
              y1="48"
              x2="329.643"
              y2="245.934"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A2C1C4" stopOpacity="0" />
              <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_2003_9879"
              x1="1139.5"
              y1="48"
              x2="1062.36"
              y2="245.934"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A2C1C4" stopOpacity="0" />
              <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient
              id="paint2_linear_2003_9879"
              x1="252.5"
              y1="324"
              x2="329.643"
              y2="126.066"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A2C1C4" stopOpacity="0" />
              <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient
              id="paint3_linear_2003_9879"
              x1="1139.5"
              y1="324"
              x2="1062.36"
              y2="126.066"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#A2C1C4" stopOpacity="0" />
              <stop offset="1" stopColor="#A2C1C4" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </DecorationIsolation>
      <Heading as="h2" size="md" className="text-white">
        Got an idea for a new library?
      </Heading>
      <p className="mt-4 text-white/80">
        Join our community to chat with us and let's build something together!
      </p>
      <CallToAction
        href="https://the-guild.dev/contact"
        variant="primary-inverted"
        className="mt-8"
        onClick={event => {
          if (window.$crisp) {
            event.preventDefault();
            window.$crisp?.push(['do', 'chat:open']);
          }
        }}
      >
        Get in touch
      </CallToAction>
    </div>
  );
}
