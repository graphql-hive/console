import '../case-studies-styles.css';
import { GetYourAPIGameWhite } from '#components/get-your-api-game-white';
import { CaseStudiesHeader } from '../case-studies-header';
import { MoreStoriesSection } from '../more-stories-section';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="case-studies mx-auto box-content max-w-[90rem] px-6">
      <CaseStudiesHeader className="mx-auto max-w-[992px] pl-6 sm:my-12 md:pl-12 lg:my-24" />
      {children}
      <MoreStoriesSection className="sm:my-24" />
      <GetYourAPIGameWhite className="sm:my-24" />
    </div>
  );
}
