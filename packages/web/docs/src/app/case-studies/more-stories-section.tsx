import { cn, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { CaseStudyCard } from './case-study-card';
import { getCompanyLogo } from './company-logos';
import { isCaseStudy } from './isCaseStudyFile';

// TODO: This can only be grabbed from a client component.
const CURRENT_CASE_STUDY_NAME = 'sound-xyz';

export interface MoreStoriesSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export async function MoreStoriesSection({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');

  const otherStories = pageMap.filter(item => {
    return 'name' in item && item.name !== CURRENT_CASE_STUDY_NAME;
  });

  if (otherStories.length < 3) {
    return null;
  }

  return (
    <section {...rest} className={cn('py-6 sm:p-24', className)}>
      <Heading size="md" as="h2" className="text-center">
        More stories {otherStories.length}
      </Heading>
      <ul className="mt-6 flex flex-wrap gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        {otherStories.filter(isCaseStudy).map(item => {
          return (
            <li key={item.name} className="basis-1/3">
              <CaseStudyCard
                category={item.frontMatter.category}
                excerpt={item.frontMatter.excerpt}
                href={item.route}
                logo={getCompanyLogo(item.name)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
