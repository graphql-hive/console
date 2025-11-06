import { getPageMap } from '@theguild/components/server';
import { parseSchema } from '../../lib/parse-schema';
import { CaseStudyFile } from './case-study-types';

export async function getCaseStudies() {
  const [_meta, _indexPage, ...pageMap] = await getPageMap('/case-studies');

  const caseStudies: CaseStudyFile[] = pageMap
    .map(x => parseSchema(x, CaseStudyFile))
    .sort((a, b) => {
      const aDate = a.frontMatter.date;
      const bDate = b.frontMatter.date;
      return aDate < bDate ? 1 : aDate > bDate ? -1 : 0;
    });

  return caseStudies;
}
