'use client';

export const EcosystemPageNavH2 = (props: React.HTMLAttributes<HTMLHeadingElement>) => (
  <a
    href={`#${props.id}`}
    className="hive-focus focus-visible:text-green-1000 hover:text-green-1000 overflow-visible text-nowrap rounded-2xl px-4 py-3 font-medium text-green-800 transition hover:bg-white/10 focus:z-10 focus-visible:bg-white/10 focus-visible:ring-inset sm:py-5 sm:max-md:px-1"
    onKeyDown={event => {
      if (event.key === 'ArrowLeft') {
        const previousElement = event.currentTarget.previousElementSibling;
        if (previousElement) {
          (previousElement as HTMLElement).focus();
        }
      } else if (event.key === 'ArrowRight') {
        const nextElement = event.currentTarget.nextElementSibling;
        if (nextElement) {
          (nextElement as HTMLElement).focus();
        }
      }
    }}
  >
    {props.children}
  </a>
);
