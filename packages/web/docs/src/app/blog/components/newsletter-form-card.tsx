'use client';

import { useRef, useState } from 'react';
import { CallToAction, cn, Heading, Input } from '@theguild/components';

export function NewsletterFormCard(props: React.HTMLAttributes<HTMLElement>) {
  type Idle = undefined;
  type Pending = { status: 'pending'; message?: never };
  type Success = { status: 'success'; message: string };
  type Error = { status: 'error'; message: string };
  type State = Idle | Pending | Success | Error;
  const [state, setState] = useState<State>();

  // we don't want to blink a message on retries when request is pending
  const lastErrorMessage = useRef<string>();
  lastErrorMessage.current = state?.message || lastErrorMessage.current;

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
        <p className="relative mt-4">
          Get the latest insights and best practices on GraphQL API management delivered straight to
          your inbox.
        </p>
      </div>
      <form
        className="relative z-10 p-6"
        onSubmit={async event => {
          event.preventDefault();
          const email = event.currentTarget.email.value;

          if (!email?.includes('@')) {
            setState({ status: 'error', message: 'Please enter a valid email address.' });
            return;
          }

          setState({ status: 'pending' });

          try {
            const response = await fetch('https://utils.the-guild.dev/api/newsletter-subscribe', {
              body: JSON.stringify({ email }),
              method: 'POST',
            });

            const json = await response.json();
            if (json.status === 'success') {
              lastErrorMessage.current = undefined;
              setState({ status: 'success', message: json.message });
            } else {
              setState({ status: 'error', message: json.message });
            }
          } catch (e: unknown) {
            if (!navigator.onLine) {
              setState({
                status: 'error',
                message: 'Please check your internet connection and try again.',
              });
            }

            if (e instanceof Error && e.message !== 'Failed to fetch') {
              setState({ status: 'error', message: e.message });
              return;
            }

            setState({ status: 'error', message: 'Something went wrong. Please let us know.' });
          }
        }}
      >
        <Input
          name="email"
          placeholder="E-mail"
          severity={lastErrorMessage.current ? 'critical' : undefined}
          message={lastErrorMessage.current}
        />
        {!state || state.status === 'error' ? (
          <CallToAction type="submit" variant="secondary-inverted" className="mt-2 !w-full">
            Subscribe
          </CallToAction>
        ) : state.status === 'pending' ? (
          <CallToAction
            type="submit"
            variant="secondary-inverted"
            className="mt-2 !w-full"
            disabled
          >
            Subscribing...
          </CallToAction>
        ) : state.status === 'success' ? (
          <CallToAction
            type="reset"
            variant="secondary-inverted"
            className="group/button mt-2 !w-full before:absolute"
            onClick={() => {
              // the default behavior of <button type="reset"> doesn't work here
              // because it gets unmounted too fast
              setTimeout(() => {
                setState(undefined);
              }, 0);
            }}
          >
            <span className="group-hover/button:hidden group-focus/button:hidden">Subscribed</span>
            <span aria-hidden className="hidden group-hover/button:block group-focus/button:block">
              Another email?
            </span>
          </CallToAction>
        ) : null}
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
