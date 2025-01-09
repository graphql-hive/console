import './case-studies-styles.css';
import { CaseStudiesHeader } from './case-studies-header';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="case-studies">
      <CaseStudiesHeader />
      {children}
    </div>
  );
}
