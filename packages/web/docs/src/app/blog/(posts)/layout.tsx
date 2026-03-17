import { cn, GetYourAPIGameRightSection, HiveLayoutConfig } from '@theguild/components';
import { LandingPageContainer } from '../../../components/landing-page-container';
import { BlogPostHeader } from '../components/blog-post-layout/blog-post-header';
import { SimilarPosts } from '../components/blog-post-layout/similar-posts';
import '../../hive-prose-styles.css';

const MAIN_CONTENT = 'main-content';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingPageContainer className="hive-prose text-green-1000 mx-auto max-w-[90rem] overflow-hidden dark:text-white">
      <HiveLayoutConfig widths="landing-narrow" />
      <BlogPostHeader className="mx-auto" />
      <div
        className={cn(
          MAIN_CONTENT,
          'mx-auto flex *:!pl-2 sm:*:!ml-auto sm:*:!pl-0 [&>div>:first-child]:hidden [&_main>p:first-of-type]:text-xl/8 md:[&_main>p:first-of-type]:text-2xl/8',
        )}
      >
        {children}
      </div>
      <SimilarPosts className="mx-4 md:mx-6" />
      <GetYourAPIGameRightSection className="light text-green-1000 dark:bg-primary/95 mx-4 sm:mb-6 md:mx-6" />
    </LandingPageContainer>
  );
}
