import { HiveLayoutConfig } from '@theguild/components';
import { LandingPageContainer } from '../../../components/landing-page-container';
import { BlogPostPicture } from '../components/blog-post-layout/blog-post-picture';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingPageContainer className="text-green-1000 mx-auto max-w-[90rem] overflow-hidden dark:text-white">
      <HiveLayoutConfig widths="landing-narrow" />
      <BlogPostPicture className="mx-4 max-sm:mt-2 md:mx-6" />
      {children}
    </LandingPageContainer>
  );
}
