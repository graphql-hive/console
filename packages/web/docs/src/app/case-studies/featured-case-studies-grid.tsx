import { cn, Heading } from '@theguild/components';
import { CaseStudiesArchDecoration, CaseStudiesGradientDefs } from './case-studies-arch-decoration';
import { CaseStudyCard } from './case-study-card';
import { CaseStudyFile } from './case-study-types';
import { getCompanyLogo } from './company-logos';
import { isCaseStudy } from './isCaseStudyFile';

export function FeaturedCaseStudiesGrid({
  caseStudies,
  className,
}: {
  caseStudies: CaseStudyFile[];
  className?: string;
}) {
  if (process.env.NODE_ENV === 'development' && caseStudies.length < 6) {
    while (caseStudies.length < 6) {
      caseStudies = [...caseStudies, ...caseStudies, ...caseStudies];
    }
  }

  return (
    <section
      className={cn('grid gap-6', className)}
      style={{
        gridTemplateAreas: "'a1 a1 a1 a2 a2 a2' 'a3 a3 ac ac a4 a4' 'a5 a5 a5 a6 a6 a6'",
      }}
    >
      <header
        style={{ gridArea: 'ac' }}
        className="relative flex h-[508px] w-[448px] items-center overflow-hidden"
      >
        <Heading size="md" as="h2" className="text-center">
          What teams say about Hive
        </Heading>
        <CaseStudiesArchDecoration
          gradientId="featured-studies-gradient"
          className="absolute -right-8 top-0 w-full rotate-180 overflow-visible"
        />
        <CaseStudiesArchDecoration
          gradientId="featured-studies-gradient"
          className="absolute -left-8 bottom-0 w-full overflow-visible"
        />
        <CaseStudiesGradientDefs
          gradientId="featured-studies-gradient"
          stops={
            <>
              <stop offset="0%" stopColor="#F1EEE4" stopOpacity={0} />
              <stop
                offset="100%"
                stopColor="#F1EEE4"
                stopOpacity={1}
                className="dark:[stop-opacity:0.1]"
              />
            </>
          }
        />
      </header>
      {caseStudies
        .filter(isCaseStudy)
        .slice(0, 6)
        .map((caseStudy, i) => (
          <CaseStudyCard
            key={i}
            excerpt={caseStudy.frontMatter.excerpt}
            href={caseStudy.route}
            logo={getCompanyLogo(caseStudy.name)}
            style={{ gridArea: `a${i + 1}` }}
          />
        ))}
    </section>
  );
}
