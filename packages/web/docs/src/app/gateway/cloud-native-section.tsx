import { cn, DecorationIsolation, Heading } from '@theguild/components';

export function CloudNativeSection({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'bg-green-1000 relative rounded-3xl px-4 py-6 text-white md:px-8 md:py-16 xl:p-24',
        className,
      )}
      {...rest}
    >
      <div className="lg:w-[630px]">
        <Heading as="h2" size="md">
          Cloud Native Nature
        </Heading>
        <p className="mt-6 text-white/80">
          As modern teams expect their tools to work seamlessly in serverless environments, Hive
          Gateway is highly versatile and cloud-ready.
        </p>
        <div className="mt-8 flex gap-2 max-sm:flex-col max-sm:border-t max-sm:border-green-700 max-sm:pt-4 sm:mt-12 sm:gap-12">
          <strong className="block basis-1/2 font-medium md:text-xl/7">
            Cloud-Native & Serverless Support
          </strong>
          <p className="basis-1/2 text-white/80">
            Optimized for deployment in modern cloud and serverless environments such as AWS Lambda
            and Cloudflare Workers, demonstrating high scalability and flexibility.
          </p>
        </div>
      </div>
      <DecorationIsolation className="max-lg:hidden">
        <svg
          width="642"
          height="709"
          fill="none"
          className="absolute right-0 top-1/2 size-[709px] -translate-y-1/2"
        >
          <path
            d="M203.098 554.406h344.1c17.726.082 35.289-3.387 51.654-10.201 16.364-6.814 31.198-16.836 43.628-29.474 12.43-12.638 22.203-27.637 28.744-44.113 6.541-16.475 9.717-34.093 9.341-51.816-.376-17.722-4.297-35.19-11.531-51.373-7.234-16.183-17.635-30.754-30.59-42.853-12.955-12.1-28.201-21.483-44.84-27.596-16.485-6.057-34.005-8.783-51.547-8.023-2.533-40.625-20.424-78.773-50.055-106.698-29.751-28.037-69.089-43.68-109.969-43.677-56.531 0-106.159 29.263-134.697 73.365-23.813-6.223-48.677-7.325-72.95-3.232-24.392 4.113-47.627 13.378-68.157 27.177-20.5297 13.799-37.8824 31.816-50.9014 52.849-13.019 21.034-21.4053 44.6-24.5998 69.13-3.1946 24.529-1.1241 49.457 6.0734 73.124 7.1976 23.666 19.3569 45.526 35.6675 64.123 16.3105 18.597 36.3973 33.504 58.9223 43.728 22.525 10.223 46.971 15.528 71.707 15.56Z"
            stroke="url(#a)"
          />
          <path
            d="M350.288 242v-.5h-37.636v.5l.001 61.813c0 10.224-8.316 18.508-18.587 18.508H231.5v37.487h40.473c5.131 0 10.052-2.03 13.68-5.644l58.969-58.737c3.628-3.613 5.666-8.514 5.666-13.625V242Zm8.924-.5h-.5v40.302c0 5.111 2.038 10.012 5.666 13.625l58.969 58.737c3.628 3.614 8.549 5.644 13.68 5.644H477.5v-37.487h-62.566c-10.271 0-18.586-8.284-18.586-18.508V241.5h-37.136Zm-9.424 245h.5v-40.302c0-5.111-2.038-10.012-5.666-13.625l-58.969-58.737c-3.628-3.614-8.549-5.644-13.68-5.644H231.5v37.487h62.566c10.271 0 18.587 8.284 18.587 18.508L312.652 486v.5h37.136Zm8.924-.5v.5h37.636v-62.313c0-10.224 8.315-18.508 18.586-18.508H477.5v-37.487h-40.473c-5.131 0-10.052 2.03-13.68 5.644l-58.969 58.737c-3.628 3.613-5.666 8.514-5.666 13.625V486Zm14.366-140.004v-.5h-37.156v37.008h37.156v-36.508Z"
            stroke="url(#b)"
          />
          <defs>
            <linearGradient
              id="a"
              x1="29.7701"
              y1="139.082"
              x2="405.93"
              y2="728.791"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" stopOpacity=".1" />
              <stop offset="1" stopColor="#fff" stopOpacity=".4" />
            </linearGradient>
            <linearGradient
              id="b"
              x1="232"
              y1="242"
              x2="475.998"
              y2="486.998"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" stopOpacity=".1" />
              <stop offset="1" stopColor="#fff" stopOpacity=".4" />
            </linearGradient>
          </defs>
        </svg>
      </DecorationIsolation>
    </section>
  );
}
