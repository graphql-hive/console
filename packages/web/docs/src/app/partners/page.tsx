import Link from 'next/link';
import { CodeIcon, LockOpen2Icon, RocketIcon } from '@radix-ui/react-icons';
import {
  Anchor,
  cn,
  ContactButton,
  GetYourAPIGameRightSection,
  Heading,
  InfoCard,
} from '@theguild/components';
import { FrequentlyAskedPartnersQuestions } from '../../components/frequently-asked-questions';
import { Hero, HeroLinks } from '../../components/hero';
import { LandingPageContainer } from '../../components/landing-page-container';
import { metadata as rootMetadata } from '../layout';

export const metadata = {
  title: 'Partnerships',
  description:
    'Accelerate GraphQL Federation adoption with the Hive Partner Network. Access enterprise-grade tools and expertise to build scalable, unified APIs across distributed systems. Join our network of federation experts.',
  openGraph: {
    ...rootMetadata.openGraph,
    /**
     * We currently have `metadataBase` which includes `basePath`,
     * so the opengraph-image.png file convention results in a
     * duplicate `basePath` in the OG Image URL.
     *
     * Remove this workaround when we have a fix upstream.
     * Do not extract this workaround to a separate file, as it will stop working.
     */
    images: [
      new URL('./opengraph-image.png', import.meta.url)
        .toString()

        .replace(process.env.NEXT_BASE_PATH || '', ''),
    ],
  },
};

function WhyUs({ className }: { className?: string }) {
  return (
    <section className={cn('p-6 sm:py-20 md:py-24 xl:px-[120px]', className)}>
      <Heading as="h2" size="md" className="text-center">
        Why partner with us?
      </Heading>

      <ul className="mt-6 flex flex-row flex-wrap justify-center gap-2 md:mt-16 md:gap-6">
        <InfoCard
          as="li"
          heading="Scale with Open Source"
          icon={<RocketIcon />}
          className="flex-1 rounded-2xl md:rounded-3xl"
        >
          Join the open-source revolution and grow your business by integrating with a platform that
          puts flexibility and community first. Build solutions that respect your customers' freedom
          to innovate.
        </InfoCard>
        <InfoCard
          as="li"
          icon={<LockOpen2Icon />}
          heading="Enhance Your Enterprise Appeal"
          className="flex-1 basis-full rounded-2xl md:basis-0 md:rounded-3xl"
        >
          Reach organizations seeking vendor-independent solutions. As a Hive partner, you'll
          connect with companies prioritizing open-source infrastructure and full ownership of their
          GraphQL stack.
        </InfoCard>
        <InfoCard
          as="li"
          icon={<CodeIcon />}
          heading="Drive Technical Excellence"
          className="flex-1 basis-full rounded-2xl md:rounded-3xl lg:basis-0"
        >
          Enable your customers to build more reliable and observable GraphQL APIs through our
          comprehensive schema registry,{' '}
          <Anchor
            href="/federation"
            title="Visit our guide to learn more about GraphQL federation"
            className="underline decoration-slate-400 hover:decoration-slate-700"
          >
            federation
          </Anchor>{' '}
          support, and performance monitoring tools.
        </InfoCard>
      </ul>
    </section>
  );
}

const PARTNERS = [
  {
    name: 'The Guild',
    logo: 'the-guild-logo.svg',
    className: 'brightness-0 grayscale hover:brightness-100',
    href: 'https://the-guild.dev',
  },
  {
    name: 'Duality',
    logo: 'duality-logo.svg',
    href: 'https://teamduality.dev',
  },
];

function SolutionsPartner({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'bg-beige-100 text-green-1000 rounded-3xl',
        'p-6 sm:py-20 md:py-24 xl:px-[120px]',
        'mx-4 max-sm:mt-2 md:mx-6',
        className,
      )}
    >
      <Heading as="h2" size="md" className="text-center">
        Solution Partners
      </Heading>
      <p className="mx-auto mt-4 max-w-3xl text-center">
        Our solution partners are experts in their field, providing a range of services to help you
        get the most out of the Hive platform. From consulting to implementation, our partners are
        here to help you succeed.
      </p>
      <ul className="mt-10 grid grid-cols-1 place-items-center gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {PARTNERS.map(partner => (
          <Link
            key={partner.name}
            href={`${partner.href}?utm_source=hive&utm_medium=website&utm_campaign=partners`}
            target="_blank"
          >
            <li
              className={cn(
                'flex h-32 w-56 cursor-pointer flex-col items-center justify-center rounded-3xl border border-black hover:bg-slate-300',
                partner?.className,
              )}
            >
              <img src={partner.logo} alt={partner.name} className="h-10 w-auto" />
            </li>
          </Link>
        ))}
      </ul>
    </section>
  );
}

export default function PartnersPage() {
  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <Hero className="mx-4 h-[22%] max-sm:mt-2 md:mx-6 lg:py-24">
        <Heading
          as="h1"
          size="xl"
          className="mx-auto max-w-3xl text-balance text-center text-white"
        >
          Accelerate Your Federation Journey
        </Heading>
        <p className="mx-auto w-[512px] max-w-[80%] text-center leading-6 text-white/80">
          The Hive Partner Network accelerates your{' '}
          <Anchor
            href="/federation"
            title="Visit our guide to learn more about GraphQL federation"
            className="underline decoration-white/30 underline-offset-2 hover:decoration-white/80"
          >
            federation
          </Anchor>{' '}
          journey, delivering expert solutions and best-in-class technology for faster value
          realization.
        </p>
        <HeroLinks>
          <ContactButton variant="primary-inverted">Talk to an expert</ContactButton>
          <ContactButton variant="secondary">Become a partner</ContactButton>
        </HeroLinks>
      </Hero>
      <WhyUs />
      <SolutionsPartner />
      <FrequentlyAskedPartnersQuestions />
      <GetYourAPIGameRightSection className="mx-4 mt-6 !overflow-visible sm:mb-6 md:mx-6 md:mt-16" />
    </LandingPageContainer>
  );
}
