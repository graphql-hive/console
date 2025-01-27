import { CaseStudyFile, PageMapItem } from './case-study-types';

export function isCaseStudy(item: PageMapItem): item is CaseStudyFile {
  return item && 'route' in item && 'name' in item && 'frontMatter' in item && !!item.frontMatter;
}
