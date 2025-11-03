import { cn, Heading } from '@theguild/components';
import { getCaseStudies } from '../get-case-studies';
import { OtherCaseStudies } from './other-case-studies';

export interface MoreStoriesSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export async function MoreStoriesSection({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const caseStudies = await getCaseStudies();

  return (
    <section {...rest} className={cn('py-6 sm:p-24', className)}>
      <Heading size="md" as="h2" className="text-center">
        More stories
      </Heading>
      <ul className="mt-6 flex flex-wrap gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        <OtherCaseStudies caseStudies={caseStudies.slice(0, 4)} />
      </ul>
    </section>
  );
}
