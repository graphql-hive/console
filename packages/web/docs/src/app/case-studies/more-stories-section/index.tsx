import { cn, Heading } from '@theguild/components';
import { getPageMap } from '@theguild/components/server';
import { isCaseStudy } from '../isCaseStudyFile';
import { OtherCaseStudies } from './other-case-studies';

export interface MoreStoriesSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export async function MoreStoriesSection({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');
  let caseStudies = pageMap.filter(isCaseStudy).slice(0, 4);

  if (caseStudies.length < 4) {
    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV === 'development') {
      caseStudies = [...caseStudies, ...caseStudies, ...caseStudies];
    } else {
      return null;
    }
  }

  return (
    <section {...rest} className={cn('py-6 sm:p-24', className)}>
      <Heading size="md" as="h2" className="text-center">
        More stories
      </Heading>
      <ul className="mt-6 flex flex-wrap gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        <OtherCaseStudies caseStudies={caseStudies} />
      </ul>
    </section>
  );
}
