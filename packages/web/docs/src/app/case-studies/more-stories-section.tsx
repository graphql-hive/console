import { cn, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { CaseStudyCard } from './case-study-card';
import { companyLogos } from './company-logos';

export async function MoreStoriesSection(props: React.HTMLAttributes<HTMLDivElement>) {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');

  const current = new Error().stack?.split('\n')[1].split(' ')[1];

  const otherStories = pageMap.filter(item => {
    return 'name' in item && item.name !== 'index';
  });

  console.log({ pageMap, _indexPage, _meta });

  return (
    <section {...props} className={cn('py-6 sm:p-24', props.className)}>
      <pre>{JSON.stringify({ otherStories, current }, null, 2)}</pre>
      <Heading size="md" as="h2" className="text-center">
        More stories
      </Heading>
      <ul className="mt-6 flex gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        {Array.from({ length: 3 }).map((_, i) => {
          const caseStudy = {
            name: 'sound-xyz',
            href: '/case-studies/sound-xyz',
            category: 'E-commerce',
            logo: companyLogos['sound-xyz'],
            description: 'Risus blandit blandit vel et eget viverra adipiscing.',
          };

          return (
            <li key={i} className="basis-1/3">
              <CaseStudyCard {...caseStudy} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
