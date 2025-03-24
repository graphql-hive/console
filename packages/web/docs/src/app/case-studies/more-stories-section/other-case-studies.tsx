'use client';

import { useFrontmatter } from '../../../components/use-frontmatter';
import { CaseStudyCard } from '../case-study-card';
import { CaseStudyFile } from '../case-study-types';
import { getCompanyLogo } from '../company-logos';

export function OtherCaseStudies({ caseStudies }: { caseStudies: CaseStudyFile[] }) {
  const frontmatter = useFrontmatter();
  return (
    <>
      {caseStudies
        .filter(item => item.name !== frontmatter.name)
        .slice(0, 3)
        .map((item, i) => {
          return (
            <li key={i} className="grow basis-[320px]">
              <CaseStudyCard
                category={item.frontMatter.category}
                excerpt={item.frontMatter.excerpt}
                href={item.route}
                logo={getCompanyLogo(item.name)}
              />
            </li>
          );
        })}
    </>
  );
}
