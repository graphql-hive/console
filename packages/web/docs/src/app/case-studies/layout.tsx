import './case-studies-styles.css';
import { CaseStudiesHeader } from './case-studies-header';
import { GetYourAPIGameWhite } from './get-your-api-game-white';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="case-studies">
      <CaseStudiesHeader className="mx-auto max-w-[640px] max-sm:mx-4 sm:my-24" />
      {children}
      <GetYourAPIGameWhite className="mx-auto max-w-[90rem] sm:my-24" />
    </div>
  );
}
