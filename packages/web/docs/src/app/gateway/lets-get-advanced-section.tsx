import { CallToAction, cn, Heading, InfoCard, TargetIcon } from '@theguild/components';

export function LetsGetAdvancedSection({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('px-4 py-6 sm:py-12 md:px-6 lg:py-16 xl:px-24 xl:pb-24', className)}
      {...rest}
    >
      <Heading as="h2" size="md" className="text-center">
        Let's get advanced
      </Heading>
      <p className="mt-4 text-pretty text-center text-green-800">
        Hive Gateway features a set of advanced GraphQL features.
      </p>
      <div className="nextra-scrollbar overflow-auto max-sm:-m-4 max-sm:p-4">
        <ul className="mt-6 flex gap-6 *:flex *:flex-col *:rounded-3xl max-sm:*:w-80 max-sm:*:shrink-0 sm:grid sm:grid-cols-2 md:mt-8 md:*:p-8 lg:mt-12 xl:mt-16 xl:grid-cols-4 [&>*>:last-child]:contents [&>*>h3]:mb-4">
          <InfoCard
            icon={<ArrowRightWallIcon />}
            heading="GraphQL Subscriptions"
            // moved to the last place, because it's the shortest
            // and it looks like it has too much spacing without seeing other cards
            className="max-sm:order-10"
          >
            Supports real-time data streaming capabilities crucial for dynamic user experiences.
            <div
              className="grow" /* we're using a spacer div here bcs mt-[min(20px,auto)] is not supported */
            />
            <CallToAction
              variant="tertiary"
              className="!mt-5 xl:w-full"
              href="/docs/gateway/deployment/node-frameworks/uwebsockets#subscriptions-with-websockets"
            >
              Documentation
            </CallToAction>
          </InfoCard>
          <InfoCard icon={<CogIcon />} heading="@defer and @stream Support">
            Allows more efficient data loading patterns, improving user interface responsiveness and
            system performance.
            <div className="grow" />
            <CallToAction
              variant="tertiary"
              className="!mt-5 xl:w-full"
              href="/docs/gateway/defer-stream"
            >
              Documentation
            </CallToAction>
          </InfoCard>
          <InfoCard icon={<StackIcon />} heading="Request Batching">
            Reduces network overhead by enabling multiple GraphQL operations in a single HTTP
            request, enhancing data retrieval efficiency.
            <div className="grow" />
            <CallToAction
              variant="tertiary"
              className="!mt-5 xl:w-full"
              href="/docs/gateway/other-features/performance/request-batching"
            >
              Documentation
            </CallToAction>
          </InfoCard>
          <InfoCard icon={<TargetIcon />} heading="Demand Control">
            Facilitates efficient management of API resources by setting limits on query complexity
            and execution depth, tailored for high-demand cloud environments.
            <div className="grow" />
            <CallToAction
              variant="tertiary"
              className="!mt-5 xl:w-full"
              href="/docs/gateway/other-features/security"
            >
              Documentation
            </CallToAction>
          </InfoCard>
        </ul>
      </div>
    </section>
  );
}

function ArrowRightWallIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12.172 10.9999L7.515 6.34293L8.929 4.92993L15.999 11.9999L8.929 19.0709L7.515 17.6569L12.17 12.9999H3V10.9999H12.172ZM18 18.9999V4.99993H20V18.9999H18Z" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.68601 3.99988L11.293 1.39288C11.4805 1.20541 11.7348 1.1001 12 1.1001C12.2652 1.1001 12.5195 1.20541 12.707 1.39288L15.314 3.99988H19C19.2652 3.99988 19.5196 4.10524 19.7071 4.29278C19.8946 4.48031 20 4.73467 20 4.99988V8.68588L22.607 11.2929C22.7945 11.4804 22.8998 11.7347 22.8998 11.9999C22.8998 12.265 22.7945 12.5194 22.607 12.7069L20 15.3139V18.9999C20 19.2651 19.8946 19.5195 19.7071 19.707C19.5196 19.8945 19.2652 19.9999 19 19.9999H15.314L12.707 22.6069C12.5195 22.7944 12.2652 22.8997 12 22.8997C11.7348 22.8997 11.4805 22.7944 11.293 22.6069L8.68601 19.9999H5.00001C4.73479 19.9999 4.48044 19.8945 4.2929 19.707C4.10536 19.5195 4.00001 19.2651 4.00001 18.9999V15.3139L1.39301 12.7069C1.20554 12.5194 1.10022 12.265 1.10022 11.9999C1.10022 11.7347 1.20554 11.4804 1.39301 11.2929L4.00001 8.68588V4.99988C4.00001 4.73467 4.10536 4.48031 4.2929 4.29278C4.48044 4.10524 4.73479 3.99988 5.00001 3.99988H8.68601ZM6.00001 5.99988V9.51488L3.51501 11.9999L6.00001 14.4849V17.9999H9.51501L12 20.4849L14.485 17.9999H18V14.4849L20.485 11.9999L18 9.51488V5.99988H14.485L12 3.51488L9.51501 5.99988H6.00001ZM12 15.9999C10.9391 15.9999 9.92173 15.5785 9.17158 14.8283C8.42143 14.0782 8.00001 13.0608 8.00001 11.9999C8.00001 10.939 8.42143 9.9216 9.17158 9.17146C9.92173 8.42131 10.9391 7.99988 12 7.99988C13.0609 7.99988 14.0783 8.42131 14.8284 9.17146C15.5786 9.9216 16 10.939 16 11.9999C16 13.0608 15.5786 14.0782 14.8284 14.8283C14.0783 15.5785 13.0609 15.9999 12 15.9999ZM12 13.9999C12.5304 13.9999 13.0391 13.7892 13.4142 13.4141C13.7893 13.039 14 12.5303 14 11.9999C14 11.4695 13.7893 10.9607 13.4142 10.5857C13.0391 10.2106 12.5304 9.99988 12 9.99988C11.4696 9.99988 10.9609 10.2106 10.5858 10.5857C10.2107 10.9607 10 11.4695 10 11.9999C10 12.5303 10.2107 13.039 10.5858 13.4141C10.9609 13.7892 11.4696 13.9999 12 13.9999Z" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.083 15.2L21.285 15.921C21.3591 15.9654 21.4205 16.0283 21.4631 16.1035C21.5058 16.1787 21.5282 16.2636 21.5282 16.35C21.5282 16.4365 21.5058 16.5214 21.4631 16.5966C21.4205 16.6718 21.3591 16.7347 21.285 16.779L12.515 22.041C12.3594 22.1345 12.1814 22.1839 12 22.1839C11.8185 22.1839 11.6405 22.1345 11.485 22.041L2.71498 16.779C2.64082 16.7347 2.57944 16.6718 2.53682 16.5966C2.4942 16.5214 2.4718 16.4365 2.4718 16.35C2.4718 16.2636 2.4942 16.1787 2.53682 16.1035C2.57944 16.0283 2.64082 15.9654 2.71498 15.921L3.91698 15.2L12 20.05L20.083 15.2ZM20.083 10.5L21.285 11.221C21.3591 11.2654 21.4205 11.3283 21.4631 11.4035C21.5058 11.4787 21.5282 11.5636 21.5282 11.65C21.5282 11.7365 21.5058 11.8214 21.4631 11.8966C21.4205 11.9718 21.3591 12.0347 21.285 12.079L12 17.649L2.71498 12.079C2.64082 12.0347 2.57944 11.9718 2.53682 11.8966C2.4942 11.8214 2.4718 11.7365 2.4718 11.65C2.4718 11.5636 2.4942 11.4787 2.53682 11.4035C2.57944 11.3283 2.64082 11.2654 2.71498 11.221L3.91698 10.5L12 15.35L20.083 10.5ZM12.514 1.30905L21.285 6.57105C21.3591 6.61544 21.4205 6.6783 21.4631 6.75348C21.5058 6.82867 21.5282 6.91362 21.5282 7.00005C21.5282 7.08647 21.5058 7.17142 21.4631 7.24661C21.4205 7.3218 21.3591 7.38465 21.285 7.42905L12 12.999L2.71498 7.43005C2.64082 7.38565 2.57944 7.3228 2.53682 7.24761C2.4942 7.17242 2.4718 7.08747 2.4718 7.00105C2.4718 6.91462 2.4942 6.82967 2.53682 6.75448C2.57944 6.6793 2.64082 6.61644 2.71498 6.57205L11.485 1.31005C11.6405 1.2166 11.8185 1.16724 12 1.16724C12.1814 1.16724 12.3594 1.2166 12.515 1.31005M12 3.33205L5.88698 7.00005L12 10.668L18.113 7.00005L12 3.33205Z" />
    </svg>
  );
}
