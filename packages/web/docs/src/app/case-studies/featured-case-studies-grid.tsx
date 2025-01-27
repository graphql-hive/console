import { Heading } from '@theguild/components';
import { CaseStudyCard } from './case-study-card';
import { CaseStudyFile } from './case-study-types';
import { getCompanyLogo } from './company-logos';
import { isCaseStudy } from './isCaseStudyFile';

export function FeaturedCaseStudiesGrid({ caseStudies }: { caseStudies: CaseStudyFile[] }) {
  // if (caseStudies.length < 6) {
  //   return null;
  // }

  return (
    <section className="grid grid-cols-6">
      <header>
        <Heading size="md" as="h2" className="text-center">
          What teams say about Hive
        </Heading>
        {caseStudies
          .filter(isCaseStudy)
          .slice(0, 6)
          .map(caseStudy => (
            <CaseStudyCard
              category={caseStudy.frontMatter.category}
              excerpt={caseStudy.frontMatter.excerpt}
              href={caseStudy.route}
              logo={getCompanyLogo(caseStudy.name)}
            />
          ))}
      </header>
    </section>
  );
}
