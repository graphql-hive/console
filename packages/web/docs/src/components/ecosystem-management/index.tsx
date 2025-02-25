import NextLink from 'next/link';
import {
  CallToAction,
  cn,
  DecorationIsolation,
  Heading,
  HighlightDecoration,
} from '@theguild/components';
import { ArrowIcon } from '../arrow-icon';
import { BookIcon } from '../book-icon';
import { CheckIcon } from '../check-icon';
import { EcosystemIllustration } from './ecosystem-illustration';

export function EcosystemManagementSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'bg-green-1000 relative isolate overflow-hidden rounded-3xl text-white',
        'p-8 pb-[180px] sm:pb-[128px] md:p-[72px] md:pb-[128px] lg:pb-[72px]',
        className,
      )}
    >
      <div className="relative mx-auto flex w-[1392px] max-w-full flex-col gap-x-4 gap-y-6 md:gap-y-12 lg:flex-row [@media(min-width:1400px)]:gap-x-[120px]">
        <div className="flex flex-col gap-12 lg:w-[488px]">
          <Heading as="h2" size="sm">
            360° GraphQL API Management
          </Heading>
          <ul className="mx-auto flex list-none flex-col gap-y-4 text-white/80 lg:gap-y-6">
            {[
              <div className="text-white">
                A complete ecosystem covering all your dev and production needs.
              </div>,
              <>
                <div className="font-medium text-white">Apollo Federation v1 and v2</div>
                <div>
                  Best in class{' '}
                  <NextLink
                    className="underline underline-offset-2"
                    href="/federation-gateway-audit"
                  >
                    compatibility with Apollo Federation spec
                  </NextLink>
                </div>
              </>,
              <>
                <div className="font-medium text-white">
                  Powerful and flexible{' '}
                  <NextLink className="underline decoration-1 underline-offset-2" href="/gateway">
                    GraphQL Gateway (Router)
                  </NextLink>
                </div>
                <div>
                  GraphQL Subscriptions support and built-in security features (RBAC, JWT, Persisted
                  Operations)
                </div>
              </>,
              <>
                <span className="font-medium text-white">No vendor-lock</span> — dive into our full
                GraphQL ecosystem, or&nbsp;build your own stack, connecting{' '}
                <NextLink className="underline decoration-1 underline-offset-2" href="/federation">
                  GraphQL federation
                </NextLink>
                ,{' '}
                <NextLink className="underline decoration-1 underline-offset-2" href="/gateway">
                  Hive Gateway
                </NextLink>
                ,{' '}
                <NextLink
                  className="underline decoration-1 underline-offset-2"
                  href="https://the-guild.dev/graphql/mesh"
                >
                  GraphQL Mesh
                </NextLink>{' '}
                and more.
              </>,
              <>
                <div className="font-medium text-white">
                  Drop-in replacement for Apollo GraphOS (Apollo Studio)
                </div>
                <div>100% on-prem and open-source</div>
              </>,
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-4">
                <CheckIcon className="mt-0.5 shrink-0 text-blue-400" />
                <div>{text}</div>
              </li>
            ))}
          </ul>
          <div className="bottom-0 flex w-full gap-x-4 gap-y-2 max-lg:absolute max-lg:translate-y-[calc(100%+40px)] max-sm:flex-col lg:flex-col">
            <CallToAction
              href="/federation"
              variant="primary-inverted"
              title="Learn what GraphQL Federation is and when to use it."
            >
              Learn GraphQL Federation
              <ArrowIcon />
            </CallToAction>
            <CallToAction href="/docs/use-cases/apollo-graphos" variant="secondary">
              <BookIcon />
              Migrate from Apollo GraphOS
            </CallToAction>
          </div>
        </div>
        <EcosystemIllustration />
      </div>
      <DecorationIsolation>
        <HighlightDecoration className="pointer-events-none absolute right-0 top-[-22px] overflow-visible" />
      </DecorationIsolation>
    </section>
  );
}
