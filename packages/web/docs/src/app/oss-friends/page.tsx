import NextLink from 'next/link';
import {
  ArchDecoration,
  CallToAction,
  DecorationIsolation,
  Heading,
  HighlightDecoration,
  LargeHiveIconDecoration,
} from '@theguild/components';
import { LandingPageContainer } from '../../components/landing-page-container';

export const metadata = {
  title: 'Our Open Source Friends',
  description: 'We love open source. Meet our friends who share the same passion.',
};

async function fetchFriends() {
  const response = await fetch('https://formbricks.com/api/oss-friends');
  const body: {
    data: {
      name: string;
      description: string;
      href: string;
    }[];
  } = await response.json();

  return body.data;
}

export default async function OSSFriendsPage() {
  const friends = await fetchFriends();

  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <div className="bg-beige-100 relative isolate mx-4 flex flex-col gap-6 overflow-hidden rounded-3xl px-4 py-6 max-sm:mt-2 sm:py-12 md:mx-6 md:gap-8 lg:py-24">
        <DecorationIsolation>
          <ArchDecoration className="pointer-events-none absolute -top-5 left-[-46px] size-[200px] rotate-180 md:left-[-60px] md:top-[-188px] md:size-auto" />
          <ArchDecoration className="pointer-events-none absolute bottom-0 right-[-53px] size-[200px] md:-bottom-32 md:size-auto lg:bottom-[-188px] lg:right-0" />
          <svg width="432" height="432" viewBox="0 0 432 432" className="absolute -z-10">
            <defs>
              <linearGradient
                id="arch-decoration-a"
                x1="48.5"
                y1="53.5"
                x2="302.5"
                y2="341"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff" stopOpacity="0.3" />
                <stop offset="1" stopColor="#fff" stopOpacity="1" />
              </linearGradient>
              <linearGradient
                id="arch-decoration-b"
                x1="1"
                y1="1"
                x2="431"
                y2="431"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff" stopOpacity="0.1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>
        </DecorationIsolation>
        <Heading as="h1" size="xl" className="text-green-1000 z-0 mx-auto max-w-3xl text-center">
          Open Source Friends
        </Heading>
        <p className="z-0 mx-auto max-w-[80%] text-center leading-6 text-green-800">
          We love open source. Meet our friends who share the same passion.
        </p>
      </div>
      <div className="relative mt-6 sm:mt-[-72px]">
        <section className="border-beige-400 isolate mx-auto w-[1200px] max-w-full rounded-3xl bg-white sm:max-w-[calc(100%-4rem)] sm:border sm:p-6">
          <div className="relative mx-auto flex w-[1392px] max-w-full flex-col gap-x-4 gap-y-6 md:gap-y-12 lg:flex-row [@media(min-width:1400px)]:gap-x-[120px]">
            <div className="flex grow flex-col gap-12 px-4 md:px-0 lg:w-[650px]">
              <div className="mx-auto leading-6 text-green-800">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {friends.map((friend, i) => (
                    <NextLink
                      href={friend.href}
                      key={i}
                      className="hover:bg-beige-200 bg-beige-100 relative block rounded-lg p-4 shadow-sm"
                    >
                      <dt className="text-green-1000 font-medium">{friend.name}</dt>
                      <dd className="mt-2 text-sm leading-5 text-green-800">
                        {friend.description}
                      </dd>
                      <Arrow className="absolute bottom-2 right-2 size-6 rotate-[135deg] opacity-20" />
                    </NextLink>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section className="bg-blueish-green relative mx-4 mt-12 overflow-hidden rounded-3xl p-12 text-center sm:p-24 md:mx-6">
        <DecorationIsolation>
          <ArchDecoration className="absolute -left-1/2 -top-1/2 rotate-180 sm:-left-1/4 md:left-[-105px] md:top-[-109px] [&>path]:fill-none" />
          <HighlightDecoration className="absolute -left-1 -top-16 size-[600px] -scale-x-100 overflow-visible" />
          <LargeHiveIconDecoration className="absolute bottom-0 right-8 hidden lg:block" />
        </DecorationIsolation>
        <Heading as="h3" size="md" className="text-white">
          Open Source GraphQL Platform
        </Heading>
        <p className="relative mt-4 text-white/80">
          Start building your federated GraphQL API today, by following our guide, that will walk
          you through the basics of Apollo Federation.
        </p>
        <CallToAction
          variant="primary-inverted"
          className="mx-auto mt-8"
          href="/docs/get-started/apollo-federation"
        >
          Start building now
        </CallToAction>
      </section>
    </LandingPageContainer>
  );
}

function Arrow(props: { className: string }) {
  return (
    <svg
      className={props.className}
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 512 512"
      height="200px"
      width="200px"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M427 234.625H167.296l119.702-119.702L256 85 85 256l171 171 29.922-29.924-118.626-119.701H427v-42.75z" />
    </svg>
  );
}
