import { cn, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { CaseStudyCard } from './case-study-card';
import { CaseStudyFrontmatter } from './case-study-frontmatter';
import { companyLogos } from './company-logos';

// TODO
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
      <ul className="mt-6 flex gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        {otherStories.map(item => {
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
