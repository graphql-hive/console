import { DecorationIsolation, Heading, ProductCard, PRODUCTS } from '@theguild/components';
import EcosystemPageContent from './content.mdx';
import { EcosystemPageNavH2 } from './ecosystem-page-nav-h2';

export const components = {
  EcosystemHeader: (props: React.HTMLAttributes<HTMLDivElement>) => (
    <header
      className="relative isolate flex max-w-[90rem] flex-col items-center gap-6 overflow-visible rounded-3xl bg-blue-400 px-4 py-6 text-center sm:py-12 md:mx-2 md:gap-8 md:py-24 [&>h1]:max-w-[800px] [&>p]:max-w-[520px]"
      {...props}
    >
      <span className="font-medium">The Ecosystem</span>
      {props.children}
      <CrossDecoration />
      <nav className="top-full grid grid-flow-col rounded-2xl bg-blue-400 [grid-auto-columns:1fr] max-sm:w-full max-sm:grid-flow-row max-sm:bg-blue-300 sm:absolute sm:-translate-y-1/2">
        <EcosystemPageContent components={ecosystemPageNav} />
      </nav>
    </header>
  ),
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <Heading as="h1" size="xl" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h2" size="xs" className="mb-4 mt-24" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-green-800" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => {
    return (
      <ul
        className="mt-5 grid gap-5 p-4 last-of-type:mb-24 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        {...props}
      />
    );
  },
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => {
    const productName = String(props.children)
      .toUpperCase()
      .replace(' ', '_') as keyof typeof PRODUCTS;

    const product = PRODUCTS[productName];
    if (!product) {
      throw new Error(`Product ${productName} is missing`);
    }

    return <ProductCard as="li" product={product} className="h-[222px] max-md:w-auto" {...props} />;
  },
};

/**
 * Take all sections headings and render them as navigation links
 */
const ecosystemPageNav = {
  ...Object.fromEntries(Object.keys(components).map(key => [key, () => null])),
  h2: EcosystemPageNavH2,
};

function CrossDecoration() {
  return (
    <DecorationIsolation className="-z-10 [container-type:size] *:absolute">
      <ArchDecoration className="-left-10 sm:max-md:-top-20 [@media(width<1128px)]:left-1/2 [@media(width<1128px)]:translate-x-[calc(-100%-40px)]" />
      <ArchDecoration className="-right-10 scale-x-[-1] sm:max-md:-top-20 [@media(width<1128px)]:right-1/2 [@media(width<1128px)]:translate-x-[calc(100%+40px)]" />
      <ArchDecoration className="-right-10 bottom-0 rotate-180 sm:max-md:-bottom-20 [@media(width<1128px)]:right-1/2 [@media(width<1128px)]:translate-x-[calc(100%+40px)]" />
      <ArchDecoration className="-left-10 bottom-0 scale-y-[-1] sm:max-md:-bottom-20 [@media(width<1128px)]:left-1/2 [@media(width<1128px)]:translate-x-[calc(-100%-40px)]" />
    </DecorationIsolation>
  );
}

function ArchDecoration({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="569"
      height="228"
      viewBox="0 0 569 228"
      fill="none"
      className={className}
    >
      <path
        d="M569 37.1357C569 49.5249 564.068 61.4232 555.302 70.1892L487.231 138.26L479.26 146.231L411.189 214.302C402.423 223.068 390.525 228 378.136 228L-16 228L-16 138.26L409.132 138.26C447.866 138.26 479.26 106.866 479.26 68.1321L479.26 3.92267e-06L569 0L569 37.1357Z"
        fill="url(#paint0_linear_2003_9841)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2003_9841"
          x1="-16"
          y1="178.5"
          x2="293.759"
          y2="370.89"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
