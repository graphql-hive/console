import { GotAnIdeaSection } from '../got-an-idea-section';
import { Page as LandingPageContainer } from '../page';
import { components } from './components';
import EcosystemPageContent from './content.mdx';

export default function EcosystemPage() {
  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden [&>:not(header)]:px-4 lg:[&>:not(header)]:px-8 xl:[&>:not(header)]:px-[120px]">
      <EcosystemPageContent components={components} />
      <GotAnIdeaSection className="mx-4 md:mx-6" />
    </LandingPageContainer>
  );
}
