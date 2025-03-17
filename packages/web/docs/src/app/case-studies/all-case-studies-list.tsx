import { Heading } from '@theguild/components';
import { CaseStudyCard } from './case-study-card';
import { CaseStudyFile } from './case-study-types';
import { getCompanyLogo } from './company-logos';

export function AllCaseStudiesList({ caseStudies }: { caseStudies: CaseStudyFile[] }) {
  return (
    <section className="py-6 sm:pt-24">
      <Heading size="md" as="h2" className="text-center">
        Explore customer stories
      </Heading>
      <ul className="mt-6 flex gap-4 max-sm:flex-col sm:mt-16 sm:gap-6">
        {caseStudies.map(caseStudy => {
          return (
            <li key={caseStudy.name} className="basis-1/3">
              <CaseStudyCard
                category={caseStudy.frontMatter.category}
                excerpt={caseStudy.frontMatter.excerpt}
                href={caseStudy.route}
                logo={getCompanyLogo(caseStudy.name)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
