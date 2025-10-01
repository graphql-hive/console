import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CardDescription, CardTitle } from './card';

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
          <div className="mb-3 h-[1px] w-full bg-gray-700" />
        </>
      ) : null}
      {children}
    </div>
  ),
);
PageLayoutContent.displayName = 'PageLayoutContent';

const SubPageLayout = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  ),
);
SubPageLayout.displayName = 'SubPageLayout';

type SubPageLayoutHeaderProps = {
  children?: ReactNode;
  subPageTitle?: ReactNode;
  description?: string | ReactNode;
  sideContent?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

const SubPageLayoutHeader = forwardRef<HTMLDivElement, SubPageLayoutHeaderProps>((props, ref) => {
  const header = (
    <div className="space-y-1.5">
      <CardTitle>{props.subPageTitle}</CardTitle>
      {typeof props.description === 'string' ? (
        <CardDescription>{props.description}</CardDescription>
      ) : (
        props.description
      )}
    </div>
  );
  return (
    <div className="flex flex-row items-center justify-between" ref={ref}>
      {props.sideContent ? (
        <div className="flex w-full">
          {header}
          {props.sideContent}
        </div>
      ) : (
        header
      )}
      <div>{props.children}</div>
    </div>
  );
});
SubPageLayoutHeader.displayName = 'SubPageLayoutHeader';

export { PageLayout, NavLayout, PageLayoutContent, SubPageLayout, SubPageLayoutHeader };
