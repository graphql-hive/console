import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { DocsLink, DocsLinkProps } from '@/components/ui/docs-note';
import { cn } from '@/lib/utils';

type NavLayoutProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const NavLayout = forwardRef<HTMLDivElement, NavLayoutProps>(({ children, ...props }, ref) => (
  <nav ref={ref} className="flex w-48 flex-col space-x-0 space-y-1" {...props}>
    {children}
  </nav>
));
NavLayout.displayName = 'NavLayout';

type PageLayoutProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const PageLayout = forwardRef<HTMLDivElement, PageLayoutProps>(({ children, ...props }, ref) => (
  <div ref={ref} className="flex flex-col gap-y-4" {...props}>
    <div className="flex flex-row gap-x-6 py-6" {...props}>
      {children}
    </div>
  </div>
));
PageLayout.displayName = 'PageLayout';

type PageLayoutContentProps = {
  children: ReactNode;
  mainTitlePage?: string;
} & HTMLAttributes<HTMLDivElement>;

const PageLayoutContent = forwardRef<HTMLDivElement, PageLayoutContentProps>(
  ({ children, mainTitlePage, ...props }, ref) => (
    <div ref={ref} className={cn('grow', props.className)} {...props}>
      {mainTitlePage ? (
        <>
          <h1 className="mb-2 text-2xl font-semibold">{mainTitlePage}</h1>
          <div className="bg-neutral-2 mb-3 h-[1px] w-full" />
        </>
      ) : null}
      {children}
    </div>
  ),
);
PageLayoutContent.displayName = 'PageLayoutContent';

const SubPageLayout = ({ children }: { children: ReactNode }) => (
  <div className="space-y-2">{children}</div>
);
SubPageLayout.displayName = 'SubPageLayout';

type SubPageLayoutHeaderProps = {
  subPageTitle?: ReactNode;
  description?: string | ReactNode;
  sideContent?: ReactNode;
  docsLink?: DocsLinkProps;
};

const SubPageLayoutHeader = ({
  description,
  docsLink,
  sideContent,
  subPageTitle,
}: SubPageLayoutHeaderProps) => {
  const header = (
    <div className="max-w-[600px] space-y-3">
      <h3 className="text-neutral-11 text-base font-medium">{subPageTitle}</h3>
      {typeof description === 'string' ? <p>{description}</p> : description}
      {docsLink && <DocsLink {...docsLink} />}
    </div>
  );
  return (
    <div className="mb-6">
      {sideContent ? (
        <div className="flex w-full justify-between">
          {header}
          <div className="flex gap-4">{sideContent}</div>
        </div>
      ) : (
        header
      )}
    </div>
  );
};

SubPageLayoutHeader.displayName = 'SubPageLayoutHeader';

export { PageLayout, NavLayout, PageLayoutContent, SubPageLayout, SubPageLayoutHeader };
