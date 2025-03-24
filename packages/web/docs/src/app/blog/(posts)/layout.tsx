import { cn, HiveLayoutConfig } from '@theguild/components';
import { LandingPageContainer } from '../../../components/landing-page-container';
import '../../hive-prose-styles.css';
import { BlogPostHeader } from '../components/blog-post-layout/blog-post-header';
import { BlogPostPicture } from '../components/blog-post-layout/blog-post-picture';

const MAIN_CONTENT = 'main-content';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingPageContainer className="hive-prose text-green-1000 mx-auto max-w-[90rem] overflow-hidden dark:text-white">
      <HiveLayoutConfig widths="landing-narrow" />
      <BlogPostPicture className="mx-4 max-sm:mt-2 md:mx-6" />
      <BlogPostHeader className="mx-auto" />
      <div className={cn(MAIN_CONTENT, 'mx-auto flex [&_main>p:first-of-type]:text-2xl/8')}>
        {children}
      </div>
    </LandingPageContainer>
  );
}
