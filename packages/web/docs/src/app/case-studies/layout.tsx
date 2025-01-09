import './case-studies-styles.css';
import { CaseStudiesHeader } from './case-studies-header';
import { GetYourAPIGameWhite } from './get-your-api-game-white';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="case-studies">
      <CaseStudiesHeader className="mx-auto my-24 max-w-[640px]" />
      {children}
      <GetYourAPIGameWhite className="mx-auto my-24 max-w-[90rem]" />
    </div>
  );
}
