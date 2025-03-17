import { cn, Heading } from '@theguild/components';
import { BlogCard } from './blog-card';

export function CompanyNewsAndPressSection({ className }: { className?: string }) {
  return (
    <section className={cn('py-6 lg:p-24', className)}>
      <Heading as="h3" size="md" className="text-balance text-center">
        Company News and Press
      </Heading>
      <ul className="mt-6 flex items-stretch gap-4 *:flex-1 max-md:flex-col sm:gap-6 lg:mt-16">
        <li>
          <BlogCard
            title="Understanding the Differences Between GraphQL and REST API Gateways"
            author="saihaj"
            category="GraphQL"
            href="https://the-guild.dev/blog/understanding-the-differences-between-graphql-and-rest-api-gateways"
            date="2024-12-03"
            className="h-full"
          />
        </li>
        <li>
          <BlogCard
            title="The Guild acquires Stellate"
            author="uri"
            category="Company"
            href="https://the-guild.dev/blog/stellate-acquisition"
            date="2024-09-10"
            className="h-full"
          />
        </li>
        <li>
          <BlogCard
            title="Rebranding in open source"
            author="uri"
            category="Company"
            href="https://the-guild.dev/blog/rebranding-in-open-source"
            date="2024-02-24"
            className="h-full"
          />
        </li>
      </ul>
    </section>
  );
}
