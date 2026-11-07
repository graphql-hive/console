import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { DocsLink, DocsLinkProps } from '@/components/ui/docs-note';
import { cn } from '@/lib/utils';
import { pageContentLayoutStyles } from './page-content-layout.css';

const PageLayout = ({ children }: { children: ReactNode }) => (
  <div className={pageContentLayoutStyles.root}>
    <div className={pageContentLayoutStyles.row}>{children}</div>
  </div>
);
PageLayout.displayName = 'PageLayout';

type PageLayoutContentProps = {
  children: ReactNode;
  mainTitlePage?: string;
} & HTMLAttributes<HTMLDivElement>;

const PageLayoutContent = forwardRef<HTMLDivElement, PageLayoutContentProps>(
  ({ children, mainTitlePage, ...props }, ref) => (
    <div ref={ref} className={cn(pageContentLayoutStyles.content, props.className)} {...props}>
      {mainTitlePage ? (
        <>
          <h1 className={pageContentLayoutStyles.title}>{mainTitlePage}</h1>
          <div className={pageContentLayoutStyles.rule} />
        </>
      ) : null}
      {children}
    </div>
  ),
);
PageLayoutContent.displayName = 'PageLayoutContent';

const SubPageLayout = ({
  children,
  'data-testid': dataTestId,
}: {
  children: ReactNode;
  'data-testid'?: string;
}) => (
  <div className={pageContentLayoutStyles.subPage} data-testid={dataTestId}>
    {children}
  </div>
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
    <div className={pageContentLayoutStyles.subPageHeading}>
      <h3 className={pageContentLayoutStyles.subPageTitle}>{subPageTitle}</h3>
      {typeof description === 'string' ? <p>{description}</p> : description}
      {docsLink && <DocsLink {...docsLink} />}
    </div>
  );
  return (
    <div className={pageContentLayoutStyles.subPageHeader}>
      {sideContent ? (
        <div className={pageContentLayoutStyles.subPageHeaderSplit}>
          {header}
          <div className={pageContentLayoutStyles.subPageSide}>{sideContent}</div>
        </div>
      ) : (
        header
      )}
    </div>
  );
};

SubPageLayoutHeader.displayName = 'SubPageLayoutHeader';

export { PageLayout, PageLayoutContent, SubPageLayout, SubPageLayoutHeader };
