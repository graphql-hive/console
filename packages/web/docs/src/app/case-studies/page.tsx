import { CallToAction, ContactButton, DecorationIsolation, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { GetYourAPIGameWhite } from '../../components/get-your-api-game-white';
import { HeroLinks } from '../../components/hero';
import { CaseStudyFrontmatter } from './case-studies-header';
import { CaseStudyCard } from './case-study-card';
import { companyLogos } from './company-logos';

export const metadata = {
  title: 'Case Studies',
};

export default async function CaseStudiesPage() {
  return (
    <article className="mx-auto box-content max-w-[90rem] overflow-hidden px-6">
      <header className="bg-primary dark:bg-primary/[0.01] dark:border-primary/5 relative isolate flex flex-col gap-6 overflow-hidden rounded-3xl px-4 py-6 max-sm:mt-2 sm:py-12 md:gap-8 lg:py-24">
        <Heading
          size="xl"
          as="h1"
          className="relative z-10 mx-auto max-w-3xl text-balance text-center max-md:text-5xl"
        >
          Best teams. Hive{'‑' /* non-breaking hyphen */}powered.
        </Heading>
        <p className="relative z-10 text-pretty text-center text-green-800 dark:text-white/80">
          See the results our Customers achieved by switching to Hive.
        </p>
        <HeroLinks>
          <ContactButton variant="secondary-inverted">Talk to us</ContactButton>
          <CallToAction variant="tertiary" href="/pricing">
            Explore Pricing
          </CallToAction>
        </HeroLinks>
        <DecorationIsolation className="max-sm:opacity-75 dark:opacity-10">
          <GradientDefs />
          <ArchDecoration className="absolute left-[-180px] top-0 rotate-180 max-md:h-[155px] sm:left-[-100px] xl:left-0" />
          <ArchDecoration className="absolute bottom-0 right-[-180px] max-md:h-[155px] sm:right-[-100px] xl:right-0" />
        </DecorationIsolation>
      </header>
      {/* <FeaturedCaseStudiesGrid /> // add when we have 6 case studies */}
      {/* TODO: Uncomment this as a separator between FeaturedCaseStudiesGrid and the list of case studies */}
      {/* <TrustedBySection className="mx-auto my-8 md:my-16" /> */}
      <AllCaseStudiesList />
      {/* TODO: DeveloperLovedSection, like CommunitySection, but just four tweets */}
      <GetYourAPIGameWhite />
    </article>
  );
}

async function AllCaseStudiesList() {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');

  return (
    <section className="py-6 sm:pt-24">
      <Heading size="md" as="h2" className="text-center">
        Explore customer stories
      </Heading>
      <ul className="mt-6 flex gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        {pageMap.map(item => {
          if ('name' in item && 'frontMatter' in item && item.frontMatter) {
            const frontMatter = item.frontMatter as CaseStudyFrontmatter;

            let logo: React.ReactNode = null;
            if (item.name in companyLogos) {
              logo = companyLogos[item.name as keyof typeof companyLogos];
            } else {
              console.dir({ companyLogos }, { depth: 9 });
              throw new Error(
                `No logo found for ${item.name}. We have the following: (${Object.keys(companyLogos).join(', ')})`,
              );
            }

            return (
              <li key={item.name} className="basis-1/3">
                <CaseStudyCard
                  category={frontMatter.category}
                  excerpt={frontMatter.excerpt}
                  href={item.route}
                  logo={logo}
                />
              </li>
            );
          }

          return null;
        })}
      </ul>
    </section>
  );
}

function ArchDecoration(props: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="385"
      height="220"
      viewBox="0 0 385 220"
      fill="none"
      className={props.className}
    >
      <path
        d="M8.34295e-06 190.864C7.8014e-06 178.475 4.93233 166.577 13.6983 157.811L81.769 89.7401L89.7401 81.769L157.811 13.6983C166.577 4.93231 178.475 -7.8014e-06 190.864 -8.34295e-06L585 -1.87959e-05L585 89.7401L159.868 89.7401C121.134 89.7401 89.7401 121.134 89.7401 159.868L89.7402 228L1.87959e-05 228L8.34295e-06 190.864Z"
        fill="url(#paint0_linear_2522_10780)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2522_10780"
          x1="71.4243"
          y1="25.186"
          x2="184.877"
          y2="282.363"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GradientDefs() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="385"
      height="220"
      viewBox="0 0 385 220"
      fill="none"
      className="absolute size-0"
    >
      <defs>
        <linearGradient
          id="paint0_linear_2522_10780"
          x1="71.4243"
          y1="25.186"
          x2="184.877"
          y2="282.363"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
      </defs>
    </svg>
  );
}
