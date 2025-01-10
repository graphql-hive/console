import { Anchor, ArrowIcon, cn, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { SoundYXZLogo } from '../../components/company-logos';

const logos = {
  'sound-xyz': <SoundYXZLogo width={193} height={64} />,
};

export async function MoreStoriesSection(props: React.HTMLAttributes<HTMLDivElement>) {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');

  const current = new Error().stack?.split('\n')[1].split(' ')[1];

  const otherStories = pageMap.filter(item => {
    return 'name' in item && item.name !== 'index';
  });

  return (
    <section {...props} className={cn('py-6 sm:p-24', props.className)}>
      <Heading size="md" as="h2" className="text-center">
        More stories
      </Heading>
      <pre>{JSON.stringify({ otherStories, current }, null, 2)}</pre>
      <ul className="mt-6 flex gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        {Array.from({ length: 3 }).map((_, i) => {
          const caseStudy = {
            name: 'sound-xyz',
            href: '/case-studies/sound-xyz',
            category: 'E-commerce',
            logo: logos['sound-xyz'],
            description: 'Risus blandit blandit vel et eget viverra adipiscing.',
          };

          return (
            <li key={i}>
              <Anchor
                href={caseStudy.href}
                className="bg-beige-100 hover:bg-beige-200/80 hover:ring-beige-400 flex flex-col gap-6 rounded-2xl border sm:gap-10 dark:bg-neutral-800 dark:ring-neutral-600 dark:hover:bg-neutral-700"
              >
                <div className="text-beige-800 text-sm font-medium dark:text-neutral-400">
                  {caseStudy.category}
                </div>
                {caseStudy.logo}
                <p className="text-xl">{caseStudy.description}</p>
                <div className="flex items-center justify-between gap-2">
                  Read full story
                  <ArrowIcon />
                </div>
              </Anchor>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
