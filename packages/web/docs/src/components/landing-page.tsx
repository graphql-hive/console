import { ReactElement, ReactNode, useState } from 'react';
import Head from 'next/head';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';
import { FiGithub, FiGlobe, FiLogIn, FiPackage, FiPhone, FiServer, FiTruck } from 'react-icons/fi';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '../lib';
import { BookIcon } from './book-icon';
import { HereTrustedBy, Hero, HeroLinks, HeroSubtitle, HeroTitle } from './hero';
import { Highlights, HighlightTextLink } from './highlights';
import { AligentLogo, KarrotLogo, LinktreeLogo, MeetupLogo, SoundYXZLogo } from './logos';
import { Page } from './page';
import { Pricing } from './pricing';
import { StatsItem, StatsList } from './stats';
import observabilityClientsImage from '../../public/features/observability/clients.png';
import observabilityOperationsImage from '../../public/features/observability/operations.png';
import observabilityOverallImage from '../../public/features/observability/overall.png';
import registryExplorerImage from '../../public/features/registry/explorer.png';
import registrySchemaChecksImage from '../../public/features/registry/schema-checks.png';
import registryVersionControlSystemImage from '../../public/features/registry/version-control-system.png';

const classes = {
  link: cn(
    'inline-block rounded-lg bg-gray-100 px-6 py-3 font-medium text-gray-600 shadow-sm hover:bg-gray-200',
  ),
  feature: cn('w-full', 'even:bg-gray-50', 'odd:bg-white'),
  root: cn('flex flex-1 flex-row gap-6 md:flex-col lg:flex-row'),
  content: cn('flex flex-col text-black'),
  title: cn('text-xl font-semibold'),
  description: cn('text-gray-600'),
};

const gradients: [string, string][] = [
  ['#ff9472', '#f2709c'],
  ['#4776e6', '#8e54e9'],
  ['#f857a6', '#ff5858'],
  ['#4ac29a', '#bdfff3'],
  ['#00c6ff', '#0072ff'],
];

function pickGradient(i: number): [string, string] {
  const gradient = gradients[i % gradients.length];

  if (!gradient) {
    throw new Error('No gradient found');
  }

  return gradient;
}

const renderFeatures = ({
  title,
  description,
  documentationLink,
}: {
  title: string;
  description: ReactNode;
  documentationLink?: string;
}) => (
  <div className={classes.root} key={title}>
    <div className={classes.content}>
      <h3 className={cn(classes.title, 'text-lg')}>{title}</h3>
      <p className={cn(classes.description, 'text-sm')}>{description}</p>
      {documentationLink ? (
        <Link
          href={documentationLink}
          className="group mt-2 inline-flex items-center gap-x-2 text-sm underline-offset-8 transition hover:underline"
        >
          <div>
            <BookIcon size={16} />
          </div>
          <div>Learn more</div>
        </Link>
      ) : null}
    </div>
  </div>
);

function Highlight(
  props: {
    title: string;
    description: ReactNode;
    documentationLink?: string;
    startColor: string;
    endColor: string;
  } & (
    | {
        active: boolean;
        index: number;
        onClick(i: number): void;
      }
    | {}
  ),
) {
  return (
    <div
      className={cn(
        classes.root,
        'relative p-2 transition lg:p-8',
        'onClick' in props ? 'cursor-pointer' : '',
      )}
      onClick={'onClick' in props ? () => props.onClick(props.index) : () => {}}
    >
      {props.documentationLink ? null : (
        <div
          className={cn(
            'absolute inset-0 border-b-2 lg:border-b-0 lg:border-l-4',
            'active' in props && props.active ? 'opacity-100' : 'opacity-0 hover:opacity-50',
          )}
          style={{
            borderColor: props.startColor,
          }}
        />
      )}
      <div
        className={cn(
          classes.content,
          'w-full lg:w-auto',
          'onClick' in props ? 'gap-y-2' : 'gap-y-4',
        )}
      >
        <h3
          className={cn(
            classes.title,
            'text-base lg:text-lg',
            'onClick' in props ? 'text-center lg:text-left' : '',
          )}
        >
          {props.title}
        </h3>
        <p
          className={cn(
            classes.description,
            'text-sm',
            'onClick' in props ? 'hidden lg:block' : '',
          )}
        >
          {props.description}
        </p>
        {props.documentationLink ? (
          <Link
            href={props.documentationLink}
            className="group mt-2 inline-flex items-center gap-x-2 text-sm underline-offset-8 transition hover:underline"
          >
            <div>
              <BookIcon size={16} />
            </div>
            <div>Learn more</div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Feature(props: {
  title: string;
  description: ReactNode;
  highlights?: {
    title: string;
    description: string;
    image: StaticImageData;
  }[];
  imagelessHighlights?: {
    title: string;
    description: string;
    documentationLink: string;
  }[];
  gradient: number;
  documentationLink?: string;
}) {
  const [activeHighlight, setActiveHighlight] = useState(0);
  const { title, description, gradient, documentationLink, highlights, imagelessHighlights } =
    props;
  const [start, end] = pickGradient(gradient);

  return (
    <>
      <Head>
        {highlights
          ? highlights.map(highlight => (
              <link key={highlight.image.src} rel="preload" as="image" href={highlight.image.src} />
            ))
          : null}
      </Head>
      <div className={cn(classes.feature, 'relative overflow-hidden')}>
        <div>
          <div
            className="absolute top-0 h-[1px] w-full opacity-25"
            style={{
              backgroundImage: `linear-gradient(90deg, ${end}, ${start})`,
            }}
          />
          <div
            className="absolute left-[-200px] top-[-200px] h-[255px] w-[60vw] opacity-[0.15] blur-3xl"
            style={{
              backgroundImage: `linear-gradient(180deg, ${end}, ${start})`,
            }}
          />
          <div
            className="absolute right-[-200px] top-[-200px] h-[255px] w-[60vw] opacity-[0.15] blur-3xl"
            style={{
              backgroundImage: `linear-gradient(180deg, ${start}, ${end})`,
            }}
          />
        </div>
        <div className="pb-28 pt-20 sm:py-32">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl md:mx-auto md:text-center xl:max-w-none">
              <h2
                className="bg-clip-text text-4xl font-semibold leading-normal tracking-tight text-transparent"
                style={{ backgroundImage: `linear-gradient(-70deg, ${end}, ${start})` }}
              >
                {title}
              </h2>
              <div className="mt-6 text-lg tracking-tight text-gray-600">{description}</div>
              {documentationLink ? (
                <div className="pt-12">
                  <Link
                    href={documentationLink}
                    className="group inline-flex items-center gap-x-2 font-semibold underline-offset-8 transition hover:underline"
                    style={{
                      color: start,
                    }}
                  >
                    <div>
                      <BookIcon size={16} />
                    </div>
                    <div>Learn more</div>
                  </Link>
                </div>
              ) : null}
            </div>
            {imagelessHighlights ? (
              <div className="mt-16 flex flex-col justify-center pt-10 sm:gap-y-6 md:mt-20 lg:flex-row lg:pt-0">
                {imagelessHighlights.map(highlight => (
                  <Highlight
                    {...highlight}
                    endColor={end}
                    startColor={start}
                    key={highlight.title}
                  />
                ))}
              </div>
            ) : null}
            {highlights ? (
              <div className="mt-0 grid grid-cols-1 items-center gap-y-2 pt-10 sm:gap-y-6 md:mt-20 lg:mt-16 lg:grid-cols-12 lg:pt-0">
                <div className="flex w-full overflow-x-auto pb-4 sm:mx-0 sm:overflow-visible sm:pb-0 lg:col-span-5 lg:w-auto">
                  <div className="w-full">
                    <div className="flex flex-row justify-evenly gap-x-0 lg:flex-col lg:gap-y-12">
                      {highlights.map((highlight, i) => (
                        <Highlight
                          {...highlight}
                          endColor={end}
                          startColor={start}
                          key={highlight.title}
                          index={i}
                          active={activeHighlight === i}
                          onClick={setActiveHighlight}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block" />
                <div className="lg:col-span-6">
                  {highlights.map((highlight, i) => (
                    <div key={i} className={cn(activeHighlight === i ? 'block' : 'hidden')}>
                      <div className="relative sm:px-6 lg:hidden">
                        <p className="relative mx-auto max-w-2xl text-base text-black sm:text-center">
                          {highlight.description}
                        </p>
                      </div>
                      <div
                        className="mt-10 w-[45rem] rounded-lg sm:w-auto lg:mt-0 lg:w-[67.8125rem]"
                        style={{ backgroundImage: `linear-gradient(-70deg, ${end}, ${start})` }}
                      >
                        <div className="p-4 lg:p-12">
                          <div className="overflow-hidden rounded-xl">
                            <Image
                              {...highlight.image}
                              className="w-full"
                              style={{ color: 'transparent' }}
                              alt={title}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export function IndexPage(): ReactElement {
  return (
    <Tooltip.Provider>
      <Page>
        <Hero>
          <HeroTitle>Open GraphQL Platform</HeroTitle>
          <HeroSubtitle>
            Prevent breaking changes, monitor performance of your GraphQL API, and manage your API
            gateway
          </HeroSubtitle>
          <HeroLinks>
            <>
              <a
                href="https://app.graphql-hive.com"
                className={cn(
                  'inline-block rounded-lg px-6 py-3 font-medium text-white shadow-sm',
                  'bg-yellow-500 hover:bg-yellow-500/75',
                )}
              >
                Start for free
              </a>
              <Link href="/docs" className={classes.link}>
                Documentation
              </Link>
              <a
                className={cn(classes.link, 'flex flex-row items-center gap-2')}
                href="https://github.com/kamilkisiela/graphql-hive"
              >
                <FiGithub /> Star on GitHub
              </a>
              <a
                className={cn(classes.link, 'flex flex-row items-center gap-2')}
                href="#"
                onClick={() => {
                  (window as any).$crisp?.push(['do', 'chat:open']);
                }}
              >
                <FiPhone /> Talk to us
              </a>
            </>
          </HeroLinks>
          <HereTrustedBy>
            <MeetupLogo
              className="opacity-50 transition-opacity duration-300 ease-in-out hover:opacity-100"
              height={32}
            />
            <LinktreeLogo
              className="opacity-50 transition-opacity duration-300 ease-in-out hover:opacity-100"
              height={22}
            />
            <KarrotLogo
              height={28}
              className="opacity-50 transition-opacity duration-300 ease-in-out hover:opacity-100"
            />
            <AligentLogo
              className="opacity-50 transition-opacity duration-300 ease-in-out hover:opacity-100"
              height={32}
            />
            <SoundYXZLogo
              className="opacity-50 transition-opacity duration-300 ease-in-out hover:opacity-100"
              height={32}
            />
          </HereTrustedBy>
        </Hero>
        <div className="relative even:bg-gray-50">
          <div>
            <div className="absolute top-0 h-[1px] w-full bg-gradient-to-r from-gray-300 via-gray-500 to-gray-300 opacity-25" />
          </div>
          <StatsList>
            <StatsItem label="Happy users" value={4.1} suffix="K" decimal />
            <StatsItem label="Registered Schemas" value={120} suffix="K" />
            <StatsItem label="Collected Operations" value={150} suffix="B" />
            <StatsItem label="GitHub Commits" value={4.6} suffix="K" decimal />
          </StatsList>
        </div>
        <div className="flex flex-col">
          <Feature
            title="Schema Registry"
            documentationLink="/docs/features/schema-registry"
            description={
              <>
                <p>Push GraphQL schema to the registry and track the history of changes.</p>
                <p>All your GraphQL services in one place.</p>
              </>
            }
            highlights={[
              {
                title: 'Version Control System',
                description:
                  'Track every modification of your GraphQL API across different environments, such as staging and production.',
                image: registryVersionControlSystemImage,
              },
              {
                title: 'Schema checks',
                description:
                  'Detect breaking changes and composition errors, prevent them from being deployed.',
                image: registrySchemaChecksImage,
              },
              {
                title: 'Schema explorer',
                description:
                  'Navigate through your GraphQL schema and understand which types and fields are referenced from which subgraphs.',
                image: registryExplorerImage,
              },
            ]}
            gradient={0}
          />
          <div className={cn(classes.feature, 'relative overflow-hidden')}>
            <div>
              <div className="absolute top-0 h-[1px] w-full bg-gradient-to-r from-gray-300 via-gray-500 to-gray-300 opacity-25" />
              <div className="absolute left-[-200px] top-[-200px] h-[255px] w-[60vw] bg-gradient-to-b from-gray-50 to-gray-300 opacity-[0.15] blur-3xl" />
              <div className="absolute right-[-200px] top-[-200px] h-[255px] w-[60vw] bg-gradient-to-b from-gray-300 to-gray-50 opacity-[0.15] blur-3xl" />
            </div>
            <div className="py-24">
              <h2 className="base:mr-1 mb-12 ml-1 text-center text-3xl font-semibold leading-normal tracking-tight text-black">
                Perfect fit for your GraphQL Gateway
              </h2>
              <Highlights
                items={[
                  {
                    title: 'Manage your Gateway',
                    description: (
                      <>
                        Connect to{' '}
                        <HighlightTextLink href="/docs/get-started/apollo-federation">
                          Apollo Federation
                        </HighlightTextLink>
                        ,{' '}
                        <HighlightTextLink href="/docs/integrations/graphql-mesh">
                          GraphQL Mesh
                        </HighlightTextLink>
                        ,{' '}
                        <HighlightTextLink href="/docs/integrations/schema-stitching">
                          Stitching
                        </HighlightTextLink>{' '}
                        and more.
                      </>
                    ),
                    icon: <FiServer strokeWidth={1} className="size-full" />,
                    documentationLink: '/docs/get-started/apollo-federation',
                  },
                  {
                    title: 'Global Edge Network',
                    description: 'Access the registry from any place on earth within milliseconds.',
                    icon: <FiGlobe strokeWidth={1} className="size-full" />,
                    documentationLink: '/docs/features/high-availability-cdn',
                  },
                  {
                    title: 'Apollo Studio alternative',
                    description:
                      'GraphQL Hive is a drop-in replacement for Apollo Studio (Apollo GraphOS).',
                    icon: <FiPackage strokeWidth={1} className="size-full" />,
                    documentationLink: '/docs/use-cases/apollo-studio',
                  },
                ]}
              />
            </div>
          </div>
          <Feature
            title="GraphQL Observability"
            documentationLink="/docs/features/usage-reporting"
            description={
              <p>
                Be aware of how your GraphQL API is used and what is the experience of its final
                users.
              </p>
            }
            highlights={[
              {
                title: 'GraphQL consumers',
                description:
                  'Track every source of GraphQL requests and see how the API is consumed.',
                image: observabilityClientsImage,
              },
              {
                title: 'Overall performance',
                description: 'Get a global overview of the usage of GraphQL API.',
                image: observabilityOverallImage,
              },
              {
                title: 'Query performance',
                description: 'Detect slow GraphQL Operations and identify the culprits.',
                image: observabilityOperationsImage,
              },
            ]}
            gradient={1}
          />
          <Feature
            title="Schema Management"
            description={<p>Maintain GraphQL API across many teams without concerns.</p>}
            gradient={2}
            imagelessHighlights={[
              {
                title: 'Prevent breaking changes',
                description:
                  'Combination of Schema Registry and GraphQL Monitoring helps you evolve GraphQL API with confidence.',
                documentationLink: '/docs/management/targets#conditional-breaking-changes',
              },
              {
                title: 'Detect unused fields',
                description:
                  'Helps you understand the coverage of GraphQL schema and safely remove the unused part.',
                documentationLink: '/docs/features/usage-reporting',
              },
              {
                title: 'Schema Policy',
                description:
                  'Lint, verify, and enforce best practices across the entire federated graph.',
                documentationLink: '/docs/features/schema-policy',
              },
            ]}
          />
          <div
            className="relative overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(-70deg, ${gradients[4][1]}, ${gradients[4][0]})`,
            }}
          >
            <div>
              <div className="absolute top-0 h-[1px] w-full bg-blue-900 opacity-25" />
            </div>
            <div className="py-24">
              <div className="mx-auto max-w-lg text-center text-white">
                <h2 className="text-3xl font-semibold leading-normal tracking-tight">
                  Get started today
                </h2>
                <p className="mt-4 text-lg tracking-tight">
                  Start with a free Hobby plan that fits perfectly most side projects or try our Pro
                  plan with 30 days trial period.
                </p>
                <a
                  href="https://app.graphql-hive.com"
                  className={cn(
                    'mt-12 rounded-md px-6 py-3 text-sm font-medium text-black shadow-sm',
                    'bg-white hover:bg-blue-50',
                    'inline-flex flex-row items-center gap-2',
                  )}
                >
                  <FiLogIn /> Enter Hive
                </a>
              </div>
            </div>
          </div>
          <div className={cn(classes.feature, 'relative overflow-hidden')}>
            <div>
              <div className="absolute top-0 h-[1px] w-full bg-gradient-to-r from-gray-300 via-gray-500 to-gray-300 opacity-25" />
              <div className="absolute left-[-200px] top-[-200px] h-[255px] w-[60vw] bg-gradient-to-b from-gray-600 to-gray-900 opacity-[0.15] blur-3xl" />
              <div className="absolute right-[-200px] top-[-200px] h-[255px] w-[60vw] bg-gradient-to-b from-gray-900 to-gray-600 opacity-[0.15] blur-3xl" />
            </div>
            <div className="py-24">
              <h2 className="mb-12 text-center text-3xl font-semibold leading-normal tracking-tight text-black">
                Fits your infrastructure
              </h2>
              <Highlights
                items={[
                  {
                    title: 'GitHub Integration',
                    description: 'Our CLI integrates smoothly with GitHub Actions / repositories.',
                    icon: <FiGithub strokeWidth={1} className="size-full" />,
                    documentationLink: '/docs/integrations/ci-cd#github-check-suites',
                  },
                  {
                    title: 'Works with every CI/CD',
                    description: 'Connect GraphQL Hive CLI to CI/CD of your choice.',
                    icon: <FiTruck strokeWidth={1} className="size-full" />,
                    documentationLink: '/docs/integrations/ci-cd',
                  },
                  {
                    title: 'On-premise or Cloud',
                    description:
                      'GraphQL Hive is MIT licensed, you can host it on your own infrastructure.',
                    icon: <FiServer strokeWidth={1} className="size-full" />,
                    documentationLink: '/docs/self-hosting/get-started',
                  },
                ]}
              />
            </div>
          </div>
          <div className={cn(classes.feature, 'relative overflow-hidden')}>
            <div>
              <div
                className="absolute top-0 h-[1px] w-full opacity-25"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${gradients[3][1]}, ${gradients[3][0]})`,
                }}
              />
              <div
                className="absolute left-[-200px] top-[-200px] h-[255px] w-[60vw] opacity-[0.15] blur-3xl"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${gradients[3][0]}, ${gradients[3][1]})`,
                }}
              />
              <div
                className="absolute right-[-200px] top-[-200px] h-[255px] w-[60vw] opacity-[0.15] blur-3xl"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${gradients[3][1]}, ${gradients[3][0]})`,
                }}
              />
            </div>
            <div className="py-24">
              <div className="container mx-auto box-border flex flex-col gap-y-24 px-6">
                <div className="text-center">
                  <h2
                    className="mb-6 bg-clip-text text-5xl font-semibold leading-normal text-transparent"
                    style={{
                      backgroundImage: `linear-gradient(-70deg, ${gradients[3][1]}, ${gradients[3][0]})`,
                    }}
                  >
                    Open-Source
                  </h2>
                  <p className="text-lg leading-7 text-gray-600">Built entirely in public.</p>
                </div>
                <div className="mx-auto box-border grid max-w-screen-lg grid-cols-2 gap-12 px-6">
                  {[
                    {
                      title: 'Public roadmap',
                      description: 'Influence the future of GraphQL Hive.',
                    },
                    {
                      title: 'Cloud and Self-Hosted',
                      description: 'MIT licensed, host it on your own infrastructure.',
                    },
                    {
                      title: 'Available for free',
                      description: 'Free Hobby plan that fits perfectly for most side projects.',
                    },
                    {
                      title: 'Community',
                      description: 'Implement your own features with our help.',
                    },
                  ].map(renderFeatures)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Pricing gradient={gradients[4]} />
      </Page>
    </Tooltip.Provider>
  );
}
