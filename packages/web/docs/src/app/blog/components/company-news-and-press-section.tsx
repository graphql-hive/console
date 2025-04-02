import { cn, Heading } from '@theguild/components';
import { BlogCard } from './blog-card';

export function CompanyNewsAndPressSection({ className }: { className?: string }) {
  return (
    <section className={cn('py-6 lg:py-24', className)}>
      <Heading as="h3" size="md" className="text-balance text-center">
        Company News and Press
      </Heading>
      <ul className="mt-6 flex items-stretch gap-4 *:flex-1 max-md:flex-col sm:gap-6 lg:mt-16">
        <li>
          <BlogCard
            variant="featured"
            post={{
              route: '/blog/hive-platform-achieves-soc2-certification',
              frontMatter: {
                title: 'Hive Platform Achieves SOC-2 Type II Certification',
                authors: ['dotan'],
                tags: ['security'],
                date: '2025-03-25',
              },
            }}
            className="h-full"
          />
        </li>
        <li>
          <BlogCard
            variant="featured"
            post={{
              route: '/blog/stellate-acquisition',
              frontMatter: {
                title: 'The Guild acquires Stellate',
                authors: ['uri'],
                tags: ['Company', 'GraphQL'],
                date: '2024-09-10',
              },
            }}
            className="h-full"
          />
        </li>
        <li>
          <BlogCard
            variant="featured"
            post={{
              route: 'https://the-guild.dev/blog/rebranding-in-open-source',
              frontMatter: {
                title: 'Rebranding in open source',
                authors: ['uri'],
                tags: ['branding'],
                date: '2024-02-24',
              },
            }}
            className="h-full"
          />
        </li>
      </ul>
    </section>
  );
}
