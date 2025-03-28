import { cn, HiveLayoutConfig } from '@theguild/components';
import { LandingPageContainer } from '../../../components/landing-page-container';
import '../../hive-prose-styles.css';
import { BlogPostHeader } from '../components/blog-post-layout/blog-post-header';

const MAIN_CONTENT = 'main-content';

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingPageContainer className="hive-prose text-green-1000 mx-auto max-w-[90rem] overflow-hidden dark:text-white">
      <HiveLayoutConfig widths="landing-narrow" />
      <BlogPostHeader className="mx-auto" />
      <div
        className={cn(
          MAIN_CONTENT,
          'mx-auto flex *:!pl-2 sm:*:!ml-auto sm:*:!pl-0 [&>div>:first-child]:hidden [&_main>p:first-of-type]:text-xl/6 md:[&_main>p:first-of-type]:text-2xl/8',
        )}
      >
        {children}
      </div>
    </LandingPageContainer>
  );
}
