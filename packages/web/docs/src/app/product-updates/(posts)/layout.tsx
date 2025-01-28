import type { ReactElement, ReactNode } from 'react';
import { ConfiguredGiscus } from '../../../components/configured-giscus';
import { metadata as rootMetadata } from '../../layout';
import { ProductUpdateHeader } from './product-update-header';

export const metadata = {
  // TODO: Remove this when Components have a fix for OG Images with basePath
  openGraph: rootMetadata.openGraph,
};

const Layout = ({ children }: { children: ReactNode }): ReactElement => {
  return (
    <>
      <ProductUpdateHeader />
      {children}
      <div className="container !max-w-[65rem]">
        <ConfiguredGiscus />
      </div>
    </>
  );
};

export default Layout;
