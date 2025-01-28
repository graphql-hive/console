import { GotAnIdeaSection } from '../../components/got-an-idea-section';
import { LandingPageContainer } from '../../components/landing-page-container';
import { components } from './components';
import EcosystemPageContent from './content.mdx';

export const metadata = {
  title: 'The Ecosystem',
  description: 'Everything you need to scale your API infrastructure',
};

export default function EcosystemPage() {
  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden px-4 [&>:not(header)]:px-4 lg:[&>:not(header)]:px-8 xl:[&>:not(header)]:px-[120px]">
      <EcosystemPageContent components={components} />
      <GotAnIdeaSection className="md:mx-2" />
    </LandingPageContainer>
  );
}
